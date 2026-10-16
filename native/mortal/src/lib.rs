//! Mortal for Riichi Night.
//!
//! * `riichi/`: the parts of Mortal's libriichi that track one player's view
//!   of the game from mjai events and encode it for the network (copied by
//!   scripts/mortal/import_libriichi.py, AGPL-3.0-or-later).
//! * `net`: the Mortal v4 network (ResNet + dueling DQN head) in plain Rust,
//!   so the app needs no ML runtime.
//! * `bot`: one seat: feeds events, picks an action, with knobs to play below
//!   full strength.
//! * `ffi`: the C ABI the WebAssembly module exports to the app.
//!
//! The libriichi modules expect to sit at the crate root (`crate::tile`, ...).

#![allow(dead_code, clippy::all)]

#[path = "riichi/macros.rs"]
#[macro_use]
mod macros;

#[path = "riichi/algo/mod.rs"]
pub mod algo;
#[path = "riichi/array.rs"]
mod array;
#[path = "riichi/chi_type.rs"]
pub mod chi_type;
#[path = "riichi/consts.rs"]
pub mod consts;
#[path = "riichi/hand.rs"]
pub mod hand;
#[path = "riichi/rankings.rs"]
mod rankings;
#[path = "riichi/state/mod.rs"]
pub mod state;
#[path = "riichi/tile.rs"]
pub mod tile;
#[path = "riichi/vec_ops.rs"]
mod vec_ops;

#[path = "."]
pub mod mjai {
    #[path = "riichi/mjai/event.rs"]
    mod event;
    pub use event::{Event, EventExt, EventWithCanAct, Metadata, OutOfBoundError};
}

pub mod bot;
pub mod ffi;
pub mod net;
