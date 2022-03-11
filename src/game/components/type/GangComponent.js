// Defines the given entity as a gang (movement blocker with enemies)
define(['ash'], function (Ash) {
	var GangComponent = Ash.Class.extend({
		
		numEnemies: 0,
		numEnemiesDefeated: 0,
		numAttempts: 0,
		enemyID: null,
		
		constructor: function (gangVO) {
			this.numEnemies = gangVO.numEnemies;
			this.numEnemiesDefeated = 0;
			this.numAttempts = 0;
			this.enemyIDs = gangVO.enemyIDs;
		},
		
		getEnemyCount: function () {
			return this.numEnemies - this.numEnemiesDefeated;
		},
		
		addAttempt: function () {
			this.numAttempts++;
		},
		
		addWin: function () {
			this.numEnemiesDefeated++;
		},
		
		isDefeated: function () {
			return this.getEnemyCount() <= 0;
		},
		
		getNextEnemyID: function () {
			let index = this.numEnemiesDefeated % this.enemyIDs.length;
			return this.enemyIDs[index];
		},

		getSaveKey: function () {
			return "Gang";
		},

		getCustomSaveObject: function () {
			var copy = {};
			if (this.numEnemiesDefeated > 0) {
				copy.nd = this.numEnemiesDefeated;
			}
			if (this.numAttempts > 0 && this.getEnemyCount() > 0) {
				copy.na = this.numAttempts;
			}
			return Object.keys(copy).length > 0 ? copy : null;
		},

		customLoadFromSave: function (componentValues) {
			this.numEnemiesDefeated = componentValues.nd ? componentValues.nd : 0;
			this.numAttempts = componentValues.na ? componentValues.na : 0;
		}
		
	});

	return GangComponent;
});
