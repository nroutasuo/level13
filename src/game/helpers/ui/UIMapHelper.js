// Creates and updates maps (mini-map and main)
define(['ash',
	'utils/CanvasUtils',
	'utils/MapElements',
	'utils/MapUtils',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/constants/ColorConstants',
	'game/constants/UIConstants',
	'game/constants/CanvasConstants',
	'game/constants/ExplorationConstants',
	'game/constants/ItemConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/WorldConstants',
	'game/nodes/PlayerPositionNode',
	'game/components/type/LevelComponent',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/player/ItemsComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/type/SectorComponent',
	'game/vos/PositionVO'],
function (Ash, CanvasUtils, MapElements, MapUtils, MathUtils,
	GameGlobals, ColorConstants, UIConstants, CanvasConstants, ExplorationConstants, ItemConstants, MovementConstants, PositionConstants, SectorConstants, WorldConstants,
	PlayerPositionNode,
	LevelComponent, CampComponent, PositionComponent, ItemsComponent,
	SectorStatusComponent, SectorLocalesComponent, SectorFeaturesComponent, PassagesComponent, SectorImprovementsComponent, WorkshopComponent, SectorComponent,
	PositionVO) {

	var UIMapHelper = Ash.Class.extend({

		playerPosNodes: null,

		icons: [],

		isMapRevealed: false,

		constructor: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.isMapRevealed = false;
			this.icons = MapElements.icons;
		},

		enableScrollingForMap: function (canvasId) {
			CanvasConstants.makeCanvasScrollable(canvasId);
			CanvasConstants.updateScrollEnable(canvasId);
		},

		disableScrollingForMap: function (canvasId) {
			// TODO check if this works
			$("#" + canvasId).off("mousedown", this.onScrollableMapMouseDown);
			$("#" + canvasId).off("mouseup", this.onScrollableMapMouseUp);
			$("#" + canvasId).off("mouseleave", this.onScrollableMapMouseLeave);
			$("#" + canvasId).off("mousemove", this.onScrollableMapMouseMove);
			$("#" + canvasId).removeClass("scrollable");
			$("#" + canvasId).parent().unwrap();
		},

		centerMapToPosition: function (canvasId, mapPosition, centered, animate) {
			let sectorSize = this.getSectorSize(false);
			let dimensions = this.getMapSectorDimensions(canvasId, -1, false, mapPosition);
			
			let positionPixels = this.getSectorPixelPosCenter(dimensions, centered, sectorSize, mapPosition.sectorX, mapPosition.sectorY);
			let playerPosX = positionPixels.x;
			let playerPosY = positionPixels.y;
			
			let $scrollContainer = $("#" + canvasId).parent();
			let scrollPosition = {
				x: playerPosX - $scrollContainer.width() * 0.5,
				y: playerPosY - $scrollContainer.height() * 0.5,
			};
			let finalPosition = CanvasConstants.getScrollSnapPosition(scrollPosition);
			
			if (animate) {
				let duration = 300;
				$scrollContainer.animate({
					scrollLeft: finalPosition.x,
					scrollTop: finalPosition.y,
				}, duration, () => {
					CanvasConstants.updateScrollIndicators(canvasId);
				});
			} else {
				$scrollContainer.scrollLeft(finalPosition.x);
				$scrollContainer.scrollTop(finalPosition.y);
				CanvasConstants.snapScrollPositionToGrid(canvasId);
				CanvasConstants.updateScrollIndicators(canvasId);
			}
		},

		rebuildMap: function (canvasId, overlayId, mapPosition, mapSize, centered, mapMode, sectorSelectedCallback) {
			let map = {};
			map.canvasID = canvasId;
			
			let options = {};
			options.mapSize = mapSize;
			options.mapPosition = mapPosition;
			options.centered = centered;
			options.zoomLevel = centered ? MapUtils.MAP_ZOOM_MINIMAP : MapUtils.MAP_ZOOM_DEFAULT;
			options.mapMode = mapMode;
			
			let canvases = $("#" + canvasId);
			let canvas = canvases[0];
			let ctx = CanvasUtils.getCTX(canvases);

			let visibleSectors = {};
			let allSectors = {};
			let mapDimensions = this.getMapSectorDimensions(canvasId, mapSize, centered, mapPosition, visibleSectors, allSectors);
				
			if (ctx) {
				this.rebuildMapWithCanvas(canvas, ctx, options, visibleSectors, allSectors, mapDimensions);
			}

			if (overlayId) {
				this.rebuildOverlay(map, overlayId, options, visibleSectors, mapDimensions, sectorSelectedCallback);
			}
			
			return map;
		},
		
		setSelectedSector: function (map, sector) {
			var sectorPos = sector == null ? null : sector.get(PositionComponent).getPosition();
			$.each($(".map-overlay-cell"), function () {
				var level = $(this).attr("data-level");
				var x = $(this).attr("data-x");
				var y = $(this).attr("data-y");
				var isMatch = sectorPos && sectorPos.level == level && sectorPos.sectorX == x && sectorPos.sectorY == y;
				if (isMatch == null) isMatch = false;
				$(this).toggleClass("selected", isMatch);
			});
		},
		
		getASCII: function (mapMode, mapPosition) {
			let result = "";
			
			let level = mapPosition.level;
			let levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent);
			
			result += "\n";
			
			for (var y = levelComponent.minY - 1; y <= levelComponent.maxY + 1; y++) {
				let levelResult = "";
				for (var x = levelComponent.minX - 1; x <= levelComponent.maxX + 1; x++) {
					let sector = GameGlobals.levelHelper.getSectorByPosition(mapPosition.level, x, y);
					
					levelResult += this.getSectorASCII(mapMode, sector);
				}
				if (levelResult.trim().length > 0) {
					levelResult += "\n";
					result += levelResult;
				}
			}
			
			return result;
		},
		
		getSectorASCII: function (mapMode, sector) {
			if (sector == null) return " ";
			
			let sectorStatus = SectorConstants.getSectorStatus(sector);
			
			if (sectorStatus == null) return " ";
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE) return " ";
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE) return "?";
			
			if (mapMode == MapUtils.MAP_MODE_HAZARDS) {
				if (this.hasHazard(sector)) {
					if (this.isAffectedByHazard(sector)) {
						return "H";
					} else {
						return "h";
					}
				}
				return "x";
			}
			
			if (mapMode == MapUtils.MAP_MODE_SCAVENGING) {
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.water)) {
					return "W";
				}
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.food)) {
					return "F";
				}
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.metal, WorldConstants.resourcePrevalence.COMMON)) {
					return "M";
				}
				if (GameGlobals.sectorHelper.hasSectorVisibleIngredients(sector)) {
					return "I";
				}
				return "x";
			}
			
			if (sector.has(CampComponent)) return "C";
			
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED) return "0";
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_REVEALED_BY_MAP) return "0";
			
			var sectorPassages = sector.get(PassagesComponent);
			if (sectorPassages.passageUp) return "U";
			if (sectorPassages.passageDown) return "D";
			
			let statusComponent = sector.get(SectorStatusComponent);
			let localesComponent = sector.get(SectorLocalesComponent);
			let numUnscoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
			
			if (numUnscoutedLocales > 0) return "!";
			
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED) return "0";
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED) return "X";
					
			return "?";
		},
		
		getASCIILegend: function (mapMode) {
			switch (mapMode) {
				case MapUtils.MAP_MODE_DEFAULT:
					return "? = unvisited, 0 = visited, X = cleared, C = camp, U = passage up, D = passage down, ! = point of interest";
				case MapUtils.MAP_MODE_HAZARDS:
					return "? = unvisited, x = default, H = hazard (high), h = hazard (low)";
				case MapUtils.MAP_MODE_SCAVENGING:
					return "? = unvisited, x = default, I = crafting ingredients, W = water, F = food, M = metal";
				default:
					log.w("no ASCII map legend defined for map mode: " + mapMode);
					return "";
			}
		},

		rebuildMapWithCanvas: function (canvas, ctx, options, visibleSectors, allSectors, dimensions) {
			let sectorSize = this.getSectorSize(options.centered);
			let sunlit = $("body").hasClass("sunlit");
			let level = options.mapPosition.level;
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			
			// background color
			let colorBgMap = this.getBackgroundColor(level, sunlit);
			ctx.canvas.width = dimensions.canvasWidth;
			ctx.canvas.height = dimensions.canvasHeight;
			ctx.clearRect(0, 0, canvas.scrollWidth, canvas.scrollWidth);
			ctx.fillStyle = colorBgMap;
			ctx.fillRect(0, 0, canvas.scrollWidth, canvas.scrollHeight);

			var sector;
			var sectorXpx;
			var sectorYpx;
			var sectorPos;
			var sectorPadding = this.getSectorPadding(options.centered);
			
			this.drawGridOnCanvas(ctx, sectorSize, dimensions, options.centered);
			// this.drawVisibleAreaOnCanvas(ctx, mapPosition, centered, dimensions, visibleSectors, sunlit, true);
			this.drawDistrictsOnCanvas(ctx, options.mapPosition, options.centered, dimensions, visibleSectors, allSectors, sunlit);
			
			// borders on beacons
			ctx.strokeStyle = ColorConstants.getColor(sunlit, "map_stroke_sector_lit");
			ctx.lineWidth = options.centered ? 4 : 2;
			let beaconSectors = GameGlobals.levelHelper.getAllSectorsWithImprovement(level, improvementNames.beacon);
			for (let i = 0; i < beaconSectors.length; i++) {
				sector = beaconSectors[i];
				let sectorStatus = SectorConstants.getSectorStatus(sector);
				sectorPos = sector.get(PositionComponent);
				if (this.showSectorOnMap(options.centered, sector, sectorStatus)) {
					sectorXpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, sectorPos.sectorX, sectorPos.sectorY).x;
					sectorYpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, sectorPos.sectorX, sectorPos.sectorY).y;
					ctx.beginPath();
					ctx.arc(sectorXpx + sectorSize * 0.5, sectorYpx + 0.5 * sectorSize, sectorSize * (ExplorationConstants.BEACON_RADIUS - 1) * 2, 0, 2 * Math.PI);
					ctx.stroke();
				}
			}

			// sectors connecting paths
			this.foreachVisibleSector(level, options.centered, dimensions, visibleSectors, (sector, sectorPos, sectorStatus, sectorXpx, sectorYpx) => {
				if (SectorConstants.isLBasicInfoVisible(sectorStatus)) {
					this.drawMovementLinesOnCanvas(ctx, options, sector, sectorPos, sectorXpx, sectorYpx, sectorSize, sectorPadding);
				}
			});

			// sectors
			this.foreachVisibleSector(level, options.centered, dimensions, visibleSectors, (sector, sectorPos, sectorStatus, sectorXpx, sectorYpx) => {
				this.drawSectorOnCanvas(ctx, options, sectorPos.x, sectorPos.y, sector, levelEntity, sectorStatus, sectorXpx, sectorYpx, sectorSize);
			});

			// border on current
			var playerPosVO = this.playerPosNodes.head.position.getPosition();
			if (playerPosVO.level == level) {
				sectorXpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, playerPosVO.sectorX, playerPosVO.sectorY).x;
				sectorYpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, playerPosVO.sectorX, playerPosVO.sectorY).y;
				ctx.strokeStyle = ColorConstants.getColor(sunlit, "border_highlight");
				ctx.lineWidth = options.centered ? 3 : 2;
				ctx.beginPath();
				ctx.arc(sectorXpx + sectorSize * 0.5, sectorYpx + 0.5 * sectorSize, sectorSize, 0, 2 * Math.PI);
				ctx.stroke();
			}

			CanvasConstants.updateScrollEnable($(canvas).attr("id"));
		},

		rebuildOverlay: function (map, overlayId, options, visibleSectors, dimensions, sectorSelectedCallback) {
			var $overlay = $("#" + overlayId);
			$overlay.empty();
			$overlay.css("width", dimensions.canvasWidth + "px");
			$overlay.css("height", dimensions.canvasHeight + "px");
			
			map.overlay = {};

			let sectorSize = this.getSectorSize(options.centered);
			let level = options.mapPosition.level;

			for (var y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
				for (var x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
					let sector = visibleSectors[x + "." + y];
					let sectorStatus = SectorConstants.getSectorStatus(sector);
					if (this.showSectorOnMap(options.centered, sector, sectorStatus)) {
						let sectorXpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, x, y).x;
						let sectorYpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, x, y).y;
						let sectorPos = new PositionVO(level, x, y);
						var data = "data-level='" + sectorPos.level + "' data-x='" + sectorPos.sectorX + "' data-y='" + sectorPos.sectorY + "'";
						var $div = $("<div class='canvas-overlay-cell map-overlay-cell' style='top: " + sectorYpx + "px; left: " + sectorXpx + "px' " + data +"></div>");
						if (sectorSelectedCallback) {
							$div.click(function (e) {
								$.each($(".map-overlay-cell"), function () {
									$(this).toggleClass("selected", false);
								});
								var $target = $(e.target);
								var level = $target.attr("data-level");
								var x = $target.attr("data-x");
								var y = $target.attr("data-y");
								$target.toggleClass("selected", true);
								sectorSelectedCallback(level, x, y);
							});
						}
						$overlay.append($div);
					}
				}
			}
		},

		rebuildMapHints: function (canvasId, mapCanvasId, mapPosition) {
			let canvases = $("#" + canvasId);
			let canvas = canvases[0];
			let ctx = CanvasUtils.getCTX(canvases);
			
			let mapSize = UIConstants.MAP_MINIMAP_SIZE;
			let visibleSectors = {};
			let allSectors = {};
			
			let dimensions = this.getMapSectorDimensions(mapCanvasId, mapSize, true, mapPosition, visibleSectors, allSectors);
			
			let mapHints = this.getMaphints(mapPosition);
			
			ctx.clearRect(0, 0, canvas.scrollWidth, canvas.scrollWidth);
			
			for (let i = 0; i < mapHints.length; i++) {
				this.drawMapHint(ctx, mapPosition, mapHints[i], dimensions);
			}
		},
		
		getMaphints: function (mapPosition) {
			let result = [];
			
			let isLocationSunlit = $("body").hasClass("sunlit");
			let useSunlitIcon = isLocationSunlit;
			
			let levelCamp = GameGlobals.levelHelper.getCampSectorOnLevel(mapPosition.level);
			if (levelCamp != null) {
				let campIcon = this.icons["camp" + (useSunlitIcon ? "-sunlit" : "")];
				result.push({ id: "camp", icon: campIcon, position: levelCamp.get(PositionComponent) });
			}
			
			let passageUp = GameGlobals.levelHelper.findPassageUp(mapPosition.level);
			if (passageUp != null && passageUp.get(SectorStatusComponent).scouted) {
				let passageUpIcon = this.icons["passage-up" + (useSunlitIcon ? "-sunlit" : "")];
				result.push({ id: "passage-up", icon: passageUpIcon, position: passageUp.get(PositionComponent) });
			}
			
			let passageDown = GameGlobals.levelHelper.findPassageDown(mapPosition.level);
			if (passageDown != null && passageDown.get(SectorStatusComponent).scouted) {
				let passageDownIcon = this.icons["passage-down" + (useSunlitIcon ? "-sunlit" : "")];
				result.push({ id: "passage-up", icon: passageDownIcon, position: passageDown.get(PositionComponent) });
			}
			
			let nearestWaterSector = GameGlobals.levelHelper.findNearestKnownWaterSector(mapPosition);
			if (nearestWaterSector != null) {
				result.push({ id: "water", color: this.getResourceFill(resourceNames.water), position: nearestWaterSector.get(PositionComponent) });
			}
			
			let nearestFoodSector = GameGlobals.levelHelper.findNearestKnownFoodSector(mapPosition);
			if (nearestFoodSector != null) {
				result.push({ id: "food", color: this.getResourceFill(resourceNames.food), position: nearestFoodSector.get(PositionComponent) });
			}
			
			return result;
		},
		
		drawMapHint: function (ctx, mapPosition, mapHint, dimensions) {
			let sunlit = $("body").hasClass("sunlit");
			let sectorSize = this.getSectorSize(true);
			
			let xDist = Math.abs(mapHint.position.sectorX - mapPosition.sectorX);
			let yDist = Math.abs(mapHint.position.sectorY - mapPosition.sectorY);
			
			if (xDist <= 3 && yDist <= 3) return;
			
			// TODO hard-coded numbers
			let frameSize = 12;
			
			// choose egde the hint should appear on
			let edge = this.getMapHintEdge(mapPosition, mapHint, frameSize);
			
			if (!edge) {
				log.w("could not determine map hint edge " + mapHint.id + " " + mapHint.position);
				return;
			}
			
			// pixel pos on the real map
			let center = this.getSectorPixelPosCenter(dimensions, true, sectorSize, mapPosition.sectorX, mapPosition.sectorY);
			let pixelPos = this.getSectorPixelPosCenter(dimensions, true, sectorSize, mapHint.position.sectorX, mapHint.position.sectorY);
			
			// offset due to the two canvases being positioned differently
			pixelPos.x = pixelPos.x + frameSize;
			pixelPos.y = pixelPos.y + frameSize;
			
			// find position on edge - intersection of edge and line connecting map center to target
			let blibPos = MathUtils.lineIntersection(center.x, center.y, pixelPos.x, pixelPos.y, edge.p1.x, edge.p1.y, edge.p2.x, edge.p2.y);
			let iconSize = 10;
			let icon = mapHint.icon;
			
			if (icon) {
				let p = 1;
				let blibSize = iconSize + p * 2;
				let blibColor = ColorConstants.getColor(sunlit, "map_fill_sector_scouted");
				CanvasUtils.drawCircle(ctx, blibColor, blibPos.x, blibPos.y, blibSize / 2);
				ctx.drawImage(icon, Math.round(blibPos.x - iconSize / 2), Math.round(blibPos.y - iconSize / 2));
			} else {
				CanvasUtils.drawCircle(ctx, mapHint.color, blibPos.x, blibPos.y, (iconSize - 2) / 2);
			}
		},
		
		getMapHintEdge: function (mapPosition, mapHint, frameSize) {
			let xDist = Math.abs(mapHint.position.sectorX - mapPosition.sectorX);
			let yDist = Math.abs(mapHint.position.sectorY - mapPosition.sectorY);
			
			let min = frameSize / 2;
			let max = 224 - frameSize / 2;
			
			if (mapHint.position.sectorX < mapPosition.sectorX && xDist >= yDist)
				// - left side
				return { p1: { x: min, y: min }, p2: { x: min, y: max } };
			if (mapHint.position.sectorX > mapPosition.sectorX && xDist >= yDist) {
				// - right side
				return { p1: { x: max, y: min }, p2: { x: max, y: max } };
			} else if (mapHint.position.sectorY < mapPosition.sectorY && yDist > xDist) {
				// - top
				return { p1: { x: min, y: min }, p2: { x: max, y: min } };
			} else if (mapHint.position.sectorY > mapPosition.sectorY && yDist > xDist) {
				// bottom
				return { p1: { x: min, y: 233 }, p2: { x: max, y: max } };
			}
			
			return null;
		},

		getSectorPixelPos: function (dimensions, centered, sectorSize, x, y) {
			let smallMapOffsetX = Math.max(0, (dimensions.canvasWidth - dimensions.mapWidth) / 2);
			let paddingFactor = this.getSectorPadding(centered);
			let marginFactor = this.getSectorMargin(centered);
			let padding = sectorSize * paddingFactor;
			let margin = sectorSize * marginFactor;
			
			let rawX = margin + padding/2 + (x - dimensions.minVisibleX) * sectorSize * (1 + paddingFactor) + smallMapOffsetX;
			let rawY = margin + padding/2 + (y - dimensions.minVisibleY) * sectorSize * (1 + paddingFactor);
			
			return {
				x: Math.round(Math.round(rawX) * 2)/2,
				y: Math.round(Math.round(rawY) * 2)/2,
			};
		},
		
		getSectorPixelPosCenter: function (dimensions, centered, sectorSize, x, y) {
			let cornerPos = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y);
			return {
				x: cornerPos.x + sectorSize / 2,
				y: cornerPos.y + sectorSize / 2
			};
		},

		drawVisibleAreaOnCanvas: function (ctx, mapPosition, centered, dimensions, visibleSectors, sunlit, stroke) {
			let sectorSize = this.getSectorSize(centered);
			let level = mapPosition.level;
			let colorBgMap = this.getBackgroundColor(level, sunlit);
			
			let colorBorderVisibleArea = this.getVisibleAreaBackgroundColor(level, sunlit);
			let radiusDefault = 2;
			let radiusSmall = 0.75;
			let paddingDefault = 2.3;
			let paddingSmall = 0.4;
			
			ctx.lineWidth = 2;
			
			this.foreachVisibleSector(level, centered, dimensions, visibleSectors, (sector, sectorPos, sectorStatus, sectorXpx, sectorYpx) => {
				let bgPadding = sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE ? sectorSize * paddingSmall : sectorSize * paddingDefault;
				let radius = sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE ? sectorSize * radiusSmall : sectorSize * radiusDefault;
				ctx.fillStyle = colorBorderVisibleArea;
				ctx.strokeStyle = colorBorderVisibleArea;
				let fillX = Mathr.sectorXpx - bgPadding;
				let fillY = sectorYpx - bgPadding;
				let fillSize = sectorSize + bgPadding * 2;
				CanvasUtils.fillRoundedRect(ctx, fillX, fillY, fillSize, fillSize, radius);
			});
			
			if (stroke) {
				let borderSize = 3;
				this.foreachVisibleSector(level, centered, dimensions, visibleSectors, (sector, sectorPos, sectorStatus, sectorXpx, sectorYpx) => {
					let bgPadding = sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE ? sectorSize * paddingSmall : sectorSize * paddingDefault;
					let radius = sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE ? sectorSize * radiusSmall : sectorSize * radiusDefault;
					let sectorFeatures = sector.get(SectorFeaturesComponent);
					ctx.fillStyle = sectorFeatures.isEarlyZone() ? colorBgMap : "#252525";
					ctx.strokeStyle = sectorFeatures.isEarlyZone() ? colorBgMap : "#252525";
					let strokeX = sectorXpx - bgPadding + borderSize;
					let strokeY = sectorYpx - bgPadding + borderSize;
					let strokeSize = sectorSize + bgPadding * 2 - borderSize * 2;
					CanvasUtils.fillRoundedRect(ctx, strokeX, strokeY, strokeSize, strokeSize, radius);
				});
			}
		},

		drawGridOnCanvas: function (ctx, sectorSize, dimensions, centered) {
			var gridSize = this.getGridSize();
			var sunlit = $("body").hasClass("sunlit");
			ctx.strokeStyle = ColorConstants.getColor(sunlit, "map_stroke_grid");
			ctx.lineWidth = 2;
			var sectorPadding = this.getSectorPadding(centered);
			var startGridX = (Math.floor(dimensions.mapMinX / gridSize) - 1) * gridSize;
			var endGridX = (Math.ceil(dimensions.mapMaxX / gridSize) + 2) * gridSize;
			var startGridY = (Math.floor(dimensions.mapMinY / gridSize) - 1) * gridSize;
			var endGridY = (Math.ceil(dimensions.mapMaxY / gridSize) + 1) * gridSize;
			for (var y = startGridY; y <= endGridY; y += gridSize) {
				for (var x = startGridX; x <= endGridX; x += gridSize) {
					var gridX = x - (gridSize - 1 / 2);
					var gridY = y - (gridSize - 1 / 2);
					ctx.strokeRect(
						this.getSectorPixelPos(dimensions, centered, sectorSize, gridX, gridY).x - sectorSize * 0.5 + 2,
						this.getSectorPixelPos(dimensions, centered, sectorSize, gridX, gridY).y - sectorSize * 0.5 + 2,
						(sectorSize + sectorSize * sectorPadding) * gridSize,
						(sectorSize + sectorSize * sectorPadding) * gridSize);
				}
			}
		},

		drawDistrictsOnCanvas: function (ctx, mapPosition, centered, dimensions, visibleSectors, allSectors, sunlit) {
			let sectorSize = this.getSectorSize(centered);
			let level = mapPosition.level;
			
			let radiusDefault = 3.15;
			let radiusSmall = 0.75;
			
			let paddingDefault = 2.25;
			let paddingSmall = 0.53;
			let paddingSmallDiagonal = 0.65;
			let paddingBig = 4.25;
			
			ctx.fillStyle = this.getVisibleAreaBackgroundColor(level, sunlit);
			ctx.strokeStyle = this.getVisibleAreaBackgroundColor(level, sunlit);
			this.foreachVisibleSector(mapPosition.level, centered, dimensions, visibleSectors, (sector, sectorPos, sectorStatus, sectorXpx, sectorYpx) => {
				let sectorFeatures = sector.get(SectorFeaturesComponent);
				if (!sectorFeatures.isEarlyZone()) return;
				
				let neighbours = GameGlobals.levelHelper.getSectorNeighboursMap(sector);

				let isVisibleEdge = sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE;
				let hasDifferentZoneNeighbour = false;
				let hasNonDiagonalNeighbour = false;
				
				for (let direction in neighbours) {
					let neighbour = neighbours[direction];
					if (!neighbour) continue;
					
					let neighbourFeatures = neighbour.get(SectorFeaturesComponent);
					if (neighbourFeatures.isEarlyZone() != sectorFeatures.isEarlyZone()) {
						hasDifferentZoneNeighbour = true;
					}
					if (!PositionConstants.isDiagonal(direction)) {
						hasNonDiagonalNeighbour = true;
					}
				}
				
				let isSingle = isVisibleEdge || hasDifferentZoneNeighbour;
				
				let bgPadding = sectorSize * (isSingle ? (hasNonDiagonalNeighbour ? paddingSmall : paddingSmallDiagonal) : paddingDefault);
				let radius = sectorSize * (isSingle ? radiusSmall : radiusDefault);
				
				ctx.save();
				ctx.translate(sectorXpx + sectorSize / 2, sectorYpx + sectorSize / 2);
				if (!hasNonDiagonalNeighbour && !isSingle) {
					ctx.rotate(Math.PI / 4);
				}
				
				CanvasUtils.fillRoundedRect(ctx, - sectorSize / 2 - bgPadding, -sectorSize / 2 - bgPadding, sectorSize + bgPadding * 2, sectorSize + bgPadding * 2, radius);
				
				ctx.restore();
			});
		},

		drawSectorOnCanvas: function (ctx, options, x, y, sector, levelEntity, sectorStatus, sectorXpx, sectorYpx, sectorSize) {
			let isLocationSunlit = $("body").hasClass("sunlit");
			let isBigSectorSize = sectorSize >= this.getSectorSize(true);

			let statusComponent = sector.get(SectorStatusComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorPassages = sector.get(PassagesComponent);
			let hasCampOnSector = sector.has(CampComponent);
			
			let itemsComponent = this.playerPosNodes.head.entity.get(ItemsComponent);
			
			let mapModeHasResources = MapUtils.showResourcesInMapMode(options.mapMode);
			
			let isScouted = statusComponent.scouted;
			let isRevealed = isScouted || this.isMapRevealed;
			let isSuppliesRevealed = this.isInSuppliesDetectionRange(sector);
			let isIngredientsRevealed = this.isInIngredientsDetectionRange(sector);
			let level = sector.get(PositionComponent).level;
			
			let knownResources = GameGlobals.sectorHelper.getLocationKnownResources(sector);
			let knownItems = GameGlobals.sectorHelper.getLocationKnownItems(sector);
			let allItems = GameGlobals.sectorHelper.getLocationScavengeableItems(sector);
			
			let drawSectorShape = function (color, size) {
				ctx.fillStyle = color;
				
				let centerX = sectorXpx + sectorSize / 2;
				let centerY = sectorYpx + sectorSize / 2;
					
				if (isScouted && (hasCampOnSector || sectorPassages.passageUp || sectorPassages.passageDown)) {
					let r = size / 2 + 1;
					ctx.beginPath();
					ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
					ctx.fill();
				} else {
					let sizeOffset = size - sectorSize;
					let p = sizeOffset / 2;
					
					ctx.fillRect(sectorXpx - p, sectorYpx - p, size, size);
				}
			};
			
			let drawSectorBorder = function (color, isAffected, partial) {
				ctx.fillStyle = color;
				let p = isBigSectorSize ? (isAffected ? 4 : 2) : (isAffected ? 2 : 1);
				if (partial) {
					ctx.fillRect(sectorXpx  + sectorSize / 2, sectorYpx - p, sectorSize / 2 + p, sectorSize / 2 + p);
					ctx.fillRect(sectorXpx - p, sectorYpx + sectorSize / 2, sectorSize / 2 + p, sectorSize / 2 + p);
				} else {
					drawSectorShape(color, sectorSize + p * 2);
				}
			};

			// border(s) for sectors with hazards or sunlight
			let isLevelSunlit = level == GameGlobals.gameState.getSurfaceLevel();
			let isSectorSunlit = sectorFeatures.sunlit;
			let showBorderForSunlit = (!isLevelSunlit || !isLocationSunlit) && MapUtils.showSunlightInMapMode(options.mapMode);
			let hasSunlitBorder = isSectorSunlit && showBorderForSunlit;
			
			let showBorderForHazard = MapUtils.showHazardsInMapMode(options.mapMode);
			let hasSectorHazard = GameGlobals.sectorHelper.hasHazards(sectorFeatures, statusComponent);
			
			if (this.showSectorHazards(sector)) {
				let hasHazardBorder = hasSectorHazard && showBorderForHazard;
				if (hasHazardBorder) {
					let borderColor = this.getSectorHazardBorderColor(options.mapMode, sector);
					let isAffected = GameGlobals.sectorHelper.isAffectedByHazard(sectorFeatures, statusComponent, itemsComponent);
					drawSectorBorder(borderColor, isAffected, false);
				}
				
				if (hasSunlitBorder) {
					let extraBorderColor = ColorConstants.getColor(isLocationSunlit, "map_stroke_sector_sunlit");
					let isPartial = hasHazardBorder && options.mapMode != MapUtils.MAP_MODE_HAZARDS;
					drawSectorBorder(extraBorderColor, true, isPartial);
				}
			}
			
			if (options.mapMode == MapUtils.MAP_MODE_SCAVENGING) {
				if (allItems.length > 0) {
					let ingredientBorderColor = this.getSectorFill(options.mapMode, sector);
					drawSectorBorder(ingredientBorderColor, true, false);
				}
			}
			
			// background color
			let fillColor = this.getSectorFill(options.mapMode, sector);
			drawSectorShape(fillColor, sectorSize);

			// sector contents: points of interest
			
			let showResourceIcons = mapModeHasResources && (isRevealed || isSuppliesRevealed);
			let hasResourcesToShow = knownResources.indexOf(resourceNames.water) >= 0 || knownResources.indexOf(resourceNames.food) >= 0;
			let showResources = showResourceIcons && hasResourcesToShow;
			
			let showIngredientIcons = mapModeHasResources && (isRevealed || isIngredientsRevealed);
			let hasIngredientsToShow = allItems.length > 0;
			let showIngredients = showIngredientIcons && hasIngredientsToShow;

			let hideUnknownIcon = (showResources || showIngredients);
			let hasIcon = this.drawIconsOnSector(ctx, options, sector, levelEntity, sectorXpx, sectorYpx, sectorSize, knownItems, allItems, hideUnknownIcon, showIngredientIcons);
	
			// sector contents: resources
			let fitsResourceIcons = isBigSectorSize || !hasIcon;
			if (showResourceIcons && fitsResourceIcons) {
				this.drawResourcesOnSector(ctx, options, sector, knownResources, sectorXpx, sectorYpx, sectorSize);
			}
		},
		
		drawIconsOnSector: function (ctx, options, sector, levelEntity, sectorXpx, sectorYpx, sectorSize, knownItems, allItems, hideUnknownIcon, showIngredientIcons) {
			let statusComponent = sector.get(SectorStatusComponent);
			let sectorPassages = sector.get(PassagesComponent);
			let sectorImprovements = sector.get(SectorImprovementsComponent);
			let localesComponent = sector.get(SectorLocalesComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			
			let itemsComponent = this.playerPosNodes.head.entity.get(ItemsComponent);
			
			let level = sector.get(PositionComponent).level;
			let hasCampOnSector = sector.has(CampComponent);
			let hasCampOnLevel = levelEntity.has(CampComponent);
			let numUnscoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
			
			let isLocationSunlit = $("body").hasClass("sunlit");
			let isScouted = statusComponent.scouted;
			let isRevealed = isScouted || this.isMapRevealed;
			let isBigSectorSize = sectorSize >= this.getSectorSize(true);
			
			let mapModeHasPois = MapUtils.showPOIsInMapMode(options.mapMode);
			
			let useSunlitIcon = isLocationSunlit;
			
			let iconSize = 10;
			
			if (options.mapMode == MapUtils.MAP_MODE_HAZARDS) {
				if (this.showSectorHazards(sector)) {
					let hazards = GameGlobals.sectorHelper.getEffectiveHazards(sectorFeatures, statusComponent, itemsComponent);
					let hazardType = hazards.getMainHazard();
					let hazardValue = hazards[hazardType] || 0;
					if (hazardValue > 0) {
						if (this.isAffectedByHazard(sector)) {
							iconSize = 8;
							let iconColor = this.getBackgroundColor(level, isLocationSunlit);
							CanvasUtils.drawXShape(ctx, iconColor, iconSize, 3, sectorXpx + sectorSize / 2, sectorYpx + sectorSize / 2);
						}
					}
				}
				return;
			}
			
			let iconPosX = Math.round(sectorXpx + (sectorSize - iconSize) / 2);
			let iconPosYCentered = Math.round(sectorYpx + sectorSize / 2 - iconSize / 2);
			let iconPosY = Math.round(isBigSectorSize ? sectorYpx : iconPosYCentered);
			let disabledAlpha = 0.4;
			
			if (!isRevealed && !hideUnknownIcon) {
				ctx.drawImage(this.icons["unknown" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosYCentered);
				return true;
			} else if (mapModeHasPois && sector.has(WorkshopComponent) && sector.get(WorkshopComponent).isClearable) {
				ctx.drawImage(this.icons["workshop" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (mapModeHasPois && sectorImprovements.getCount(improvementNames.greenhouse) > 0) {
				ctx.drawImage(this.icons["workshop" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (mapModeHasPois && hasCampOnSector) {
				ctx.drawImage(this.icons["camp" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (mapModeHasPois && !hasCampOnLevel && sectorFeatures.canHaveCamp()) {
				ctx.drawImage(this.icons["campable" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (mapModeHasPois && numUnscoutedLocales > 0) {
				ctx.drawImage(this.icons["interest" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (mapModeHasPois && sectorPassages.passageUp) {
				if (GameGlobals.movementHelper.isPassageTypeAvailable(sector, PositionConstants.DIRECTION_UP)) {
					ctx.drawImage(this.icons["passage-up" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				} else {
					ctx.drawImage(this.icons["passage-up-disabled" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				}
				return true;
			} else if (mapModeHasPois && sectorPassages.passageDown) {
				if (!GameGlobals.movementHelper.isPassageTypeAvailable(sector, PositionConstants.DIRECTION_DOWN)) {
					ctx.globalAlpha = disabledAlpha;
				}
				ctx.drawImage(this.icons["passage-down" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				ctx.globalAlpha = 1;
				return true;
			} else if (mapModeHasPois && sectorImprovements.getCount(improvementNames.beacon) > 0) {
				ctx.drawImage(this.icons["beacon" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showIngredientIcons && allItems.length > 0) {
				if (knownItems.length == 0) {
					ctx.globalAlpha = disabledAlpha;
				}
				ctx.drawImage(this.icons["ingredient" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				ctx.globalAlpha = 1;
				return true;
			}
			
			return false;
		},
		
		drawResourcesOnSector: function (ctx, options, sector, knownResources, sectorXpx, sectorYpx, sectorSize) {
			let mapResources = options.mapMode == MapUtils.MAP_MODE_SCAVENGING ?
				[ resourceNames.water, resourceNames.food, resourceNames.metal, resourceNames.rope, resourceNames.herbs, resourceNames.fuel, resourceNames.rubber, resourceNames.medicine, resourceNames.tools, resourceNames.concrete, resourceNames.robots ] :
				[ resourceNames.water, resourceNames.food ];

			let sectorImprovements = sector.get(SectorImprovementsComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorPosition = sector.get(PositionComponent);
			
			let resourcesCollectable = sectorFeatures.resourcesCollectable;
				
			let directResources = {};
			directResources[resourceNames.water] = sectorImprovements.getCount(improvementNames.collector_water) > 0 || sectorFeatures.hasSpring;
			directResources[resourceNames.food] = sectorImprovements.getCount(improvementNames.collector_food) > 0;
			
			let totalWidth = 0;
			let bigResSize = 5;
			let smallResSize = 3;
			let padding = 1;
			let isBigSectorSize = sectorSize >= this.getSectorSize(true);
			
			let potentialResources = {};
			
			for (let i in mapResources) {
				let name = mapResources[i];
				let colAmount = resourcesCollectable.getResource(name);
				if (colAmount > 0) {
					potentialResources[name] = true;
				} else if (knownResources.indexOf(name) >= 0) {
					let minAmountToShow = name == resourceNames.metal ? WorldConstants.resourcePrevalence.COMMON : 1;
					if (sectorFeatures.resourcesScavengable.getResource(name) >= minAmountToShow) {
						potentialResources[name] = true;
					}
				}
				
				if (directResources[name]) totalWidth += bigResSize + padding;
				else if(potentialResources[name]) totalWidth += smallResSize + padding;
			}
			
			if (totalWidth > 0) {
				totalWidth -= padding;
				let x = sectorXpx + sectorSize / 2 - totalWidth / 2;
				let y = isBigSectorSize ? sectorYpx + sectorSize - 5 : sectorYpx + sectorSize / 2 - 1;
				for (let i in mapResources) {
					let name = mapResources[i];
					let drawSize = 0;
					let yOffset;
					
					if (directResources[name]) {
						drawSize = bigResSize;
						yOffset = -1;
					} else if(potentialResources[name]) {
						drawSize = smallResSize;
						yOffset = 0;
					} else {
						drawSize = 0;
					}
					
					if (drawSize > 0) {
						ctx.fillStyle = this.getResourceFill(name);
						ctx.fillRect(Math.round(x), Math.round(y + yOffset), drawSize, drawSize);
						x = x + drawSize + padding;
					}
				}
			}
		},

		drawMovementLinesOnCanvas: function (ctx, options, sector, sectorPos, sectorXpx, sectorYpx, sectorSize, sectorPadding) {
			let sunlit = $("body").hasClass("sunlit");
			let sectorPassages = sector.get(PassagesComponent);
			let sectorMiddleX = sectorXpx + sectorSize * 0.5;
			let sectorMiddleY = sectorYpx + sectorSize * 0.5;
			let sectorStatus = SectorConstants.getSectorStatus(sector);
			
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getPositionOnPath(sectorPos, direction, 1);
				var neighbour = GameGlobals.levelHelper.getSectorByPosition(options.mapPosition.level, neighbourPos.sectorX, neighbourPos.sectorY);
				if (neighbour) {
					let neighbourStatus = SectorConstants.getSectorStatus(neighbour);
					let blocker = sectorPassages.getBlocker(direction);
					let isBlocked = blocker != null && GameGlobals.movementHelper.isBlocked(sector, direction);
					
					let isVisited = SectorConstants.isVisited(sectorStatus) && SectorConstants.isVisited(neighbourStatus);
					let lineColor = ColorConstants.getColor(sunlit, "map_stroke_movementlines");
					ctx.strokeStyle = lineColor;
					ctx.lineWidth = MapUtils.getMovementLineWidth(options.zoomLevel);
					
					let distX = neighbourPos.sectorX - sectorPos.sectorX;
					let distY = neighbourPos.sectorY - sectorPos.sectorY;
					
					ctx.beginPath();
					ctx.moveTo(sectorMiddleX + 0.5 * sectorSize * distX, sectorMiddleY + 0.5 * sectorSize * distY);
					ctx.lineTo(sectorMiddleX + (0.5 + sectorPadding) * sectorSize * distX, sectorMiddleY + (0.5 + sectorPadding) * sectorSize * distY);

					ctx.stroke();

					if (blocker) {
						var blockerType = blocker.type;
						var isGang = blockerType === MovementConstants.BLOCKER_TYPE_GANG;
						var blockerX = sectorMiddleX + sectorSize * (1 + sectorPadding)/2 * distX;
						var blockerY = sectorMiddleY + sectorSize * (1 + sectorPadding)/2 * distY;
						
						if (!isBlocked && !MapUtils.showClearedBlockersInMapMode(options.mapMode)) continue;
						
						MapElements.drawMovementBlocker(ctx, sunlit, sectorSize, blockerX, blockerY, isGang, isBlocked);
					}
				}
			}
		},
		
		foreachVisibleSector: function (level, centered, dimensions, visibleSectors, cb) {
			let sectorSize = this.getSectorSize(centered);
			for (let y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
				for (let x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
					let sector = visibleSectors[x + "." + y];
					let sectorStatus = SectorConstants.getSectorStatus(sector);
					if (this.showSectorOnMap(centered, sector, sectorStatus)) {
						let sectorPos = new PositionVO(level, x, y);
						let sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).x;
						let sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).y;
						cb.apply(this, [ sector, sectorPos, sectorStatus, sectorXpx, sectorYpx ]);
					}
				}
			}
		},

		showSectorOnMap: function (centered, sector, sectorStatus) {
			return this.isMapRevealed ? sector : sector && sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
		},
		
		isInHazardDetectionRange: function (sector) {
			return GameGlobals.sectorHelper.isInDetectionRange(sector, ItemConstants.itemBonusTypes.detect_hazards);
		},
		
		isInSuppliesDetectionRange: function (sector) {
			return GameGlobals.sectorHelper.isInDetectionRange(sector, ItemConstants.itemBonusTypes.detect_supplies);
		},
		
		isInIngredientsDetectionRange: function (sector) {
			return GameGlobals.sectorHelper.isInDetectionRange(sector, ItemConstants.itemBonusTypes.detect_ingredients);
		},

		getCanvasMinimumWidth: function (canvas) {
			switch ($(canvas).attr("id")) {
				case "mainmap": return $(canvas).parent().width();
				case "minimap": return 198;
				default: return 0;
			}
		},

		getCanvasMinimumHeight: function (canvas) {
			switch ($(canvas).attr("id")) {
				case "mainmap": return 10;
				case "minimap": return 198;
				default: return 0;
			}
		},

		getMapSectorDimensions: function (canvasId, mapSize, centered, mapPosition, visibleSectors, allSectors) {
			var level = mapPosition.level;
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent);
			var sectorSize = this.getSectorSize(centered);

			var dimensions = {};
			dimensions.mapMinX = levelComponent.minX;
			dimensions.mapMaxX = levelComponent.maxX;
			dimensions.mapMinY = levelComponent.minY;
			dimensions.mapMaxY = levelComponent.maxY;

			dimensions.canvasMinX = levelComponent.minX;
			dimensions.canvasMaxX = levelComponent.maxX;
			dimensions.canvasMinY = levelComponent.minY;
			dimensions.canvasMaxY = levelComponent.maxY;

			if (centered) {
				var levelSize = Math.max(Math.abs(levelComponent.minX - levelComponent.maxX), Math.abs(levelComponent.minY - levelComponent.maxY));
				mapSize = mapSize && mapSize > 0 ? mapSize : levelSize;
				if (mapSize % 2 === 0) mapSize = mapSize + 1;
				var mapDiameter = (mapSize - 1) / 2;
				dimensions.canvasMinX = mapPosition.sectorX - mapDiameter;
				dimensions.canvasMaxX = mapPosition.sectorX + mapDiameter;
				dimensions.canvasMinY = mapPosition.sectorY - mapDiameter;
				dimensions.canvasMaxY = mapPosition.sectorY + mapDiameter;
			}

			var sector;
			var sectorStatus;
			dimensions.minVisibleX = dimensions.mapMaxX + 1;
			dimensions.maxVisibleX = dimensions.mapMinX - 1;
			dimensions.minVisibleY = dimensions.mapMaxY + 1;
			dimensions.maxVisibleY = dimensions.mapMinY - 1;
			for (var y = dimensions.mapMinY; y <= dimensions.mapMaxY; y++) {
				for (var x = dimensions.mapMinX; x <= dimensions.mapMaxX; x++) {
					sector = GameGlobals.levelHelper.getSectorByPosition(mapPosition.level, x, y);
					sectorStatus = SectorConstants.getSectorStatus(sector);
					if (allSectors && sector) allSectors[x + "." + y] = sector;
					// if map is centered, make a node for empty sectors too
					if (centered || this.showSectorOnMap(centered, sector, sectorStatus)) {
						if (visibleSectors) visibleSectors[x + "." + y] = sector;
						dimensions.minVisibleX = Math.min(dimensions.minVisibleX, x);
						dimensions.maxVisibleX = Math.max(dimensions.maxVisibleX, x);
						dimensions.minVisibleY = Math.min(dimensions.minVisibleY, y);
						dimensions.maxVisibleY = Math.max(dimensions.maxVisibleY, y);
					}
				}
			}
			
			// if centered map is on edge, allow visible "sectors" outside of map to be able to center on player
			if (centered) {
				dimensions.minVisibleX = Math.min(dimensions.minVisibleX, dimensions.canvasMinX);
				dimensions.maxVisibleX = Math.max(dimensions.maxVisibleX, dimensions.canvasMaxX);
				dimensions.minVisibleY = Math.min(dimensions.minVisibleY, dimensions.canvasMinY);
				dimensions.maxVisibleY = Math.max(dimensions.maxVisibleY, dimensions.canvasMaxY);
			}
			
			dimensions.minVisibleX = Math.max(dimensions.minVisibleX, dimensions.canvasMinX);
			dimensions.maxVisibleX = Math.min(dimensions.maxVisibleX, dimensions.canvasMaxX);
			dimensions.minVisibleY = Math.max(dimensions.minVisibleY, dimensions.canvasMinY);
			dimensions.maxVisibleY = Math.min(dimensions.maxVisibleY, dimensions.canvasMaxY);

			let canvas = $("#" + canvasId);
			let visibleXDiff = dimensions.maxVisibleX - dimensions.minVisibleX;
			let visibleYDiff = dimensions.maxVisibleY - dimensions.minVisibleY;
			let paddingFactor = this.getSectorPadding(centered);
			let padding = sectorSize * paddingFactor;
			let margin = sectorSize * this.getSectorMargin(centered);
			dimensions.mapWidth = (visibleXDiff + 1.5) * sectorSize * (1 + paddingFactor) + margin * 2 - padding;
			dimensions.mapHeight = (visibleYDiff + 1.5) * sectorSize * (1 + paddingFactor) + margin * 2 - padding;
			dimensions.canvasWidth = Math.max(dimensions.mapWidth, this.getCanvasMinimumWidth(canvas));
			dimensions.canvasHeight = Math.max(dimensions.mapHeight, this.getCanvasMinimumHeight(canvas));
			dimensions.sectorSize = sectorSize;
			
			return dimensions;
		},
		
		getBackgroundColor: function (level, sunlit) {
			let isLevelSunlit = level == GameGlobals.gameState.getSurfaceLevel();
			if (isLevelSunlit) {
				return ColorConstants.getColor(sunlit, "map_background_surface");
			} else {
				return ColorConstants.getColor(sunlit, "map_background_default");
			}
		},
		
		getVisibleAreaBackgroundColor: function (level, sunlit) {
			let isLevelSunlit = level == GameGlobals.gameState.getSurfaceLevel();
			let isGround = level == GameGlobals.gameState.getGroundLevel();
			if (isLevelSunlit) {
				return ColorConstants.getColor(sunlit, "map_background_2_surface");
			} else if (isGround) {
				return ColorConstants.getColor(sunlit, "map_background_2_ground");
			} else {
				return ColorConstants.getColor(sunlit, "map_background_2_default");
			}
		},

		getSectorSize: function (centered) {
			return MapUtils.getSectorSize(centered ? MapUtils.MAP_ZOOM_MINIMAP : MapUtils.MAP_ZOOM_DEFAULT);
		},

		getGridSize: function () {
			return MapUtils.getGridSize();
		},

		getSectorPadding: function (centered) {
			return MapUtils.getSectorPadding(centered ? MapUtils.MAP_ZOOM_MINIMAP : MapUtils.MAP_ZOOM_DEFAULT);
		},
		
		getSectorMargin: function (centered) {
			return MapUtils.getSectorMargin(centered ? MapUtils.MAP_ZOOM_MINIMAP : MapUtils.MAP_ZOOM_DEFAULT);
		},

		getSectorFill: function (mapMode, sector) {
			let sunlit = $("body").hasClass("sunlit");
			let sectorStatus = SectorConstants.getSectorStatus(sector);
			
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE || sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE) {
				return ColorConstants.getColor(sunlit, "map_fill_sector_unvisited");
			}
			
			if (mapMode == MapUtils.MAP_MODE_HAZARDS) {
				let hazardFillColor = this.getSectorHazardFillColor(sector);
				if (hazardFillColor != ColorConstants.colors.global.transparent) {
					return hazardFillColor;
				}
			}
			
			if (!MapUtils.showSectorStatusInMapMode(mapMode)) {
				return ColorConstants.getColor(sunlit, "map_fill_sector_cleared");
			}

			return MapUtils.getDefaultSectorFill(sectorStatus, sunlit);
		},
		
		getSectorHazardBorderColor: function (mapMode, sector) {
			let sunlit = $("body").hasClass("sunlit");
			
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorStatus = sector.get(SectorStatusComponent);
			
			if (mapMode == MapUtils.MAP_MODE_HAZARDS) {
				let hazardFillColor = this.getSectorHazardFillColor(sector);
				if (hazardFillColor != ColorConstants.colors.global.transparent) {
					return hazardFillColor;
				}
			}
			
			let hasSectorHazard = GameGlobals.sectorHelper.hasHazards(sectorFeatures, sectorStatus);
			
			if (hasSectorHazard) {
				let hazards = GameGlobals.sectorHelper.getEffectiveHazards(sectorFeatures, sectorStatus);
				let mainHazard = hazards.getMainHazard();
				if (mainHazard == "cold") {
					return ColorConstants.getColor(sunlit, "map_stroke_sector_cold");
				} else if (mainHazard == "debris") {
					return ColorConstants.getColor(sunlit, "map_stroke_sector_debris");
				} else if (mainHazard == "radiation") {
					return ColorConstants.getColor(sunlit, "map_stroke_sector_radiation");
				} else if (mainHazard == "poison") {
					return ColorConstants.getColor(sunlit, "map_stroke_sector_poison");
				} else {
					return ColorConstants.getColor(sunlit, "map_stroke_sector_hazard");
				}
			}
			
			return ColorConstants.colors.global.transparent;
		},
		
		getSectorHazardFillColor: function (sector) {
			let sunlit = $("body").hasClass("sunlit");
			
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorStatus = sector.get(SectorStatusComponent);
			
			let hasSectorHazard = GameGlobals.sectorHelper.hasHazards(sectorFeatures, sectorStatus);
			
			if (hasSectorHazard) {
				let hazards = GameGlobals.sectorHelper.getEffectiveHazards(sectorFeatures, sectorStatus);
				let mainHazard = hazards.getMainHazard();
				if (mainHazard == "cold") {
					return ColorConstants.getColor(sunlit, "map_fill_sector_cold");
				} else if (mainHazard == "debris") {
					return ColorConstants.getColor(sunlit, "map_fill_sector_debris");
				} else if (mainHazard == "radiation") {
					return ColorConstants.getColor(sunlit, "map_fill_sector_radiation");
				} else if (mainHazard == "poison") {
					return ColorConstants.getColor(sunlit, "map_fill_sector_poison");
				} else {
					return ColorConstants.getColor(sunlit, "map_fill_sector_hazard");
				}
			}
			
			return ColorConstants.colors.global.transparent;
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
		
		hasHazard: function (sector) {
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let statusComponent = sector.get(SectorStatusComponent);
			return GameGlobals.sectorHelper.hasHazards(sectorFeatures, statusComponent);
		},
		
		isAffectedByHazard: function (sector) {
			let itemsComponent = this.playerPosNodes.head.entity.get(ItemsComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let statusComponent = sector.get(SectorStatusComponent);
			return GameGlobals.sectorHelper.isAffectedByHazard(sectorFeatures, statusComponent, itemsComponent);
		},
		
		showSectorHazards: function (sector) {
			let sectorStatus = SectorConstants.getSectorStatus(sector);
			return SectorConstants.isLBasicInfoVisible(sectorStatus) || this.isMapRevealed || this.isInHazardDetectionRange(sector);
		},

	});

	return UIMapHelper;
});
