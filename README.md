# skynet
Technically client-agnostic websocket communications server, designed for ComputerCraft.

A `client.lua` to be `require`d is included; protocol documentation is in PROTOCOL.md.

Run a server for it by:

1. cloning this repo
2. creating a `skynet.toml` file (it's fine to leave it blank, the defaults are probably okay)
3. running `npm install`
4. running `node src/index.js`