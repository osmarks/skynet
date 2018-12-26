import { app } from "hyperapp"
import * as CBOR from "borc"
import dayjs from "dayjs"
import hashbow from "hashbow"

// From the ijk package - https://github.com/lukejacksonn/ijk
const isString = x => typeof x === 'string'
const isArray = Array.isArray
const arrayPush = Array.prototype.push
const isObject = x => typeof x === 'object' && !isArray(x)

const clean = (arr, n) => (
  n && arrayPush.apply(arr, isString(n[0]) ? [n] : n), arr
)

const child = (n, cb) =>
  n != null ? (isArray(n) ? n.reduce(clean, []).map(cb) : [n + '']) : []

const ijk = (x, y, z) => {
  const transform = node =>
  isString(node)
    ? node
    : isObject(node[1])
      ? {
          [x]: node[0],
          [y]: node[1],
          [z]: child(node[2], transform),
        }
      : transform([node[0], {}, node[1]])
  return transform
}

const push = (xs, x) => xs.concat([x])

const state = {
    messages: [],
    websocket: null,
    URL: (window.location.href + "connect").replace("http", "ws"),
    channel: "default"
}

let windowVisible = true
let doNotify = false

window.onfocus = () => { windowVisible = true; doNotify = false }
window.onblur = () => { windowVisible = false }

const blinkTime = 1000

// Blink title a bit by adding then removing ***.
setInterval(() => {
    if (doNotify && !windowVisible) {
        let title = document.title
        document.title = "*** " + title
        setTimeout(() => {
            document.title = title
        }, blinkTime)
    }
}, blinkTime * 2)

const notify = () => { doNotify = !windowVisible } // do not start notification if window is visible

const toDiagnostic = x => CBOR.diagnose(CBOR.encode(x))

const actions = {
    connect: () => (state, actions) => {
        const URL = state.URL;
        console.log("CONN", URL)

        if (state.websocket && "close" in state.websocket) { state.websocket.close() }

        const ws = new WebSocket(URL)

        ws.addEventListener("message", data => {
            try {
                window.asaaaadasfasfasgasg = data
                actions.handleMessage(CBOR.decodeFirst(new Uint8Array(data.data)))
            } catch(e) {
                console.warn(e)
                actions.addMessage(["error", e.toString()])
            }
        })
        ws.addEventListener("close", ce => actions.addMessage([ "internal", "Connection closed: code " + ce.code ]))
        ws.addEventListener("open", () => {
            ws.binaryType = "arraybuffer"
            actions.addMessage([ "internal", "Connected to " + URL + "." ])
            actions.send([
                "open", "*"
            ])
        })

        return { websocket: ws }
    },
    handleMessage: message => (state, actions) => {
        console.log("RECV", message)
        const type = message[0]
        const data = message[1]

        if (type === "message") {
            actions.addMessage([ "remote", data ])
        } else if (type === "error") {
            actions.addMessage([ "error", data + ": " + message[2] ])
        }
    },
    urlInput: ev => (state, actions) => {
        if (ev.keyCode === 13) { // enter
            actions.connect()
        }
        return { URL: ev.target.value }
    },
    channelInput: ev => (state, actions) => {
        const val = ev.target.value;
        return { channel: parseFloat(val) || val }
    },
    addMessage: m => state => ({ messages: push(state.messages, m) }),
    messageInput: ev => (state, actions) => {
        if (ev.keyCode === 13) { // enter
            actions.sendMessage()
            ev.target.value = ""
        }
        return { message: ev.target.value }
    },
    send: x => (state, actions) => {
        if (state.websocket.readyState === 1) { // socket is open
            console.log("SEND", x)
            state.websocket.send(CBOR.encode(x))
        } else {
            actions.addMessage(["error", "Open connection before sending messages."])
        }
    },
    sendMessage: () => (state, actions) => {
        const channel = state.channel
        let message = state.message

        try {
            message = JSON.parse(message)  
        } catch(e) {}


        actions.send([ "message", {
            channel,
            message
        } ])

        actions.addMessage([ "user", {
            channel,
            message,
            time: new Date().getTime()
        } ])
    }
}

const cls = x => ({ class: x })

const scrollDown = () => {
    const scrollEl = document.scrollingElement
    scrollEl.scrollTop = scrollEl.scrollHeight
}

const viewMessage = m => {
    const classes = m[0]
    const data = m[1]
    var children

    if (typeof data === "string") { children = data }
    else {
        children = []
        if (data.channel) {
            const color = hashbow(data.channel.toString(), 100, 40)
            const style = "color: " + color;
            children.push([ "span", { ...cls("channel"), style }, data.channel.toString() + " " ])
        }
        if (data.message) {
            let text = toDiagnostic(data.message/*, null, "\t"*/);
            if (typeof data.message === "string") { text = data.message }
            children.push([ "span", cls("message"), text ])
        }
        if (data.time) {
            children.push([ "span", cls("timestamp"), dayjs(data.time).format("HH:mm:ss") ])
        }
    }

    return [ "li", cls(classes), children ]
}

const view = (state, actions) => ijk("nodeName", "attributes", "children")(
    [ "div", [
        [ "input", { onkeyup: actions.urlInput, placeholder: "URL", value: state.URL } ],
        [ "ul", { class: "messages", onupdate: (element, old) => scrollDown() }, state.messages.map(viewMessage) ],
        [ "input", { onkeyup: actions.channelInput, placeholder: "Channel", value: state.channel } ],
        [ "input", { onkeyup: actions.messageInput, placeholder: "Message" } ] // unfortunately, setting the value from the one in the state appears to cause problems when other stuff is going on
    ]])

const main = app(state, actions, view, document.getElementById("app"))
main.connect()

// Detect mobile devices
if ("onorientationchange" in window) {
    document.documentElement.classList.add("mobile")
}