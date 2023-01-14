define([
	'ash',
	'utils/MapUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/ItemConstants',
	'game/constants/LevelConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/TextConstants',
	'game/constants/TradeConstants',
	'game/constants/UIConstants',
	'game/nodes/PlayerLocationNode',
	'game/nodes/PlayerPositionNode',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/common/VisitedComponent',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/player/ItemsComponent',
	'game/components/type/LevelComponent',
	'game/systems/CheatSystem',
], function (Ash, MapUtils, GameGlobals, GlobalSignals, GameConstants, ItemConstants, LevelConstants, MovementConstants, PositionConstants, SectorConstants, TextConstants, TradeConstants, UIConstants,
	PlayerLocationNode, PlayerPositionNode,
	CampComponent, PositionComponent, VisitedComponent, EnemiesComponent, PassagesComponent, SectorControlComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorStatusComponent, SectorImprovementsComponent, WorkshopComponent, ItemsComponent, LevelComponent,
	CheatSystem) {

	var UIOutMapSystem = Ash.System.extend({

		context: "UIOutMapSystem",
		
		playerPositionNodes: null,
		playerLocationNodes: null,
		
		MAP_STYLE_CANVAS: "canvas",
		MAP_STYLE_ASCII: "ascii",

		constructor: function () {
			this.initElements();
			this.updateHeight();
		},

		addToEngine: function (engine) {
			this.engine = engine;
			$("#select-header-level").bind("change", $.proxy(this.onLevelSelectorChanged, this));
			$("#select-header-mapmode").bind("change", $.proxy(this.onMapModeSelectorChanged, this));
			$("#select-header-mapstyle").bind("change", $.proxy(this.onMapStyleSelectorChanged, this));
			GameGlobals.uiMapHelper.enableScrollingForMap("mainmap");
			this.playerPositionNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
			GlobalSignals.add(this, GlobalSignals.windowResizedSignal, this.onResize);
			GlobalSignals.add(this, GlobalSignals.clearBubblesSignal, this.clearBubble);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
			$("#select-header-level").unbind("change", $.proxy(this.onLevelSelectorChanged, this));
			$("#select-header-mapmode").unbind("change", $.proxy(this.onMapModeSelectorChanged, this));
			$("#select-header-mapstyle").unbind("change", $.proxy(this.onMapStyleSelectorChanged, this));
			GameGlobals.uiMapHelper.disableScrollingForMap("mainmap");
			this.playerPositionNodes = null;
			this.playerLocationNodes = null;
		},
		
		initElements: function () {
			var sys = this;
			$("#btn-cheat-teleport").click(function () {
				sys.teleport();
			});
			$("#btn-mainmap-sector-details-next").click($.proxy(this.selectNextSector, this));
			$("#btn-mainmap-sector-details-previous").click($.proxy(this.selectPreviousSector, this));
			$("#btn-mainmap-sector-details-camp").click($.proxy(this.selectCampSector, this));
			$("#btn-mainmap-sector-details-unvisited").click($.proxy(this.selectUnvisitedSector, this));
			$("#btn-mainmap-sector-details-unscouted").click($.proxy(this.selectUnscoutedSector, this));
			$("#btn-mainmap-sector-details-ingredients").click($.proxy(this.selectIngredientSector, this));
			
			$("#btn-mainmap-sector-path").click($.proxy(this.showSectorPath, this));
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			GameGlobals.uiFunctions.toggle("#switch-map .bubble", !GameGlobals.gameState.uiStatus.mapVisited);
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.map) return;
			GameGlobals.gameState.uiStatus.mapVisited = true;
		},
		
		updateHeight: function () {
			var maxHeight = Math.max(198, $(window).height() - 380);
			$("#mainmap-container").css("maxHeight", maxHeight + "px");
		},

		initLevelSelector: function () {
			$("#select-header-level").empty();
			var html = "";
			var surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
			var groundLevel = GameGlobals.gameState.getGroundLevel();
			for (let i = surfaceLevel; i >= groundLevel; i--) {
				html += "<option value='" + i + "' id='map-level-selector-level-" + i + "'>Level " + i + "</option>"
			}
			$("#select-header-level").append(html);
		},
		
		initMapModeSelector: function () {
			$("#select-header-mapmode").empty();
			var html = "";
			html += "<option value='" + MapUtils.MAP_MODE_DEFAULT + "' id='map-style-selector-" + this.MAP_MODE_DEFAULT + "'>Default</option>";
			html += "<option value='" + MapUtils.MAP_MODE_HAZARDS + "' id='map-style-selector-" + this.MAP_MODE_HAZARDS + "'>Hazards</option>";
			html += "<option value='" + MapUtils.MAP_MODE_SCAVENGING + "' id='map-style-selector-" + this.MAP_MODE_SCAVENGING + "'>Scavenging</option>";
			$("#select-header-mapmode").append(html);
		},
		
		initMapStyleSelector: function () {
			$("#select-header-mapstyle").empty();
			var html = "";
			html += "<option value='" + this.MAP_STYLE_CANVAS + "' id='map-style-selector-" + this.MAP_STYLE_CANVAS + "'>Canvas</option>";
			html += "<option value='" + this.MAP_STYLE_ASCII + "' id='map-style-selector-" + this.MAP_STYLE_CANVAS + "'>ASCII</option>";
			$("#select-header-mapstyle").append(html);
		},

		updateLevelSelector: function () {
			var surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
			var groundLevel = GameGlobals.gameState.getGroundLevel();
			var countVisible = 0;
			for (let i = surfaceLevel; i >= groundLevel; i--) {
				let isVisible = GameGlobals.uiMapHelper.isMapRevealed || GameGlobals.levelHelper.getLevelEntityForPosition(i).has(VisitedComponent);
				let $elem = $("#map-level-selector-level-" + i);
				let levelStats = GameGlobals.levelHelper.getLevelStats(i);
				let isCleared = levelStats.percentClearedSectors >= 1;
				GameGlobals.uiFunctions.toggle($elem, isVisible);
				if (isVisible) {
					$elem.text("Level " + i + " " + (isCleared ? "(x)" : "(-)"));
					countVisible++;
				}
			}
			GameGlobals.uiFunctions.toggle($("#select-header-level"), countVisible > 1);
		},

		selectLevel: function (level) {
			$("#select-header-level").val(level);
			this.selectedLevel = level;
			this.selectedSector = null;
			this.updateMap();
			this.updateSector();
			this.centerMap();
		},

		selectSector: function (level, x, y) {
			this.selectedSector = GameGlobals.levelHelper.getSectorByPosition(level, x, y);
			GameGlobals.uiMapHelper.setSelectedSector(this.map, this.selectedSector);
			this.updateSector();
		},
		
		selectMapMode: function (mapMode) {
			$("#select-header-mapmode").val(mapMode);
			
			this.selectedMapMode = mapMode;
			$("#mainmap-sector-details-res-sca").closest("tr").toggleClass("current", this.selectedMapMode == MapUtils.MAP_MODE_SCAVENGING);
			$("#mainmap-sector-details-res-col").closest("tr").toggleClass("current", this.selectedMapMode == MapUtils.MAP_MODE_SCAVENGING);
			$("#mainmap-sector-details-threats").closest("tr").toggleClass("current", this.selectedMapMode == MapUtils.MAP_MODE_HAZARDS);
			$("#mainmap-sector-details-blockers").closest("tr").toggleClass("current", this.selectedMapMode == MapUtils.MAP_MODE_HAZARDS);
			$("#mainmap-sector-details-env").closest("tr").toggleClass("current", this.selectedMapMode == MapUtils.MAP_MODE_HAZARDS);
			
			this.updateHeader();
			this.updateMap();
		},
		
		selectMapStyle: function (mapStyle) {
			$("#select-header-mapstyle").val(mapStyle);
			
			this.selectedMapStyle = mapStyle;
			GameGlobals.gameState.settings.mapStyle = mapStyle;
			$("#mainmap-container-container").toggle(mapStyle == this.MAP_STYLE_CANVAS);
			$("#mainmap-sector-details-empty-text-canvas").toggle(mapStyle == this.MAP_STYLE_CANVAS);
			$("#mainmap-container-ascii").toggle(mapStyle == this.MAP_STYLE_ASCII);
			$("#mainmap-sector-details-empty-text-ascii").toggle(mapStyle == this.MAP_STYLE_ASCII);
			
			this.updateMap();
			this.centerMap();
		},

		updateMap: function () {
			if (!this.playerPositionNodes || !this.playerPositionNodes.head) return;
			
			var mapPosition = this.playerPositionNodes.head.position.getPosition();
			var sys = this;
			if (this.selectedLevel || this.selectedLevel == 0) {
				mapPosition.level = this.selectedLevel;
				mapPosition.sectorX = 0;
				mapPosition.sectorY = 0;
			}
			
			var levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(mapPosition.level);
			var hasCampOnLevel = levelEntity.get(CampComponent) !== null;
			GameGlobals.uiFunctions.toggle($("#btn-mainmap-sector-details-camp"), hasCampOnLevel);
			
			let mapStatus = GameGlobals.levelHelper.getLevelStats(this.selectedLevel);
			let hasUnvisitedSectors = mapStatus.percentVisitedSectors < 1;
			let hasUnscoutedSectors = mapStatus.countClearedSectors != mapStatus.countScoutedSectors;
			let hasIngredientSectors = mapStatus.countKnownIngredientSectors > 0;
			
			GameGlobals.uiFunctions.toggle($("#btn-mainmap-sector-details-unvisited"), hasUnvisitedSectors);
			GameGlobals.uiFunctions.toggle($("#btn-mainmap-sector-details-unscouted"), hasUnscoutedSectors);
			GameGlobals.uiFunctions.toggle($("#btn-mainmap-sector-details-ingredients"), hasIngredientSectors);
				
			if (this.selectedMapStyle == this.MAP_STYLE_CANVAS) {
				$("#mainmap-container-container").css("opacity", 0);
				
				setTimeout(function () {
					sys.map = GameGlobals.uiMapHelper.rebuildMap("mainmap", "mainmap-overlay", mapPosition, -1, false, sys.selectedMapMode, function (level, x, y) {
						sys.onSectorSelected(level, x, y);
					});
					$("#mainmap-container-container").css("opacity", 1);
					GameGlobals.uiMapHelper.setSelectedSector(sys.map, sys.selectedSector);
				}, 10);
			} else {
				let ascii = GameGlobals.uiMapHelper.getASCII(this.selectedMapMode, mapPosition, false);
				let rows = ascii.split("\n").length;
				rows = Math.min(rows, 25);
				rows = Math.max(rows, 5);
				$("#mainmap-container-ascii textarea").text(ascii);
				$("#mainmap-container-ascii textarea").attr("rows", rows)
				$("#mainmap-ascii-legend").text(GameGlobals.uiMapHelper.getASCIILegend(this.selectedMapMode));
			}
		},

		updateSector: function () {
			let hasSector = this.selectedSector !== null;
			let path = this.findPathTo(this.selectedSector);
			let hasPath = hasSector && path && path.length > 0;
			
			let position = hasSector ? this.selectedSector.get(PositionComponent).getPosition() : null;
			let playerPosition = this.playerLocationNodes.head.position.getPosition();
			let levelDiff = hasSector ? Math.abs(position.level - playerPosition.level) : 0;
			
			GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content-empty"), !hasSector);
			GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content"), hasSector);
			GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content-debug"), hasSector && GameConstants.isCheatsEnabled);
			GameGlobals.uiFunctions.toggle($("#btn-mainmap-sector-path"), hasSector && hasPath && levelDiff <= 1);

			if (hasSector) {
				let statusComponent = this.selectedSector.get(SectorStatusComponent);
				var isScouted = statusComponent.scouted;
				var isVisited = this.selectedSector.has(VisitedComponent);
				var sectorFeatures = this.selectedSector.get(SectorFeaturesComponent);
				var features = GameGlobals.sectorHelper.getTextFeatures(this.selectedSector);
				var header = isVisited ? TextConstants.getSectorName(isScouted, features) : "Sector";
				$("#mainmap-sector-details-name").text(header);
				$("#mainmap-sector-details-pos").text(position.getInGameFormat(false));
				$("#mainmap-sector-details-district").text(this.getDistrictText(this.selectedSector));
				$("#mainmap-sector-details-distance").text(this.getDistanceText(this.selectedSector));
				$("#mainmap-sector-details-poi").text(this.getPOIText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-res-sca").text(this.getResScaText(this.selectedSector, isScouted, statusComponent, sectorFeatures));
				$("#mainmap-sector-details-res-col").text(this.getCollectorsText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-threats").text(this.getThreatsText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-blockers").text(this.getBlockersHTML(this.selectedSector, isScouted));
				$("#mainmap-sector-details-env").html(this.getEnvironmentHTML(this.selectedSector, isScouted));
				$("#mainmap-sector-debug-text").text("Zone: " + sectorFeatures.zone);
			}
		},

		centerMap: function (pos, animate) {
			if (this.selectedMapStyle != this.MAP_STYLE_CANVAS) return;
			if (!this.playerPositionNodes || !this.playerPositionNodes.head) return;
			setTimeout(() => {
				let hasSelectedLevel = this.selectedLevel || this.selectedLevel == 0;
				
				let mapPosition = pos || {};
				if (!pos) {
					let playerPos = this.playerPositionNodes.head.position.getPosition();
					if (this.selectedSector) {
						mapPosition = selectedSector.get(PositionComponent).getPosition();
					} else if (hasSelectedLevel && this.selectedLevel != playerPos.level) {
						let campSector = GameGlobals.levelHelper.getCampSectorOnLevel(this.selectedLevel);
						if (campSector) {
							mapPosition = campSector.get(PositionComponent).getPosition();
						} else {
							mapPosition.level = this.selectedLevel;
		   					mapPosition.sectorX = 0;
		   					mapPosition.sectorY = 0;
		   				}
					} else {
						mapPosition = playerPos;
					}
				}
				
				GameGlobals.uiMapHelper.centerMapToPosition("mainmap", mapPosition, false, animate);
			}, 1);
		},
		
		selectNextSector: function () {
			let newSector = this.getNextSelectableSector(1);
			if (!newSector) return null;
			let pos = newSector.get(PositionComponent);
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
			this.centerMap(pos, true);
		},
		
		selectPreviousSector: function () {
			let newSector = this.getNextSelectableSector(-1);
			if (!newSector) return null;
			let pos = newSector.get(PositionComponent);
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
			this.centerMap(pos, true);
		},
		
		selectCampSector: function () {
			let level = this.selectedLevel || 13;
			let campNode = GameGlobals.campHelper.getCampNodeForLevel(level);
			if (!campNode) return;
			let pos = campNode.position;
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
			this.centerMap(pos, true);
		},
		
		selectUnvisitedSector: function () {
			let newSector = this.getNextSelectableSector(1, (sector) => {
				let sectorStatus = SectorConstants.getSectorStatus(sector);
				return sectorStatus == SectorConstants.MAP_SECTOR_STATUS_REVEALED_BY_MAP || sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE;
			});
			if (!newSector) return null;
			let pos = newSector.get(PositionComponent);
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
			this.centerMap(pos, true);
		},
		
		selectUnscoutedSector: function () {
			let newSector = this.getNextSelectableSector(1, (sector) => {
				let sectorStatus = SectorConstants.getSectorStatus(sector);
				return sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED || sectorStatus == SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED;
			});
			if (!newSector) return null;
			let pos = newSector.get(PositionComponent);
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
			this.centerMap(pos, true);
		},
		
		selectIngredientSector: function () {
			let newSector = this.getNextSelectableSector(1, (sector) => {
				let sectorFeatures = sector.get(SectorFeaturesComponent);
				return GameGlobals.sectorHelper.hasSectorVisibleIngredients(sector);
			});
			if (!newSector) return null;
			let pos = newSector.get(PositionComponent);
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
			this.centerMap(pos, true);
		},
		
		getNextSelectableSector: function (offset, filter) {
			let level = this.selectedLevel || 13;
			let sectors = GameGlobals.levelHelper.getSectorsByLevel(level);
			let currentIndex = sectors.indexOf(this.selectedSector);
			let startIndex = currentIndex >= 0 ? currentIndex : 0;
			let newIndex = startIndex;
			
			let checked = 0;
			let i = startIndex;
			while (checked < sectors.length) {
				i += offset;
				checked++;
				if (i < 0) i = sectors.length - 1;
				if (i >= sectors.length) i = 0;
				let sector = sectors[i];
				let sectorStatus = SectorConstants.getSectorStatus(sector);
				if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE) continue;
				if (filter && !filter(sector)) continue;
				newIndex = i;
				break;
			}
			
			return newIndex == null ? null : sectors[newIndex];
		},
		
		showSectorPath: function () {
			if (!this.selectedSector) return;
			let path = this.findPathTo(this.selectedSector);
			if (!path || path.length == 0) return;
			
			let position = this.selectedSector.get(PositionComponent).getPosition();
			let startPosition = this.playerLocationNodes.head.position.getPosition();
			let includeLevel = position.level != startPosition.level;
			let title = "Directions from " + startPosition.getInGameFormat(includeLevel) + " to " + position.getInGameFormat(includeLevel);
			
			let stretches = [];
			let previousPos = startPosition;
			for (let i = 0; i < path.length; i++) {
				let sector = path[i];
				let pos = sector.get(PositionComponent).getPosition();
				let direction = PositionConstants.getDirectionFrom(previousPos, pos);
				
				if (stretches.length == 0) {
					stretches.push({ startPos: previousPos, endPos: pos, direction: direction, steps: 1 });
				} else {
					let previousStretch = stretches[stretches.length - 1];
					if (direction == previousStretch.direction) {
						previousStretch.endPos = pos;
						previousStretch.steps = previousStretch.steps + 1;
						
					} else {
						stretches.push({ startPos: previousPos, endPos: pos, direction: direction, steps: 1 });
					}
				}
				
				previousPos = pos;
			}
			
			let instructions = [];
			for (let i = 0; i < stretches.length; i++) {
				let stretch = stretches[i];
				let isLast = i == stretches.length - 1;
				let isLevelChange = stretch.startPos.level != stretch.endPos.level;
				
				let instructionPreface = "";
				if (stretches.length > 1) {
					if (isLast && stretches.length > 3) instructionPreface = "finally, ";
					else if (isLevelChange) instructionPreface = "then, ";
				}
				
				let isPerpendicular = i > 0 && PositionConstants.isPerpendicular(stretch.direction, stretches[i-1].direction);
				
				let goVerb = isPerpendicular ? "turn" : "move";
				let stepNoun = stretch.steps > 1 ? "steps" : "step";
				let stepsPhrase = isLevelChange ? "" : "<span class='hl-functionality'>" + stretch.steps + "</span> " + stepNoun + " ";
				let endPosition = isLevelChange ? "level " + stretch.endPos.level : stretch.endPos.getInGameFormat();
				
				let instructionBase =
					goVerb + " " +
					stepsPhrase +
					"<span class='hl-functionality'>" + PositionConstants.getDirectionName(stretch.direction) + "</span>" +
					" to " + endPosition;
				
				let instruction = instructionPreface + " " + instructionBase;
				
				instructions.push(instruction);
			}
			
			let body = instructions.join("<br/>");
			
			GameGlobals.uiFunctions.showInfoPopup(title, body, null, null, null, true, false);
		},

		updateMapCompletionHint: function () {
			let level = this.selectedLevel;
			
			let levelTypeText = "";
			let levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent);
			let surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
			let groundLevel = GameGlobals.gameState.getGroundLevel();
			if (level == surfaceLevel) {
				levelTypeText = "This level is on the surface of the City. "
			} else if (level == groundLevel) {
				levelTypeText = "This level is on the Ground. ";
			} else if (!levelComponent.isCampable) {
				switch (levelComponent.notCampableReason) {
					case LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION:
					case LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION:
						levelTypeText = "This level is polluted. ";
						break;
					default:
						levelTypeText = "This level is uninhabited. ";
						break;
				}
			} else {
				base = "ui-level-default";
				desc = "outside | regular level";
			}
			
			let levelPronoun = levelTypeText.length > 0 ? "It" : "This level";
			let levelLocation = levelTypeText.length > 0 ? "" : " on this level";
			
			let mapStatus = GameGlobals.levelHelper.getLevelStats(level);
			let mapStatusText = "There are still many unvisited streets" + levelLocation + ".";
			if (mapStatus.percentClearedSectors >= 1)
				mapStatusText = levelPronoun + " has been thoroughly explored.";
			else if (mapStatus.percentScoutedSectors >= 1)
				mapStatusText =  levelPronoun + " has been mapped, but there are unexplored locations left.";
			else if (mapStatus.percentRevealedSectors >= 1)
				mapStatusText = "There are still unscouted streets" + levelLocation + ".";
			else if (mapStatus.percentRevealedSectors >= 0.5)
				mapStatusText = "There are still some unvisited streets" + levelLocation + ".";

			$("#map-completion-hint").text(levelTypeText + "" + mapStatusText);
		},
		
		getDistrictText: function (sector) {
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			return sectorFeatures.isEarlyZone() ? "central" : "outer";
		},
		
		getPOIText: function (sector, isScouted) {
			if (!isScouted) return "?";
			
			var levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(sector.get(PositionComponent).level);
			var hasCampOnLevel = levelEntity.get(CampComponent) !== null;
			var sectorFeatures = sector.get(SectorFeaturesComponent);
			var sectorPassages = sector.get(PassagesComponent);
			var statusComponent = this.selectedSector.get(SectorStatusComponent);
			var localesComponent = sector.get(SectorLocalesComponent);
			var improvements = sector.get(SectorImprovementsComponent);
			var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
			
			let result = [];
			if (sector.has(CampComponent)) result.push("camp");
			if (sector.has(WorkshopComponent) && sector.get(WorkshopComponent).isClearable) result.push("workshop");
			if (improvements.getCount(improvementNames.greenhouse)) result.push("greenhouse");
			if (!hasCampOnLevel && sectorFeatures.canHaveCamp()) result.push("good place for camp");
			if (sectorPassages.passageUp) {
				var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
					improvements.getCount(improvementNames.passageUpElevator) +
					improvements.getCount(improvementNames.passageUpHole) > 0;
				result.push(TextConstants.getPassageDescription(sectorPassages.passageUp, PositionConstants.DIRECTION_UP, passageUpBuilt, true));
			}
			if (sectorPassages.passageDown) {
				var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
					improvements.getCount(improvementNames.passageDownElevator) +
					improvements.getCount(improvementNames.passageDownHole) > 0;
				result.push(TextConstants.getPassageDescription(sectorPassages.passageDown, PositionConstants.DIRECTION_DOWN, passageDownBuilt, true));
			}
			if (unScoutedLocales > 0) result.push("unscouted locales");
			if (sectorFeatures.hasSpring) result.push(TextConstants.getSpringName(sectorFeatures));
			
			for (let i = 0; i < localesComponent.locales.length; i++) {
				var locale = localesComponent.locales[i];
				if (statusComponent.isLocaleScouted(i)) {
					if (locale.type == localeTypes.tradingpartner) {
						var campOrdinal = GameGlobals.gameState.getCampOrdinal(sector.get(PositionComponent).level);
						var partner = TradeConstants.getTradePartner(campOrdinal);
						if (partner) {
							result.push(partner.name + " (trade partner)");
						}
					}
				}
			}
			
			
			if (improvements.getCount(improvementNames.beacon) > 0) {
				result.push("beacon");
			}
			
			if (result.length < 1) return "-";
			else return result.join(", ");
		},
		
		getResScaText: function (sector, isScouted, statusComponent, featuresComponent) {
			let scavengedPercent = UIConstants.roundValue(statusComponent.getScavengedPercent());
			let investigatedPercent = UIConstants.roundValue(statusComponent.getInvestigatedPercent());
			
			let result = "";
			let resources = GameGlobals.sectorHelper.getLocationDiscoveredResources(sector);
			let knownResources = GameGlobals.sectorHelper.getLocationKnownResources(sector);
			let items = GameGlobals.sectorHelper.getLocationDiscoveredItems(sector);
			let knownItems = GameGlobals.sectorHelper.getLocationKnownItems(sector);
			let allItems = GameGlobals.sectorHelper.getLocationScavengeableItems(sector);
			let showIngredients = GameGlobals.sectorHelper.hasSectorVisibleIngredients(sector);
			if (resources.length < 1 && !showIngredients) {
				result = "-";
			} else {
				if (knownResources.length > 0) result += TextConstants.getScaResourcesString(resources, knownResources, featuresComponent.resourcesScavengable);
				if (knownResources.length > 0 && showIngredients) result += ", ";
				if (showIngredients) result += TextConstants.getScaItemString(items, knownItems, featuresComponent.itemsScavengeable);
			}
			
			result += " (" + scavengedPercent + "% scavenged) ";
			
			if (investigatedPercent > 0) {
				result += " (" + investigatedPercent + "% investigated) ";
			}
			
			return result;
		},
		
		getCollectorsText: function (sector, isScouted) {
			var improvements = sector.get(SectorImprovementsComponent);
			var featuresComponent = sector.get(SectorFeaturesComponent);
			
			var collectorFood = improvements.getVO(improvementNames.collector_food);
			var collectorWater = improvements.getVO(improvementNames.collector_water);
			
			var result1 = [];
			var result2 = [];
			if (isScouted) {
				if (collectorFood.count === 1) result1.push("1 trap");
				if (collectorFood.count > 1) result1.push("traps");
				if (collectorFood.count == 0 && featuresComponent.resourcesCollectable.food > 0) result2.push ("food")
				if (collectorWater.count === 1) result1.push("1 bucket");
				if (collectorWater.count > 1) result1.push("buckets");
				if (collectorWater.count == 0 && featuresComponent.resourcesCollectable.water > 0) result2.push ("water")
			}
			
			let part1 = "-";
			if (result1.length > 0) part1 = result1.join(", ");
			
			let part2 = "";
			if (result2.length > 0) part2 = " (can collect " + result2.join(", ") + ")";
			return part1 + part2;
		},
		
		getThreatsText: function (sector, isScouted) {
			if (!isScouted) return "?";
			var sectorControlComponent = sector.get(SectorControlComponent);
			var enemiesComponent = sector.get(EnemiesComponent);
			if (enemiesComponent.hasEnemies) {
				return TextConstants.getEnemyNoun(enemiesComponent.possibleEnemies, true);
			} else {
				return "-"
			}
		},
		
		getBlockersHTML: function (sector, isScouted) {
			if (!isScouted) return "?";
			let result = [];
			
			let position = sector.get(PositionComponent);
			let passagesComponent = sector.get(PassagesComponent);
			for (let i in PositionConstants.getLevelDirections()) {
				let direction = PositionConstants.getLevelDirections()[i];
				let directionName = PositionConstants.getDirectionName(direction);
				let blocker = passagesComponent.getBlocker(direction);
				if (blocker) {
					let gangComponent = GameGlobals.levelHelper.getGangComponent(position, direction);
					let enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
					let blockerName = TextConstants.getMovementBlockerName(blocker, enemiesComponent, gangComponent).toLowerCase();
					if (GameGlobals.movementHelper.isBlocked(sector, direction)) {
						let blockerType = blocker.type;
						let isGang = blockerType === MovementConstants.BLOCKER_TYPE_GANG;
						result.push(blockerName + " (" + directionName + ")");
					}
				}
			}
			
			if (result.length < 1) return "-";
			else return result.join(", ");
		},
		
		getEnvironmentHTML: function (sector, isScouted) {
			let isVisited = sector.has(VisitedComponent);
			if (!isVisited) return "?";
			let result = [];
			let featuresComponent = sector.get(SectorFeaturesComponent);
			let statusComponent = sector.get(SectorStatusComponent);
			let itemsComponent = this.playerPositionNodes.head.entity.get(ItemsComponent);
			let hazards = GameGlobals.sectorHelper.getEffectiveHazards(featuresComponent, statusComponent);
			
			let getHazardSpan = function (label, value, isWarning) {
				if (!value) return label;
				if (!isWarning) return label + " (" + value + ")";
				return label + " (<span class='warning'>" + value + "</span>)";
			};
			
			if (featuresComponent.sunlit) result.push("sunlit");
			if (hazards.debris > 0) result.push("debris");
			
			if (hazards.radiation > 0)
				result.push(getHazardSpan("radioactivity", hazards.radiation, hazards.radiation > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_radiation)));
			if (hazards.poison > 0)
				result.push(getHazardSpan("pollution", hazards.poison, hazards.poison > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_poison)));
			if (hazards.cold > 0)
				result.push(getHazardSpan("cold", hazards.cold, hazards.cold > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_cold)));
			
			if (result.length < 1) return "-";
			else return result.join(", ");
		},
		
		getDistanceText: function (sector) {
			var path = this.findPathTo(sector);
			var len = path ? path.length : "?";
			return len + " blocks";
		},
		
		findPathTo: function (sector) {
			if (!sector) return null;
			return GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, sector, { skipBlockers: true, skipUnvisited: false });
		},
		
		teleport: function () {
			if (!GameConstants.isCheatsEnabled) return;
			if (!this.selectedSector) return;
			var targetPosition = this.selectedSector.get(PositionComponent).getPosition();
			var cheatSystem = this.engine.getSystem(CheatSystem);
			cheatSystem.applyCheat(() => {
				cheatSystem.setPlayerPosition(targetPosition.level, targetPosition.sectorX, targetPosition.sectorY, false);
			});
			GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.out);
		},

		onSectorSelected: function (level, x, y) {
			this.selectSector(level, x, y);
		},

		onGameStarted: function () {
			this.initLevelSelector();
			this.initMapModeSelector();
			this.initMapStyleSelector();
			this.updateLevelSelector();
		},
		
		onResize: function () {
			this.updateHeight();
		},

		onTabChanged: function (tabID, tabProps) {
			if (tabID !== GameGlobals.uiFunctions.elementIDs.tabs.map) return;
			
			this.updateHeader();
			
			$("#select-header-mapmode").toggle(GameGlobals.playerHelper.hasItem("equipment_map_2"));
			
			this.selectMapStyle(GameGlobals.gameState.settings.mapStyle || this.MAP_STYLE_CANVAS);
			this.selectMapMode(GameGlobals.gameState.settings.mapMode || MapUtils.MAP_MODE_DEFAULT);
			
			var level = tabProps ? tabProps.level : this.playerPositionNodes.head.position.level;
			this.updateLevelSelector();
			this.selectLevel(level);
			if (tabProps) {
				this.selectSector(tabProps.level, tabProps.sectorX, tabProps.sectorY);
			}
			this.updateMap();
			this.centerMap();
			this.updateMapCompletionHint();
		},
		
		updateHeader: function () {
			$("#tab-header h2").text("Map (" + this.selectedMapMode + ")");
		},

		onLevelSelectorChanged: function () {
			let level = parseInt($("#select-header-level").val());
			if (this.selectedLevel === level) return;
			this.selectLevel(level);
			this.updateMapCompletionHint();
		},
		
		onMapModeSelectorChanged: function () {
			let mapMode = $("#select-header-mapmode").val();
			if (this.selectedMapMode === mapMode) return;
			this.selectMapMode(mapMode);
		},
		
		onMapStyleSelectorChanged: function () {
			let mapStyle = $("#select-header-mapstyle").val();
			if (this.selectedMapStyle === mapStyle) return;
			this.selectMapStyle(mapStyle);
		},

		clearBubble: function () {
			GameGlobals.gameState.uiStatus.mapVisited = true;
		}

	});

	return UIOutMapSystem;
});
