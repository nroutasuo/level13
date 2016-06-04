// Checks hunger & thirst when exploring and determines when, and how, the player faints
define([
    'ash',
    'game/systems/SaveSystem',
    'game/constants/LogConstants',
    'game/constants/PositionConstants',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/sector/SectorNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/NearestCampNode',
    'game/nodes/LastVisitedCampNode',
    'game/components/common/ResourcesComponent',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/components/common/CampComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorStatusComponent',
	'game/components/player/DeityComponent',
	'game/components/player/PlayerActionResultComponent',
    'game/components/common/LogMessagesComponent',
    'game/vos/ResultVO',
], function (Ash,
    SaveSystem,
	LogConstants,
	PositionConstants,
	PlayerResourcesNode,
	SectorNode,
	PlayerLocationNode,
	NearestCampNode,
	LastVisitedCampNode,
	ResourcesComponent,
	PositionComponent,
	VisitedComponent,
	CampComponent,
	SectorFeaturesComponent,
	SectorStatusComponent,
	DeityComponent,
    PlayerActionResultComponent,
	LogMessagesComponent,
    ResultVO
) {
    var FaintingSystem = Ash.System.extend({
		
		playerResourcesNodes: null,
		playerLocationNodes: null,
        lastVisitedCampNodes: null,
        nearestCampNodes: null,
		sectorNodes: null,

        constructor: function (uiFunctions, playerActionFunctions, playerActionResultsHelper) {
			this.uiFunctions = uiFunctions;
			this.playerActionFunctions = playerActionFunctions;
            this.playerActionResultsHelper = playerActionResultsHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
            this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.lastVisitedCampNodes = engine.getNodeList(LastVisitedCampNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            this.playerResourcesNodes = null;
			this.playerLocationNodes = null;
			this.lastVisitedCampNodes = null;
            this.nearestCampNodes = null;
			this.sectorNodes = null;
        },
        
        checkFainting: function () {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			if (playerPosition.inCamp) return;
            
			if (this.playerLocationNodes.head.entity.has(CampComponent)) return;
            
			var hasFood = this.playerResourcesNodes.head.resources.resources.getResource(resourceNames.food) >= 1;
			var hasWater = this.playerResourcesNodes.head.resources.resources.getResource(resourceNames.water) >= 1;
			if (hasFood && hasWater) {
                this.log("You rest a bit, eat and drink some. Then you decide to continue.");
                return;
            }
			
			// Player is hungry or thirsty and is out exploring
			
			var hasDeity = this.playerResourcesNodes.head.entity.has(DeityComponent);
			var hasLastVisitedCamp = this.lastVisitedCampNodes.head != null;
			var hasCampOnLevel = this.nearestCampNodes.head != null;
			
			// TODO rework texts
			
			var msgAdjective = hasWater ? "hungry" : "thirsty";
			var msgMain = "";
			var msgLog = "";
			
			if (hasDeity && Math.random() < 0.1) {
				// rescued by deity: back to random camp, keep items, no injury
				// TODO deity specific text
				msgMain = "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>Your deity takes pity on you and brings you to a camp.";
				msgLog = "The world fades. You wake up back in camp.";
				this.fadeOut(msgMain, msgLog, true, this.lastVisitedCampNodes.head.entity, 0, 0);
			}
			
			if (hasCampOnLevel && this.lastVisitedCampNodes.head && Math.random() < 0.2) {
				// rescued by campers: back to nearest camp, keep items, maybe injured
				msgMain = "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>You wake up back in camp. Some of the scavengers found you and brought you home.";
				msgLog = "The world fades. You wake up back in camp.";
				this.fadeOut(msgMain, msgLog, true, this.lastVisitedCampNodes.head.entity, 0, 0.25);
				return;
			}
			
			if (hasLastVisitedCamp) {
				// pass out and teleport to last visited camp: lose items, back to last visited camp, maybe injured
				this.fadeOutToLastVisitedCamp(true, true, msgAdjective);
				return;
			}
			
			var sectorSafe = this.isSectorSafe(this.playerLocationNodes.head.entity);
			if (!sectorSafe) {
				// pass out and teleport to nearest safe sector (with scavengable food & water)
				this.fadeOutToOutside(msgAdjective);
			}
		},
		
		isSectorSafe: function (sector) {
			var sectorResources = sector.get(SectorFeaturesComponent).resources;
			var sectorSafe = sectorResources.getResource(resourceNames.food) > 0 && sectorResources.getResource(resourceNames.water) > 0;
			return sectorSafe;
		},
		
		isSectorKnownSafe: function (sector) {
			var discoveredResources = sector.get(SectorStatusComponent).discoveredResources;
			var knownSectorSafe = discoveredResources.indexOf(resourceNames.food) >= 0 && discoveredResources.indexOf(resourceNames.water) >= 0;
			return knownSectorSafe;
		},
		
		fadeOutToLastVisitedCamp: function (showPopup, handleResults, msgAdjective) {
			var msgMain = showPopup ? "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>When you wake up, you find yourself back in camp." : null;
			var msgLog = "The world fades. You wake up with no memory how you found your way back.";
			this.fadeOut(msgMain, msgLog, handleResults, this.lastVisitedCampNodes.head.entity, 1, 1);
		},
		
		fadeOutToOutside: function (msgAdjective) {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var nearestKnownSafeSector;
			var nearestKnownSafeSectorDist = 100;
			var nearestVisitedSafeSector;
			var nearestVisitedSafeSectorDist = 100;
			
			var dist;
			var isVisited;
			var isSafe;
			var isKnownSafe;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				if (node.position.level === playerPosition.level) {
					isVisited = node.entity.has(VisitedComponent);
					if (!isVisited) continue;
					isSafe = this.isSectorSafe(node.entity);
					if (!isSafe) continue;
					dist = PositionConstants.getDistanceTo(playerPosition.getPosition(), node.position.getPosition());
					if (dist < nearestVisitedSafeSectorDist) {
						nearestVisitedSafeSector = node.entity;
						nearestVisitedSafeSectorDist = dist;
					}
					isKnownSafe = this.isSectorKnownSafe(node.entity);
					if (dist < nearestKnownSafeSectorDist) {
						nearestKnownSafeSector = node.entity;
						nearestKnownSafeSectorDist = dist;
					}
				}
			}
			
			var msgMain = "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>When you wake up, you find yourself back in a familiar area.";
			var msgLog = "The world fades. You wake up with no memory how you got here.";
			if (nearestKnownSafeSector) {
				this.fadeOut(msgMain, msgLog, true, nearestKnownSafeSector, 1, 0);
			} else if (nearestVisitedSafeSector) {
				this.fadeOut(msgMain, msgLog, true, nearestVisitedSafeSector, 1, 0);
			} else {
				console.log("WARN: Nowhere to fade out to.");
			}
		},
		
		fadeOut: function (msg, msgLog, handleResults, sector, loseInventoryProbability, injuryProbability) {
			if (handleResults) {
				var resultVO = this.playerActionResultsHelper.getFadeOutResults(loseInventoryProbability, injuryProbability);
                var sys = this;
                this.playerResourcesNodes.head.entity.add(new PlayerActionResultComponent(resultVO));
                var resultPopUpCallback = function () {
                    sys.playerActionResultsHelper.collectRewards(resultVO);  
                    sys.teleport(msgLog, sector);                  
                };
				if (msg) this.uiFunctions.showResultPopup("Exhaustion", msg, resultVO, resultPopUpCallback);
			} else {
                this.teleport(msgLog, sector);
            }
		},
		
		teleport: function (msgLog, sector) {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var sectorPosition = sector.get(PositionComponent);
			playerPosition.level = sectorPosition.level;
			playerPosition.sectorX = sectorPosition.sectorX;
			playerPosition.sectorY = sectorPosition.sectorY;
			if (sector.has(CampComponent)) {
                this.uiFunctions.playerActions.enterCamp(false);
                this.uiFunctions.showTab(this.uiFunctions.elementIDs.tabs.in);
            }
			this.log(msgLog);
			this.save();
		},
	
		log: function (msg) {
			if (msg) {
				var logComponent = this.playerResourcesNodes.head.entity.get(LogMessagesComponent);
				logComponent.addMessage(LogConstants.MSG_ID_FAINTED, msg);
				this.lastMsgTimeStamp = new Date().getTime();
			}
		},
        
        save: function () {
            var saveSystem = this.engine.getSystem(SaveSystem);
            saveSystem.save();
        }

    });

    return FaintingSystem;
});
