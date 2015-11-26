// A class responds to player actions parsed by the UIFunctions
define(['ash',
    'game/constants/OccurrenceConstants',
    'game/constants/EnemyConstants',
    'game/constants/TextConstants',
    'game/nodes/sector/CampNode',
    'game/components/common/PositionComponent',
    'game/components/common/ResourcesComponent',
    'game/components/sector/events/RaidComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/components/common/CampComponent',
], function (Ash, OccurrenceConstants, EnemyConstants, TextConstants, CampNode,
    PositionComponent, ResourcesComponent, RaidComponent,
    SectorFeaturesComponent, SectorControlComponent, SectorImprovementsComponent, WorkshopComponent, CampComponent) {
    
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
			var sectorControlComponent = sectorEntity.get(SectorControlComponent);
			var hasCampOnLevel = this.hasCampOnLevel(sectorEntity);
			var hasEnemies = !sectorControlComponent.hasControl();
			
			// Workshops
			if (sectorEntity.has(WorkshopComponent)) {
				var workshopName = TextConstants.getWorkshopName(sectorEntity.get(WorkshopComponent).resource);
				var helpString = "";
				if (hasEnemies && !hasCampOnLevel) helpString = "Clear the sector and build a camp nearby to use it.";
				else if (!hasCampOnLevel) helpString = "Build a camp nearby to use it.";
				this.showClickOccurrence("You've discovered a " + workshopName + "! " + helpString);
			}
		},
	
		onScoutSectorWeakling: function (sectorEntity) {
			this.showLevelStrengthWarning(sectorEntity);
		},
		
		onGainSectorControl: function (sectorEntity) {
			if (sectorEntity.has(WorkshopComponent)) {
				var workshopName = TextConstants.getWorkshopName(sectorEntity.get(WorkshopComponent).resource);
				if (this.hasCampOnLevel(sectorEntity)) {
					this.showClickOccurrence("The " + workshopName + " is now safe for workers to use.");
				} else {
					this.showClickOccurrence("The " + workshopName + " is now secured. Build a camp nearby to send workers to it.");
				}
			}
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
				if (sectorPosition.level == campPosition.level) {
					return true;
				}
			}
			return false;
		},
		
		showLevelStrengthWarning: function (sectorEntity) {
			var positionComponent = sectorEntity.get(PositionComponent);
			var sectorControlComponent = sectorEntity.get(SectorControlComponent);
			var hasEnemies = !sectorControlComponent.hasControl();
			var levelOrdinal = this.gameState.getLevelOrdinal(positionComponent.level);
			var totalLevels = this.gameState.getTotalLevels();
			var groundLevelOrdinal = this.gameState.getGroundLevelOrdinal();
			var requiredStrength = EnemyConstants.getRequiredStrength(levelOrdinal, groundLevelOrdinal, totalLevels);
			this.showClickOccurrence("Too dangerous for you here.<br/>You need fight strength of at least " + requiredStrength);
		},
		
		showClickOccurrence: function (text) {
			this.uiFunctions.showInfoPopup("Occurrence!", text);
		},
	
    });

    return OccurrenceFunctions;
});
