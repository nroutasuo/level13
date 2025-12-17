define(['game/constants/ColorConstants', 'game/constants/SectorConstants'], function (ColorConstants, SectorConstants) {
	
	let MapUtils = {
		
		MAP_ZOOM_DEFAULT: "default",
		MAP_ZOOM_MINIMAP: "mini",
		
		MAP_MODE_DEFAULT: "basic",
		MAP_MODE_HAZARDS: "hazards",
		MAP_MODE_SCAVENGING: "scavenging",

		getSectorSize: function (zoomLevel) {
			zoomLevel = zoomLevel || this.MAP_ZOOM_DEFAULT;
			if (zoomLevel == this.MAP_ZOOM_MINIMAP) return 16;
			return 11;
		},

		getSectorPadding: function (zoomLevel) {
			zoomLevel = zoomLevel || this.MAP_ZOOM_DEFAULT;
			if (zoomLevel == this.MAP_ZOOM_MINIMAP) return 0.75;
			return 0.85;
		},
		
		getSectorMargin: function (zoomLevel) {
			zoomLevel = zoomLevel || this.MAP_ZOOM_DEFAULT;
			if (zoomLevel == this.MAP_ZOOM_MINIMAP) return 0;
			return 2;
		},
		
		getMovementLineWidth: function (zoomLevel) {
			let sectorSize = this.getSectorSize(zoomLevel);
			return Math.ceil(sectorSize / 5);
		},

		getGridSize: function () {
			return 10;
		},

		getResourceFill: function (resourceName) {
			switch (resourceName) {
				case resourceNames.metal: return ColorConstants.getGlobalColor("res_metal");
				case resourceNames.water: return ColorConstants.getGlobalColor("res_water");
				case resourceNames.food: return ColorConstants.getGlobalColor("res_food");
				case resourceNames.fuel: return ColorConstants.getGlobalColor("res_fuel");
				case resourceNames.rubber: return ColorConstants.getGlobalColor("res_rubber");
				case resourceNames.rope: return ColorConstants.getGlobalColor("res_rope");
			}
			log.w("no fill color defined for resource: " + resourceName);
			return ColorConstants.getGlobalColor("res_metal");
		},
		
		getDefaultSectorFill: function (sectorStatus, sunlit) {
			switch (sectorStatus) {
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED:
				case SectorConstants.MAP_SECTOR_STATUS_REVEALED_BY_MAP:
					return ColorConstants.getColor(sunlit, "map_fill_sector_unscouted");

				case SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED:
					return ColorConstants.getColor(sunlit, "map_fill_sector_scouted");

				case SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED:
					return ColorConstants.getColor(sunlit, "map_fill_sector_cleared");
			}
			
			return ColorConstants.getColor(sunlit, "map_fill_sector_unvisited");
		},

		getSectorHazardBorderColor: function (mainHazard, sunlit) {
			if (mainHazard == "cold") {
				return ColorConstants.getColor(sunlit, "map_stroke_sector_cold");
			} else if (mainHazard == "debris") {
				return ColorConstants.getColor(sunlit, "map_stroke_sector_debris");
			} else if (mainHazard == "radiation") {
				return ColorConstants.getColor(sunlit, "map_stroke_sector_radiation");
			} else if (mainHazard == "poison") {
				return ColorConstants.getColor(sunlit, "map_stroke_sector_poison");
			} else if (mainHazard == "flooded") {
				return ColorConstants.getColor(sunlit, "map_stroke_sector_flooded");
			} else if (mainHazard == "territory") {
				return ColorConstants.getColor(sunlit, "map_stroke_sector_territory");
			} else {
				return ColorConstants.getColor(sunlit, "map_stroke_sector_hazard");
			}
		},
		
		showResourcesInMapMode: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_HAZARDS: return false;
				default: return true;
			}
		},
		
		showPOIsInMapMode: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_HAZARDS: return false;
				case MapUtils.MAP_MODE_SCAVENGING: return false;
				default: return true;
			}
		},
		
		showClearedBlockersInMapMode: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_HAZARDS: return false;
				case MapUtils.MAP_MODE_SCAVENGING: return false;
				default: return true;
			}
		},
		
		showSectorStatusInMapMode: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_HAZARDS: return false;
				case MapUtils.MAP_MODE_SCAVENGING: return false;
				default: return true;
			}
		},
		
		showSunlightInMapMode: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_SCAVENGING: return false;
				default: return true;
			}
		},
		
		showHazardsInMapMode: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_SCAVENGING: return false;
				default: return true;
			}
		},
		
	};

	return MapUtils;
});
