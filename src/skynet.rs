use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use serde_cbor::Value;
use chrono;
use lazy_static::lazy_static;

// Channels can be either strings or numbers
#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, Hash, Clone)]
#[serde(untagged)]
pub enum Channel {
    Numeric(i64),
    Named(String)
}

// Clients listening on this channel will receive all messages
lazy_static! {
    pub static ref WILDCARD_CHANNEL: Channel = Channel::Named("*".to_string());
}

// A message sent from a client
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct RawMsg {
    pub channel: Channel,
    #[serde(flatten)] pub meta: HashMap<String, Value>,
    pub message: Value
}

// Like a RawMsg but contains extra data. What actually gets sent to clients.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub struct Msg {
    pub channel: Channel,
    #[serde(flatten)] pub meta: HashMap<String, Value>,
    pub message: Value,
    pub time: chrono::DateTime<chrono::Utc>
}

// Converts a RawMsg to a Msg
pub fn complete(raw: RawMsg) -> Msg {
    Msg {
        channel: raw.channel,
        meta: raw.meta,
        time: chrono::Utc::now(),
        message: raw.message
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum MessageFromClient {
    Open(Channel),
    Close(Channel),
    Message(RawMsg)
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrType {
    DeserializationFailure
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageToClient {
    Message(Msg),
    Error(ErrType, String)
}