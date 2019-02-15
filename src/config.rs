use serde::{Deserialize, Serialize};

// Workaround for https://github.com/serde-rs/serde/issues/368
fn port() -> u16 { 3030 }

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    #[serde(default="port")]
    pub port: u16
}