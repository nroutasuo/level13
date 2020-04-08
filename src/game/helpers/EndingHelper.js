define(['ash', 'game/GameGlobals', 'game/constants/UpgradeConstants', 'game/constants/WorldConstants', 'game/nodes/tribe/TribeUpgradesNode'],
function (Ash, GameGlobals, UpgradeConstants, WorldConstants, TribeUpgradesNode) {
    
    var EndingHelper = Ash.Class.extend({
        
        tribeNodes: null,
        
        endProjectUpgrades: [],

        constructor: function (engine) {
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
            
            this.endProjectUpgrades.push(UpgradeConstants.upgradeIds.unlock_building_spaceship1);
            this.endProjectUpgrades.push(UpgradeConstants.upgradeIds.unlock_building_spaceship2);
            this.endProjectUpgrades.push(UpgradeConstants.upgradeIds.unlock_building_spaceship3);
        },
        
        hasUnlockedEndProject: function () {
            for (var i = 0; i < this.endProjectUpgrades.length; i++) {
                if (this.tribeNodes.head.upgrades.hasUpgrade(this.endProjectUpgrades[i])) {
                    return true;
                }
            }
            return false;
        },
        
        isReadyForLaunch: function () {
            if (GameGlobals.gameState.numCamps < WorldConstants.CAMPS_TOTAL) return false;
            return GameGlobals.playerActionsHelper.checkAvailability("launch");
        },
        
        isFinished: function () {
            return GameGlobals.gameState.isFinished;
        },
        
    });

    return EndingHelper;
});
