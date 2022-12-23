const { spawn, spawnSync } = require("child_process");
const rooms = spawnSync("find './RWGG/Merged Screenshots' -name '*.png' | wc -l", { shell: true }).stdout.toString();
const { WebSocketServer } = require("ws");

function random() {
	return Math.floor(Math.random()*4294967295);
}

let lobbies = {};

function start_round(lobby) {
	clearTimeout(lobby.load_timeout);
	lobby.time_votes.sort();
	let time = lobby.time_votes[Math.floor(lobby.time_votes.length/2)] || 60;
	lobby.end = new Date();
	lobby.end.setSeconds(lobby.end.getSeconds() + time);
	lobby.end_timer = setTimeout(function() {
		// if a client doesn't load or guess for two rounds, don't wait on it for anything
		for(let i = 0; i < lobby.clients.length; i++) {
			let client = lobby.clients[i];
			if(client.wait !== 0 && (!client.loaded || !client.guessed)) {
				client.wait--;
				if(client.wait === 0) {
					if(client.loaded)  lobby.loaded--;
					if(client.guessed) lobby.guessed--;
					lobby.to_wait--;
				}
			}
		}
		end_round(lobby);
	}, 1000*time);
	let message = "s|" + time + "\n";
	lobby.clients.forEach(client => client.send(message));
}

function end_round(lobby) {
	// needed for check in join_lobby
	lobby.end = new Date();
	// load callback is suppressed when lobby is created
	lobby.round += 1+lobby.skipped/Math.max(1, lobby.loaded);
	lobby.round_seed = random();
	let message = "";
	if(lobby.round >= rooms) {
		lobby.seed = random();
		message += "i|" + lobby.seed + "\n";
	}
	lobby.loaded = 0;
	lobby.skipped = 0;
	lobby.guessed = 0;
	message += "r|" + lobby.round + "|" + lobby.round_seed + "\n";
	message += "co" + "\n";
	lobby.clients.forEach(function(client) {
		client.loaded = false;
		client.guessed = false;
		client.send(message);
	});
	lobby.clients.sort(function(a, b) {
		return (a.cum_dist > b.cum_dist) ? 1 : -1;
	});
	// if everyone is idle, start new round so not stuck on waiting to generate screen
	if(lobby.to_wait === 0)
		start_round(lobby);
	else {
		lobby.load_timeout = setTimeout(function() {
			if(lobby.end-(new Date()) > 0) return;
			start_round(lobby);
		}, 15000);
	}
}

function join_lobby(client, lobby) {
	if("lobby" in client && lobby === client.lobby.name) {
		// release again if just changing settings in middle of round
		let time = Math.round((lobbies[lobby].end-(new Date()))/1000);
		if(time > 0) {
			let message  = "r|" + client.lobby.round + "|" + client.lobby.round_seed + "\n";
			    message += "s|" + time + "\n";
			client.send(message);
		}
		return;
	}
	leave_lobby(client);
	client.loaded = false;
	client.guess_total = 0;
	client.guess_count = 0;
	client.cum_dist = Infinity;
	if(!(lobby in lobbies)) {
		lobbies[lobby] = {
			name: lobby,
			clients: [],
			to_wait: 0,
			time_votes: [],
			loaded: 0,
			skipped: 0,
			guessed: 0
		};
		lobby = lobbies[lobby];
		lobby.seed = random();
		lobby.round = 0;
		lobby.round_seed = random();
		start_round(lobby);
		// don't send s again, not that it would hurt anything at the moment
		client.loaded = true;
	}
	else lobby = lobbies[lobby];
	// end sequence may have already triggered
	// prevents malicious endless new clients re-triggering (and delaying) end sequence
	client.guessed = lobby.to_wait !== 0 && lobby.guessed === lobby.to_wait;
	// further adjustment for the above
	if(lobby.to_wait === 0) client.wait++;
	client.lobby = lobby;
	let message  = "ca|1" + "\n";
	    message += "cn|" + lobby.clients.length + "|" + (client.name || "Anonymous") + "\n";
	if("difficulty" in client)
	    message += "cs|" + lobby.clients.length + "|" + client.difficulty + "\n";
	lobby.clients.forEach(client => client.send(message));
	lobby.clients.push(client);
	if("time_vote" in client)
		lobby.time_votes.push(client.time_vote);
	if(client.wait !== 0)
		lobby.to_wait++;
	message  = "ca|" + lobby.clients.length + "\n";
	for(let i = 0; i < lobby.clients.length; i++) {
		message += "cn|" + i + "|" + (lobby.clients[i].name || "Anonymous") + "\n";
		message += "cs|" + i + "|" + lobby.clients[i].difficulty + "\n";
		message += "cg|" + i + "|" + 0 + "|" + lobby.clients[i].cum_dist.toFixed(2) + "\n";
	}
	message += "i|" + lobby.seed + "\n";
	let time = Math.round((lobby.end-(new Date()))/1000);
	if(time > 0) {
		message += "r|" + lobby.round + "|" + lobby.round_seed + "\n";
		message += "s|" + time + "\n";
	}
	client.send(message);
}

function leave_lobby(client) {
	if(!("lobby" in client)) return;
	let lobby = client.lobby;
	delete client.lobby;
	let index = lobby.clients.indexOf(client);
	lobby.clients.splice(index, 1);
	if(client.wait !== 0)
		lobby.to_wait--;
	if(lobby.clients.length === 0) {
		clearTimeout(lobby.end_timer);
		delete lobbies[lobby.name];
		return;
	}
	let message = "cd|" + index + "\n";
	lobby.clients.forEach(client => client.send(message));
	if(client.guessed)
		lobby.guessed--;
	if("time_vote" in client)
		lobby.time_votes.splice(lobby.time_votes.indexOf(client.time_vote), 1);
}

module.exports = {
init_RWGG: function(parent_server) {
	const server = new WebSocketServer({
		server: parent_server,
		clientTracking: true,
		maxPayload: 1024*1024 // 1MB
	});
	setInterval(function ping() {
		for(let client in server.clients) {
			if(client.dead) client.terminate();
			client.dead = true;
			client.ping();
		}
	}, 30000);

	server.on("connection", function(client) {
		client.dead = false;
		client.on("pong", function() { client.dead = false; });
		// must start at 0 to prevent joining and loading starting a new round
		client.wait = 0;

		client.on("message", function(data, is_binary) {
			if(is_binary || !(data instanceof Buffer)) return;
			data = data.toString();
			let lobby = ("lobby" in client) ? client.lobby : null;
			let i = 0;
			while(true) {
				let j = data.indexOf("\n", i);
				if(j === -1) break;
				let line = data.substr(i, j-i).split("|");
				if(line.length != 2) {
					i = j+1;
					continue;
				}
				switch(line[0]) {
					case "lj":
						lobby = line[1].replaceAll(/[^a-zA-Z0-9]/g, "").substring(0, 20);
						if(lobby.length === 0) lobby = "default";
						join_lobby(client, lobby);
						lobby = client.lobby;
						break;
					case "ll":
						leave_lobby(client);
						break;
					case "n":
						let name = line[1].replaceAll(/[^a-zA-Z0-9]/g, "").substring(0, 20);
						if(name.length === 0) break;
						client.name = name;
						if(lobby === null) break;
						{let message = "cn|" + lobby.clients.indexOf(client) + "|" + client.name + "\n";
						lobby.clients.forEach(client => client.send(message));}
						break;
					case "tv":
						let time_vote = parseInt(line[1]);
						if(isNaN(time_vote)) break;
						time_vote = Math.max(30, Math.min(180, time_vote))
						if(lobby !== null) {
							if("time_vote" in client)
								lobby.time_votes.splice(lobby.time_votes.indexOf(client.time_vote), 1);
							lobby.time_votes.push(time_vote);
						}
						client.time_vote = time_vote;
						break;
					case "d":
						let difficulty = parseInt(line[1]);
						if(isNaN(difficulty)) break;
						client.difficulty = difficulty;
						if(lobby === null) break;
						{let message = "cs|" + lobby.clients.indexOf(client) + "|" + client.difficulty + "\n";
						lobby.clients.forEach(client => client.send(message));}
						break;
					case "l":
						if(lobby === null) break;
						if(client.loaded) break;
						client.loaded = true;
						if(client.wait === 0) break;
						lobby.loaded++;
						if(lobby.loaded === lobby.to_wait)
							start_round(lobby);
						break;
					case "s":
						if(lobby === null) break;
						// trust clients on this one, not really an alternative and not really a big deal if a bunch are maliciously skipped
						// oh no, you broke the randomness' norepeat :( literally unplayable
						lobby.skipped++;
						break;
					case "g":
						if(lobby === null) break;
						if(client.guessed) break;
						let dist = Math.abs(parseFloat(line[1]));
						if(isNaN(dist)) break;
						if(client.wait === 0) {
							if(client.loaded) lobby.loaded++;
							lobby.to_wait++;
						}
						client.wait = 2;
						client.guessed = true;
						client.guess_total += dist;
						client.guess_count++;
						client.cum_dist = client.guess_total/client.guess_count;
						lobby.guessed++;
						{let message = "cg|" + lobby.clients.indexOf(client) + "|" + dist.toFixed(2) + "|" + client.cum_dist.toFixed(2) + "\n";
						lobby.clients.forEach(client => client.send(message));}
						if(lobby.guessed === lobby.to_wait) {
							// above is false if end_round already ran as it resets lobby.guessed
							clearTimeout(lobby.end_timer);
							lobby.end_timer = setTimeout(function() {
								end_round(lobby);
							}, 5000);
						}
						break;
				}
				i = j+1;
			}
		});

		client.on("close", function() { leave_lobby(client); });
	});
}
}
