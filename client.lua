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

-- Converts "websocket_message"s into "skynet_message"s.
function skynet.listen()
	skynet.connect()
	while true do
		local _, URL, contents = os.pullEvent "websocket_message"
		if URL == skynet.server then
			local result = json.decode(contents)
			if result and result.type and result.type == "message" then
				os.queueEvent("skynet_message", result.channel, result.message, result.ID, result)
			end
		end
	end
end

-- Receives one message on given channel
-- Will open channel if it is not already open
function skynet.receive(channel)
	if channel then skynet.open(channel) end

	local ch, result
	parallel.waitForAny(skynet.listen, function()
		repeat
			_, ch, result = os.pullEvent "skynet_message"
		-- channel being nil means no channel filter.
		until channel == nil or ch == channel
	end)
	return ch, result
end

-- Send given data on given channel
function skynet.send(channel, data)
	send_raw {
		type = "message",
		message = data,
		channel = channel
	}
end

return skynet
