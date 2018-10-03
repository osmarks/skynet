const express = require("express");
const low = require("lowdb");
const FileAsync = require('lowdb/adapters/FileAsync');
const websocket = require('ws');
const humanID = require("human-id");

const makeID = () => humanID({
    separator: "-",
    capitalize: false
});

const send = (sock, msg) => sock.send(JSON.stringify(msg));
const validateChannel = channel => { if (typeof channel !== "string" && typeof channel !== "number") throw new Error("Invalid type for channel!"); }
const wildcardChannel = "*";

let messageLogs = [];

const commands = {
    open(ws, message) {
        const channel = message.channel;
        validateChannel(channel);

        console.log("Opening", channel, "on", ws.ID);
        // Avoid duplicate channels
        if (!ws.channels.includes(channel)) ws.channels.push(channel);

        return { channels: ws.channels };
    },
    close(ws, message) {
        const channel = message.channel;
        validateChannel(channel);

        console.log("Closing", channel, "on", ws.ID);

        // Remove channel from list if exists
        const index = ws.channels.indexOf(channel);
        if (index > -1) {
            ws.channels.splice(index, 1);
            return { closed: channel }
        } else {
            throw new Error("Channel " + channel + " not open.");
        }
    },
    message(ws, message, db, wss) {
        const toSend = {
            ...message,
            ID: makeID(),
            senderID: ws.ID,
            time: new Date().getTime()
        };

        console.log("Sending", message.message, "on", message.channel, "from", ws.ID);

        // Send message to all clients listening on this channel or the wildcard channel.
        const sentTo = [];
        wss.clients.forEach(client => {
            if ((client.channels.includes(message.channel) || client.channels.includes(wildcardChannel)) && client.readyState === websocket.OPEN && client.ID !== ws.ID) {
                client.send(JSON.stringify(toSend));
                sentTo.push(client.ID);
            }
        });

        toSend.sentTo = sentTo;

        messageLogs.unshift(toSend);

        return { sentTo, ID: toSend.ID };
    },
    ID(ws) {
        return { ID: ws.ID };
    },
    log(ws, data) {
        const start = data.start || 0;
        const end = data.end || 100;
        return { log: messageLogs.slice(start, end) };
    }
}

low(new FileAsync(process.env.DB || "./db.json")).then(db => {
    db.defaults({ channels: [] }).write();

    const app = express();
    const expressWSS = require("express-ws")(app);

    app.ws("/connect/", function(ws, req) {
        ws.channels = [];
        ws.ID = makeID();
        ws.on("message", msg => {
            let data;
            try {
                data = JSON.parse(msg);
            } catch(e) {
                console.log("Invalid data:", msg);
                send(ws, {
                    type: "error",
                    error: "JSON expected."
                })
            }

            // If sent data has required keys, execute corresponding command
            if (typeof data === "object" && data !== null && data.type) {
                const cmd = data.type;
                try {
                    const result = commands[cmd](ws, data, db, expressWSS.getWss());
                    if (result !== null && result !== undefined) {
                        if ("then" in result) { // Allow returning promises
                            result.then(res => send(ws, {
                                type: "result",
                                for: cmd,
                                ...res
                            }));
                        } else {
                            send(ws, {
                                type: "result",
                                for: cmd,
                                ...result
                            });
                        }
                    }
                } catch(e) {
                    // Send & log error
                    console.log(e);
                    send(ws, {
                        type: "error",
                        for: cmd,
                        error: e.message
                    })
                }
            }
        });
    });

    app.listen(parseInt(process.env.PORT) || 4567);
});