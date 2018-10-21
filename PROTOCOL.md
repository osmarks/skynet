# Skynet Protocol

## General

Connections are by websocket.
Messages must be CBOR-serialized arrays with the first element representing the type of the message. For clarity, this document will use a JSON-like syntax instead.

Arguments to commands are other items in these arrays:
```
[
  "open",
  42
]
```
and commands may result in errors:
```
[
  "error",
  "error_type_code",
  "Human-readable description of error"
]
```
Connected sockets may be sent events, such as:
```
[
  "message",
  {
    "channel": 42,
    "message": "Hello, World!",
    "time": <DateTime 1540121649234>
  }
]
```

## Client

Available at `/connect`.
This is the interface `client.lua` uses.

### Commands

#### open

Takes a single parameter - channel to open - which can be a string or number.

Opens that channel on your socket.

#### close

Takes a single parameter - channel to close - which can be a string or number.

Closes that channel on your socket.

#### message

Takes a single parameter - message object to send.
The message object must contain a `channel` and `message`. Other keys present in it will be transmitted, however.

```
{
  "channel": "helloworld",
  "message": "test"
}
```

### Events

#### message

This contains all the information present in the message command which produced it (should always include `channel` and `message`), but also has `time`.

These are sent when another client uses the `message` command with a channel your socket is listening on.

Here is an example message:
```
[
  "message",
  {
    "channel": 42,
    "message": "Hello, World!",
    "time": <DateTime 1538834413603>
  }
]
```

## Peer

Coming Soon.
