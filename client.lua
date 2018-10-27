-- download CBOR library
-- TODO: improve this (use some sort of Lua bundler?)
local CBOR_path = _G.skynet_CBOR_path or "cbor.lua"
local a=http.get"https://raw.githubusercontent.com/osmarks/skynet/master/cbor.lua"local b=fs.open(CBOR_path,"w")b.write(a.readAll())a.close()b.close()

local CBOR = dofile(CBOR_path)

local skynet = {
	server = "wss://osmarks.tk/skynet2/connect/",
	socket = nil,
	open_channels = {},
	CBOR = CBOR
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

local function send_raw(data, tries)
	local tries = tries or 0
	skynet.connect()
	local ok, err = pcall(skynet.socket.send, CBOR.encode(data), true) -- send in binary mode
	if not ok then
		if tries > 0 then sleep(tries) end
		if tries > 5 then error("Max reconnection attempts exceeded. " .. err) end
		pcall(skynet.connect, true) -- attempt to force reconnect
		send_raw(data, tries + 1)
	end
end

-- Opens the given channel
function skynet.open(channel)
	-- Don't send unnecessary channel-open messages
	if not value_in_table(skynet.open_channels, channel) then
		send_raw {
			"open",
			channel
		}
		table.insert(skynet.open_channels, channel)
	end
end

local function recv_one(filter)
	skynet.connect()
	while true do
		local contents = skynet.socket.receive()
		local result = CBOR.decode(contents)
		if type(result) == "table" then
			if result[1] == "error" then error(result[2] .. ": " .. result[3]) end
			if filter(result) then
				return result
			end
		end
	end
end

local function recv_message(channel)
	local m = recv_one(function(msg)
		return msg[1] == "message" and (channel == nil or msg[2].channel == channel)
	end)
	return m[2].channel, m[2].message, m[2]
end

function skynet.logs(start, end_)
	error "The Skynet server no longer supports log retrieval"
end

local listener_running = false
-- Converts "websocket_message"s into "skynet_message"s.
function skynet.listen(force_run)
	local function run()
		while true do
			os.queueEvent("skynet_message", recv_message())	
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
	return recv_message(channel)
end

-- Send given data on given channel
-- Can accept a third argument - an object of extra metadata to send
function skynet.send(channel, data, full)
	local obj = full or {}
	obj.message = data
	obj.channel = channel
	send_raw {
		"message",
		obj
	}
end

return skynet
