const express = require("express")
const websocket = require("ws")
const cors = require("cors")
const level = require("level")
const expressWS = require("express-ws")
const cuid = require("cuid")
const gitlog = require("gitlog")

const db = level("./db.level", {
    valueEncoding: "json"
})

const app = express()
const eWSS = expressWS(app)

app.use(cors())
app.use(express.static(__dirname))

const validateChannel = channel => { if (typeof channel !== "string" && typeof channel !== "number") throw new Error("Invalid type for channel!") }
const wildcardChannel = "*"

const messageLog = []

const broadcast = (wss, msg, sender) => {
    const toSend = {
        ...msg,
        type: "message",
        ID: cuid(),
        time: new Date().getTime()
    }

    wss.clients.forEach(socket => {
        let send = socket.readyState === websocket.OPEN
        if (socket.type === "client") { send = send && (socket.channels.includes(msg.channel) || socket.channels.includes(wildcardChannel)) && socket !== sender }
        else if (socket.type === "peer") { send = send && true }
        if (send) {
            console.log("SENDING")
            socket.send(JSON.stringify(toSend))
        }
    })

    messageLog.unshift(toSend) // push to front for nice ordering

    return toSend
}

// Get short-hash of last commit as version
const version = gitlog({
    repo: __dirname + "/..", // this file is inside /src, and the repo stuff is outside of here
    number: 1,
    fields: [ "abbrevHash" ]
})[0].abbrevHash

// Featureset of this version
const features = [ "" ];

const clientCommands = {
    open(message, sendBack, ctx) {
        const channel = message.channel
        const ws = ctx.ws

        validateChannel(channel)

        if (!ws.channels.includes(channel)) ws.channels.push(channel)

        sendBack({ channels: ws.channels })
    },
    close(message, sendBack, ctx) {
        const channel = message.channel
        const ws = ctx.ws
        validateChannel(channel)
        
        // Remove channel from list if exists
        const index = ws.channels.indexOf(channel)
        if (index > -1) {
            ws.channels.splice(index, 1)
            sendBack({ channels: ws.channels })
        } else {
            throw new Error("Channel " + channel + " not open.")
        }
    },
    log(message, sendBack) {
        const start = message.start || 0
        const end = message.end || 100
        sendBack({ log: messageLog.slice(start, end) })
    },
    message(message, sendBack, { wss, ws }) {
        sendBack(broadcast(wss, message, ws))
    }
}

const ctx = {
    wss: eWSS.getWss(),
    db
}

const websocketCommandProcessor = (ws, commands) => {
    const send = x => ws.send(JSON.stringify(x))
    ws.on("message", raw => {
        try {
            const message = JSON.parse(raw)
            if (typeof message === "object" && message !== null && message !== undefined) {
                const commandName = message.type
                const command = commands[commandName]
                if (!command) { throw new Error("No such command " + commandName) }

                const sendBack = x => send({...x, type: "result", for: commandName})

                command(message, sendBack, { ws, ...ctx })
            } else {
                throw new Error("Message must be object")
            }
        } catch(e) {
            console.error(e)
            send({
                type: "error",
                error: e.toString()
            })
            return
        }
    })
}

app.ws("/connect", (ws, req) => {
    ws.channels = []
    ws.type = "client"
    websocketCommandProcessor(ws, clientCommands)
})

app.ws("/peer", (ws, req) => {
    
})

const port = parseInt(process.env.PORT) || 4567
app.listen(port, () => console.log("Skynet " + version, "listening on port " + port))