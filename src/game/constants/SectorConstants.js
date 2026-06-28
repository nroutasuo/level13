define(['ash', 'game/constants/LevelConstants'], function (Ash, LevelConstants) {
	
	let SectorConstants = {
		
		MAP_SECTOR_STATUS_UNVISITED_INVISIBLE: "unvisited-invisible",
		MAP_SECTOR_STATUS_UNVISITED_VISIBLE: "unvisited-seen",
		MAP_SECTOR_STATUS_VISITED_UNSCOUTED: "visited",
		MAP_SECTOR_STATUS_REVEALED_BY_MAP: "revealed-by-map",
		MAP_SECTOR_STATUS_VISITED_SCOUTED: "scouted",
		MAP_SECTOR_STATUS_VISITED_CLEARED: "cleared",
		
		SECTOR_TYPE_RESIDENTIAL: "residential",
		SECTOR_TYPE_INDUSTRIAL: "industrial",
		SECTOR_TYPE_MAINTENANCE: "maintenance",
		SECTOR_TYPE_COMMERCIAL: "commercial",
		SECTOR_TYPE_PUBLIC: "public",
		SECTOR_TYPE_EMPTY: "empty",
		SECTOR_TYPE_SLUM: "slum", // unused

		SECTOR_AFFILIATION_AGRICORP: "agricorp",
		SECTOR_AFFILIATION_MINECORP: "minecorp",
		SECTOR_AFFILIATION_HANSA: "hansa",
		SECTOR_AFFILIATION_DONBALISM: "donbalism",
		
		SECTOR_CONDITION_MAINTAINED: "maintained", // currently maintained
		SECTOR_CONDITION_RECENT: "recent", // well-kept pre-Fall
		SECTOR_CONDITION_WORN: "worn", // already in bad shape around the Fall
		SECTOR_CONDITION_ABANDONED: "abandoned", // already abandoned pre-Fall
		SECTOR_CONDITION_DAMAGED: "damaged", // not worn out but actually damaged by something
		SECTOR_CONDITION_RUINED: "ruined", // so damaged or worn it's hard to say which

		STYLE_CITTADINIAN: "cittadinian",
		STYLE_HUMANIST: "humanist",
		STYLE_INDUSTRIAL: "industrial",
		STYLE_KARBOQUE: "karboque",
		STYLE_KIEVAN: "kievan",
		STYLE_MODERN: "modern",
		STYLE_NEOWESTERN: "neo-western",
		STYLE_SLUM_GENERAL: "slum-general",
		STYLE_SLUM_HUN: "slum-hun",	
		STYLE_WESTERN: "western",

		SUNLIT_REASON_SURFACE: "surface",
		SUNLIT_REASON_MIRROR: "mirror",
		SUNLIT_REASON_HOLE: "hole",
		SUNLIT_REASON_NEIGHBOUR: "neighbour",
		
		WAYMARK_TYPE_CAMP: "camp",
		WAYMARK_TYPE_CLINIC: "clinic",
		WAYMARK_TYPE_DISTRICT: "district",
		WAYMARK_TYPE_PASSAGE: "camp",
		WAYMARK_TYPE_POLLUTION: "pollution",
		WAYMARK_TYPE_RADIATION: "radiation",
		WAYMARK_TYPE_SETTLEMENT: "settlement",
		WAYMARK_TYPE_SPRING: "spring",
		
		HAZARD_TYPE_RADIATION: "radiation",
		HAZARD_TYPE_POLLUTION: "poison",
		HAZARD_TYPE_DEBRIS: "debris",
		HAZARD_TYPE_FLOODED: "flooded",
		HAZARD_TYPE_GANG_TERRITORY: "territory",
		HAZARD_TYPE_COLD: "cold",
		
		isVisited: function (sectorStatus) {
			switch (sectorStatus) {
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED: return true;
				default: return false;
			}
		},
		
		isLBasicInfoVisible: function (sectorStatus) {
			switch (sectorStatus) {
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_REVEALED_BY_MAP: return true;
				default: return false;
			}
		},

		getCondition: function (wear, damage) {
			if (damage > 7 || wear > 9)
				return SectorConstants.SECTOR_CONDITION_RUINED;
			if (damage > 0)
				return SectorConstants.SECTOR_CONDITION_DAMAGED;
			if (wear > 7)
				return SectorConstants.SECTOR_CONDITION_ABANDONED;
			if (wear > 4)
				return SectorConstants.SECTOR_CONDITION_WORN;
			if (wear > 1)
				return SectorConstants.SECTOR_CONDITION_RECENT;
			
			return SectorConstants.SECTOR_CONDITION_MAINTAINED;
		},

		getSectorEnvironmentTags: function (worldData, levelData, districtData, sectorData, hasWater) {
			worldData = worldData || {};
			levelData = levelData || {};
			districtData = districtData || {};
			sectorData = sectorData || {};

			let incompatibleCombinations = [];
			incompatibleCombinations.push(["arid", "humid"]);
			incompatibleCombinations.push(["inhabited", "uninhabited"]);
			incompatibleCombinations.push(["warm", "cold", "cool"]);
			incompatibleCombinations.push(["open", "closed"]);

			let incompatibleIndex = {};
			for (let i = 0; i < incompatibleCombinations.length; i++) {
				for (j = 0; j < incompatibleCombinations[i].length; j++) {
					let tag = incompatibleCombinations[i][j];
					if (!incompatibleIndex[tag]) incompatibleIndex[tag] = [];
					for (k = 0; k < incompatibleCombinations[i].length; k++) {
						if (k == j) continue;
						incompatibleIndex[tag].push(incompatibleCombinations[i][k]);
					}
				}
			}

			let tags = [];

			let addTag = (tag) => { 
				if (tags.indexOf(tag) >= 0) return;
				let incompatibleTags = incompatibleIndex[tag];
				if (incompatibleTags) {
					for (let i = 0; i < incompatibleTags.length; i++) {
						if (tags.indexOf(incompatibleTags[i]) >= 0) return;
					}
				}
				tags.push(tag) 
			};
			let addTags = (newTags) => { for (let i = 0; i < newTags.length; i++) { addTag(newTags[i]) } };

			let level = levelData.level || levelData.position || sectorData.level || 0;
			let condition = this.getCondition(sectorData.wear, sectorData.damage);

			let sectorTypeMatches = (type) => sectorData.sectorType == type || districtData.type == type;
			let sectorStyleMatches = (style) => sectorData.sectorStyle == style || districtData.style == style;

			let isPollutedLevel = levelData.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
			let isRadiatedLevel = levelData.notCampableReason === LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;

			addTag("level-" + level);

			if (level == worldData.bottomLevel) addTag("ground");
			if (level == worldData.topLevel) addTag("surface");

			if (level < 14) addTag("lowlevels");
			if (level > 14) addTag("highlevels");

			if (!isPollutedLevel && !isRadiatedLevel && !sectorData.hazards.hasHazards()) addTag("nohazard");
			if (sectorData.hazards.cold > 0) addTag("cold");
			if (isPollutedLevel || sectorData.hazards.poison > 0) addTag("toxic");
			if (isRadiatedLevel || sectorData.hazards.radiation > 0) addTag("radiation");

			if (sectorData.hazards.flooded > 0) addTag("flooded");
			if (sectorData.hazards.territory > 0) addTag("territory");
			if (levelData.raidDangerFactor > 1) addTag("raid");
			if (sectorData.hazards.flooded === 0) addTag("noflood");

			if (sectorData.sunlit > 0) addTags("sunlit");
			if (sectorData.sunlit == 0) addTag("dark");

			if (sectorData.buildingDensity >= 5) addTag("dense");
			if (sectorData.buildingDensity <= 5) addTag("sparse");
			if (sectorData.activity < 4) addTag("quiet");
			if (sectorData.activity > 6) addTag("busy");

			if (Math.max(sectorData.wealth, districtData.wealth || 0) >= 8) addTag("rich");
			if (Math.max(sectorData.wealth, districtData.wealth || 0) >= 4) addTag("nopoor");
			if (Math.min(sectorData.wealth, districtData.wealth || 10) <= 6) addTag("norich");
			if (Math.min(sectorData.wealth, districtData.wealth || 10) <= 3) addTag("poor");

			if (sectorData.hazards.flooded > 0 || hasWater) addTag("humid");
			if (sectorData.hazards.cold > 0) addTag("arid");

			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_MAINTENANCE)) addTag("uninhabited");
			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_EMPTY)) addTag("uninhabited");

			if (levelData.habitability > 0) addTag("inhabited");
			if (levelData.habitability <= 0) addTag("uninhabited");

			if (sectorStyleMatches(SectorConstants.STYLE_CITTADINIAN)) addTags([ "arid", "warm" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_HUMANIST)) addTags([ "arid" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_INDUSTRIAL)) addTags([ "cool", "closed" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_KARBOQUE)) addTags([ "arid", "warm", "closed" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_KIEVAN)) addTags([ "cool" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_MODERN)) addTags([ "cool", "open" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_NEOWESTERN)) addTags([ "humid", "warm", "open" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_SLUM_GENERAL)) addTags([ "humid", "closed" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_SLUM_HUN)) addTags([ "humid", "closed" ]);
			if (sectorStyleMatches(SectorConstants.STYLE_WESTERN)) addTags([ "warm" ]);

			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_RESIDENTIAL)) addTags([ "residential" ]);
			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_INDUSTRIAL)) addTags([ "industrial", "closed" ]);
			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_MAINTENANCE)) addTags([ "maintenance", "closed" ]);
			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_COMMERCIAL)) addTags([ "commercial" ]);
			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_PUBLIC)) addTags([ "public", "open" ]);
			if (sectorTypeMatches(SectorConstants.SECTOR_TYPE_EMPTY)) addTags([ "empty", "open" ]);

			if (sectorData.wear > 5 || districtData.wear > 5) addTag("worn");
			if (sectorData.wear < 5 || districtData.wear < 5) addTag("new");
			if (sectorData.damage > 0 || districtData.damage > 0) addTag("damaged");

			if (sectorData.wear > 5 || sectorData.wear > 5 || sectorTypeMatches(SectorConstants.SECTOR_TYPE_PUBLIC) || sectorTypeMatches(SectorConstants.SECTOR_TYPE_RESIDENTIAL) || sectorData.sunlit) 
				addTag("nature");

			if (!isPollutedLevel && !isRadiatedLevel && hasWater) addTag("water");

			if (condition == SectorConstants.SECTOR_CONDITION_RUINED) addTag("ruined");
			if (condition == SectorConstants.SECTOR_CONDITION_DAMAGED) addTag("damaged");
			if (condition == SectorConstants.SECTOR_CONDITION_ABANDONED) addTag("abandoned");
			if (condition == SectorConstants.SECTOR_CONDITION_WORN) addTag("worn");
			if (condition == SectorConstants.SECTOR_CONDITION_RECENT) addTag("recent");
			if (condition == SectorConstants.SECTOR_CONDITION_MAINTAINED) addTag("maintained");

			if (tags.indexOf("arid") < 0) addTag("noarid");
			if (tags.indexOf("humid") < 0) addTag("nohumid");
			if (tags.indexOf("warm") < 0) addTag("nowarm");
			if (tags.indexOf("closed") < 0) addTag("noclosed");
			if (tags.indexOf("open") < 0) addTag("noopen");

			return tags;
		},
		
	};
	
	return SectorConstants;
});
