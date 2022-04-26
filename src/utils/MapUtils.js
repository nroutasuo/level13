define(function () {
	
	var MapUtils = {
		
		MAP_ZOOM_DEFAULT: "default",
		MAP_ZOOM_MINIMAP: "mini",

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
