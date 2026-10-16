//! Replays Mortal self-play logs (from the "Mortal kit" workflow) and checks
//! that the app's bot makes the same move as PyTorch Mortal at every
//! decision of every seat.
//!     cargo run --release --example check_selfplay -- <s42.json> <s42.bin> <log.json.gz>...
use flate2::read::GzDecoder;
use riichinight_mortal::bot::{Bot, Strength};
use riichinight_mortal::mjai::Event;
use riichinight_mortal::net::Net;
use std::io::Read;
use std::time::Instant;

fn same(a: &Event, b: &Event) -> bool {
    // Hora / ryukyoku from the log carry deltas; compare the kind and actor.
    match (a, b) {
        (Event::Hora { actor: x, .. }, Event::Hora { actor: y, .. }) => x == y,
        (Event::Ryukyoku { .. }, Event::Ryukyoku { .. }) => true,
        _ => a == b,
    }
}

fn main() {
    let a: Vec<String> = std::env::args().collect();
    let net = Net::load(&std::fs::read_to_string(&a[1]).unwrap(), &std::fs::read(&a[2]).unwrap(), a[2].ends_with("f16.bin")).unwrap();
    let (mut total, mut agree) = (0, 0);
    let mut shown = 0;
    let start = Instant::now();
    for path in &a[3..] {
        let mut text = String::new();
        GzDecoder::new(std::fs::File::open(path).unwrap()).read_to_string(&mut text).unwrap();
        let lines: Vec<&str> = text.lines().collect();
        let mut bots: Vec<Bot> = (0..4).map(|s| Bot::new(s, 1)).collect();
        for (i, line) in lines.iter().enumerate() {
            for seat in 0..4u8 {
                let can_act = bots[seat as usize].update(line).unwrap_or_else(|e| panic!("{path}:{i}: {e}"));
                if !can_act {
                    continue;
                }
                let r = bots[seat as usize].react(&net, Strength::default()).unwrap();
                // What did this seat actually do? The next event by it, or none.
                let next: Event = serde_json::from_str(lines[i + 1]).unwrap();
                let acted = match &next {
                    Event::Dahai { actor, .. } | Event::Reach { actor } | Event::Chi { actor, .. } | Event::Pon { actor, .. }
                    | Event::Daiminkan { actor, .. } | Event::Kakan { actor, .. } | Event::Ankan { actor, .. }
                    | Event::Hora { actor, .. } => *actor == seat,
                    Event::Ryukyoku { .. } => true,
                    _ => false,
                };
                let expected = if acted { next.clone() } else { Event::None };
                // A seat that could only pass on another's discard and whose
                // pass is implied may also show up as acted by someone else.
                total += 1;
                if same(&r.event, &expected) {
                    agree += 1;
                } else if shown < 8 {
                    shown += 1;
                    println!("{path}:{} seat {seat}: bot {:?}, log {:?}", i + 1, r.event, expected);
                }
            }
        }
    }
    let ms = start.elapsed().as_secs_f64() * 1000.0 / total.max(1) as f64;
    println!("{agree}/{total} decisions agree ({ms:.1} ms per decision incl. encoding)");
}
