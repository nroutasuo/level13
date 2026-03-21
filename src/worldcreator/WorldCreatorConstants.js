define(['ash', 'worldcreator/WorldCreatorLogger', 'game/constants/PlayerStatConstants', 'game/constants/WorldConstants', 'utils/MathUtils'],
function (Ash, WorldCreatorLogger, PlayerStatConstants, WorldConstants, MathUtils) {
	
	var WorldCreatorConstants = {
		
		CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP: "passage_to_camp",
		CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE: "camp_to_passage",
		CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE: "passage_to_passage",
		CRITICAL_PATH_TYPE_CAMP_TO_POI_1: "camp_to_poi_1",
		CRITICAL_PATH_TYPE_CAMP_TO_POI_2: "camp_to_poi_2",

		REQUIRED_PATH_TYPE_CAMP_TO_POI_X: "camp_to_poi_x",
		
		TOWER_RADIUS: 20,
		AREA_SIZE_CENTRAL: 20,
		AREA_SIZE_MEDIUM: 30,
		AREA_SIZE_OUTSKIRTS: 40,
		SECTOR_RECT_EDGE_LENGTH_MAX: 20,
		START_RECT_SIZE: 5,
		MAX_SECTOR_COUNT_OVERFLOW: 10,
		MAX_CAMP_POS_DISTANCE: 3,
		
		// TODO move to WorldConstants
		MIN_CAMP_ORDINAL_HAZARD_RADIATION: 5,
		MIN_CAMP_ORDINAL_HAZARD_POISON: 3,
		MIN_CAMP_ORDINAL_HAZARD_DEBRIS: 7,
		MIN_CAMP_ORDINAL_HAZARD_FLOODED: 2,
		WASTE_HAZARD_RADIUS: 2,
		
		CONNECTION_POINTS_PATH_END: "p-end",
		CONNECTION_POINTS_PATH_ENDS: "p-ends",
		CONNECTION_POINTS_PATH_START: "p-start",
		CONNECTION_POINTS_PATH_MIDDLE: "p-middle",
		CONNECTION_POINTS_PATH_MIDDLE2: "p-middle2",
		CONNECTION_POINTS_PATH_CW: "p-cw",
		CONNECTION_POINTS_PATH_CCW: "p-ccw",
		CONNECTION_POINTS_PATH_T: "p-t",
		CONNECTION_POINTS_PATH_Y: "p-y",
		CONNECTION_POINTS_PATH_X: "p-x",
		CONNECTION_POINTS_PATH_CONTINUE: "p-cont",
		CONNECTION_POINTS_PATH_ALL: "p-all",
		CONNECTION_POINTS_PATH_EXTRA: "p-extra",
		CONNECTION_POINTS_PATH_NONE: "p-none",
		
		CONNECTION_POINTS_RECT_CORNERS: "r-corners",
		CONNECTION_POINTS_RECT_MIDDLE: "r-middle",
		CONNECTION_POINTS_RECT_OUTER: "r-outer",
		CONNECTION_POINTS_RECT_INNER: "r-inner",
		CONNECTION_POINTS_RECT_ALL: "r-all",
		CONNECTION_POINTS_RECT_EXTRA: "r-extra",
		CONNECTION_POINTS_RECT_DIAGONAL: "r-diagonal",
		CONNECTION_POINTS_RECT_NONE: "r-none",

		SHAPE_LINE_ANY: "line-any", // line starting from one connection point and going in any direction
		SHAPE_LINE_CONNECTION: "line-connection", // line between two existing connection points
		SHAPE_RECTANGLE_CORNER: "rectangle-corner", // rectangle attaching to connection point via a corner
		SHAPE_RECTANGLE_CENTER: "rectangle-center", // rectangle attaching to a connection point via a side
		SHAPE_CIRCLE: "circle", // same as SHAPE_RECTANGLE_CENTER but rounded
		SHAPE_TRIANGLE: "triangele", // triangles using two connection points
		
		getNumSectors: function (campOrdinal) {
			// sizes of levels if there is a campable and a non-campable level
			let defaultBigLevel = 140;
			let defaultSmallLevel = 80;

			// slightly grow level size towards late game
			let campOrdinalExtra = campOrdinal * 3;
			
			// slightly smaller first level
			if (campOrdinal == 1) 
				return Math.round(defaultBigLevel * 0.75);

			// camp ordinal 8 has 3 levels (camp, ground, level 14)
			if (campOrdinal == WorldConstants.CAMPS_BEFORE_GROUND)
				return Math.round(defaultBigLevel * 2 + defaultSmallLevel + campOrdinalExtra * 2);

			// surface is only camp
			if (campOrdinal == WorldConstants.CAMPS_TOTAL)
				return defaultBigLevel + campOrdinalExtra;

			return defaultBigLevel + defaultSmallLevel + campOrdinalExtra;
		},
		
		getMaxSectorOverflow: function (levelOrdinal) {
			return this.MAX_SECTOR_COUNT_OVERFLOW + Math.floor(levelOrdinal / 5);
		},
		
		// max length of a path (limited by stamina) on the given camp ordinal
		// if a path spans several levels, lowest ordinal should be used
		getMaxPathLength: function (campOrdinal, pathType) {
			// TODO get rid of hard-coded values
			var movementCost = 10;
			if (campOrdinal > 1) movementCost = 9;
			if (campOrdinal > 7) movementCost = 8;
			var maxStamina = 1000;
			if (campOrdinal > 12) maxStamina = 1250;
			var movementCostLevel = movementCost * 10;
			var maxLength = maxStamina / movementCost;
			
			var deductScouts = true;
			var deductScavenges = true;

			switch (pathType) {
				case this.CRITICAL_PATH_TYPE_CAMP_TO_POI_1:
				case this.CRITICAL_PATH_TYPE_CAMP_TO_POI_2:
				case this.CRITICAL_PATH_TYPE_CAMP_TO_POI_X:
					// there, scout/fight, and back (these paths have a lot of points so less strict -> faster world creation)
					var maxScoutCost = PlayerStatConstants.MAX_SCOUT_LOCALE_STAMINA_COST;
					var fightCost = 10 * 3;
					var actionCost = Math.max(fightCost, maxScoutCost);
					maxLength = (maxLength - actionCost / movementCost) / 2;
					deductScouts = false;
					deductScavenges = false;
					break;
				case this.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE:
				case this.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP:
				case this.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE:
					// once there, but the whole route can be CAMP_TO_PASSAGE + PASSAGE_TO_PASSAGE + PASSAGE_TO_CAMP
					maxLength = maxLength / 3 - movementCostLevel / movementCost;
					break;
				default:
					WorldCreatorLogger.w("Unknown path type: " + pathType);
					break;
			}
			
			if (deductScouts) {
				var scoutCost = 5;
				var numScouts = MathUtils.clamp(Math.round(maxLength / 5), 1, 10);
				maxLength = maxLength - numScouts * scoutCost / movementCost;
			}
			
			if (deductScavenges) {
				var scavengeCost = 3;
				var numScavenges = MathUtils.clamp(Math.round(maxLength / 5), 1, 10);
				maxLength = maxLength - numScavenges * scavengeCost / movementCost;
			}
			
			var ordinalFactor = campOrdinal === 1 ? 0.85 : 1;
			maxLength = maxLength * ordinalFactor;
			
			return Math.floor(maxLength);
		},
		
		getHabitability: function (campOrdinal) {
			if (campOrdinal <= 0) return 0;
			switch (campOrdinal) {
				// outposts
				case 3:
				case 5:
				case 7:
				case 8:
				case 10:
				case 11:
				case 14:
					return 0.5;
					
				// capital
				case 13:
					return 1.5;
					
				// regular camps
				default:
					return 1;
			}
		},
		
		getRaidDangerFactor: function (campOrdinal) {
			if (campOrdinal <= 0) return 0;
			switch (campOrdinal) {
				case 1:
				case WorldConstants.CAMPS_BEFORE_GROUND:
				case WorldConstants.CAMPS_TOTAL:
					return 0.5;
				
				case 10:
				case 11:
				case 12:
				case 13:
					return 1.5;
				
				default:
					return this.getHabitability(campOrdinal);
			}
		},
		
		getZoneOrdinal: function (zone) {
			switch (zone) {
				// all levels
				case WorldConstants.ZONE_ENTRANCE: return 0;
				// campable levels
				case WorldConstants.ZONE_PASSAGE_TO_CAMP: return 1;
				case WorldConstants.ZONE_POI_1: return 2;
				case WorldConstants.ZONE_POI_2: return 3;
				case WorldConstants.ZONE_CAMP_TO_PASSAGE: return 4;
				case WorldConstants.ZONE_EXTRA_CAMPABLE: return 5;
				case WorldConstants.ZONE_POI_TEMP: return 6;
				// uncampable levels
				case WorldConstants.ZONE_PASSAGE_TO_PASSAGE: return 11;
				case WorldConstants.ZONE_EXTRA_UNCAMPABLE: return 12;
				default:
					WorldCreatorLogger.w("no ordinal defined for zone: " + zone);
					return 5;
			}
		},
		
		isEarlierZone: function (zone1, zone2) {
			return this.getZoneOrdinal(zone1) < this.getZoneOrdinal(zone2);
		},
		
		getMinLocales: function (blueprints) {
			return 2 + blueprints;
		},
		
		getMaxLocales: function (blueprints) {
			return Math.max(
				this.getMinLocales(blueprints) + 2,
				Math.round(blueprints + blueprints / 2)
			);
		},

		isFeatureBlockingSectors: function (featureType) {
			switch (featureType) {
				case WorldConstants.FEATURE_HOLE_COLLAPSE:
				case WorldConstants.FEATURE_HOLE_MOUNTAIN:
				case WorldConstants.FEATURE_HOLE_WELL:
					return true;
			}

			return false;
		},

		isFeaturePreferredForSectors: function (featureType) {
			return !this.isFeatureBlockingSectors(featureType);
		},

		getEdgeFeature: function (featureType) {
			switch (featureType) {
				case WorldConstants.FEATURE_HOLE_COLLAPSE: return WorldConstants.FEATURE_HOLE_COLLAPSE_EDGE;
				case WorldConstants.FEATURE_HOLE_MOUNTAIN: return WorldConstants.FEATURE_HOLE_MOUNTAIN_EDGE;
				case WorldConstants.FEATURE_HOLE_WELL: return WorldConstants.FEATURE_HOLE_WELL_EDGE;
			}

			return null;
		},

	};
	
	WorldCreatorConstants.CRITICAL_PATHS_BY_ORDER = [
		WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_CAMP,
		WorldCreatorConstants.CRITICAL_PATH_TYPE_PASSAGE_TO_PASSAGE,
		WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_1,
		WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2,
		WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_PASSAGE,
	];
	
	return WorldCreatorConstants;
});
