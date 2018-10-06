# Skynet Protocol

## General

Connections are by websocket.
Messages must be JSON-serialized objects containing at least a `type` key (e.g. `{"type": "log"}`) - this key is the command to run.
Commands take other arguments, passed in that object (e.g. `{"type": "open", "channel": "whatever"}`).
When a command is executed, it will either return a good result (e.g. `{"type": "result", "for": "log", "log": []}`) or an error (e.g. `{"type": "error", "error": "Human-readable description of error."}`).
Clients may also receive events, which have a `type` key containing the name of the event and extra data (e.g. `{"type": "message", "channel": 42, "message": "hi"}`).

## Client

Available at `/connect`.
This is the interface `client.lua` uses.

### Commands

#### open

Takes a `channel` key (channel to open - can be string or number) and opens that channel on the socket sending this command. Opening `*` will listen to messages on all channels.

Returns `channels`, a list of channels which are now open.

#### close

Takes a `channel` key and closes that channel - opposite of open.

Returns `channels`, a list of channels which are now open.

#### message

Takes a `message` key (contents of message to send) and `channel` key (channel to send on) and sends the message to all clients listening on the channel used.  See `message` event for further details.

Returns the message sent.

#### log

Optionally takes `start` and `end` keys (slice of message log to return).

Returns the server's message log (on all channels); this consists of an array of `message` events.
The message log is newest-first and not persisted across server restarts.

### Events

#### message

This contains all the keys present in the message command which produced it (should always include `channel` and `message`) as well as `time` (as produced by `new Date().getTime()`) and `ID` (unique per-message ID).

These are sent when another client uses the `message` command with a channel your socket is listening on.

## Peer

Coming Soon.