define(['ash', 'game/vos/EnemyVO', 'game/constants/PerkConstants'],
function (Ash, EnemyVO, PerkConstants) {

	var EnemyConstants = {
		
		enemyDefinitions: [],

		enemyUsage: {}, // usage in current world, just for debug
		
		enemyTexts: {
			apparition: {
				nouns: [ "apparition", "entity" ],
				groupNouns: [ "cloud", "group", "gathering" ],
				verbsActive: [ "occupied by", "haunted by"],
				verbsDefeated: [ "driven away", "defeated", "cleared"],
			},
			bandit: {
				nouns: [ "bandit", "thug" ],
				groupNouns: [ "mob", "gang"],
				verbsActive: [ "patrolled by", "controlled by", "guarded by", "occupied by"],
				verbsDefeated: [ "driven away", "killed"],
			},
			big_animal: {
				nouns: [ "aggressive animal", "wild animal", "animal", "hostile wildlife" ],
				groupNouns: ["pack", "mob", "gang"],
				verbsActive: ["overrun with", "guarded by", "occupied by"],
				verbsDefeated: ["cleared", "killed"],
			},
			bird: {
				nouns: ["urban pest", "birds", "animal", "aggressive animal", "hostile wildlife" ],
				groupNouns: ["flock", "swarm", "gang", "mob"],
				verbsActive: ["overrun with", "infested with", "occupied by", "guarded by"],
				verbsDefeated: ["killed", "cleared", "driven away"],
			},
			flora: {
				nouns: ["urban pest", "vicious plant", "hostile wildlife" ],
				groupNouns: ["cluster", "group"],
				verbsActive: ["infested with", "covered in", "overrun with"],
				verbsDefeated: ["cleared"],
			},
			fungi: {
				nouns: ["urban pest", "dangerous fungi", "hostile wildlife"],
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
				nouns: ["aggressive bot"],
				groupNouns: ["mob", "gang", "group", "swarm", "cell"],
				verbsActive: ["patrolled by", "controlled by", "guarded by", "occupied by"],
				verbsDefeated: ["disabled", "cleared", "destroyed"],
			},
			small_animal: {
				nouns: ["urban pest", "aggressive animal", "wild animal", "animal", "hostile wildlife"],
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
			apparition: {
				droppedResources: [ "water" ],
			},
			bandit: {
				droppedResources: [ "food", "water", "rope" ],
				droppedIngredients: [ "res_bands", "res_bottle", "res_hairpin", "res_leather", "res_silk", "res_tape" ],
			},
			big_animal: {
				droppedResources: [ "food" ],
				droppedIngredients: [ "res_bands", "res_leather" ],
			},
			bird: {
				droppedResources: [ "food" ],
				droppedIngredients: [ "res_bands", "res_bottle", "res_hairpin", "res_leather", "res_tape" ],
			},
			flora: {
				droppedResources: [ "food" ],
				droppedIngredients: [ "res_glowbug", "res_silk" ],
			},
			fungi: {
				droppedResources: [ "food" ],
				droppedIngredients: [ "res_bottle", "res_glowbug", "res_silk" ],
			},
			humanoid: {
				droppedResources: [ "water" ],
				droppedIngredients: [ "res_bands", "res_bottle", "res_hairpin", "res_leather", "res_silk", "res_tape" ],
			},
			robot: {
				droppedResources: [ "metal", "fuel" ],
				droppedIngredients: [ "res_bands", "res_bottle", "res_hairpin", "res_tape" ],
			},
			small_animal: {
				droppedResources: [ "food" ],
				droppedIngredients: [ "res_bands", "res_glowbug", "res_hairpin", "res_leather", "res_silk" ],
			},
			structure: {
				droppedResources: [ "metal" ],
				droppedIngredients: [ "res_bands", "res_bottle", "res_glowbug", "res_hairpin", "res_tape" ],
			},
		},
		
		enemyInjuries: {
			bandit: [ PerkConstants.injuryType.SHARP, PerkConstants.injuryType.BLUNT ],
			big_animal: [ PerkConstants.injuryType.SHARP, PerkConstants.injuryType.BLUNT ],
			bird: [ PerkConstants.injuryType.SHARP ],
			flora: [ PerkConstants.injuryType.BLUNT ],
			fungi: [ PerkConstants.injuryType.BLUNT ],
			humanoid: [ PerkConstants.injuryType.SHARP, PerkConstants.injuryType.BLUNT ],
			robot: [ PerkConstants.injuryType.SHARP, PerkConstants.injuryType.BLUNT ],
			small_animal: [ PerkConstants.injuryType.SHARP ],
			structure: [ PerkConstants.injuryType.BLUNT ],
		},
		
		// saved for convenience & startup speed
		enemyDifficulties: {},
		
		getEnemy: function (enemyID) {
			let enemyVO = this.tryGetEnemy(enemyID);
			if (enemyVO) return enemyVO;
			log.w("no such enemy found: " + enemyID);
			return null;
		},

		tryGetEnemy: function (enemyID) {
			for (let i in this.enemyDefinitions) {
				let enemy = this.enemyDefinitions[i];
				if (enemy.id == enemyID) {
					return enemy;
				}
			}
			return null;
		},
		
		getAll: function () {
			let result = [];
			for (let i in this.enemyDefinitions) {
				let enemy = this.enemyDefinitions[i];
				result.push(enemy);
			}
			return result;
		},
		
		getDifficulty: function (enemy) {
			return this.enemyDifficulties[enemy.id];
		},

		getDropsCurrency: function (enemyVO) {
			switch (enemyVO.enemyClass) {
				case "bandit": return true;
				default: return false;
			}
		}
		
	};
		
	
	return EnemyConstants;
	
});
