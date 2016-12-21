// A class responds to player actions parsed by the UIFunctions
define(['ash',
    'game/constants/OccurrenceConstants',
    'game/nodes/sector/CampNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/components/common/PositionComponent',
    'game/components/common/ResourcesComponent',
    'game/components/sector/events/RaidComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/common/CampComponent',
], function (Ash, OccurrenceConstants, 
    CampNode, TribeUpgradesNode,
    PositionComponent, ResourcesComponent, RaidComponent,
    SectorImprovementsComponent, CampComponent) {
    
    var OccurrenceFunctions = Ash.System.extend({
        
		gameState: null,
		uiFunctions: null,
		resourcesHelper: null,
		upgradeEffectsHelper: null,
		
		engine: null,
		campNodes: null,
        tribeUpgradeNodes: null,
	
        constructor: function (gameState, uiFunctions, resourcesHelper, upgradeEffectsHelper) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.resourcesHelper = resourcesHelper;
            this.upgradeEffectsHelper = upgradeEffectsHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
        },

        removeFromEngine: function (engine) {
            this.engine = null;
			this.campNodes = null;
            this.tribeUpgradeNodes = null;
        },
	
		onEnterNewSector: function (sectorEntity) {
            // TODO log message for hazards?
		},
	
		onScoutSector: function (sectorEntity) {
		},
		
		onGainSectorControl: function (sectorEntity) {
		},
	
		onEndRaid: function (sectorEntity) {
			var improvements = sectorEntity.get(SectorImprovementsComponent);
			var raidComponent = sectorEntity.get(RaidComponent);
			var campResources = sectorEntity.get(ResourcesComponent).resources;
			var soldiers = sectorEntity.get(CampComponent).assignedWorkers.soldier;
            var fortificationUpgradeLevel = this.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.fortification, this.tribeUpgradeNodes.head.upgrades);
			raidComponent.victory = OccurrenceConstants.getRaidDanger(improvements, soldiers, fortificationUpgradeLevel) < Math.random()*100;
			if (!raidComponent.victory) {
				var selectedResources = [];
				var maxSelectedResources = 3;
				var largestSelectedAmount = 0;
				for (var key in resourceNames) {
					var name = resourceNames[key];
					var campAmount = campResources.getResource(name);
					if (selectedResources.length < maxSelectedResources) {
						selectedResources.push(name);
						largestSelectedAmount = Math.max(largestSelectedAmount, campAmount);
					} else if (campAmount > largestSelectedAmount) {
						selectedResources.pop();
						selectedResources.push(name);
						largestSelectedAmount = Math.max(largestSelectedAmount, campAmount);
					}
				}
			
				for(var i in selectedResources) {
					var name = selectedResources[i];
					var campAmount = campResources.getResource(name);
					var lostAmount = campAmount * 0.5;
					if (lostAmount >= 5) {
					campResources.setResource(name, campAmount - lostAmount);
					raidComponent.resourcesLost.addResource(name, lostAmount);
					}
				}
			}
		},
		
		hasCampOnLevel: function (sectorEntity) {
			var sectorPosition = sectorEntity.get(PositionComponent);
			var campPosition;
			for (var node = this.campNodes.head; node; node = node.next) {
				campPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level === campPosition.level) {
					return true;
				}
			}
			return false;
		},
		
		showClickOccurrence: function (text) {
			this.uiFunctions.showInfoPopup("Occurrence!", text);
		},
	
    });

    return OccurrenceFunctions;
});
