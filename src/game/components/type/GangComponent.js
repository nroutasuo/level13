// Defines the given entity as a gang (movement blocker with enemies)
define(['ash'], function (Ash) {
    var GangComponent = Ash.Class.extend({
        
        numEnemies: 0,
        numEnemiesDefeated: 0,
        
        constructor: function (gangVO) {
            this.numEnemies = gangVO.numEnemies;
            this.numEnemiesDefeated = 0;
        },
        
        getEnemyCount: function () {
            return this.numEnemies - this.numEnemiesDefeated;
        },
        
        addWin: function () {
            this.numEnemiesDefeated++;
            log.i("gangComponent add win -> " + this.numEnemiesDefeated);
        },
        
        isDefeated: function () {
            return this.getEnemyCount() <= 0;
        },

		getSaveKey: function () {
			return "Gang";
		},
    });

    return GangComponent;
});
