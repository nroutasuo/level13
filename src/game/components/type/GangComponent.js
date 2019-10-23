// Defines the given entity as a gang (movement blocker with enemies)
define(['ash'], function (Ash) {
    var GangComponent = Ash.Class.extend({
        
        numEnemies: 0,
        numEnemiesDefeated: 0,
        enemyID: null,
        
        constructor: function (gangVO) {
            this.numEnemies = gangVO.numEnemies;
            this.numEnemiesDefeated = 0;
            this.enemyID = gangVO.enemyID;
        },
        
        getEnemyCount: function () {
            return this.numEnemies - this.numEnemiesDefeated;
        },
        
        addWin: function () {
            this.numEnemiesDefeated++;
        },
        
        isDefeated: function () {
            return this.getEnemyCount() <= 0;
        },

		getSaveKey: function () {
			return "Gang";
		},

        getCustomSaveObject: function () {
            var copy = {};
            if (this.numEnemiesDefeated > 0) {
                copy.nd = this.numEnemiesDefeated;
            }
            return Object.keys(copy).length > 0 ? copy : null;
        },

        customLoadFromSave: function (componentValues) {
            this.numEnemiesDefeated = componentValues.nd ? componentValues.nd : 0;
        }
        
    });

    return GangComponent;
});
