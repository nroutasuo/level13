// Checks hunger & thirst when exploring and determines when, and how, the player faints
define([
    'ash',
    'game/systems/SaveSystem',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/sector/SectorNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/NearestCampNode',
    'game/nodes/LastVisitedCampNode',
    'game/components/common/ResourcesComponent',
    'game/components/common/PositionComponent',
    'game/components/common/VisitedComponent',
    'game/components/sector/improvements/CampComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorStatusComponent',
	'game/components/player/DeityComponent',
    'game/components/common/LogMessagesComponent',
    'game/vos/ResultVO',
], function (Ash,
    SaveSystem,
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
            
			var hasFood = this.playerResourcesNodes.head.resources.resources.getResource(resourceNames.food) > 0;
			var hasWater = this.playerResourcesNodes.head.resources.resources.getResource(resourceNames.water) > 0;
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
			var msgNoun = hasWater ? "food" : "water";
			var msgMain = "";
			var msgLog = "";
			
			if (hasDeity && Math.random() < 0.1) {
				// rescued by deity: back to random camp, keep items, no injury
				// TODO deity specific text
				msgMain = "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>Your deity takes pity on you and brings you to a camp.";
				msgLog = "The world fades. You wake up back in camp.";
				this.fadeOut(msgMain, msgLog, this.lastVisitedCampNodes.head.entity, 0, 0);
			}
			
			if (hasCampOnLevel && Math.random() < 0.2) {
				// rescued by campers: back to nearest camp, keep items, maybe injured
				msgMain = "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>You wake up back in camp. Some of the scavengers found you and brought you home.";
				msgLog = "The world fades. You wake up back in camp.";
				this.fadeOut(msgMain, msgLog, this.lastVisitedCampNodes.head.entity, 0, 0.25);
				return;
			}
			
			if (hasLastVisitedCamp) {
				// pass out and teleport to last visited camp: lose items, back to last visited camp, maybe injured
				msgMain = "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>When you wake up, you find yourself back in camp.";
				msgLog = "The world fades. You wake up with no memory how you found your way back.";
				this.fadeOut(msgMain, msgLog, this.lastVisitedCampNodes.head.entity, 1, 1);
				return;
			}
			
			var sectorSafe = this.isSectorSafe(this.playerLocationNodes.head.entity);
			if (!sectorSafe) {
				// pass out and teleport to nearest safe sector (with scavengable food & water)
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
						dist = Math.abs(playerPosition.sector - node.position.sector);
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
				
				msgMain = "Exhausted and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>When you wake up, you find yourself back in a familiar area.";
				msgLog = "The world fades. You wake up with no memory how you got here.";
				if (nearestKnownSafeSector) {
					this.fadeOut(msgMain, msgLog, nearestKnownSafeSector, 1, 0);
				} else if (nearestVisitedSafeSector) {
					this.fadeOut(msgMain, msgLog, nearestVisitedSafeSector, 1, 0);
				} else {
					console.log("WARN: Nowhere to fade out to.");
				}
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
		
		fadeOut: function (msg, msgLog, sector, loseInventoryProbability, injuryProbability) {
            var resultVO = this.playerActionResultsHelper.getFadeOutResults(loseInventoryProbability, injuryProbability);
            this.playerActionResultsHelper.collectRewards(resultVO);
            
			this.uiFunctions.showInfoPopup("Exhaustion", msg, "Continue", resultVO);

            // Teleport player
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var sectorPosition = sector.get(PositionComponent);
			playerPosition.level = sectorPosition.level;
			playerPosition.sector = sectorPosition.sector;
			if (sector.has(CampComponent)) this.uiFunctions.showTab(this.uiFunctions.elementIDs.tabs.in);
            
			this.log(msgLog);
			this.save();
		},
	
		log: function (msg) {
			if (msg) {
				var logComponent = this.playerResourcesNodes.head.entity.get(LogMessagesComponent);
				logComponent.addMessage(msg);
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
