define(['ash', 'game/constants/UpgradeConstants', 'game/nodes/tribe/TribeUpgradesNode'], 
function (Ash, UpgradeConstants, TribeUpgradesNode) {
    
    var EndingHelper = Ash.Class.extend({
        
        gameState: null,
        playerActionsHelper: null,
        levelHelper: null,
        tribeNodes: null,
        
        endProjectUpgrades: [],

        constructor: function (engine, gameState, playerActionsHelper, levelHelper) {
            this.gameState = gameState;
            this.playerActionsHelper = playerActionsHelper;
            this.levelHelper = levelHelper;
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
            return this.playerActionsHelper.checkAvailability("launch");
        },
        
        isFinished: function () {
            return this.gameState.isFinished;
        },
        
    });

    return EndingHelper;
});