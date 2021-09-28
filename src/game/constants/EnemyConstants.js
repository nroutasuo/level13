define(['ash', 'game/vos/EnemyVO'],
function (Ash, EnemyVO) {

	var EnemyConstants = {
		
		enemyTypes: {
			global: "global",			// anywhere
			nohazard: "nohazard",    	// sectors with no hazards
			cold: "cold",            	// cold sectors
			dark: "dark",            	// dark sectors
			radiation: "radiation",  	// radiactive sectors
			dense: "dense",          	// densely built sectors
			sparse: "sparse",        	// sparsely built sectors
			inhabited: "inhabited",  	// has fairly recent human habitation
			uninhabited: "inhabited",	// no recent human habitation
			sunlit: "sunlit",        	// sunlit sectors
			toxic: "toxic",          	// polluted sectors
			water: "water",          	// sectors with water (or neighbours)
		},
		
		enemyDefinitions: {
			global: [ ],
			nohazard: [ ],
			cold: [ ],
			dark: [ ],
			radiation: [ ],
			dense: [ ],
			sparse: [ ],
			inhabited: [ ],
			uninhabited: [ ],
			sunlit: [ ],
			toxic: [ ],
			water: [ ],
		},
		
		enemyTexts: {
			bandit: {
				nouns: [ "bandit", "thug" ],
				groupNouns: [ "mob", "gang"],
				verbsActive: [ "patrolled by", "controlled by", "guarded by", "occupied by"],
				verbsDefeated: [ "driven away", "killed"],
			},
			big_animal: {
				nouns: [ "aggressive animal", "wild animal", "animal" ],
				groupNouns: ["pack", "mob", "gang"],
				verbsActive: ["overrun with", "guarded by", "occupied by"],
				verbsDefeated: ["cleared", "killed"],
			},
			bird: {
				nouns: ["urban pest", "birds", "animals", "aggressive animals"],
				groupNouns: ["flock", "swarm", "gang", "mob"],
				verbsActive: ["overrun with", "infested with", "occupied by", "guarded by"],
				verbsDefeated: ["killed", "cleared", "driven away"],
			},
			flora: {
				nouns: ["urban pest", "vicious plants"],
				groupNouns: ["cluster", "group"],
				verbsActive: ["infested with", "covered in", "overrun with"],
				verbsDefeated: ["cleared"],
			},
			fungi: {
				nouns: ["urban pest", "dangerous fungi"],
				groupNouns: ["cluster", "group"],
				verbsActive: ["infested with", "covered in", "overrun with"],
				verbsDefeated: ["cleared", "killed"],
			},
			humanoid: {
				nouns: ["malevolent creatures"],
				groupNouns: ["mob", "gang", "group"],
				verbsActive: ["guarded by", "occupied by"],
				verbsDefeated: ["driven away"],
			},
			robot: {
				nouns: ["aggressive bots"],
				groupNouns: ["mob", "gang", "group", "swarm", "cell"],
				verbsActive: ["patrolled by", "controlled by", "guarded by", "occupied by"],
				verbsDefeated: ["disabled", "cleared", "destroyed"],
			},
			small_animal: {
				nouns: ["urban pest", "aggressive animal", "wild animal", "animal"],
				groupNouns: ["swarm", "pack", "mob", "group", "horde"],
				verbsActive: ["infested with", "overrun with" ],
				verbsDefeated: ["killed", "cleared"],
			},
			structure: {
				nouns: ["automated structures"],
				groupNouns: ["group", "set"],
				verbsActive: ["blocked by"],
				verbsDefeated: ["disabled"],
			},
		},
		
		enemyLoot: {
			bandit: {
				droppedResources: [ "food", "water", "rope" ],
			},
			big_animal: {
				droppedResources: [ "food" ],
			},
			bird: {
				droppedResources: [ "food" ],
			},
			flora: {
				droppedResources: [ "food" ],
			},
			fungi: {
				droppedResources: [ "food" ],
			},
			humanoid: {
				droppedResources: [ ],
			},
			robot: {
				droppedResources: [ "metal", "fuel" ],
			},
			small_animal: {
				droppedResources: [ "food" ],
			},
			structure: {
				droppedResources: [ "metal" ],
			},
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
