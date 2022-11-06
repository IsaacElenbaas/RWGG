const fs = require("fs");
const readline = require("readline");

let path = "/media/steam/SteamLibrary/steamapps/common/Rain World";

//{{{ parse_room_line(i, line, room, room_out)
function parse_room_line(i, line, room, room_out) {
	switch(i) {
		//case 0: // name
		case 1: // room info
			room.w = line.split("|")[0].split("*")[0];
			room.h = line.split("|")[0].split("*")[1];
			room_out.write(line.split("|")[0] + "\n");
			room.water = line.split("|")[1];
			room.water_fg = line.split("|")[2];
			room.data = [];
			for(let j = 0; j < room.w; j++) {
				room.data[j] = [];
			}
			break;
		//case 2:  break; // light angle
		//case 3:  break; // cameras
		//case 4:  break; // solid or passable border
		//case 5:  break; // spears and rocks
		//case 9:  break; // AI pathfinding costs
		//case 10: break; // AI movement precalculations
		case 11: // geometry
			let j = 0;
			let k = 0;
			while(true) {
				let l = line.indexOf("|", k);
				if(l === -1) break;
				let attr = line.substr(k, l-k).split(",");
				let x = Math.trunc(j/room.h);
				let y = j%room.h;
				switch(attr[0]) {
					case "0": room.data[x][j%room.h] = " ";  break; // air
					case "1": room.data[x][j%room.h] = "#";  break; // solid
					case "2": room.data[x][j%room.h] = "/";  break; // slope
					case "3": room.data[x][j%room.h] = " _"; break; // platform, treat as air with single line like the in-game map does
					default:  room.data[x][j%room.h] = " ";  break; // pipe, treat as air like the in-game map does
				}
				for(let m = 1; m < attr.length; m++) {
					switch(attr[m]) {
						case "1": // vertical pole
							room.data[x][y] += "|";
							break;
						case "2": // horizontal pole
							room.data[x][y] += "-";
							break;
						case "3": break; // pipe path, ignore like the in-game map does
						case "4": room.data[x][y] = "E"; break; // room transition pipe
						case "5": room.data[x][y] = "U"; break; // den
						// might append to data entry and draw some of these in some form later (waterfall at least?)
						//case "6":  break; // background wall
						//case "7":  break; // bat nest
						//case "8":  break; // waterfall
						//case "9":  break; // scavenger spawn point
						//case "10": break; // garbage worm hole
						//case "11": break; // worm grass
						//case "12": break; // scav pipe
					}
				}
				j++;
				k = l+1;
			}
			break;
	}
}
//}}}

//{{{ parse_room_end(room, room_out)
function parse_room_end(room, room_out) {
	/*for(let y = 0; y < room.h; y++) {
		for(let x = 0; x < room.w; x++) {
			room_out.write(room.data[x][y].charAt(0));
		}
		room_out.write("\n");
	}//*/

	//{{{ air
	room_out.write(" ");
	if(room.water != -1) {
		for(let y = 0; y < room.h; y++) {
			for(let x = 0; x < room.w; x++) {
				if(room.data[x][y].charAt(0) === " " && y >= room.h-room.water)
					room.data[x][y] = "W" + room.data[x][y].substring(1);
			}
		}
	}
	for(let y = 0; y < room.h; y++) {
		for(let x = 0; x < room.w; x++) {
			let u = Math.max(0,        y-1); let d = Math.min(room.h-1, y+1);
			let l = Math.max(0,        x-1); let r = Math.min(room.w-1, x+1);
			if(room.data[x][y].charAt(0) === " " && room.data[x][y].indexOf("F") === -1) {

		//{{{ air
				room.data[x][y] += "F";
				let width = 1;
				for(let i = x+1; i < room.w; i++) {
					if(room.data[i][y].charAt(0) !== " " || room.data[i][y].indexOf("F") !== -1) break;
					room.data[i][y] += "F";
					width++;
				}
				let height = 1;
				for(let j = y+1; j < room.h; j++) {
					let expandable = true;
					for(let i = x; i < x+width; i++) {
						if(room.data[i][j].charAt(0) !== " " || room.data[i][j].indexOf("F") !== -1) {
							expandable = false;
							break;
						}
					}
					if(!expandable) break;
					for(let i = x; i < x+width; i++) {
						room.data[i][j] += "F";
					}
					height++;
				}
				room_out.write(x + "," + y + "," + (x+width) + "," + y + "," + (x+width) + "," + (y+height) + " ");
				room_out.write(x + "," + y + "," + (x+width) + "," + (y+height) + "," + x + "," + (y+height) + " ");
		//}}}

			}
			else if(room.data[x][y].charAt(0) === "/") {

		//{{{ down-right slopes
				if(
					(
						r !== x && d !== y && room.data[r][d].charAt(0) === "/"
					) || (
						(l === x || room.data[l][y].charAt(0) === " ") &&
						(d === y || room.data[x][d].charAt(0) === " ")
					) || (
						(r === x || room.data[r][y].charAt(0) === " ") &&
						(u === y || room.data[x][u].charAt(0) === " ")
					)
				) {
					if(d === y || room.data[x][u].charAt(0) === " ") {
						room_out.write(x + "," + y + "," + (x+1) + "," + y + "," + (x+1) + "," + (y+1) + " ");
					}
					if(u === y || room.data[x][d].charAt(0) === " ") {
						room_out.write(x + "," + y + "," + (x+1) + "," + (y+1) + "," + x + "," + (y+1) + " ");
					}
				}
		//}}}

		//{{{ down-left slopes
				if(
					(
						l !== x && d !== y && room.data[l][d].charAt(0) === "/"
					) || (
						(l === x || room.data[l][y].charAt(0) === " ") &&
						(u === y || room.data[x][u].charAt(0) === " ")
					) || (
						(r === x || room.data[r][y].charAt(0) === " ") &&
						(d === y || room.data[x][d].charAt(0) === " ")
					)
				) {
					if(d === y || room.data[x][u].charAt(0) === " ") {
						room_out.write(x + "," + y + "," + (x+1) + "," + y + "," + x + "," + (y+1) + " ");
					}
					if(u === y || room.data[x][d].charAt(0) === " ") {
						room_out.write((x+1) + "," + y + "," + (x+1) + "," + (y+1) + "," + x + "," + (y+1) + " ");
					}
				}
		//}}}

			}
		}
	}
	room_out.write("\n");
	//}}}

	//{{{ water
	if(room.water != -1) {
		room_out.write("W");
		for(let y = 0; y < room.h; y++) {
			for(let x = 0; x < room.w; x++) {
				let u = Math.max(0,        y-1); let d = Math.min(room.h-1, y+1);
				let l = Math.max(0,        x-1); let r = Math.min(room.w-1, x+1);
				if(room.data[x][y].charAt(0) === "W" && room.data[x][y].indexOf("F") === -1) {

		//{{{ air
					room.data[x][y] += "F";
					let width = 1;
					for(let i = x+1; i < room.w; i++) {
						if(room.data[i][y].charAt(0) !== "W" || room.data[i][y].indexOf("F") !== -1) break;
						room.data[i][y] += "F";
						width++;
					}
					let height = 1;
					for(let j = y+1; j < room.h; j++) {
						let expandable = true;
						for(let i = x; i < x+width; i++) {
							if(room.data[i][j].charAt(0) !== "W" || room.data[i][j].indexOf("F") !== -1) {
								expandable = false;
								break;
							}
						}
						if(!expandable) break;
						for(let i = x; i < x+width; i++) {
							room.data[i][j] += "F";
						}
						height++;
					}
					room_out.write(x + "," + y + "," + (x+width) + "," + y + "," + (x+width) + "," + (y+height) + "W");
					room_out.write(x + "," + y + "," + (x+width) + "," + (y+height) + "," + x + "," + (y+height) + "W");
		//}}}

				}
				else if(room.data[x][y].charAt(0) === "/") {

		//{{{ down-right slopes
					if(
						(
							r !== x && d !== y && room.data[r][d].charAt(0) === "/"
						) || (
							(l === x || room.data[l][y].charAt(0) === "W") &&
							(d === y || room.data[x][d].charAt(0) === "W")
						) || (
							(r === x || room.data[r][y].charAt(0) === "W") &&
							(u === y || room.data[x][u].charAt(0) === "W")
						)
					) {
						if(d === y || room.data[x][u].charAt(0) === "W") {
							room_out.write(x + "," + y + "," + (x+1) + "," + y + "," + (x+1) + "," + (y+1) + "W");
						}
						if(u === y || room.data[x][d].charAt(0) === "W") {
							room_out.write(x + "," + y + "," + (x+1) + "," + (y+1) + "," + x + "," + (y+1) + "W");
						}
					}
		//}}}

		//{{{ down-left slopes
					if(
						(
							l !== x && d !== y && room.data[l][d].charAt(0) === "/"
						) || (
							(l === x || room.data[l][y].charAt(0) === "W") &&
							(u === y || room.data[x][u].charAt(0) === "W")
						) || (
							(r === x || room.data[r][y].charAt(0) === "W") &&
							(d === y || room.data[x][d].charAt(0) === "W")
						)
					) {
						if(d === y || room.data[x][u].charAt(0) === "W") {
							room_out.write(x + "," + y + "," + (x+1) + "," + y + "," + x + "," + (y+1) + "W");
						}
						if(u === y || room.data[x][d].charAt(0) === "W") {
							room_out.write((x+1) + "," + y + "," + (x+1) + "," + (y+1) + "," + x + "," + (y+1) + "W");
						}
					}
		//}}}

				}
			}
		}
		room_out.write("\n");
	}
	//}}}

	//{{{ geometry
	room_out.write("|");
	for(let y = 0; y < room.h; y++) {
		for(let x = 0; x < room.w; x++) {
			let u = Math.max(0,        y-1); let d = Math.min(room.h-1, y+1);
			let l = Math.max(0,        x-1); let r = Math.min(room.w-1, x+1);
			if(room.data[x][y].charAt(0) === "#") {

		//{{{ top of block lines
				if(" W".includes(room.data[x][u].charAt(0)) &&
					(l === x || room.data[l][y].charAt(0) !== "#"
					         || !" W".includes(room.data[l][u].charAt(0))) // not already handled
				) {
					let length = 1;
					for(let i = r; i < room.w; i++) {
						if(room.data[i][y].charAt(0) !== "#" ||
						   !" W".includes(room.data[i][u].charAt(0))
						) break;
						length++;
					}
					room_out.write(x + "," + y + "," + (x+length) + "," + y + "|");
				}
		//}}}

		//{{{ bottom of block lines
				if(" W".includes(room.data[x][d].charAt(0)) &&
					(l === x || room.data[l][y].charAt(0) !== "#"
					         || !" W".includes(room.data[l][d].charAt(0))) // not already handled
				) {
					let length = 1;
					for(let i = r; i < room.w; i++) {
						if(room.data[i][y].charAt(0) !== "#" ||
						   !" W".includes(room.data[i][d].charAt(0))
						) break;
						length++;
					}
					room_out.write(x + "," + (y+1) + "," + (x+length) + "," + (y+1) + "|");
				}
		//}}}

		//{{{ left of block lines
				if(" W".includes(room.data[l][y].charAt(0)) &&
					(u === y || room.data[x][u].charAt(0) !== "#"
					         || !" W".includes(room.data[l][u].charAt(0))) // not already handled
				) {
					let length = 1;
					for(let i = d; i < room.h; i++) {
						if(room.data[x][i].charAt(0) !== "#" ||
						   !" W".includes(room.data[l][i].charAt(0))
						) break;
						length++;
					}
					room_out.write(x + "," + y + "," + x + "," + (y+length) + "|");
				}
		//}}}

		//{{{ right of block lines
				if(" W".includes(room.data[r][y].charAt(0)) &&
					(u === y || room.data[x][u].charAt(0) !== "#"
					         || !" W".includes(room.data[r][u].charAt(0))) // not already handled
				) {
					let length = 1;
					for(let i = d; i < room.h; i++) {
						if(room.data[x][i].charAt(0) !== "#" ||
						   !" W".includes(room.data[r][i].charAt(0))
						) break;
						length++;
					}
					room_out.write((x+1) + "," + y + "," + (x+1) + "," + (y+length) + "|");
				}
		//}}}

			}
			else if(room.data[x][y].charAt(0) === "/") {

		//{{{ down-right slopes
				if(
					(
						(
							r !== x && d !== y && room.data[r][d].charAt(0) === "/"
						) || (
							(l === x || room.data[l][y].charAt(0) === " ") &&
							(d === y || room.data[x][d].charAt(0) === " ")
						) || (
							(r === x || room.data[r][y].charAt(0) === " ") &&
							(u === y || room.data[x][u].charAt(0) === " ")
						)
					) &&
					(l === x || u === y || room.data[l][u].charAt(0) !== "/") // not already handled
				) {
					let length = 1;
					for(let i = 1; x+i < room.w && y+i < room.h; i++) {
						if(room.data[x+i][y+i].charAt(0) !== "/") break;
						length++;
					}
					room_out.write(x + "," + y + "," + (x+length) + "," + (y+length) + "|");
				}
		//}}}

		//{{{ down-left slopes
				if(
					(
						(
							l !== x && d !== y && room.data[l][d].charAt(0) === "/"
						) || (
							(l === x || room.data[l][y].charAt(0) === " ") &&
							(u === y || room.data[x][u].charAt(0) === " ")
						) || (
							(r === x || room.data[r][y].charAt(0) === " ") &&
							(d === y || room.data[x][d].charAt(0) === " ")
						)
					) &&
					(r === x || u === y || room.data[r][u].charAt(0) !== "/") // not already handled
				) {
					let length = 1;
					for(let i = 1; x-i >= 0 && y+i < room.h; i++) {
						if(room.data[x-i][y+i].charAt(0) !== "/") break;
						length++;
					}
					room_out.write((x+1) + "," + y + "," + (x+1-length) + "," + (y+length) + "|");
				}
		//}}}

			}
			if(room.data[x][y].includes("_")) {

		//{{{ platforms
				if(l === x || !room.data[l][y].includes("_")) { // not already handled
					let length = 1;
					for(let i = r; i < room.w; i++) {
						if(!room.data[i][y].includes("_")) break;
						length++;
					}
					room_out.write(x + "," + (y+0.25) + "," + (x+length) + "," + (y+0.25) + "|");
				}
		//}}}

			}
			if(room.data[x][y].includes("|")) {

		//{{{ vertical poles
				if(u === y || !room.data[x][u].includes("|")) { // not already handled
					let length = 1;
					for(let i = d; i < room.h; i++) {
						if(!room.data[x][i].includes("|")) break;
						length++;
					}
					room_out.write((x+0.5) + "," + y + "," + (x+0.5) + "," + (y+length) + "|");
				}
		//}}}

			}
			if(room.data[x][y].includes("-")) {

		//{{{ horizontal poles
				if(l === x || !room.data[l][y].includes("-")) { // not already handled
					let length = 1;
					for(let i = r; i < room.w; i++) {
						if(!room.data[i][y].includes("-")) break;
						length++;
					}
					room_out.write(x + "," + (y+0.5) + "," + (x+length) + "," + (y+0.5) + "|");
				}
		//}}}

			}
			// TODO: dens and their directions? Draw here?
		}
	}
	room_out.write("\n");
	//}}}
}
//}}}

let regions = path + "/World/Regions/regions.txt";
try {
	fs.accessSync("./regions");
}
catch(e) {
	fs.cpSync(regions, "./regions");
}
regions = fs.readFileSync(regions).toString().replaceAll("\r", "") + "\n";

//{{{ parse_region()
function parse_region() {
	if(regions === "") return;
	let region = regions.substring(0, regions.indexOf("\n"));
	regions = regions.substring(regions.indexOf("\n")+1);
	if(region === "") parse_region();

	let region_map = path + "/World/Regions/" + region + "/map_" + region + ".txt";
	try {
		fs.accessSync("./map_" + region);
	}
	catch(e) {
		fs.cpSync(region_map, "./map_" + region);
	}
	region_map = fs.createReadStream(region_map);
	region_map = readline.createInterface({ input: region_map });
	let region_todo = {
		count: 1,
		add: function() { this.count++; },
		done: function() {
			this.count--;
			if(this.count === 0) parse_region();
		}
	};
	region_map.on("line", function(line) {
		if(line.substring(0, 3) !== region + "_" && line.substring(0, 8) !== "GATE_" + region + "_") return;
		region_todo.add();

		let map_name = line.replace(/:.*$/, "");
		let room_map;
		if(line.substring(0, 3) === region + "_")
			room_map = readline.createInterface({ input: fs.createReadStream(path + "/World/Regions/" + region + "/Rooms/" + map_name + ".txt") });
		else
			room_map = readline.createInterface({ input: fs.createReadStream(path + "/World/Gates/" + map_name + ".txt") });
		try {
			fs.accessSync("./" + region);
		}
		catch(e) {
			fs.mkdirSync("./" + region);
		}
		let room_out = fs.createWriteStream("./" + region + "/" + map_name);
		room_out.write(line.replace(/^.*:\s*/, "").replace(/\,\d*$/, "") + "\n");
		let i = 0;
		let room = {
			w: null,
			h: null,
			water: null,
			water_fg: null,
			data: null
		}
		room_map.on("line", function(line) {
			parse_room_line(i, line, room, room_out);
			i++;
		});
		room_map.on("close", function() {
			parse_room_end(room, room_out);
			room_out.end();
			region_todo.done();
		});
	});
	region_map.on("close", function() { region_todo.done(); });
}
//}}}

parse_region();
