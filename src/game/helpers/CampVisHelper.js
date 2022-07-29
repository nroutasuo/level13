define(['ash'],
function (Ash) {
	
	var CampVisHelper = Ash.Class.extend({
		
		// i -> { x, z }
		// x: 0 (middle) to positive and negative infinity
		// z: 0-3 (smaller is in front) (4 for special cases like fortifications)
		coordinates: {},
		
		// settings per camp (ordinal) to create different camps on different levels
		campSettings: {},
		
		maxSpot: 999,

		constructor: function () {
			this.gridX = 10;
			this.defaultBuildingSize = 14;
		},
		
		initCampSettings: function (campOrdinal, settings) {
			this.campSettings[campOrdinal] = settings;
		},
		
		initCoordinate: function (i) {
			var z = i % 4;
			var d = Math.floor(i/4);
			var x = Math.ceil(d/2);
			if (d % 2 > 0) x = -x;
			
			let result = { x: x, z: z };
			this.coordinates[i] = result;
			// log.i("assigned coordinate: " + i + " { x: " + x + ", z: " + z +" }");
		},
		
		initCoordinates: function (count) {
			for (let i = 0; i <= count; i++) {
				if (!this.coordinates[i]) {
					this.initCoordinate(i);
				}
			}
		},
		
		getCoords: function (i) {
			if (!this.coordinates[i]) {
				this.initCoordinates(i);
			}
			return this.coordinates[i];
		},
		
		getSpot: function (x, z) {
			for (let i = 0; i < this.maxSpot; i++) {
				var coords2 = this.getCoords(i);
				if (coords2.x == x && coords2.z == z)
					return i;
			}
			log.w("couldn't find building spot for coordinates: " + x + "." + z);
			return -1;
		},
		
		getFortificationCoords: function (n) {
			return { x: 0, z: 4 };
		},
		
		getSundomeCoords: function () {
			return { x: 0, z: 0 };
		},
		
		getSpotIndex: function (x, z) {
			let i = 0;
			while (this.coordinates[i]) {
				if (this.coordinates[i].x == x && this.coordinates[i].z == z) {
					return i;
				}
				i++;
			}
			return -1;
		},
		
		getBuildingSize: function (buildingType) {
			var s = this.defaultBuildingSize;
			switch (buildingType) {
				case improvementNames.darkfarm:
					return { x: s * 1.5, y: s * 1.25 };
				case improvementNames.fortification:
					return { x: 1000, y: s * 1 };
				case improvementNames.generator:
					return { x: s * 0.9, y: s * 0.65 };
				case improvementNames.hospital:
					return { x: s * 1.25, y: s * 1.25 };
				case improvementNames.house2:
					return { x: s, y: s * 3.25 };
				case improvementNames.inn:
					return { x: s, y: s * 1.25 };
				case improvementNames.library:
					return { x: s, y: s * 3.5 };
				case improvementNames.lights:
					return { x: 3, y: s / 2 * 3.5 };
				case improvementNames.market:
					return { x: s * 3, y: s * 1.25 };
				case improvementNames.stable:
					return { x: s * 1.25, y: s * 1.5 };
				case improvementNames.storage:
					return { x: s / 2 * 3, y: s * 2.35 };
				case improvementNames.square:
					return { x: s * 3, y: s };
				case improvementNames.tradepost:
					return { x: s * 1.25, y: s * 2.85 };
				case improvementNames.shrine:
					return { x: s * 0.75, y: s * 2.5 };
				case improvementNames.temple:
					return { x: s * 2, y: s * 2 };
			}
			return { x: s, y: s };
		},
		
		isConflict: function (coords1, coords2, buildingType1, buildingType2) {
			if (buildingType1 == improvementNames.fortification) return false;
			if (buildingType2 == improvementNames.fortification) return false;
			var width1 = this.getBuildingSize(buildingType1).x;
			var width2 = this.getBuildingSize(buildingType2).x;
			var x1 = coords1.x * this.gridX;
			var x2 = coords2.x * this.gridX;
			var xdist = Math.abs(x1 - x2);
			var zdiff = coords1.z - coords2.z;
			var zdist = Math.abs(zdiff);
			var minDistance = 0;
			if (coords1.z == coords2.z) {
				// same layer, no overlap allowed and some margin
				minDistance = Math.ceil(width1/2 + width2/2) + 2;
			} else {
				// different layers, depends on height difference
				var height1 = this.getBuildingSize(buildingType1).y;
				var height2 = this.getBuildingSize(buildingType2).y;
				var ydiff = height1 - height2;
				if (zdiff < 0 && ydiff < 0) {
					// 1 in front and 2 is taller, overlap fine
					minDistance = zdist > 1 ? 0 : 1;
				} else if (zdiff > 0 && ydiff > 0) {
					// 2 in front and 1 is taller, overlap fine
					minDistance = zdist > 1 ? 0 : 1;
				} else if (ydiff == 0) {
					// same height, a bit of margin
					minDistance = Math.max(width1/2, width2/2);
				} else {
					// taller building in front, make sure shorter is visible
					minDistance = Math.max(width1/2, width2/2) + 2;
				}
			}
			return xdist < minDistance;
		},
		
		isValidCoordinates: function (coords, buildingType, buildingCount) {
			if (!coords) return false;
			
			// create soft rules / preferences by applying some rules to only some coordinates
			var isStrict = coords.x % 2 == 0;
			
			// z-coordinate: limit by building count
			if (buildingCount < 6 && coords.z == 0) return false;
			if (buildingCount < 12 && coords.z == 3) return false;
			
			// z-coordinate: bigger buildings prefer higher z values
			var size = this.getBuildingSize(buildingType);
			if (isStrict && size.y > this.defaultBuildingSize && coords.z < 1) return false;
			if (size.y < this.defaultBuildingSize && coords.z > 1) return false;
			
			// z-coordinate: some buildings prefer foreground/bacgrkound
			switch (buildingType) {
				case improvementNames.fortification:
					if (coords.z < 2) return false;
					break;
				case improvementNames.campfire:
				case improvementNames.lights:
					if (coords.z > 1) return false;
					break;
			}
			
			// x-coordinate: some building types avoid the center
			var xdist = Math.abs(coords.x);
			switch (buildingType) {
				case improvementNames.house:
					if (xdist < 4) return false;
					break;
				case improvementNames.darkfarm:
				case improvementNames.storage:
				case improvementNames.cementmill:
				case improvementNames.robotFactory:
				case improvementNames.generator:
					if (xdist < 6) return false;
					break;
				case improvementNames.stable:
					if (xdist < 10) return false;
					break;
			}
			
			// both: no low z coordinates far from the center
			if (xdist > 15 && coords.z < 1) return false;
			if (xdist > 25 && coords.z < 2) return false;
			
			return true;
		},
		
		getNextCampBuildingSpot: function (campOrdinal, sectorImprovements, building) {
			var settings = this.campSettings[campOrdinal] || {};
			var buildingType1 = building.name;
			
			if (buildingType1 == improvementNames.fortification) {
				return -1;
			}
			
			if (this.hasPredefinedPosition(building, settings, sectorImprovements, true)) {
				let i = this.getPredefinedPosition(building, settings, sectorImprovements, true);
				log.i("assigned predefined building spot for: " + buildingType1 + ": " + i);
				return i;
			}
			
			// find a number of valid spots, score them, and select the highest score
			var bestScore = -1;
			var bestSpot = -1;
			var spots = [];
			var minstarti = 1;
			var maxstarti = this.getMaxBuildingSpotAssignStartIndex(buildingType1, sectorImprovements.getTotalCount());
			var starti = minstarti + Math.floor(Math.random() * (maxstarti - minstarti));
			for (var n = 0; n < 5; n++) {
				let i = this.getRandomValidBuildingSpot(settings, sectorImprovements, buildingType1, starti);
				if (i < minstarti) break;
				var score = this.getSpotScore(settings, sectorImprovements, buildingType1, i);
				if (score > bestScore) {
					bestScore = score;
					bestSpot = i;
				}
				starti = Math.max(starti, i + 1 + Math.round(Math.random(3)));
				spots.push({ spot: i, score: score });
			}
			
			if (bestSpot < minstarti) {
				log.w("Couldn't find free valid buildings spot for " + buildingType1 + ", starti: " + starti + "/" + maxstarti);
				return -1;
			}
			
			log.i("selected a next camp building spot for " + buildingType1 + " " + bestSpot + ", score " + bestScore);
			log.i(spots);
			
			return bestSpot;
		},
		
		getRandomValidBuildingSpot: function (settings, sectorImprovements, buildingType1, starti) {
			var buildingCount = sectorImprovements.getTotalCount();
			var step = 1 + Math.floor(Math.random() * 11);
			for (let i = starti; i < this.maxSpot; i += step) {
				var coords1 = this.getCoords(i);
				// is blocked area?
				if (this.isBlockedArea(i, settings)) continue;
				// already occupied?
				var contents = sectorImprovements.buildingSpots[i];
				if (contents) continue;
				if (this.isPredefinedPosition(i, settings)) continue;
				// valid coordinates for building type?
				if (!this.isValidCoordinates(coords1, buildingType1, buildingCount)) continue;
				// conflicts with some existing?
				var foundConflict = false;
				for (let j = 0; j < sectorImprovements.buildingSpots.length; j++) {
					var contents2 = sectorImprovements.buildingSpots[j];
					if (contents2) {
						var coords2 = this.getCoords(j);
						var buildingType2 = contents2.buildingType;
						if (this.isConflict(coords1, coords2, buildingType1, buildingType2)) {
							foundConflict = true;
							break;
						}
					}
				}
				if (foundConflict) continue;
				// conflict with a predefined position?
				if (settings.predefinedPositions) {
					for (var pos in settings.predefinedPositions) {
						var coords2 = this.getCoords(pos);
						var buildingType2 = settings.predefinedPositions[pos];
						if (this.isConflict(coords1, coords2, buildingType1, buildingType2)) {
							foundConflict = true;
							break;
						}
					}
				}
				if (foundConflict) continue;
				return i;
			}
			return -1;
		},
		
		getSpotScore: function (settings, improvements, buildingType1, i) {
			let result = 0;
			var coords = this.getCoords(i);
			var dx = 5;
			// neighbours
			for (var x = coords.x - dx; x <= coords.x + dx; x++) {
				for (var z = 0; z <= 3; z++) {
					var pos = this.getSpot(x, z);
					var neighbour = improvements.buildingSpots[pos];
					if (neighbour && neighbour.buildingType == buildingType1) {
						// - point for nearby similar building
						result += 1;
						// - point for same z
						if (z == coords.z) result += 1;
					} else if (neighbour) {
						if (z != coords.z) result -= 0.25;
					}
				}
			}
			// coordinates
			switch (buildingType1) {
				case improvementNames.square:
					if (coords.z < 2) result += 1;
					break;
				case improvementNames.darkfarm:
					if (Math.abs(coords.x) > 5) result += 0.5;
					if (Math.abs(coords.x) > 10) result += 0.5;
					break;
				case improvementNames.storage:
					if (Math.abs(coords.x) > 3) result += 0.5;
					if (Math.abs(coords.x) > 6) result += 0.5;
					break;
			}
			
			if (Math.abs(coords.x) > 25) result -= 0.1;
			if (Math.abs(coords.x) > 35) result -= 0.1;
			if (Math.abs(coords.x) > 45) result -= 0.1;
			if (Math.abs(coords.x) > 55) result -= 0.1;
				
			return result;
		},
		
		getMaxBuildingSpotAssignStartIndex: function (building, buildingCount) {
			switch (building) {
				case improvementNames.square:
				case improvementNames.inn:
					return 0;
				case improvementNames.house:
				case improvementNames.house2:
					return 1 + buildingCount * 2;
				default:
					return 12 + buildingCount * 4;
			}
		},
		
		hasPredefinedPosition: function (building, settings, sectorImprovements, requireFree) {
			return this.getPredefinedPosition(building, settings, sectorImprovements, requireFree) >= 0;
		},
		
		getPredefinedPosition: function (building, settings, sectorImprovements, requireFree) {
			if (!settings.predefinedPositions) return -1;
			for (var pos in settings.predefinedPositions) {
				var posBuilding = settings.predefinedPositions[pos];
				var contents = sectorImprovements.buildingSpots[pos];
				if (requireFree && contents) continue;
				if (posBuilding == building.name) return pos;
			}
			return -1;
		},
		
		isPredefinedPosition: function (i, settings) {
			if (!settings.predefinedPositions) return false
			for (var pos in settings.predefinedPositions) {
				if (pos == i) return true;
			}
			return false;
		},
		
		isBlockedArea: function (i, settings) {
			if (!settings.blockedAreas) return false;
			var coords = this.getCoords(i);
			for (var a = 0; a < settings.blockedAreas.length; a++) {
				var area = settings.blockedAreas[a];
				if (!area.z || coords.z == area.z) {
					if (coords.x >= area.minx && coords.x <= area.maxx) {
						return true;
					}
				}
			}
			return false;
		},
		
	});

	return CampVisHelper;
});
