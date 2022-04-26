define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/ItemConstants',
	'game/constants/LevelConstants',
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
	'game/components/type/LevelComponent',
	'game/systems/CheatSystem'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, ItemConstants, LevelConstants, PositionConstants, SectorConstants, TextConstants, TradeConstants, UIConstants,
	PlayerLocationNode, PlayerPositionNode,
	CampComponent, PositionComponent, VisitedComponent, EnemiesComponent, PassagesComponent, SectorControlComponent, SectorFeaturesComponent, SectorLocalesComponent, SectorStatusComponent, SectorImprovementsComponent, WorkshopComponent, LevelComponent,
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
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			GameGlobals.uiFunctions.toggle("#switch-map .bubble", !GameGlobals.gameState.uiStatus.mapVisited);
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.map) return;
			GameGlobals.gameState.uiStatus.mapVisited = true;
		},
		
		updateHeight: function () {
			var maxHeight = Math.max(208, $(window).height() - 380);
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
		},

		selectSector: function (level, x, y) {
			this.selectedSector = GameGlobals.levelHelper.getSectorByPosition(level, x, y);
			GameGlobals.uiMapHelper.setSelectedSector(this.map, this.selectedSector);
			this.updateSector();
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
				
			if (this.selectedMapStyle == this.MAP_STYLE_CANVAS) {
				$("#mainmap-container-container").css("opacity", 0);
				
				setTimeout(function () {
					sys.map = GameGlobals.uiMapHelper.rebuildMap("mainmap", "mainmap-overlay", mapPosition, -1, false, function (level, x, y) {
						sys.onSectorSelected(level, x, y);
					});
					$("#mainmap-container-container").css("opacity", 1);
					GameGlobals.uiMapHelper.setSelectedSector(sys.map, sys.selectedSector);
				}, 10);
			} else {
				let ascii = GameGlobals.uiMapHelper.getASCII(mapPosition, false);
				let rows = ascii.split("\n").length;
				rows = Math.min(rows, 25);
				rows = Math.max(rows, 5);
				$("#mainmap-container-ascii textarea").text(ascii);
				$("#mainmap-container-ascii textarea").attr("rows", rows)
				$("#mainmap-ascii-legend").text(GameGlobals.uiMapHelper.getASCIILegend());
			}
		},

		updateSector: function () {
			var hasSector = this.selectedSector !== null;
			GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content-empty"), !hasSector);
			GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content"), hasSector);
			GameGlobals.uiFunctions.toggle($("#mainmap-sector-details-content-debug"), hasSector && GameConstants.isCheatsEnabled);

			if (hasSector) {
				let statusComponent = this.selectedSector.get(SectorStatusComponent);
				var position = this.selectedSector.get(PositionComponent).getPosition();
				var isScouted = statusComponent.scouted;
				var isVisited = this.selectedSector.has(VisitedComponent);
				var sectorFeatures = this.selectedSector.get(SectorFeaturesComponent);
				var features = GameGlobals.sectorHelper.getTextFeatures(this.selectedSector);
				var header = isVisited ? TextConstants.getSectorName(isScouted, features) : "Sector";
				$("#mainmap-sector-details-name").text(header);
				$("#mainmap-sector-details-pos").text(position.getInGameFormat(false));
				$("#mainmap-sector-details-poi").text(this.getPOIText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-res-sca").text(this.getResScaText(this.selectedSector, isScouted, statusComponent, sectorFeatures));
				$("#mainmap-sector-details-res-col").text(this.getCollectorsText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-threats").text(this.getThreatsText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-blockers").text(this.getBlockersText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-env").text(this.getEnvironmentText(this.selectedSector, isScouted));
				$("#mainmap-sector-details-distance").text(this.getDistanceText(this.selectedSector));
				$("#mainmap-sector-debug-text").text("Zone: " + sectorFeatures.zone);
			}
		},

		centerMap: function () {
			if (!this.playerPositionNodes || !this.playerPositionNodes.head) return;
			if (this.selectedMapStyle != this.MAP_STYLE_CANVAS) return;
			
			var mapPosition = this.playerPositionNodes.head.position.getPosition();
			if (this.selectedLevel || this.selectedLevel == 0) {
				mapPosition.level = this.selectedLevel;
				if (this.selectedSector) {
					var pos = this.selectedSector.get(PositionComponent);
					mapPosition.sectorX = pos.sectorX;
					mapPosition.sectorY = pos.sectorY;
				} else {
					mapPosition.sectorX = 0;
					mapPosition.sectorY = 0;
				}
			}
			GameGlobals.uiMapHelper.centerMapToPlayer("mainmap", mapPosition, false);
		},
		
		selectNextSector: function () {
			let newSector = this.getNextSelectableSector(1);
			if (!newSector) return null;
			let pos = newSector.get(PositionComponent);
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
		},
		
		selectPreviousSector: function () {
			let newSector = this.getNextSelectableSector(-1);
			if (!newSector) return null;
			let pos = newSector.get(PositionComponent);
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
		},
		
		selectCampSector: function () {
			let level = this.selectedLevel || 13;
			let campNode = GameGlobals.campHelper.getCampNodeForLevel(level);
			if (!campNode) return;
			let pos = campNode.position;
			this.selectSector(pos.level, pos.sectorX, pos.sectorY);
		},
		
		getNextSelectableSector: function (offset) {
			let level = this.selectedLevel || 13;
			let sectors = GameGlobals.levelHelper.getSectorsByLevel(level);
			let currentIndex = sectors.indexOf(this.selectedSector);
			let startIndex = currentIndex >= 0 ? currentIndex : 0;
			let newIndex = startIndex;
			
			let checked = 0;
			let i = startIndex;
			while (checked < sectors.length) {
				i += offset;
				if (i < 0) i = sectors.length - 1;
				if (i >= sectors.length) i = 0;
				let sector = sectors[i];
				let sectorStatus = SectorConstants.getSectorStatus(sector);
				if (sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE) continue;
				newIndex = i;
				break;
			}
			
			return newIndex == null ? null : sectors[newIndex];
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
			var mapStatusText = "There are still many unvisited streets" + levelLocation + ".";
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
						result.push(partner.name + " (trade partner)");
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
			
			let result = "";
			let resources = GameGlobals.sectorHelper.getLocationDiscoveredResources(sector);
			let items = GameGlobals.sectorHelper.getLocationDiscoveredItems(sector);
			if (resources.length < 1 && items.length < 1) {
				result = "-";
			} else {
				if (resources.length > 0) result += TextConstants.getScaResourcesString(resources, featuresComponent.resourcesScavengable);
				if (resources.length > 0 && items.length > 0) result += ", ";
				if (items.length > 0) result += items.map(itemID => ItemConstants.getItemByID(itemID).name.toLowerCase()).join(", ");
			}
			
			result += " (" + scavengedPercent + "% scavenged) ";
			
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
		
		getBlockersText: function (sector, isScouted) {
			if (!isScouted) return "?";
			let result = [];
			
			var position = sector.get(PositionComponent);
			var passagesComponent = sector.get(PassagesComponent);
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var directionName = PositionConstants.getDirectionName(direction);
				var blocker = passagesComponent.getBlocker(direction);
				if (blocker) {
					var gangComponent = GameGlobals.levelHelper.getGangComponent(position, direction);
					let enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
					let blockerName = TextConstants.getMovementBlockerName(blocker, enemiesComponent, gangComponent).toLowerCase();
					if (GameGlobals.movementHelper.isBlocked(sector, direction)) {
						result.push(blockerName + " (" + directionName + ")");
					}
				}
			}
			
			if (result.length < 1) return "-";
			else return result.join(", ");
		},
		
		getEnvironmentText: function (sector, isScouted) {
			var isVisited = sector.has(VisitedComponent);
			if (!isVisited) return "?";
			let result = [];
			var featuresComponent = sector.get(SectorFeaturesComponent);
			var statusComponent = sector.get(SectorStatusComponent);
			var hazards = GameGlobals.sectorHelper.getEffectiveHazards(featuresComponent, statusComponent);
			if (featuresComponent.sunlit) result.push("sunlit");
			if (hazards.radiation > 0) result.push("radioactivity (" + hazards.radiation + ")");
			if (hazards.poison > 0) result.push("pollution (" + hazards.poison + ")");
			if (hazards.cold > 0) result.push("cold (" + hazards.cold + ")");
			if (hazards.debris > 0) result.push("debris");
			
			if (result.length < 1) return "-";
			else return result.join(", ");
		},
		
		getDistanceText: function (sector) {
			var path = GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, sector, { skipBlockers: true, skipUnvisited: false });
			var len = path ? path.length : "?";
			return len + " blocks";
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
			this.initMapStyleSelector();
			this.updateLevelSelector();
		},
		
		onResize: function () {
			this.updateHeight();
		},

		onTabChanged: function (tabID, tabProps) {
			if (tabID !== GameGlobals.uiFunctions.elementIDs.tabs.map) return;
			
			$("#tab-header h2").text("Map");
			
			this.selectMapStyle(GameGlobals.gameState.settings.mapStyle || this.MAP_STYLE_CANVAS);
			
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

		onLevelSelectorChanged: function () {
			let level = parseInt($("#select-header-level").val());
			if (this.selectedLevel === level) return;
			this.selectLevel(level);
			this.updateMapCompletionHint();
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
