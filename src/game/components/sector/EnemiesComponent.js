// Information about the enemies in a given sector
define(['ash'], function (Ash) {
	
	var EnemiesComponent = Ash.Class.extend({
		
		hasEnemies: false,
		nextEnemy: null,
		possibleEnemies: [],
		
		constructor: function (hasEnemies, possibleEnemies) {
			this.hasEnemies = hasEnemies;
			this.possibleEnemies = possibleEnemies;
		},
		
		selectNextEnemy: function () {
			if (this.possibleEnemies.length < 1) {
				this.nextEnemy = null;
			} else {
				if (!this.nextEnemy) {
					var index = Math.floor(Math.random() * this.possibleEnemies.length);
					this.nextEnemy = this.possibleEnemies[index].clone();
				} else {
					this.nextEnemy = this.nextEnemy.clone();
				}
			}
			return this.nextEnemy;
		},
		
		getNextEnemy: function () {
			if (!this.nextEnemy) this.selectNextEnemy();
			return this.nextEnemy;
		},
		
		resetNextEnemy: function () {
			this.nextEnemy = null;
		},
	});

	return EnemiesComponent;
});
