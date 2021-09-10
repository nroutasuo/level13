define(['ash', 'game/vos/EnemyVO'],
function (Ash, EnemyVO) {

	var EnemyConstants = {
		
		enemyTypes: {
			// nohazard, cold, toxic, radiation, sunlit, dark, dense, sparse, water (sectors that contain AND neighbours)
			global: "global",     	// anywhere
			nohazard: "nohazard",   // sectors with no hazards
			cold: "cold",           // cold sectors
			toxic: "toxic",         // toxic sectors
			radiation: "radiation", // radiactive sectors
			sunlit: "sunlit",       // sunlit sectors
			dark: "dark",           // dark sectors
			dense: "dense",         // densely built sectors
			sparse: "sparse",       // sparsely built sectors
			water: "water",         // sectors with water (or neighbours)
			magic: "magic"          // sectors with magic (WIP)
		},
		
		enemyDefinitions: {
			global: [ ],
			nohazard: [ ],
			cold: [ ],
			toxic: [ ],
			radiation: [ ],
			sunlit: [ ],
			dark: [ ],
			dense: [ ],
			sparse: [ ],
			water: [ ],
			magic: [ ],
		},
		
		// saved for convenience & startup speed
		enemyDifficulties: {},
		
		getEnemy: function (enemyID) {
			for (var type in this.enemyDefinitions) {
				for (let i in this.enemyDefinitions[type]) {
					var enemy = this.enemyDefinitions[type][i];
					if (enemy.id == enemyID) {
						return enemy;
					}
				}
			}
			log.w("no such enemy found: " + enemyID);
			return null;
		},
		
		getAll: function () {
			let result = [];
			for (var type in this.enemyDefinitions ) {
				for (let i in this.enemyDefinitions[type]) {
					var enemy = this.enemyDefinitions[type][i];
					result.push(enemy);
				}
			}
			return result;
		},
		
		getDifficulty: function (enemy) {
			return this.enemyDifficulties[enemy.id];
		}
		
	};
		
	
	return EnemyConstants;
	
});
