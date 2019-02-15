use warp::Filter;
use std::sync::{Arc, Mutex};
use slotmap::DenseSlotMap;
use std::env;
use log::info;

mod skynet;
mod client;
mod config;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config_file_path = env::args().nth(1).unwrap_or("./skynet.toml".to_string());
    let config: config::Config = toml::from_slice(&std::fs::read(config_file_path)?)?;

    env::set_var("RUST_LOG", "skynet=info");
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

    info!("Serving skynet on port {}", config.port);

    warp::serve(routes)
        .run(([0, 0, 0, 0], config.port));

    Ok(())
}