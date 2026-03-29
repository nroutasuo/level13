// Creates and updates maps (mini-map and main)
define(['ash',
	'text/Text',
	'utils/CanvasUtils',
	'utils/MapElements',
	'utils/MapUtils',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/ColorConstants',
	'game/constants/GameConstants',
	'game/constants/ExplorerConstants',
	'game/constants/LevelConstants',
	'game/constants/UIConstants',
	'game/constants/CanvasConstants',
	'game/constants/ExplorationConstants',
	'game/constants/ItemConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/StoryConstants',
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
	'game/vos/PositionVO'],
function (Ash, Text, CanvasUtils, MapElements, MapUtils, MathUtils,
	GameGlobals, GlobalSignals, ColorConstants, GameConstants, ExplorerConstants, LevelConstants, UIConstants, CanvasConstants, ExplorationConstants, ItemConstants, MovementConstants, PositionConstants, SectorConstants, StoryConstants, WorldConstants,
	PlayerPositionNode,
	LevelComponent, CampComponent, PositionComponent, ItemsComponent,
	SectorStatusComponent, SectorLocalesComponent, SectorFeaturesComponent, PassagesComponent, SectorImprovementsComponent, WorkshopComponent,
	PositionVO) {

	var UIMapHelper = Ash.Class.extend({

		playerPosNodes: null,

		icons: [],

		isMapRevealed: false,
		isMapEasyMode: false,

		constructor: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.isMapRevealed = false;
			this.isMapEasyMode = false;
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

			let playerPos = this.playerPosNodes.head.position.getPosition();			
			let sectorPos = sector.get(PositionComponent);

			if (playerPos.equals(sectorPos)) return UIConstants.ASCII_MAP_SYMBOL_PLAYER;				
			if (sector.has(CampComponent)) return UIConstants.ASCII_MAP_SYMBOL_CAMP;
			
			let sectorStatus = this.getSectorStatus(sector);
			
			if (sectorStatus == null) return " ";
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE) return " ";
			if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE) return UIConstants.ASCII_MAP_SYMBOL_UNVISITED;
				
			let sectorPassages = sector.get(PassagesComponent);
			if (sectorPassages.passageUp) return UIConstants.ASCII_MAP_SYMBOL_PASSAGE_UP;
			if (sectorPassages.passageDown) return UIConstants.ASCII_MAP_SYMBOL_PASSAGE_DOWN;
			
			if (mapMode == MapUtils.MAP_MODE_HAZARDS) {
				// hazards map mode
				if (this.hasHazard(sector)) {
					if (this.isAffectedByHazard(sector)) {
						return UIConstants.ASCII_MAP_SYMBOL_HAZARD_AFFECTED;
					} else {
						return UIConstants.ASCII_MAP_SYMBOL_HAZARD_LOW;
					}
				}
				return UIConstants.ASCII_MAP_SYMBOL_GENERIC_SECTOR;

			} else if (mapMode == MapUtils.MAP_MODE_SCAVENGING) {
				// scavenging map mode
				if (GameGlobals.sectorHelper.hasSectorVisibleIngredients(sector)) {
					return UIConstants.ASCII_MAP_SYMBOL_RES_INGREDIENT;
				}
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.water)) {
					return UIConstants.ASCII_MAP_SYMBOL_RES_WATER;
				}
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.food)) {
					return UIConstants.ASCII_MAP_SYMBOL_RES_FOOD;
				}
				if (GameGlobals.sectorHelper.hasSectorKnownResource(sector, resourceNames.metal, WorldConstants.resourcePrevalence.COMMON)) {
					return UIConstants.ASCII_MAP_SYMBOL_RES_METAL;
				}
				return UIConstants.ASCII_MAP_SYMBOL_GENERIC_SECTOR;

			} else {
				// default map mode
				
				if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED) return UIConstants.ASCII_MAP_SYMBOL_VISITED;
				if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_REVEALED_BY_MAP) return UIConstants.ASCII_MAP_SYMBOL_UNVISITED;

				let numUnscoutedLocales = GameGlobals.sectorHelper.getNumVisibleUnscoutedLocales(sector);
				
				if (numUnscoutedLocales > 0) return UIConstants.ASCII_MAP_SYMBOL_POINT_OF_INTEREST;
				
				if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED) return UIConstants.ASCII_MAP_SYMBOL_VISITED;
				if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED) return UIConstants.ASCII_MAP_SYMBOL_CLEARED;
						
				return UIConstants.ASCII_MAP_SYMBOL_UNVISITED;
			}
		},
		
		getASCIILegend: function (mapMode) {
			let parts = [];

			parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_PLAYER, description: "ui.map.ascii_legend_player" }));
			parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_CAMP, description: "ui.map.ascii_legend_camp" }));
			parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_UNVISITED, description: "ui.map.ascii_legend_sector_unvisited" }));
			parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_PASSAGE_UP, description: "ui.map.ascii_legend_passage_up" }));
			parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_PASSAGE_DOWN, description: "ui.map.ascii_legend_passage_down" }));

			switch (mapMode) {
				case MapUtils.MAP_MODE_HAZARDS:
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_GENERIC_SECTOR, description: "ui.map.ascii_legend_sector_default" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_HAZARD_AFFECTED, description: "ui.map.ascii_legend_hazard_high" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_HAZARD_LOW, description: "ui.map.ascii_legend_hazard_low" }));
					break;
				case MapUtils.MAP_MODE_SCAVENGING:
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_GENERIC_SECTOR, description: "ui.map.ascii_legend_sector_default" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_RES_WATER, description: "ui.map.ascii_legend_res_water" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_RES_FOOD, description: "ui.map.ascii_legend_res_food" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_RES_METAL, description: "ui.map.ascii_legend_res_metal" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_RES_INGREDIENT, description: "ui.map.ascii_legend_res_ingredient" }));
					break;
				case MapUtils.MAP_MODE_DEFAULT:
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_VISITED, description: "ui.map.ascii_legend_sector_visited" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_CLEARED, description: "ui.map.ascii_legend_sector_cleared" }));
					parts.push(Text.t("ui.map.ascii_legend_piece_template", { symbol: UIConstants.ASCII_MAP_SYMBOL_POINT_OF_INTEREST, description: "ui.map.ascii_legend_sector_poi" }));
					break;
				default:
					log.e("no ASCII map legend defined for map mode: " + mapMode);
			}

			return parts.join(", ");
		},

		rebuildMapWithCanvas: function (canvas, ctx, options, visibleSectors, allSectors, dimensions) {
			let sectorSize = this.getSectorSize(options.centered);
			let sunlit = $("body").hasClass("sunlit");
			let level = options.mapPosition.level;
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			let districts = GameGlobals.levelHelper.getLevelDistricts(level);
			
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

			ctx.save();

			// clip
			if (!options.centered) this.clipCanvasToVisibleArea(ctx, dimensions, options.mapPosition, options.centered, sectorSize, visibleSectors);
			
			// elements inside clip
			this.drawDistrictsOnCanvas(ctx, options.mapPosition, options.centered, dimensions, districts, visibleSectors, allSectors, sunlit);

			ctx.restore();

			this.drawHolesOnCanvas(ctx, options.mapPosition, options.centered, dimensions, sunlit);
			
			// borders on beacons
			ctx.strokeStyle = ColorConstants.getColor(sunlit, "map_stroke_sector_lit");
			ctx.lineWidth = options.centered ? 4 : 2;
			let beaconSectors = GameGlobals.levelHelper.getAllSectorsWithImprovement(level, improvementNames.beacon);
			for (let i = 0; i < beaconSectors.length; i++) {
				sector = beaconSectors[i];
				let sectorStatus = this.getSectorStatus(sector);
				sectorPos = sector.get(PositionComponent);
				if (this.showSectorOnMap(options.centered, sector, sectorStatus)) {
					sectorXpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, sectorPos.sectorX, sectorPos.sectorY).x;
					sectorYpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, sectorPos.sectorX, sectorPos.sectorY).y;
					ctx.beginPath();
					ctx.arc(sectorXpx + sectorSize * 0.5, sectorYpx + 0.5 * sectorSize, sectorSize * (ExplorationConstants.BEACON_RADIUS - 1) * 2 + 1, 0, 2 * Math.PI);
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
				this.drawSectorOnCanvas(ctx, options, sectorPos.sectorX, sectorPos.sectorY, sector, levelEntity, sectorStatus, sectorXpx, sectorYpx, sectorSize);
			});

			// border on current sector
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
					let sectorStatus = this.getSectorStatus(sector);
					if (this.showSectorOnMap(options.centered, sector, sectorStatus)) {
						let sectorXpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, x, y).x;
						let sectorYpx = this.getSectorPixelPos(dimensions, options.centered, sectorSize, x, y).y;
						let sectorPos = new PositionVO(level, x, y);
						let $div = MapElements.getOverlaySectorDiv(sectorPos, sectorXpx, sectorYpx);
						if (sectorSelectedCallback) {
							$div.click(function (e) {
								let $target = $(e.target);
								GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
								MapElements.deselectAllCells();
								MapElements.selectCell($target);
								let level = $target.attr("data-level");
								let x = $target.attr("data-x");
								let y = $target.attr("data-y");
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
			
			if (!ctx) return;
			
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
			let isGround = mapPosition.level == GameGlobals.worldState.getGroundLevel();
			
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
			
			let nearestWaterSector = GameGlobals.levelHelper.findNearestKnownWaterSector(mapPosition, true);
			if (nearestWaterSector != null) {
				result.push({ id: "water", color: MapUtils.getResourceFill(resourceNames.water), position: nearestWaterSector.get(PositionComponent) });
			}
			
			let nearestFoodSector = GameGlobals.levelHelper.findNearestKnownFoodSector(mapPosition, true);
			if (nearestFoodSector != null) {
				result.push({ id: "food", color: MapUtils.getResourceFill(resourceNames.food), position: nearestFoodSector.get(PositionComponent) });
			}

			if (isGround && GameGlobals.gameState.getStoryFlag(StoryConstants.flags.SPIRITS_SEARCHING_FOR_SPIRITS)) {
				let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
				let explorerVO = GameGlobals.playerHelper.getExplorerByID(forcedExplorerID);
				if (explorerVO && explorerVO.inParty) {
					let groveSector = GameGlobals.levelHelper.findNearestLocaleSector(mapPosition, localeTypes.grove);
					if (groveSector) {
						let questIcon = this.icons["interest" + (useSunlitIcon ? "-sunlit" : "")];
						result.push({ id: "quest", icon: questIcon, position: groveSector.get(PositionComponent) });
					}
				}
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
				return { p1: { x: min, y: max }, p2: { x: max, y: max } };
			}
			
			return null;
		},

		clipCanvasToVisibleArea: function (ctx, dimensions, mapPosition, centered, sectorSize, visibleSectors) {
			let visibleAreaPoints = this.getVisibleAreaPoints(ctx, dimensions, mapPosition, centered, sectorSize, visibleSectors);
			CanvasUtils.tracePolygon(ctx, visibleAreaPoints);
			ctx.clip();
		},

		getVisibleAreaPoints: function (ctx, dimensions, mapPosition, centered, sectorSize, visibleSectors) {
			// determine in/out for each position in grid
			let revealDistance = 2;

			let padding = 3;
			let gridSize = 1;

			let settings = {
				padding: padding,
				minX: dimensions.minVisibleX,
				maxX: dimensions.maxVisibleX,
				minY: dimensions.minVisibleY,
				maxY: dimensions.maxVisibleY,
				gridSize: gridSize,
			};

			let visibleSectorsArray = [];
			for (let key in visibleSectors) {
				let s = visibleSectors[key];
				if (!s) continue;
				visibleSectorsArray.push({ position: s.get(PositionComponent).getPosition() });
			}

			let sys = this;
			let isSectorVisibleOnMap = function (sector) {
				if (!sector) return false;
				let sectorStatus = sys.getSectorStatus(sector);
				return sys.showSectorOnMap(centered, sector, sectorStatus);
			}
			let isPositionVisibleOnMap = function (x, y) {
				let sectorX = Math.floor(x);
				let sectorY = Math.floor(y);
				
				let sector = visibleSectors[sectorX + "." + sectorY];
				if (sector) {
					if (isSectorVisibleOnMap(sector)) {
						return true;
					}
				} else if (LevelConstants.isPositionSurroundedBySectors(visibleSectorsArray, x, y)) {
					return true;
				} else {
					let nearestSector = GameGlobals.levelHelper.findNearestSector(mapPosition.level, x, y, revealDistance, s => isSectorVisibleOnMap(s));
					if (nearestSector) {
						let pos = { sectorX: x, sectorY: y };
						let nearestSectorPos = nearestSector.get(PositionComponent).getPosition();
						let distance = PositionConstants.getDistanceTo(pos, nearestSectorPos);
						if (distance <= revealDistance) return true;
					}
				}

				return false;
			};
			let statusByPosition = MapUtils.getGridPositionMap(settings, isPositionVisibleOnMap);

			// find edge points
			let edgePoints = MapUtils.getEdgePointsFromGridPositionMap(settings, statusByPosition, 0);

			// debug: draw points
			/*
			for (let x = dimensions.minVisibleX - padding; x <= dimensions.maxVisibleX + padding; x++) {
				for (let y = dimensions.minVisibleY - padding; y <= dimensions.maxVisibleY + padding; y++) {
					let status = statusByPosition[x][y] || 0;
					let pixelPos = this.getSectorPixelPosCenter(dimensions, centered, sectorSize, x, y);
					ctx.strokeStyle = status ? ColorConstants.getColor(false, "map_stroke_blocker") : ColorConstants.getColor(false, "map_stroke_sector");
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.arc(pixelPos.x, pixelPos.y, 5, 0, 2 * Math.PI);
					ctx.stroke();
				}
			}

			for (let i = 0; i < edgePoints.length; i++) {
				let point = edgePoints[i];
				let pixelPos = this.getSectorPixelPosCenter(dimensions, centered, sectorSize, point.sectorX, point.sectorY);
				ctx.strokeStyle = ColorConstants.getColor(false, "map_stroke_blocker");
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(pixelPos.x, pixelPos.y, 3, 0, 2 * Math.PI);
				ctx.stroke();
			}
			*/

			// sort edge points
			let sortByAngle = (a, b, c) => {
				let angleA = Math.atan2(a.sectorY - c.sectorY, a.sectorX - c.sectorX);
				let angleB = Math.atan2(b.sectorY - c.sectorY, b.sectorX - c.sectorX);
				return angleA - angleB;
			};

			let sortByDistance = (a, b, p) => {
				let da = PositionConstants.getDistanceTo(p, a);
				let db = PositionConstants.getDistanceTo(p, b);
				return da - db;
			};


			let unsortedPoints = edgePoints.concat();
			let sortedPoints = [];

			let currentPoint = unsortedPoints[0];
			let c = mapPosition;

			while (currentPoint && unsortedPoints.length > 1) {
				let currentPointIndex = unsortedPoints.indexOf(currentPoint);
				unsortedPoints.splice(currentPointIndex, 1);
				sortedPoints.push(currentPoint);

				let closestPoints = unsortedPoints.sort((a, b) => sortByDistance(a, b, currentPoint));
				let closestPoint = closestPoints[0];
				let closestDistance = PositionConstants.getDistanceTo(currentPoint, closestPoint);

				let neighbours = unsortedPoints.filter(p => PositionConstants.getDistanceTo(currentPoint, p) == closestDistance);
				let sortedNeighbours = neighbours.sort((a, b) => sortByAngle(a, b, c));
				let nextPoint = sortedNeighbours[0];
				currentPoint = nextPoint;
			}

			// filter edge points

			// adjust/round
			
			// convert to map coordinates
			let result = [];
			for (let i = 0; i < sortedPoints.length; i++) {
				let point = sortedPoints[i];
				let pixelPos = this.getSectorPixelPosCenter(dimensions, centered, sectorSize, point.sectorX, point.sectorY);
				result.push(pixelPos);
			}

			return result;
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
			for (let y = startGridY; y <= endGridY; y += gridSize) {
				for (let x = startGridX; x <= endGridX; x += gridSize) {
					let gridX = x - (gridSize - 1 / 2);
					let gridY = y - (gridSize - 1 / 2);
					ctx.strokeRect(
						this.getSectorPixelPos(dimensions, centered, sectorSize, gridX, gridY).x - sectorSize * 0.5 + 2,
						this.getSectorPixelPos(dimensions, centered, sectorSize, gridX, gridY).y - sectorSize * 0.5 + 2,
						(sectorSize + sectorSize * sectorPadding) * gridSize,
						(sectorSize + sectorSize * sectorPadding) * gridSize);
				}
			}
		},

		drawHolesOnCanvas: function (ctx, mapPosition, centered, dimensions, sunlit) {
			let sectorSize = this.getSectorSize(centered);

			let level = mapPosition.level;
			let levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent);
			for (let i = 0; i < levelComponent.features.length; i++) {
				let featureVO = levelComponent.features[i];
				if (!WorldConstants.isFeatureHole(featureVO.type)) continue;
				for (let j = 0; j < featureVO.areas.length; j++) {
					let areaVO = featureVO.areas[j];
					if (areaVO.level != level) continue;

					let startX = this.getSectorPixelPos(dimensions, centered, sectorSize, areaVO.minX, areaVO.minY).x;
					let startY = this.getSectorPixelPos(dimensions, centered, sectorSize, areaVO.minX, areaVO.minY).y;
					let w = this.getAreaSize(areaVO.getWidth(), centered);
					let h = this.getAreaSize(areaVO.getHeight(), centered);
			
					ctx.fillStyle = ColorConstants.getColor(sunlit, "map_background_hole");
					ctx.fillRect(startX, startY, w, h);
				}
			}
		},

		drawDistrictsOnCanvas: function (ctx, mapPosition, centered, dimensions, districts, visibleSectors, allSectors, sunlit) {
			let sectorSize = this.getSectorSize(centered);
			let paddingFactor = this.getSectorPadding(centered);
			let padding = sectorSize * paddingFactor;

			let gridSize = 0.5;

			let allSectorsArray = [];
			let visibleSectorsArray = [];
			for (let key in allSectors) {
				let s = allSectors[key];
				if (!s) continue;
				allSectorsArray.push({ position: s.get(PositionComponent).getPosition() });
			}
			for (let key in visibleSectors) {
				let s = visibleSectors[key];
				if (!s) continue;
				visibleSectorsArray.push({ position: s.get(PositionComponent).getPosition() });
			}

			let levelDimensions = {
				minX: dimensions.mapMinX,
				maxX: dimensions.mapMaxX,
				minY: dimensions.mapMinY,
				maxY: dimensions.mapMaxY,
			};
			let getSectorData = function (sector) {
				if (!sector) return null;
				let features = sector.get(SectorFeaturesComponent);
				let position = sector.get(PositionComponent).getPosition();
				return { districtIndex: features.districtIndex, stage: WorldConstants.getStage(features.zone), position: position };
			}
			let levelHelper = {
				hasSector: (x, y) =>GameGlobals.levelHelper.getSectorByPosition(mapPosition.level, x, y) != null,
				getSector:(x, y) => getSectorData(GameGlobals.levelHelper.getSectorByPosition(mapPosition.level, x, y)),
				getNearestSector: (x, y, maxDist, filter) => {
					let innerFilter = s => (filter ? filter(getSectorData(s)) : true);
					return getSectorData(GameGlobals.levelHelper.findNearestSector(mapPosition.level, x, y, maxDist, innerFilter));
				},
				getDistrictIndexByPosition: (pos, stage) => LevelConstants.getDistrictIndexByPosition(districts, pos, stage),
				isPositionSurroundedBySectors: (x, y) => LevelConstants.isPositionSurroundedBySectors(visibleSectorsArray, x, y),
			};

			let pointsByDistrict = MapElements.getPolygonPointsByDistrict(levelDimensions, levelHelper, districts, allSectorsArray, gridSize);

			let lines = [];
			lines.push({ fillStyle: ColorConstants.getColor(sunlit, "map_background_district") });
			lines.push({ lineWidth: padding - 2, strokeStyle: ColorConstants.getColor(sunlit, "map_background_default") });
			//lines.push({ lineWidth: 2, strokeStyle: ColorConstants.getColor(sunlit, "map_background_district") });

			// polygons
			for (let l = 0; l < lines.length; l++) {
				for (let i = 0; i < districts.length; i++) {
					let getSectorPos = (sectorX, sectorY) => this.getSectorPixelPos(dimensions, centered, sectorSize, sectorX, sectorY);
					MapElements.drawDistrict(ctx, pointsByDistrict[i], lines[l], getSectorPos);
				}
			}
			
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
			let allItems = GameGlobals.sectorHelper.getLocationScavengeableItems(sector, true);
			
			let drawSectorShape = function (color, size) {
				let isKeySector = isScouted && (hasCampOnSector || sectorPassages.passageUp || sectorPassages.passageDown);
				MapElements.drawSectorShape(ctx, sectorXpx, sectorYpx, sectorSize, size, color, isKeySector);
			};
			
			let drawSectorBorder = function (color, isAffected, partial, shadowBlur) {
				let isKeySector = isScouted && (hasCampOnSector || sectorPassages.passageUp || sectorPassages.passageDown);
				MapElements.drawSectorBorder(ctx, sectorXpx, sectorYpx, sectorSize, color, isAffected, partial, isKeySector, shadowBlur);
			};

			// border(s) for sectors with hazards or sunlight
			let isLevelSunlit = level == GameGlobals.worldState.getSurfaceLevel();
			let isSectorSunlit = sectorFeatures.sunlit > 0;
			let showBorderForSunlit = (!isLevelSunlit || !isLocationSunlit) && MapUtils.showSunlightInMapMode(options.mapMode);
			let hasSunlitBorder = isSectorSunlit && showBorderForSunlit;
			
			let showBorderForHazard = MapUtils.showHazardsInMapMode(options.mapMode);
			let hasSectorHazard = GameGlobals.sectorHelper.hasHazards(sectorFeatures, statusComponent);
			
			if (this.showSectorHazards(sector)) {
				let hasHazardBorder = hasSectorHazard && showBorderForHazard;
				if (hasHazardBorder) {
					let borderColor = this.getSectorHazardBorderColor(options.mapMode, sector);
					let isAffected = GameGlobals.sectorHelper.isAffectedByHazard(sectorFeatures, statusComponent, itemsComponent);
					let hazards = GameGlobals.sectorHelper.getEffectiveHazards(sectorFeatures, statusComponent, itemsComponent);
					let mainHazard = hazards.getMainHazard();
					let isThickBorder = isAffected || mainHazard == "debris";
					drawSectorBorder(borderColor, isThickBorder, false);
				}
				
				if (hasSunlitBorder) {
					let extraBorderColor = ColorConstants.getColor(isLocationSunlit, "map_stroke_sector_sunlit");
					let isPartial = hasHazardBorder && options.mapMode != MapUtils.MAP_MODE_HAZARDS;
					let shadowBlur = sectorFeatures.sunlit >= 1 ? 10 : 0;
					let isThickBorder = sectorFeatures.sunlit >= 1 ? true : false;
					drawSectorBorder(extraBorderColor, isThickBorder, isPartial, shadowBlur);
				}
			}
			
			// border for ingredients in scavenge mode
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
			let numUnexaminedSpots = GameGlobals.sectorHelper.getNumUnexaminedSpots(sector);
			
			let isLocationSunlit = $("body").hasClass("sunlit");
			let isScouted = statusComponent.scouted;
			let isRevealed = isScouted || this.isMapRevealed;
			let isPartiallyRevealed = isRevealed || this.isMapEasyMode;
			
			let mapModeHasPOIs = MapUtils.showPOIsInMapMode(options.mapMode);
			let locationShowPOIs = isPartiallyRevealed || GameGlobals.playerHelper.getPartyAbilityLevel(ExplorerConstants.abilityType.DETECT_POI) > 0;
			
			let iconSize = 10;

			let showStashes = this.isMapEasyMode;
			let hasStashOnSector = sectorFeatures.stashes.length > 0 && sectorFeatures.stashes.length > statusComponent.stashesFound.length;
			
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

			let features = {
				canHaveCampOnSector: sectorFeatures.canHaveCamp(),
				hasBeacon: sectorImprovements.getCount(improvementNames.beacon) > 0,
				hasCampOnLevel: hasCampOnLevel,
				hasCampOnSector: hasCampOnSector,
				hasClearableWorkshop: sector.has(WorkshopComponent) && sector.get(WorkshopComponent).isClearable,
				hasGraffiti: statusComponent.graffiti,
				hasGreenhouse: sectorImprovements.getCount(improvementNames.greenhouse) > 0,
				hasIngredients: allItems.length > 0,
				hasKnownIngredients: knownItems.length > 0,
				hasPassageDown: sectorPassages.passageDown,
				hasPassageUp: sectorPassages.passageUp,
				hasStashOnSector: hasStashOnSector,
				hasTrainTracks: sectorFeatures.hasFeature(WorldConstants.FEATURE_TRAIN_TRACKS_NEW) || sectorFeatures.hasFeature(WorldConstants.FEATURE_TRAIN_TRACKS_OLD),
				hasUnexaminedSpots: numUnexaminedSpots > 0,
				hasUnscoutedLocales: numUnscoutedLocales > 0,
				isInvestigatable: GameGlobals.sectorHelper.canBeInvestigated(sector),
				isPartiallyRevealed: isPartiallyRevealed,
				isPassageTypeAvailable: GameGlobals.movementHelper.isPassageTypeAvailable(sector, PositionConstants.DIRECTION_DOWN) || GameGlobals.movementHelper.isPassageTypeAvailable(sector, PositionConstants.DIRECTION_UP),
				isRevealed: isRevealed,
			};

			let iconOptions = {
				hideUnknownIcon: hideUnknownIcon,
				showIngredientIcons: showIngredientIcons,
				showPOIs: mapModeHasPOIs && locationShowPOIs,
				showStashes: showStashes,
				useSunlitIcon: isLocationSunlit,
			};
			
			return MapElements.drawSectorIcon(ctx, sectorXpx, sectorYpx, sectorSize, features, iconOptions);
		},
		
		drawResourcesOnSector: function (ctx, options, sector, knownResources, sectorXpx, sectorYpx, sectorSize) {
			let sectorImprovements = sector.get(SectorImprovementsComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorStatus = sector.get(SectorStatusComponent);
			
			let hasHeap = function (resourceName) {
				if (!sectorFeatures.heapResource) return false;
				if (sectorStatus.getHeapScavengedPercent() >= 100) return false;
				if (sectorFeatures.heapResource !== resourceName) return false;
				return true;
			};

			let features = {};
			features.knownResources = knownResources;
			features.resourcesCollectable = sectorFeatures.resourcesCollectable;
			features.resourcesScavengable = sectorFeatures.resourcesScavengable;
			features.hasCollectorWater = sectorImprovements.getCount(improvementNames.collector_water) > 0;
			features.hasCollectorFood = sectorImprovements.getCount(improvementNames.collector_food) > 0;
			features.hasSpring = sectorFeatures.hasSpring;
			features.hasHeap = hasHeap(resourceNames.metal);

			options.isBigSectorSize = sectorSize >= this.getSectorSize(true);
			
			MapElements.drawResourcesOnSector(ctx, sectorXpx, sectorYpx, sectorSize, features, options);
		},

		drawMovementLinesOnCanvas: function (ctx, options, sector, sectorPos, sectorXpx, sectorYpx, sectorSize, sectorPadding) {
			let sunlit = $("body").hasClass("sunlit");
			let sectorPassages = sector.get(PassagesComponent);
			let sectorMiddleX = sectorXpx + sectorSize * 0.5;
			let sectorMiddleY = sectorYpx + sectorSize * 0.5;
			let sectorStatus = this.getSectorStatus(sector);
			
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var neighbourPos = PositionConstants.getPositionOnPath(sectorPos, direction, 1);
				var neighbour = GameGlobals.levelHelper.getSectorByPosition(options.mapPosition.level, neighbourPos.sectorX, neighbourPos.sectorY);
				if (neighbour) {
					let neighbourStatus = this.getSectorStatus(neighbour);
					let blocker = sectorPassages.getBlocker(direction);
					let isBlocked = blocker != null && GameGlobals.movementHelper.isBlocked(sector, direction);
					
					let isVisited = SectorConstants.isVisited(sectorStatus) && SectorConstants.isVisited(neighbourStatus);
					let lineColor = ColorConstants.getColor(sunlit, "map_stroke_movementlines");
					ctx.strokeStyle = lineColor;
					ctx.lineWidth = MapUtils.getMovementLineWidth(options.zoomLevel);
					
					let distX = neighbourPos.sectorX - sectorPos.sectorX;
					let distY = neighbourPos.sectorY - sectorPos.sectorY;
					
					MapElements.drawMovementLine(ctx, sectorMiddleX, sectorMiddleY, sectorSize, distX, distY, sectorPadding);

					if (blocker) {
						var blockerType = blocker.type;
						var blockerX = sectorMiddleX + sectorSize * (1 + sectorPadding)/2 * distX;
						var blockerY = sectorMiddleY + sectorSize * (1 + sectorPadding)/2 * distY;
						
						if (!isBlocked && !MapUtils.showClearedBlockersInMapMode(options.mapMode)) continue;
						
						MapElements.drawMovementBlocker(ctx, sunlit, sectorSize, blockerX, blockerY, blockerType, isBlocked);
					}
				}
			}
		},
		
		foreachVisibleSector: function (level, centered, dimensions, visibleSectors, cb) {
			let sectorSize = this.getSectorSize(centered);
			for (let y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
				for (let x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
					let sector = visibleSectors[x + "." + y];
					let sectorStatus = this.getSectorStatus(sector);
					if (this.showSectorOnMap(centered, sector, sectorStatus)) {
						let sectorPos = new PositionVO(level, x, y);
						let sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).x;
						let sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).y;
						cb.apply(this, [ sector, sectorPos, sectorStatus, sectorXpx, sectorYpx ]);
					}
				}
			}
		},

		getSectorStatus: function (sector) {
			let status = GameGlobals.sectorHelper.getSectorStatus(sector);
			if (this.isMapEasyMode && status == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE) {
				status = SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE;
			}
			return status;
		},

		showSectorOnMap: function (centered, sector, sectorStatus) {
			if (!sector) return false;
			if (this.isMapRevealed) return true;
			return sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
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
			let level = mapPosition.level;
			let levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent);
			let sectorSize = this.getSectorSize(centered);

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
					sectorStatus = this.getSectorStatus(sector);
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
			
			return dimensions;
		},
		
		getBackgroundColor: function (level, sunlit) {
			let isLevelSunlit = level == GameGlobals.worldState.getSurfaceLevel();
			if (isLevelSunlit) {
				return ColorConstants.getColor(sunlit, "map_background_surface");
			} else {
				return ColorConstants.getColor(sunlit, "map_background_default");
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

		getAreaSize: function (size, centered) {
			if (size <= 0) return 0;
			let sectorSize = this.getSectorSize(centered);
			let sectorPadding = this.getSectorPadding(centered);
			if (size == 1) return sectorSize;
			return (sectorSize + sectorSize * sectorPadding) * size;
		},

		getSectorFill: function (mapMode, sector) {
			let sunlit = $("body").hasClass("sunlit");
			let sectorStatus = this.getSectorStatus(sector);
			
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
				return MapUtils.getSectorHazardBorderColor(mainHazard, sunlit);
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
				} else if (mainHazard == "flooded") {
					return ColorConstants.getColor(sunlit, "map_fill_sector_flooded");
				} else if (mainHazard == "territory") {
					return ColorConstants.getColor(sunlit, "map_fill_sector_territory");
				} else {
					return ColorConstants.getColor(sunlit, "map_fill_sector_hazard");
				}
			}
			
			return ColorConstants.colors.global.transparent;
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
			let sectorStatus = this.getSectorStatus(sector);
			return SectorConstants.isLBasicInfoVisible(sectorStatus) || this.isMapRevealed || this.isInHazardDetectionRange(sector);
		},

	});

	return UIMapHelper;
});
