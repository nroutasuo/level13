define(['ash', 'game/vos/UpgradeVO'],
function (Ash, UpgradeVO) {
    var UpgradesComponent = Ash.Class.extend({
        
        boughtUpgrades: [],
        
        newBlueprints: [],
        availableBlueprints: [],
        
        constructor: function () {
            this.boughtUpgrades = [];
            this.newBlueprints = [];
            this.availableBlueprints = [];
        },
        
        addUpgrade: function (upgradeId) {
            if (!this.hasBought(upgradeId)) {
                this.boughtUpgrades.push(upgradeId);
            }
        },
        
        useBlueprint: function (upgradeId) {
            if (this.hasNewBlueprint(upgradeId)) {
                this.newBlueprints.splice(this.newBlueprints.indexOf(upgradeId), 1);
                this.availableBlueprints.push(upgradeId);
            }
        },
        
        hasBought: function (upgradeId) {
            return this.boughtUpgrades.indexOf(upgradeId) >= 0;
        },
        
        addNewBlueprint: function (upgradeId) {
            if (!this.hasBlueprint(upgradeId)) this.newBlueprints.push(upgradeId);
        },
        
        hasBlueprint: function (upgradeId) {
            return this.hasAvailableBlueprint(upgradeId) || this.hasNewBlueprint(upgradeId);
        },
        
        hasAvailableBlueprint: function (upgradeId) {
            return this.availableBlueprints.indexOf(upgradeId) >= 0;
        },
        
        hasNewBlueprint: function (upgradeId) {
            return this.newBlueprints.indexOf(upgradeId) >= 0;
        }
        
    });

    return UpgradesComponent;
});
