use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use futures::sync::mpsc;
use futures::{Future, Stream};
use warp::ws::{Message, WebSocket};
use serde_cbor;
use slotmap::DenseSlotMap;
use ::warp;
use ::slotmap;
use log::{error, info};

use crate::skynet::*;

pub struct Client {
    channels: HashSet<Channel>,
    sender: mpsc::UnboundedSender<Message>
}

pub type Clients = Arc<Mutex<DenseSlotMap<Client>>>;

pub fn connected(ws: WebSocket, clients: Clients) -> impl Future<Item = (), Error = ()> {
    let (user_ws_tx, user_ws_rx) = ws.split();

    // Make channel which forwards to the client's websocket
    let (tx, rx) = mpsc::unbounded();
    warp::spawn(
        rx
            .map_err(|()| -> warp::Error { unreachable!("unbounded rx never errors") })
            .forward(user_ws_tx)
            .map(|_tx_rx| ())
            .map_err(|ws_err| error!("Error sending message: {}", ws_err))
    );

    let client = Client {
        channels: HashSet::new(),
        sender: tx.clone()
    };

    // Add client's TX end to the clients list
    let id = clients
        .lock()
        .unwrap()
        .insert(client);
    info!("Client connected: {:?}", id);

    let clients2 = clients.clone();

    // Send messages to other clients via message function and then handle disconnection
    user_ws_rx
        .for_each(move |msg| {
            message(id, msg, &clients, &tx);
            Ok(())
        })
        .then(move |result| {
            disconnected(id, &clients2);
            result
        })
        .map_err(move |e| {
            error!("Error on {:?}: {}", id, e);
        })
}


fn message(id: slotmap::Key, msg: Message, clients: &Clients, sender: &mpsc::UnboundedSender<Message>) {
    let raw = msg.as_bytes();
    let reply = match serde_cbor::from_slice(raw) {
        Ok(m) => match m {
            // If message is open, then add given channel to channels list
            MessageFromClient::Open(channel) => { clients.lock().unwrap()[id].channels.insert(channel); None }, // TODO: factor lock/unwrap/index stuff out into something else somehow
            // Remove given channel from list
            MessageFromClient::Close(channel) => { clients.lock().unwrap()[id].channels.remove(&channel); None },
            MessageFromClient::Message(msg) => {
                info!("Sending {:?}", msg);
                // Clone channel information on message so we can use it after serializing
                let channel = msg.channel.clone();
                // Fill in extra parameters of message, serialize
                let to_send = serde_cbor::to_vec(&MessageToClient::Message(complete(msg))).unwrap();
                for (uid, client) in clients.lock().unwrap().iter() {
                    // Send messages only to clients with the message's channel - or the wildcard channel - open
                    if id != uid && (client.channels.contains(&channel) || client.channels.contains(&WILDCARD_CHANNEL)) {
                        // TODO: figure out how to avoid this clone somehow
                        match client.sender.unbounded_send(Message::binary(to_send.clone())) {
                            Ok(()) => (),
                            Err(_disconnected) => {
                                // TX disconnected, but that should probably be handled elsewhere
                            }
                        }
                    }
                };
                None
            }
        },
        Err(e) => {
            // If the message didn't deserialize, tell the client that
            Some(MessageToClient::Error(ErrType::DeserializationFailure, format!("{}", e)))
        }
    };

    if let Some(to_send) = reply {
        sender.unbounded_send(Message::binary(serde_cbor::to_vec(&to_send).unwrap())).unwrap();
    };
}

fn disconnected(id: slotmap::Key, users: &Clients) {
    info!("Client {:?} disconnected", id);
    users
        .lock()
        .unwrap()
        .remove(id);
}