define(function () {
	
	var MapUtils = {
		
		MAP_ZOOM_DEFAULT: "default",
		MAP_ZOOM_MINIMAP: "mini",
		
		MAP_MODE_DEFAULT: "basic",
		MAP_MODE_HAZARDS: "hazards",
		MAP_MODE_SCAVENGING: "scavenging",
		MAP_MODE_STATUS: "status",

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

		getGridSize: function () {
			return 10;
		},
		
		showResourcesInMapMode: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_HAZARDS: return false;
				case MapUtils.MAP_MODE_STATUS: return false;
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
