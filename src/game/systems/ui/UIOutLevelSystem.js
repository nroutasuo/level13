define([
    'ash',
    'game/constants/PlayerActionConstants',
    'game/constants/PlayerStatConstants',
    'game/constants/TextConstants',
    'game/constants/EnemyConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/sector/SectorNode',
    'game/nodes/sector/CampNode',
    'game/nodes/sector/VisitedSectorNode',
    'game/components/player/VisionComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/MovementOptionsComponent',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/components/common/CampComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/EnemiesComponent'
], function (
    Ash, PlayerActionConstants, PlayerStatConstants, TextConstants, EnemyConstants,
    PlayerPositionNode, PlayerLocationNode, SectorNode, CampNode, VisitedSectorNode,
    VisionComponent, PassagesComponent, SectorControlComponent, SectorFeaturesComponent, SectorLocalesComponent,
    MovementOptionsComponent,
    PositionComponent,
    VisitedComponent,
    CampComponent,
    SectorImprovementsComponent, SectorStatusComponent, EnemiesComponent
) {
    var UIOutLevelSystem = Ash.System.extend({
	
		uiFunctions : null,
		gameState : null,
		movementHelper: null,
		resourcesHelper: null,
		sectorHelper: null,
		
		engine: null,
		
		playerPosNodes: null,
		playerLocationNodes: null,
		sectorNodes: null,
		visitedSectorNodes: null,
		
		tabChangedSignal: null,
		playerMovedSignal: null,
		
		visitedSectors: 0,
	
		constructor: function (uiFunctions, tabChangedSignal, gameState, movementHelper, resourceHelper, sectorHelper, playerMovedSignal) {
			this.uiFunctions = uiFunctions;
			this.gameState = gameState;
			this.movementHelper = movementHelper;
			this.resourcesHelper = resourceHelper;
			this.sectorHelper = sectorHelper;
			this.tabChangedSignal = tabChangedSignal;
			this.playerMovedSignal = playerMovedSignal;
			return this;
		},
	
		addToEngine: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.visitedSectorNodes = engine.getNodeList(VisitedSectorNode);
			
			this.initListeners();
			
			this.engine  = engine;
		},

		removeFromEngine: function (engine) {
			this.playerPosNodes = null;
			this.playerLocationNodes = null;
			this.sectorNodes = null;
			this.engine = null;
		},
	
		initListeners: function () {
			var rebuildVis = this.rebuildVis;
			var playerPosNodes = this.playerPosNodes;
			var sectorNodes = this.sectorNodes;
			var sys = this;
			this.playerMovedSignal.add(function () {
				sys.visitedSectors = rebuildVis(playerPosNodes, sectorNodes);
				sys.updateLocales();
			});
			sys.visitedSectors = rebuildVis(playerPosNodes, sectorNodes);
		},
		
		initLeaveCampRes: function () {
			if (this.gameState.uiStatus.leaveCampRes) {
				var campResources = this.resourcesHelper.getCurrentStorage();
				for (var key in resourceNames) {
					var name = resourceNames[key];
					var oldVal = this.gameState.uiStatus.leaveCampRes[name];
					var campVal = campResources.resources.getResource(name);
					if (oldVal && oldVal > 0) {
						var value = Math.floor(Math.min(oldVal, campVal));
						$("#stepper-embark-" + name + " input").val(value);
					}
				}
			}
		},
		
		update: function (time) {
			if (this.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.out) {
				this.refreshedEmbark = false;
				this.refreshedLevel = false;
				return;
			}
			
			var posComponent = this.playerPosNodes.head.position;
			
			$("#container-tab-vis-out").toggle(!posComponent.inCamp);
			$("#container-tab-enter-out").toggle(posComponent.inCamp);
			$("#container-tab-two-out").toggle(!posComponent.inCamp);
			
			if (posComponent.inCamp) {
				if (!this.refreshedEmbark) {
					this.initLeaveCampRes();
				}
				this.updateEmbarkPage();
				this.refreshedEmbark = true;
			} else {
				this.updateLevelPage();
				this.refreshedLevel = true;
			}
		},
		
		updateEmbarkPage: function () {
			$("#tab-header h2").text("Leave camp");
			var campResources = this.resourcesHelper.getCurrentStorage();
			var bagResources = this.resourcesHelper.getPlayerStorage();
			var bagStorage = bagResources.storageCapacity;
			
			// Resource steppers
			$.each($("#embark-resources tr"), function () {
				var resourceName = $(this).attr("id").split("-")[2];
				var campVal = campResources.resources.getResource(resourceName);
				var visible = campVal > 0;
				var inputMax = Math.min(bagStorage, Math.floor(campVal));
				$(this).toggle(visible);
				$(this).children("td").children(".stepper").children("input").attr("max", inputMax);
			});
			
			$("#embark-bag .value").text(bagStorage);
		},
		
		updateLevelPage: function () {
			var posComponent = this.playerLocationNodes.head.position;
			var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
			var sectorStatusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var vision = this.playerPosNodes.head.entity.get(VisionComponent).value;
			var hasVision = vision > PlayerStatConstants.VISION_BASE;
			var hasBridgeableBlocker = (passagesComponent.blockerLeft != null && passagesComponent.blockerLeft.bridgeable) || (passagesComponent.blockerRight != null && passagesComponent.blockerRight.bridgeable);
			var passageUpAvailable = passagesComponent.passageUp != null;
			var passageDownAvailable = passagesComponent.passageDown != null;
			var hasCamp = false;
			var hasCampHere = false;
			for (var node = this.engine.getNodeList(CampNode).head; node; node = node.next) {
				var campPosition = node.entity.get(PositionComponent);
				if (campPosition.level === this.playerPosNodes.head.position.level) {
					hasCamp = true;
					if (campPosition.sector === this.playerPosNodes.head.position.sector) hasCampHere = true;
					break;
				}
			}
			
			// Header
			var header = "";
			var name = featuresComponent.getSectorTypeName(hasVision || featuresComponent.sunlit);
			header = name;
			if (this.gameState.unlockedFeatures.levels) header = "Level " + posComponent.level + ": " + header;
			$("#tab-header h2").text(header);
			
			// Vis
			// TODO update improvements
			$("#tab-vis-out").toggle(this.visitedSectors > 1 || this.gameState.unlockedFeatures.levels);
			
			// Description
			var isScouted = sectorStatusComponent.scouted;
			$("#out-desc").html(this.getDescription(
				this.playerLocationNodes.head.entity,
				hasCampHere,
				hasCamp,
				hasVision,
				isScouted
			));
			
			// Improvements
			var playerActionsHelper = this.uiFunctions.playerActions.playerActionsHelper;
			// TODO performance bottlenneck - only update as needed
			$.each($("#out-improvements tr"), function () {
				var actionName = $(this).find("button.action-build").attr("action");
				if (actionName) {
					var improvementName = playerActionsHelper.getImprovementNameForAction(actionName);
					if (improvementName) {
						var actionEnabled = playerActionsHelper.checkRequirements(actionName, false).value >= 1;
						var existingImprovements = improvements.getCount(improvementName);
						var costSource = PlayerActionConstants.getCostSource(actionName);
						var isProject = costSource === PlayerActionConstants.COST_SOURCE_CAMP;
						$(this).find(".list-amount").text(existingImprovements);
						$(this).find(".action-use").toggle(existingImprovements > 0);
						if (isProject) {
							$($(this).find(".list-info")).find("span").text(actionEnabled ? "Available in camp" : "");
						}
						$(this).toggle(actionEnabled || existingImprovements > 0);
					}
				}
			});
			var collectorFood = improvements.getVO(improvementNames.collector_food);
			var collectorWater = improvements.getVO(improvementNames.collector_water);
			var discoveredResources = this.sectorHelper.getLocationDiscoveredResources();
			var hasFoundFood = featuresComponent.resources.food > 0 && discoveredResources.indexOf("food") >= 0;
			var hasFoundWater = featuresComponent.resources.water > 0 && discoveredResources.indexOf("water") >= 0;
			$("#out-improvements-collector-food").toggle(collectorFood.count > 0 || hasFoundFood);
			$("#out-improvements-collector-water").toggle(collectorWater.count > 0 || hasFoundWater);
			$("#out-improvements-camp").toggle(sectorStatusComponent.canBuildCamp);
			$("#out-improvements-bridge").toggle(hasCamp && hasBridgeableBlocker);
			$("#out-improvements-passage-up").toggle(isScouted && passageUpAvailable);
			$("#out-improvements-passage-down").toggle(isScouted && passageDownAvailable);
			
			var collectorFoodCapacity = collectorFood.storageCapacity.food * collectorFood.count;
			var collectorWaterCapacity = collectorWater.storageCapacity.water * collectorWater.count;
			$("#out-improvements-camp .list-amount").text(hasCamp ? "1" : "0");
			$("#out-improvements-bridge .list-amount").text(improvements.getCount(improvementNames.bridge));
			$("#out-improvements-collector-food .list-storage").text(
				collectorFoodCapacity > 0 ? (Math.floor(collectorFood.storedResources.food * 10) / 10) + " / " + collectorFoodCapacity : "");
			$("#out-improvements-collector-water .list-storage").text(
				collectorWaterCapacity > 0 ? (Math.floor(collectorWater.storedResources.water * 10) / 10) + " / " + collectorWaterCapacity : "");
			
			$("#out-improvements").toggle(this.gameState.unlockedFeatures.vision);
			var hasAvailableImprovements = $("#out-improvements table tr:visible").length > 0;
			$("#header-out-improvements").toggle(hasAvailableImprovements);
			
			// Actions
			var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
				improvements.getCount(improvementNames.passageUpElevator) +
				improvements.getCount(improvementNames.passageUpHole) > 0;
			var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
				improvements.getCount(improvementNames.passageDownElevator) +
				improvements.getCount(improvementNames.passageDownHole) > 0;
			var movementOptionsComponent = this.playerLocationNodes.head.entity.get(MovementOptionsComponent);
			if (movementOptionsComponent) {
				$("#out-action-move-up").toggle((isScouted && passagesComponent.passageUp != null) || passageUpBuilt);
				$("#out-action-move-down").toggle((isScouted && passagesComponent.passageDown != null) || passageDownBuilt);
				$("#out-action-move-camp").toggle(hasCamp && !hasCampHere);
			}
			
			var discoveredResources = this.sectorHelper.getLocationDiscoveredResources();
			var showDespair =
				!hasCampHere &&
				(discoveredResources.indexOf(resourceNames.food) < 0 || discoveredResources.indexOf(resourceNames.water) < 0) &&
				this.gameState.unlockedFeatures.resources.food &&
				this.gameState.unlockedFeatures.resources.water &&
				(this.resourcesHelper.getCurrentStorage().resources.water < 0.5 || this.resourcesHelper.getCurrentStorage().resources.food < 0.5);
			$("#out-action-scout").toggle(this.gameState.unlockedFeatures.vision);
			$("#out-action-investigate").toggle(this.gameState.unlockedFeatures.investigate);
			$("#out-action-despair").toggle(showDespair);
			
			this.uiFunctions.slideToggleIf("#out-locales", null, isScouted && sectorLocalesComponent.locales.length > 0, 200, 0);
			
			// Actions results
		},
		
		getDescription: function (entity, hasCampHere, hasCampOnLevel, hasVision, isScouted) {
			var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var hasEnemies = this.playerLocationNodes.head.entity.get(SectorControlComponent).maxUndefeatedEnemies > 0;
			var description = "<p>";
			description += this.getTextureDescription(hasVision, featuresComponent);
			description += this.getFunctionalDescription(hasVision, isScouted, featuresComponent, hasCampHere, hasCampOnLevel);
			description += "</p><p>";
			description += this.getStatusDescription(hasVision, isScouted, hasEnemies, featuresComponent, passagesComponent, hasCampHere, hasCampOnLevel);
			description += this.getMovementDescription(isScouted, passagesComponent, entity);
			description += "</p>";
			return description;
		},
		
		// Sector type, density, repair. Sunlight.
		getTextureDescription: function (hasVision, featuresComponent) {
			var desc = TextConstants.getSectorDescription(
				hasVision,
				featuresComponent.sunlit,
				featuresComponent.sectorType,
				featuresComponent.buildingDensity,
				featuresComponent.stateOfRepair) + " ";
			
			/*
			if (window.app) {
                desc += "(" +
				featuresComponent.sectorType + "/" +
				featuresComponent.buildingDensity + "/" +
				featuresComponent.stateOfRepair + ") ";
			}*/
			
			if (featuresComponent.sunlit) {
				if (hasVision) desc += "Fierce sunlight soothes your nerves. ";
				else desc += "Sunlight blinds you. ";
			}
			
			return desc;
		},
		
		// Existing improvements. Workshops. Passages. Potential improvements (camp).
		getFunctionalDescription: function (hasVision, isScouted, featuresComponent, hasCampHere, hasCampOnLevel) {
			var description = "";
			if (hasVision) {
				if (hasCampHere) description += "There is a camp here. ";
			}
			
			if (isScouted && featuresComponent.hasWorkshop()) {
				var workshopName = TextConstants.getWorkshopName(featuresComponent.getWorkshopResource());
				description += "There is a " + workshopName + " here. ";
			}
			
			return description;
		},
		
		// Found resources, enemies
		getStatusDescription: function (hasVision, isScouted, hasEnemies, featuresComponent, passagesComponent, hasCampHere, hasCampOnLevel) {
			var description = "";
			
			if (hasVision) {
				description += this.getEnemyDescription(isScouted, passagesComponent, hasCampHere);
			}
			
			if (featuresComponent.resources.getTotal() > 0) {
				var discoveredResources = this.sectorHelper.getLocationDiscoveredResources();
				if (discoveredResources.length > 0) {
					description += "Resources found here: " + featuresComponent.getResourcesString(discoveredResources) + ". ";
				}
			}
			
			if (isScouted && hasVision && !hasCampHere && !hasCampOnLevel) {
				if (featuresComponent.canHaveCamp() && !hasEnemies && !passagesComponent.passageUp && !passagesComponent.passageDown)
					description += "This would be a good place for a camp. ";
			}
			
			return description;
		},
		
		getMovementDescription: function (isScouted, passagesComponent, entity) {
			var description = "";
			var movementOptionsComponent = this.playerLocationNodes.head.entity.get(MovementOptionsComponent);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			
			// Passages up / down
			var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
				improvements.getCount(improvementNames.passageUpElevator) +
				improvements.getCount(improvementNames.passageUpHole) > 0;
			var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
				improvements.getCount(improvementNames.passageDownElevator) +
				improvements.getCount(improvementNames.passageDownHole) > 0;
			if (isScouted && passagesComponent.passageUp) {
				description += "There is a passage up here (" + passagesComponent.passageUp.name.toLowerCase() + ")";
				if (!passageUpBuilt) description += ", but it requires repair";
				description += ". ";
			}
			if (isScouted && passagesComponent.passageDown) {
				description += "There is a passage down here (" + passagesComponent.passageDown.name.toLowerCase() + ")";
				if (!passageDownBuilt) description += ", but it requires repair";
				description += ". ";
			}
			
			// Blockers left / right
			var bridgedLeft = this.movementHelper.isBridged(entity, this.movementHelper.DIRECTION_LEFT);
			var blockedLeft = this.movementHelper.isBlockedLeft(entity);
			if (blockedLeft && !passagesComponent.blockerLeft.defeatable)
				description += "Passage to the left is blocked by a " + passagesComponent.blockerLeft.name + ". ";
			
			var bridgedRight = this.movementHelper.isBridged(entity, this.movementHelper.DIRECTION_RIGHT);
			var blockedRight = this.movementHelper.isBlockedRight(entity);
			if (blockedRight && !passagesComponent.blockerRight.defeatable)
				description += "Passage to the right is blocked by a " + passagesComponent.blockerRight.name + ". ";
			else if (bridgedRight) description += "The gap on the right has been bridged.";
			
			return description;
		},
		
		getEnemyDescription: function (isScouted, passagesComponent, hasCampHere) {
			var enemyDesc = "";
			
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			var hasEnemies = enemiesComponent.hasEnemies() && sectorControlComponent.maxUndefeatedEnemies > 0;
			
			if (!isScouted) {
				enemyDesc += "You have not scouted this sector yet. ";
			}
			
			if (hasEnemies) {
				var defeatableBlockerLeft = passagesComponent.isLeftDefeatable();
				var defeatableBlockerRight = passagesComponent.isRightDefeatable();
				if (isScouted || defeatableBlockerLeft || defeatableBlockerRight) {
					var defeated = sectorControlComponent.hasControl() && sectorControlComponent.defeatedEnemies > 0;
					enemyDesc = TextConstants.getEnemyText(
					enemiesComponent.possibleEnemies,
					defeated,
					defeatableBlockerLeft,
					defeatableBlockerRight
					);
				}
				// if (window.app) enemyDesc += "(" + enemiesComponent.possibleEnemies + ") ";
			} else if (!hasCampHere && isScouted) {
				enemyDesc += "There doesn't seem to be anything dangerous here. ";
			}
			
			// var posComponent = this.playerLocationNodes.head.position;
			// var levelOrdinal = this.gameState.getLevelOrdinal(posComponent.level);
            // var groundLevelOrdinal = this.gameState.getGroundLevelOrdinal();
			// var totalLevels = this.gameState.getTotalLevels();
			// if (window.app) enemyDesc += "Required strength: " + EnemyConstants.getRequiredStrength(levelOrdinal, groundLevelOrdinal, totalLevels) + ". ";
			
			return enemyDesc;
		},
		
		updateLocales: function () {
			var currentSector = this.playerLocationNodes.head.entity;
			var sectorLocalesComponent = currentSector.get(SectorLocalesComponent);
			var sectorFeaturesComponent = currentSector.get(SectorFeaturesComponent);
			var sectorStatusComponent = currentSector.get(SectorStatusComponent);
			$("#table-out-actions-locales").empty();
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				var locale = sectorLocalesComponent.locales[i];
				var button = "<button class='action' action='scout_locale_" + i + "'>" + TextConstants.getLocaleName(locale, sectorFeaturesComponent.stateOfRepair) + "</button>";
				var info = "<span class='p-meta'>" + (sectorStatusComponent.isLocaleScouted(i) ? "Already scouted" : "") + "</span>";
				$("#table-out-actions-locales").append("<tr><td>" + button + "</td><td>" + info + "</td></tr>");
			}
            this.uiFunctions.registerActionButtonListeners("#table-out-actions-locales");
            this.uiFunctions.generateButtonOverlays("#table-out-actions-locales");
            this.uiFunctions.generateCallouts("#table-out-actions-locales");
		},
		
		rebuildVis: function (playerPosNodes, sectorNodes) {
			if (!playerPosNodes.head) return 0;
			$("#tab-vis-out table tr").empty();
			
			var visitedSectors = 0;
			
			var posComponent = playerPosNodes.head.position;
			for (var sectorNode = sectorNodes.head; sectorNode; sectorNode = sectorNode.next) {
				var sectorPos = sectorNode.entity.get(PositionComponent);
				var sectorPassages = sectorNode.entity.get(PassagesComponent);
				if (sectorPos.level === posComponent.level) {
					var statusComponent = sectorNode.entity.get(SectorStatusComponent);
					var localesComponent = sectorNode.entity.get(SectorLocalesComponent);
					var isScouted = statusComponent.scouted;
					var classes = "vis-out-sector";
					if (sectorPos.sector === posComponent.sector) {
						classes += " vis-out-sector-current";
					}
					
					if (sectorNode.entity.has(VisitedComponent)) {
						visitedSectors++;
						classes += " vis-out-sector-visited";
					} else {
						continue;
					}
					
					var content = "?";
					var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
					if (isScouted) content = sectorPos.sector;
					if (sectorNode.entity.has(CampComponent)) content = "c";
					if (sectorNode.entity.get(SectorFeaturesComponent).hasWorkshop()) content = "w";
					if (sectorPassages.passageUp && isScouted) content += "U";
					if (sectorPassages.passageDown && isScouted) content += "D";
					if (unScoutedLocales > 0 && isScouted) content += "l";
					var td = "<td class='" + classes + "'>" + content + "</td>";
					$("#tab-vis-out table tr").append(td);
				}
			}
			return visitedSectors;
		},
    });

    return UIOutLevelSystem;
});
