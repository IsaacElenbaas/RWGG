const fs = require("fs");
const readline = require("readline");

let path = "/home/isaacelenbaas/.local/share/Steam/steamapps/common/Rain World";

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
		case 3: // screens
			let min = line.split("|")[0].split(",");
			min[0] = parseInt(min[0]); min[1] = parseInt(min[1]);
			for(let screen in line.split("|")) {
				let coord = screen.split(",");
				coord[0] = parseInt(coord[0]); coord[1] = parseInt(coord[1]);
				if(coord[0]+coord[1] < min[0]+min[1])
					min = coord;
			}
			room_out.write(  min[0]     + "," );
			room_out.write((-min[1]-30) + "\n");
			break;
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

path = path + "/RainWorld_Data/StreamingAssets";
let main = path +                          "/world";
let msc  = path + "/mods/moreslugcats/modify/world";
let regions;
try {
	fs.accessSync("./regions");
	regions = fs.readFileSync(regions).toString().replaceAll("\r", "") + "\n";
}
catch(e) {
	regions =
		fs.readFileSync(main + "/regions.txt").toString().replaceAll("\r", "") + "\n" +
		fs.readFileSync(msc  + "/regions.txt").toString().replaceAll("\r", "").replaceAll(/(^|\n).*]/g, "$1") + "\n"
	;
	fs.writeFileSync("./regions", regions);
}
msc = path + "/mods/moreslugcats/world";

regions = regions.trimRight().split("\n");
regions =
	["artificer", "gourmand", "red", "rivulet", "saint", "spear", "white"].map(function(c) {
		return regions.map(function(r) {
			return [c, r];
		})
	})
.flat(1);

//{{{ parse_region()
let region_todo = {
	count: 1,
	add: function() { this.count++; },
	done: function() {
		this.count--;
		if(this.count === 0) parse_region();
	}
};
function parse_region() {
	let region = regions.shift();
	if(region === undefined) return;
	region.push(region[1]);
	region[1] = region[1].toLowerCase();

	try {
		fs.accessSync("./maps");
	}
	catch(e) {
		fs.mkdirSync("./maps");
	}
	let region_map = "./maps/map_" + region[2] + "-" + region[0] + ".txt";
	try {
		fs.accessSync(region_map);
	}
	catch(e) {
		let game_region_map = msc + "/" + region[1] + "/map_" + region[1] + ((region[0] === "white") ? "" : "-" + region[0]) + ".txt";
		try {
			fs.accessSync(game_region_map);
		}
		catch(e) {
			fs.writeFileSync(region_map, "\n");
			parse_region();
			return;
		}
		fs.cpSync(game_region_map, region_map);
	}
	region_map = fs.createReadStream(region_map);
	region_map = readline.createInterface({ input: region_map });
	region_map.on("line", function(line) {
		let folder;
		if(line.substring(0, 3) === region[2] + "_")
			folder = region[1] + "-rooms/";
		else if(line.substring(0, 8) === "GATE_" + region[2] + "_")
			folder = "gates/";
		else {
			parse_region();
			return;
		}
		region_todo.add();
		line = line.split("><").slice(0, 5).join(",");

		let map_name = line.replace(/:.*$/, "");
		let room_map;
		try {
			room_map = msc + "/" + folder + map_name.toLowerCase() + ".txt";
			fs.accessSync(room_map);
		}
		catch(e) {
			room_map = main + "/" + folder + map_name.toLowerCase() + ".txt";
		}
		room_map = readline.createInterface({ input: fs.createReadStream(room_map) });
		try {
			fs.accessSync("./" + region[0] + "/" + region[2]);
		}
		catch(e) {
			fs.mkdirSync("./" + region[0] + "/" + region[2], { recursive: true });
		}
		let room_out = fs.createWriteStream("./" + region[0] + "/" + region[2] + "/" + map_name);
		room_out.write(line.replace(/^.*:\s*/, "") + "\n");
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
