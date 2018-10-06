# Skynet Protocol

## General

Connections are by websocket.
Messages must be JSON-serialized objects containing a `type` key, like this:
```
{
  "type": "log"
}
```
Arguments to commands are keys in this object:
```
{
  "type": "open",
  "channel": 42
}
```
Commands return either results:
```
{
  "type": "result",
  "channels": [42]
}
```
or errors:
```
{
  "type": "error",
  "error": "Invalid type for channel!"
}
```
Connected sockets may be sent events, such as:
```
{
  "type": "message",
  "channel": 42,
  "message": "Hello, World!"
}
```

## Client

Available at `/connect`.
This is the interface `client.lua` uses.

### Commands

#### open

Takes `channel` (channel to open - string or number) and opens it for the socket sending this command. Opening `*` will listen to messages on all channels.

Returns `channels`, a list of channels which are now open.

#### close

Takes `channel` and closes it channel - opposite of open.

Returns `channels`, a list of channels which are now open.

#### message

Takes `message` (contents of message to send) and `channel` (channel to send on) and sends the message to all clients listening on the channel specified.  See `message` event for further details.

Returns the message sent.

#### log

Optionally takes `start` and `end` (slice of message log to return).

Returns the server's message log (on all channels); this consists of an array of `message` events.
The message log is newest-first and not persisted across server restarts.

### Events

#### message

This contains all the information present in the message command which produced it (should always include `channel` and `message`), but also has `time` (as produced by `new Date().getTime()`) and `ID` (unique per-message ID).

These are sent when another client uses the `message` command with a channel your socket is listening on.

Here is an example message:
```
{
  "type": "message",
  "channel": 42,
  "message": "Hello, World!",
  "ID": "cjmxia0pv0000k2t3z8p26cjm",
  "time": 1538834413603
}
```

## Peer

Coming Soon.
