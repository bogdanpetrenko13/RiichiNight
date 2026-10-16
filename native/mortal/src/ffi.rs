//! C ABI of the WebAssembly module (no wasm-bindgen; the app's loader is
//! public/mortal/mortal.js).
//!
//! Strings go in through memory the host gets from `rn_alloc`, and come out
//! through one result buffer (`rn_out_ptr` / `rn_out_len`), valid until the
//! next call. Every call returning i32 uses -1 for an error, whose message is
//! then the result buffer.

use crate::bot::{Bot, Strength};
use crate::net::Net;
use std::cell::RefCell;

thread_local! {
    static NET: RefCell<Option<Net>> = const { RefCell::new(None) };
    static BOTS: RefCell<Vec<Option<Bot>>> = const { RefCell::new(Vec::new()) };
    static OUT: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

fn set_out(s: &str) {
    OUT.with(|o| {
        let mut o = o.borrow_mut();
        o.clear();
        o.extend_from_slice(s.as_bytes());
    });
}

fn fail(e: anyhow::Error) -> i32 {
    set_out(&format!("{e:#}"));
    -1
}

/// # Safety
/// `ptr` must point to `len` bytes the host wrote (from `rn_alloc`).
unsafe fn bytes<'a>(ptr: *const u8, len: usize) -> &'a [u8] {
    if len == 0 { &[] } else { unsafe { std::slice::from_raw_parts(ptr, len) } }
}

#[unsafe(no_mangle)]
pub extern "C" fn rn_alloc(len: usize) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(len.max(1));
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

/// # Safety
/// `ptr` / `len` must come from one `rn_alloc` call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rn_free(ptr: *mut u8, len: usize) {
    drop(unsafe { Vec::from_raw_parts(ptr, 0, len.max(1)) });
}

#[unsafe(no_mangle)]
pub extern "C" fn rn_out_ptr() -> *const u8 {
    OUT.with(|o| o.borrow().as_ptr())
}

#[unsafe(no_mangle)]
pub extern "C" fn rn_out_len() -> usize {
    OUT.with(|o| o.borrow().len())
}

/// Loads the network. `half` != 0: the data is float16.
///
/// # Safety
/// Pointers as for `bytes`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rn_load(index: *const u8, index_len: usize, data: *const u8, data_len: usize, half: u32) -> i32 {
    let index = match std::str::from_utf8(unsafe { bytes(index, index_len) }) {
        Ok(s) => s,
        Err(e) => return fail(e.into()),
    };
    match Net::load(index, unsafe { bytes(data, data_len) }, half != 0) {
        Ok(net) => {
            NET.with(|n| *n.borrow_mut() = Some(net));
            0
        }
        Err(e) => fail(e),
    }
}

/// A new seat; returns its handle.
#[unsafe(no_mangle)]
pub extern "C" fn rn_bot_new(seat: u32, seed: u32) -> i32 {
    if seat > 3 {
        return fail(anyhow::anyhow!("seat {seat}"));
    }
    BOTS.with(|b| {
        let mut b = b.borrow_mut();
        let bot = Some(Bot::new(seat as u8, u64::from(seed) * 0x9e37_79b9 + 7));
        if let Some(i) = b.iter().position(Option::is_none) {
            b[i] = bot;
            i as i32
        } else {
            b.push(bot);
            (b.len() - 1) as i32
        }
    })
}

#[unsafe(no_mangle)]
pub extern "C" fn rn_bot_free(handle: u32) {
    BOTS.with(|b| {
        if let Some(slot) = b.borrow_mut().get_mut(handle as usize) {
            *slot = None;
        }
    });
}

fn with_bot<T>(handle: u32, f: impl FnOnce(&mut Bot) -> anyhow::Result<T>) -> anyhow::Result<T> {
    BOTS.with(|b| {
        let mut b = b.borrow_mut();
        let bot = b.get_mut(handle as usize).and_then(Option::as_mut).ok_or_else(|| anyhow::anyhow!("no bot {handle}"))?;
        f(bot)
    })
}

/// Feeds one mjai event (JSON). 1: the seat may act now, 0: not.
///
/// # Safety
/// Pointers as for `bytes`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rn_bot_update(handle: u32, ptr: *const u8, len: usize) -> i32 {
    let line = match std::str::from_utf8(unsafe { bytes(ptr, len) }) {
        Ok(s) => s,
        Err(e) => return fail(e.into()),
    };
    match with_bot(handle, |bot| bot.update(line)) {
        Ok(can) => i32::from(can),
        Err(e) => fail(e),
    }
}

/// The seat's reaction as JSON {event, q, action, greedy} in the result buffer.
#[unsafe(no_mangle)]
pub extern "C" fn rn_bot_react(handle: u32, explore: f32, temperature: f32) -> i32 {
    let result = NET.with(|n| {
        let n = n.borrow();
        let net = n.as_ref().ok_or_else(|| anyhow::anyhow!("network not loaded"))?;
        with_bot(handle, |bot| {
            let r = bot.react(net, Strength { explore, temperature })?;
            Ok(serde_json::to_string(&r)?)
        })
    });
    match result {
        Ok(json) => {
            set_out(&json);
            0
        }
        Err(e) => fail(e),
    }
}

/// Points libriichi gives the hand that can win now (before honba and riichi
/// sticks): JSON {ron, tsumo_ko, tsumo_oya}. `ura` is a JSON list of ura
/// indicators. Used by the rules tests to check pyriichi's scoring.
///
/// # Safety
/// Pointers as for `bytes`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn rn_bot_agari(handle: u32, is_ron: u32, ura: *const u8, ura_len: usize) -> i32 {
    let text = match std::str::from_utf8(unsafe { bytes(ura, ura_len) }) {
        Ok(s) => s,
        Err(e) => return fail(e.into()),
    };
    let result = with_bot(handle, |bot| {
        let ura: Vec<crate::tile::Tile> = serde_json::from_str(text)?;
        let p = bot.state.agari_points(is_ron != 0, &ura)?;
        Ok(format!(r#"{{"ron":{},"tsumo_ko":{},"tsumo_oya":{}}}"#, p.ron, p.tsumo_ko, p.tsumo_oya))
    });
    match result {
        Ok(json) => {
            set_out(&json);
            0
        }
        Err(e) => fail(e),
    }
}

/// libriichi's description of the seat's state (debugging).
#[unsafe(no_mangle)]
pub extern "C" fn rn_bot_brief(handle: u32) -> i32 {
    match with_bot(handle, |bot| Ok(bot.state.brief_info())) {
        Ok(s) => {
            set_out(&s);
            0
        }
        Err(e) => fail(e),
    }
}
