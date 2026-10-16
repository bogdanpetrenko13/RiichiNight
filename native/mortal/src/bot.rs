//! One seat played by Mortal.
//!
//! Plays like libriichi's MortalBatchAgent with quick evaluation off and the
//! rule-based agari guard on (how the S42 release runs it): the network
//! scores every legal action, and when a closed or added kan is possible a
//! second evaluation (`at_kan_select`) picks the tile. Calls consume the red
//! five when the hand has it, as Mortal does.
//!
//! `Strength` lets a heroine play below full strength: with probability
//! `explore` the action is sampled from softmax(Q / temperature) instead of
//! taking the best one.

use crate::mjai::{Event, EventWithCanAct};
use crate::net::{ACTIONS, Net};
use crate::state::PlayerState;
use crate::tile::Tile;

use anyhow::{Context, Result, bail, ensure};
use serde::Serialize;

#[derive(Clone, Copy, Debug)]
pub struct Strength {
    pub explore: f32,
    pub temperature: f32,
}

impl Default for Strength {
    fn default() -> Self {
        Self { explore: 0.0, temperature: 1.0 }
    }
}

#[derive(Serialize)]
pub struct Reaction {
    pub event: Event,
    /// Q-value of each action index (null when illegal).
    pub q: Vec<Option<f32>>,
    pub action: usize,
    pub greedy: bool,
}

pub struct Bot {
    pub state: PlayerState,
    rng: u64,
}

// Action indices (libriichi consts.rs): 0..=36 discard (34 kinds + 3 red
// fives), 37 riichi, 38/39/40 chi low/mid/high, 41 pon, 42 kan, 43 agari,
// 44 ryukyoku (nine terminals), 45 pass.
const RIICHI: usize = 37;
const CHI_LOW: usize = 38;
const CHI_MID: usize = 39;
const CHI_HIGH: usize = 40;
const PON: usize = 41;
const KAN: usize = 42;
const AGARI: usize = 43;
const RYUKYOKU: usize = 44;

impl Bot {
    pub fn new(seat: u8, seed: u64) -> Self {
        Self { state: PlayerState::new(seat), rng: seed | 1 }
    }

    /// Feeds one mjai event; true when this seat may act now.
    pub fn update(&mut self, line: &str) -> Result<bool> {
        let data: EventWithCanAct = serde_json::from_str(line).with_context(|| format!("bad event {line}"))?;
        let cans = self.state.update(&data.event)?;
        Ok(cans.can_act() && data.can_act != Some(false))
    }

    fn next_f32(&mut self) -> f32 {
        // xorshift64*
        self.rng ^= self.rng >> 12;
        self.rng ^= self.rng << 25;
        self.rng ^= self.rng >> 27;
        ((self.rng.wrapping_mul(0x2545_f491_4f6c_dd1d) >> 40) as f32) / (1u64 << 24) as f32
    }

    fn best(q: &[f32; ACTIONS], mask: &[bool], skip: Option<usize>) -> Option<usize> {
        (0..ACTIONS)
            .filter(|&i| mask[i] && Some(i) != skip)
            .max_by(|&a, &b| q[a].total_cmp(&q[b]))
    }

    fn choose(&mut self, q: &[f32; ACTIONS], mask: &[bool], strength: Strength) -> (usize, bool) {
        let best = Self::best(q, mask, None).unwrap_or(ACTIONS - 1);
        if strength.explore <= 0.0 || self.next_f32() >= strength.explore {
            return (best, true);
        }
        let t = strength.temperature.max(1e-3);
        let weights: Vec<f32> = (0..ACTIONS)
            .map(|i| if mask[i] { ((q[i] - q[best]) / t).exp() } else { 0.0 })
            .collect();
        let total: f32 = weights.iter().sum();
        let mut r = self.next_f32() * total;
        for (i, &w) in weights.iter().enumerate() {
            if w > 0.0 {
                if r < w {
                    return (i, i == best);
                }
                r -= w;
            }
        }
        (best, true)
    }

    /// The seat's reaction to the last event (only when `update` returned true).
    pub fn react(&mut self, net: &Net, strength: Strength) -> Result<Reaction> {
        let cans = self.state.last_cans();
        let (obs, mask) = self.state.encode_obs(4, false);
        let mask = mask.to_vec();
        let q = net.q_values(obs.as_slice().context("obs layout")?, &mask);

        let kan_tile = if cans.can_ankan || cans.can_kakan {
            let (kobs, kmask) = self.state.encode_obs(4, true);
            let kmask = kmask.to_vec();
            let kq = net.q_values(kobs.as_slice().context("obs layout")?, &kmask);
            Self::best(&kq, &kmask, None)
        } else {
            None
        };

        let (mut action, greedy) = self.choose(&q, &mask, strength);
        if action == AGARI && !self.state.rule_based_agari() {
            // The network wants the win but the rules say it does not count.
            action = Self::best(&q, &mask, Some(AGARI)).unwrap_or(ACTIONS - 1);
        }
        let event = decode(&self.state, action, kan_tile)?;
        Ok(Reaction {
            event,
            q: (0..ACTIONS).map(|i| mask[i].then_some(q[i])).collect(),
            action,
            greedy,
        })
    }
}

fn tile(id: usize) -> Result<Tile> {
    Tile::try_from(id).map_err(|e| anyhow::anyhow!("bad tile id {id}: {e}"))
}

/// Red five of the suit of `t` (a five) is in the hand.
fn has_aka(akas: [bool; 3], t: Tile) -> bool {
    let id = t.deaka().as_usize();
    id < 27 && id % 9 == 4 && akas[id / 9]
}

/// Use the red five for a five among `consumed` when the hand holds it.
fn akaize_one(consumed: &mut [Tile], akas: [bool; 3]) {
    for c in consumed.iter_mut() {
        if has_aka(akas, *c) {
            *c = c.akaize();
            return;
        }
    }
}

/// Action index -> mjai event.
fn decode(state: &PlayerState, action: usize, kan_tile: Option<usize>) -> Result<Event> {
    let actor = state.player_id();
    let akas = state.akas_in_hand();
    let cans = state.last_cans();
    let target = cans.target_actor;
    let kawa = || state.last_kawa_tile().context("no last discard");

    Ok(match action {
        0..=36 => {
            ensure!(cans.can_discard, "discard not allowed: {}", state.brief_info());
            let pai = tile(action)?;
            let tsumogiri = state.last_self_tsumo().is_some_and(|t| t == pai);
            Event::Dahai { actor, pai, tsumogiri }
        }
        RIICHI => {
            ensure!(cans.can_riichi, "riichi not allowed: {}", state.brief_info());
            Event::Reach { actor }
        }
        CHI_LOW | CHI_MID | CHI_HIGH => {
            let ok = match action {
                CHI_LOW => cans.can_chi_low,
                CHI_MID => cans.can_chi_mid,
                _ => cans.can_chi_high,
            };
            ensure!(ok, "chi not allowed: {}", state.brief_info());
            let pai = kawa()?;
            let p = pai.deaka();
            let mut consumed = match action {
                CHI_LOW => [p.next(), p.next().next()],
                CHI_MID => [p.prev(), p.next()],
                _ => [p.prev().prev(), p.prev()],
            };
            akaize_one(&mut consumed, akas);
            Event::Chi { actor, target, pai, consumed }
        }
        PON => {
            ensure!(cans.can_pon, "pon not allowed: {}", state.brief_info());
            let pai = kawa()?;
            let mut consumed = [pai.deaka(); 2];
            if !pai.is_aka() {
                akaize_one(&mut consumed, akas);
            }
            Event::Pon { actor, target, pai, consumed }
        }
        KAN => {
            ensure!(cans.can_daiminkan || cans.can_ankan || cans.can_kakan, "kan not allowed: {}", state.brief_info());
            let ankan = state.ankan_candidates();
            let kakan = state.kakan_candidates();
            let t = if let Some(id) = kan_tile {
                let t = tile(id)?.deaka();
                ensure!(ankan.contains(&t) || kakan.contains(&t), "kan tile {t} not a candidate");
                t
            } else if cans.can_daiminkan {
                kawa()?
            } else if cans.can_ankan {
                ankan[0]
            } else {
                kakan[0]
            };
            if cans.can_daiminkan {
                let mut consumed = [t.deaka(); 3];
                if !t.is_aka() {
                    akaize_one(&mut consumed, akas);
                }
                Event::Daiminkan { actor, target, pai: t, consumed }
            } else if cans.can_ankan && ankan.contains(&t.deaka()) {
                let d = t.deaka();
                let mut consumed = [d; 4];
                if d.as_usize() < 27 && d.as_usize() % 9 == 4 {
                    consumed[0] = d.akaize();
                }
                Event::Ankan { actor, consumed }
            } else {
                // Added kan: the added tile is the red five if the hand has it.
                let d = t.deaka();
                let is_five = d.as_usize() < 27 && d.as_usize() % 9 == 4;
                let (pai, consumed) = if is_five && has_aka(akas, d) {
                    (d.akaize(), [d; 3])
                } else if is_five {
                    (d, [d.akaize(), d, d])
                } else {
                    (d, [d; 3])
                };
                Event::Kakan { actor, pai, consumed }
            }
        }
        AGARI => {
            ensure!(cans.can_agari(), "agari not allowed: {}", state.brief_info());
            Event::Hora { actor, target, deltas: None, ura_markers: None }
        }
        RYUKYOKU => {
            ensure!(cans.can_ryukyoku, "ryukyoku not allowed: {}", state.brief_info());
            Event::Ryukyoku { deltas: None }
        }
        45 => Event::None,
        _ => bail!("bad action {action}"),
    })
}
