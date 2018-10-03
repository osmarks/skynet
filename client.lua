-- download JSON library
local a=http.get"https://pastebin.com/raw/4nRg9CHU"local b=fs.open("json","w")b.write(a.readAll())a.close()b.close()

os.loadAPI "json" -- whyyyyyy

local skynet = {
	server = "wss://osmarks.tk/skynet/connect/",
	socket = nil,
	open_channels = {},
	json = json
}

function skynet.connect(force)
	if not skynet.socket or force then
		-- If we already have a socket and are throwing it away, close old one.
		if skynet.socket then skynet.socket.close() end
		sock = http.websocket(skynet.server)
		if not sock then error "Skynet server unavailable, broken or running newer protocol version." end
		skynet.socket = sock
		
		for _, c in pairs(skynet.open_channels) do
			skynet.open(channel)	
		end
	end
end

function skynet.disconnect()
	if skynet.socket then skynet.socket.close() end
end

local function value_in_table(t, v)
	for k, tv in pairs(t) do if tv == v then return true, k end end
	return false
end

local function send_raw(data)
	skynet.connect()
	skynet.socket.send(json.encode(data))
end

-- Opens the given channel
function skynet.open(channel)
	-- Don't send unnecessary channel-open messages
	if not value_in_table(skynet.open_channels, channel) then
		send_raw {
			type = "open",
			channel = channel
		}
		table.insert(skynet.open_channels, channel)
	end
end

local function recv_one(channel)
	skynet.connect()
	while true do
		local contents = skynet.socket.receive()
		local result = json.decode(contents)
		if result and result.type and result.type == "message" and (channel == nil or result.channel == channel) then
			return result.channel, result.message, result
		end
	end
end

local listener_running = false
-- Converts "websocket_message"s into "skynet_message"s.
function skynet.listen(force_run)
	local function run()
		while true do
			os.queueEvent("skynet_message", recv_one())	
		end
	end
	if not listener_running or force_run then
		local ok, err = pcall(run)
		listener_running = false
		if not ok then
			error(err)
		end
	end
end

-- Receives one message on given channel
-- Will open channel if it is not already open
-- Returns the channel, message, and full message object
function skynet.receive(channel)
	if channel then skynet.open(channel) end
	return recv_one(channel)
end

-- Send given data on given channel
-- Can accept a third argument - an object of extra metadata to send
function skynet.send(channel, data, full)
	local obj = full or {}
	obj.type = "message"
	obj.message = data
	obj.channel = channel
	send_raw(obj)
end

return skynet
