// A class responds to player actions parsed by the UIFunctions
define(['ash',
    'game/constants/OccurrenceConstants',
    'game/constants/EnemyConstants',
    'game/constants/TextConstants',
    'game/nodes/sector/CampNode',
    'game/components/common/PositionComponent',
    'game/components/common/ResourcesComponent',
    'game/components/sector/events/RaidComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/components/common/CampComponent',
], function (Ash, OccurrenceConstants, EnemyConstants, TextConstants, CampNode,
    PositionComponent, ResourcesComponent, RaidComponent,
    SectorImprovementsComponent, WorkshopComponent, CampComponent) {
    
    var OccurrenceFunctions = Ash.System.extend({
        
		gameState: null,
		uiFunctions: null,
		resourcesHelper: null,
		
		engine: null,
		campNodes: null,
	
        constructor: function (gameState, uiFunctions, resourcesHelper) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.resourcesHelper = resourcesHelper;
        },

        addToEngine: function (engine) {
            this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
        },

        removeFromEngine: function (engine) {
            this.engine = null;
			this.campNodes = null;
        },
	
		onEnterNewSector: function (sectorEntity) {
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
			raidComponent.victory = OccurrenceConstants.getRaidDanger(improvements, soldiers) < Math.random()*100;
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
