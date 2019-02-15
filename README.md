# skynet
Technically client-agnostic websocket communications server, designed for ComputerCraft.

A `client.lua` to be `require`d is included; protocol documentation is in PROTOCOL.md.

To run a server: `cargo build --release`, `./target/release/skynet`. 
A TOML config file is required - you can specify the path for this as a command line argument (default is `skynet.toml`).
An example containing some sane defaults is provided.
It exposes a webserver on the port specified in the config providing the web UI (if available) and websocket interface.

To make the web UI work, run `make client` to compile it.