# skynet
Technically client-agnostic websocket communications server, designed for ComputerCraft.

A `client.lua` to be `require`d is included; protocol documentation is in PROTOCOL.md.

To run a server: `cargo build --release`, `./target/release/skynet`. 
A configuration file will eventually be required but is not currently. 
It exposes a webserver on port 3030 providing the web UI (if available) and websocket interface.

To make the web UI work, run `make client` to compile it.