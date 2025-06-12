define([
	'game/constants/ColorConstants',
	'game/constants/MovementConstants',
	'game/constants/SectorConstants'
], function (
	ColorConstants, MovementConstants, SectorConstants
) {
	
	let MapElements = {
		
		icons: [],
		
		initIcon: function(key, name) {
			this.icons[key] = new Image();
			this.icons[key].src = "img/map/" + name + ".png";
			this.icons[key + "-sunlit"] = new Image();
			this.icons[key + "-sunlit"].src = "img/map/" + name + "-sunlit.png";
		},

		drawMovementBlocker: function (ctx, sunlit, sectorSize, x, y, blockerType, isBlocked) {
			if (blockerType === MovementConstants.BLOCKER_TYPE_GANG) {
				if (isBlocked) {
					ctx.strokeStyle = ColorConstants.getColor(sunlit, "map_stroke_gang");
					ctx.lineWidth = Math.ceil(sectorSize / 9);
					ctx.beginPath();
					ctx.arc(x, y, sectorSize * 0.2, 0, 2 * Math.PI);
					ctx.stroke();
				}
			} else if (blockerType === MovementConstants.BLOCKER_TYPE_TOLL_GATE) {
				let squareSize = Math.max(sectorSize / 5, 4);
				ctx.strokeStyle = isBlocked ? ColorConstants.getColor(sunlit, "map_stroke_blocker") : ColorConstants.getColor(sunlit, "map_fill_sector_unscouted");
				ctx.lineWidth = 2;
				ctx.strokeRect(x - squareSize / 2, y - squareSize / 2, squareSize, squareSize);
			} else {
				let crossSize = Math.max(sectorSize / 5, 3);
				ctx.strokeStyle = isBlocked ? ColorConstants.getColor(sunlit, "map_stroke_blocker") : ColorConstants.getColor(sunlit, "map_fill_sector_unscouted");
				ctx.lineWidth = Math.ceil(sectorSize / 9);
				ctx.beginPath();
				ctx.moveTo(x - crossSize, y - crossSize);
				ctx.lineTo(x + crossSize, y + crossSize);
				ctx.moveTo(x + crossSize, y - crossSize);
				ctx.lineTo(x - crossSize, y + crossSize);
				ctx.stroke();
			}
		}
		
	};
	
	MapElements.initIcon("camp", "map-camp");
	MapElements.initIcon("campable", "map-campable");
	MapElements.initIcon("passage-up", "map-passage-up");
	MapElements.initIcon("passage-up-disabled", "map-passage-up-disabled");
	MapElements.initIcon("passage-down", "map-passage-down");
	MapElements.initIcon("interest", "map-interest");
	MapElements.initIcon("unknown", "map-unvisited");
	MapElements.initIcon("workshop", "map-workshop");
	MapElements.initIcon("water", "map-water");
	MapElements.initIcon("beacon", "map-beacon");
	MapElements.initIcon("ingredient", "map-ingredient");
	MapElements.initIcon("investigate", "map-investigate");
	MapElements.initIcon("graffiti", "map-graffiti");

	return MapElements;
});
