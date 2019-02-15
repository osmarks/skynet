# skynet
Technically client-agnostic websocket communications server, designed for ComputerCraft.

A `client.lua` to be `require`d is included; protocol documentation is in PROTOCOL.md.

To run a server, compile/run it as you would any other Rust application (with `cargo`). For the web debug UI to work, run `make client` (requires `node` and `npm`).