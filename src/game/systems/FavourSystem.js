define([
    'ash',
    'game/GameGlobals',
	'game/constants/CampConstants',
	'game/constants/GameConstants',
    'game/components/player/DeityComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/sector/CampNode',
], function (Ash, GameGlobals, CampConstants, GameConstants, DeityComponent, SectorImprovementsComponent, PlayerStatsNode, TribeUpgradesNode, CampNode) {
    
    var FavourSystem = Ash.System.extend({

        constructor: function () {},

        addToEngine: function (engine) {
            this.engine = engine;
            this.campNodes = engine.getNodeList(CampNode);
            this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
        },

        removeFromEngine: function (engine) {
            this.campNodes = null;
            this.tribeUpgradesNodes = null;
            this.playerStatsNodes = null;
            this.engine = null;
        },

        update: function (time) {
            if (GameGlobals.gameState.isPaused) return;
            if (!this.campNodes.head) return;
            
            var deityComponent = this.playerStatsNodes.head.entity.get(DeityComponent);
            if (!deityComponent) return;
            
			deityComponent.accSources = [];
			deityComponent.accumulation = 0;
			var templeUpgradeLevel = this.getTempleUpgradeLevel();
            
    		for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
                var improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
                
                var accTemple = GameGlobals.campHelper.getTempleFavourGenerationPerSecond(improvementsComponent, templeUpgradeLevel);
                var numClerics = campNode.camp.assignedWorkers.cleric || 0;
                var accClerics = GameGlobals.campHelper.getFavourProductionPerSecond(numClerics, improvementsComponent);
                var accCamp = accTemple + accClerics;
                
                deityComponent.addChange("Temples", accTemple, campNode.position.level);
                deityComponent.addChange("Clerics", accClerics, campNode.position.level);
                deityComponent.accumulation += accCamp;
                deityComponent.accumulationPerCamp[campNode.position.level] = accCamp;
            }
        },
		
		getTempleUpgradeLevel: function () {
            return GameGlobals.upgradeEffectsHelper.getBuildingUpgradeLevel(improvementNames.temple, this.tribeUpgradesNodes.head.upgrades);
		},
        
    });
    
    return FavourSystem;
    
});
