define(['ash', 'game/vos/UpgradeVO'],
function (Ash, UpgradeVO) {
    var UpgradesComponent = Ash.Class.extend({
        
        boughtUpgrades: [],
        
        constructor: function () {
            this.boughtUpgrades = [];
        },
        
        addUpgrade: function(upgradeId) {
            if (!this.hasBought(upgradeId)) {
                this.boughtUpgrades.push(upgradeId);
            }
        },
        
        hasBought: function(upgradeId) {
            return this.boughtUpgrades.indexOf(upgradeId) >= 0;
        }
        
    });

    return UpgradesComponent;
});
