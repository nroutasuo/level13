define([
	'utils/MapUtils',
	'game/constants/ColorConstants',
	'game/constants/MovementConstants',
	'game/constants/SectorConstants'
], function (
	MapUtils, ColorConstants, MovementConstants, SectorConstants
) {
	
	let MapElements = {
		
		icons: [],

		initIcons: function () {
			this.initIcon("camp", "map-camp");
			this.initIcon("campable", "map-campable");
			this.initIcon("passage-up", "map-passage-up");
			this.initIcon("passage-up-disabled", "map-passage-up-disabled");
			this.initIcon("passage-down", "map-passage-down");
			this.initIcon("interest", "map-interest");
			this.initIcon("unknown", "map-unvisited");
			this.initIcon("workshop", "map-workshop");
			this.initIcon("water", "map-water");
			this.initIcon("beacon", "map-beacon");
			this.initIcon("ingredient", "map-ingredient");
			this.initIcon("investigate", "map-investigate");
			this.initIcon("graffiti", "map-graffiti");
		},
		
		initIcon: function(key, name) {
			this.icons[key] = new Image();
			this.icons[key].src = location.origin + "/img/map/" + name + ".png";
			this.icons[key + "-sunlit"] = new Image();
			this.icons[key + "-sunlit"].src = location.origin + "/img/map/" + name + "-sunlit.png";
		},

		drawSectorShape: function (ctx, sectorXpx, sectorYpx, sectorSize, size, color, isKeySector) {
			ctx.fillStyle = color;
			
			let centerX = sectorXpx + sectorSize / 2;
			let centerY = sectorYpx + sectorSize / 2;
				
			if (isKeySector) {
				let r = size / 2 + 1;
				ctx.beginPath();
				ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
				ctx.fill();
			} else {
				let sizeOffset = size - sectorSize;
				let p = sizeOffset / 2;
				ctx.fillRect(sectorXpx - p, sectorYpx - p, size, size);
			}
		},

		drawSectorBorder: function (ctx, sectorXpx, sectorYpx, sectorSize, color, isHigh, isPartial, isKeySector) {
			ctx.fillStyle = color;

			let isBigSectorSize = sectorSize >= MapUtils.getSectorSize(MapUtils.MAP_ZOOM_MINIMAP);
			let p = isBigSectorSize ? (isHigh ? 4 : 2) : (isHigh ? 2 : 1);

			if (isPartial) {
				ctx.fillRect(sectorXpx  + sectorSize / 2, sectorYpx - p, sectorSize / 2 + p, sectorSize / 2 + p);
				ctx.fillRect(sectorXpx - p, sectorYpx + sectorSize / 2, sectorSize / 2 + p, sectorSize / 2 + p);
			} else {
				MapElements.drawSectorShape(ctx, sectorXpx, sectorYpx, sectorSize, sectorSize + p * 2, color, isKeySector);
			}
		},

		drawSectorIcon: function (ctx, sectorXpx, sectorYpx, sectorSize, features, options) {
			let useSunlitIcon = options.useSunlitIcon;
			let showPOIs = options.showPOIs;

			let disabledAlpha = 0.4;
			let iconSize = 10;

			let isBigSectorSize = sectorSize >= MapUtils.getSectorSize(MapUtils.MAP_ZOOM_MINIMAP);
			
			let iconPosX = Math.round(sectorXpx + (sectorSize - iconSize) / 2);
			let iconPosYCentered = Math.round(sectorYpx + sectorSize / 2 - iconSize / 2);
			let iconPosY = Math.round(isBigSectorSize ? sectorYpx : iconPosYCentered);

			if (showPOIs && features.isInvestigatable) {
				ctx.drawImage(this.icons["investigate" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosYCentered);
				return true;
			} else if (showPOIs && features.hasClearableWorkshop) {
				ctx.drawImage(this.icons["workshop" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && features.hasGreenhouse) {
				ctx.drawImage(this.icons["workshop" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && features.hasCampOnSector) {
				ctx.drawImage(this.icons["camp" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && !features.hasCampOnLevel && features.canHaveCampOnSector) {
				ctx.drawImage(this.icons["campable" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && (features.hasUnscoutedLocales || features.hasUnexaminedSpots)) {
				ctx.drawImage(this.icons["interest" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && options.showStashes && features.hasStashOnSector) {
				ctx.drawImage(this.icons["interest" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && features.hasPassageUp) {
				if (features.isPassageTypeAvailable) {
					ctx.drawImage(this.icons["passage-up" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				} else {
					ctx.drawImage(this.icons["passage-up-disabled" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				}
				return true;
			} else if (showPOIs && features.hasPassageDown) {
				if (!features.isPassageTypeAvailable) {
					ctx.globalAlpha = disabledAlpha;
				}
				ctx.drawImage(this.icons["passage-down" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				ctx.globalAlpha = 1;
				return true;
			} else if (showPOIs && features.hasBeacon) {
				ctx.drawImage(this.icons["beacon" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (options.showIngredientIcons && features.hasIngredients) {
				if (features.hasKnownIngredients) {
					ctx.globalAlpha = disabledAlpha;
				}
				ctx.drawImage(this.icons["ingredient" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				ctx.globalAlpha = 1;
				return true;
			} else if (features.isRevealed && features.hasGraffiti) {
				ctx.drawImage(this.icons["graffiti" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (!features.isRevealed && !features.isPartiallyRevealed && !options.hideUnknownIcon) {
				ctx.drawImage(this.icons["unknown" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosYCentered);
				return true;
			}
			
			return false;
		},

		drawMovementLine: function (ctx, sectorMiddleX, sectorMiddleY, sectorSize, distX, distY, sectorPadding) {
			ctx.beginPath();
			ctx.moveTo(sectorMiddleX + 0.5 * sectorSize * distX, sectorMiddleY + 0.5 * sectorSize * distY);
			ctx.lineTo(sectorMiddleX + (0.5 + sectorPadding) * sectorSize * distX, sectorMiddleY + (0.5 + sectorPadding) * sectorSize * distY);
			ctx.stroke();
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
		},

		getOverlaySectorDiv: function (sectorPos, sectorXpx, sectorYpx) {
			let data = "data-level='" + sectorPos.level + "' data-x='" + sectorPos.sectorX + "' data-y='" + sectorPos.sectorY + "'";
			let $div = $("<div class='canvas-overlay-cell map-overlay-cell' style='top: " + sectorYpx + "px; left: " + sectorXpx + "px' " + data +"></div>");
			return $div;
		},

		selectCell: function ($element) {
			$element.toggleClass("selected", true);
		},

		deselectAllCells: function () {
			$.each($(".map-overlay-cell"), function () {
				$(this).toggleClass("selected", false);
			});
		},
		
	};

	MapElements.initIcons();

	return MapElements;
});
