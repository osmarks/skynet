extern crate futures;
#[macro_use] extern crate log;
extern crate pretty_env_logger;
extern crate warp;
#[macro_use] extern crate serde_derive;
extern crate serde;
extern crate serde_cbor;
extern crate chrono;
extern crate slotmap;
#[macro_use] extern crate lazy_static;

use warp::Filter;
use std::sync::{Arc, Mutex};
use slotmap::DenseSlotMap;

mod skynet;
mod client;

fn main() {
    ::std::env::set_var("RUST_LOG", "skynet=info");
    pretty_env_logger::init();

    let users = Arc::new(Mutex::new(DenseSlotMap::new()));
    let users = warp::any().map(move || users.clone());

    let socket = warp::path("connect")
        .and(warp::ws2())
        .and(users)
        .map(|ws: warp::ws::Ws2, users| {
            ws.on_upgrade(move |socket| {
                client::connected(socket, users)
            })
        });

    let index = warp::fs::dir("webui/dist");

    let routes = index.or(socket);

    warp::serve(routes)
        .run(([127, 0, 0, 1], 3030));
}