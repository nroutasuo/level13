define(function () {
	
	var MapUtils = {
		
		MAP_ZOOM_DEFAULT: "default",
		MAP_ZOOM_MINIMAP: "mini",
		
		MAP_MODE_BASIC: "basic",
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
		
	};

	return MapUtils;
});
