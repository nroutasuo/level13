define([
	'ash',
	'json!game/data/EnemyData.json',
	'game/GameGlobals',
	'game/constants/EnemyConstants',
	'game/constants/PerkConstants',
	'game/constants/ItemConstants',
	'game/constants/FightConstants',
	'game/constants/WorldConstants',
	'game/components/player/ItemsComponent',
	'game/vos/EnemyVO',
	'utils/MathUtils',
], function (
	Ash,
	EnemyData,
	GameGlobals,
	EnemyConstants,
	PerkConstants,
	ItemConstants,
	FightConstants,
	WorldConstants,
	ItemsComponent,
	EnemyVO,
	MathUtils
) {
	var EnemyCreator = Ash.Class.extend({
		
		constructor: function () {},
		
		createEnemies: function () {
			EnemyConstants.enemyDefinitions = {};
			
			// TODO check nouns and verbs for orphans (only one/few enemies using)
			
			for (enemyID in EnemyData) {
				let def = EnemyData[enemyID];
				let type = def.type;
				let enemyVO = this.createEnemy(
					enemyID, def.name, type,
					def.nouns, def.groupNouns, def.verbsActive, def.verbsDefeated,
					def.campOrdinal || 0, def.difficulty || 5,
					def.attackRatio || 0.5, def.shieldRatio || 0, def.healthFactor || 1, def.shieldFactor || 1, def.size || 1, def.speed || 1,
					def.rarity || 1,
					def.droppedResources
				);
				if (!EnemyConstants.enemyDefinitions[type]) EnemyConstants.enemyDefinitions[type] = [];
			 	EnemyConstants.enemyDefinitions[type].push(enemyVO);
			}
		},

		// Enemy definitions (difficulty: 1-10, attRatio: 0-1, shieldRatio: 0-1, healthFactor: 0-1, size: around 1, speed: around 1, rarity: 0-100)
		createEnemy: function (id, name, type, nouns, groupN, activeV, defeatedV, campOrdinal, normalizedDifficulty, attRatio, shieldRatio, healthFactor, shieldFactor, size, speed, rarity, droppedResources) {
			var reqStr = this.getRequiredStrength(campOrdinal, 2);
			var reqStrPrev = this.getRequiredStrength(campOrdinal, 1);
			var reqStrNext = this.getRequiredStrength(campOrdinal, 3);
			var strengthMin = Math.max(0, reqStr - (reqStr - reqStrPrev) * 0.5);
			var strengthMax = Math.max(2, reqStr + (reqStrNext - reqStr) * 0.5);
			if (reqStr === reqStrNext) {
				strengthMax = Math.max(2, reqStr + (reqStr - reqStrPrev) * 0.5);
			}
			
			let attackFactor = MathUtils.clamp(attRatio, 0.1, 0.9);
			
			var typicalStamina = this.getTypicalStamina(campOrdinal, 2, false);
			let staminaBase = typicalStamina.maxHP + typicalStamina.maxShield;
			let sizeHPFactor = MathUtils.map(size, 0, 2, 0.5, 1.5);
			let sizeShieldFactor = MathUtils.map(size, 0, 2, 0.75, 1.25);
			let hp = Math.round(staminaBase * (1 - shieldRatio) * healthFactor * sizeHPFactor);
			let shield = Math.round(staminaBase * shieldRatio * shieldFactor * sizeShieldFactor);
			
			// log.i("createEnemy " + name + " campOrdinal:" + campOrdinal + ", normalizedDifficulty: " + normalizedDifficulty + " strengthMin: " + strengthMin + ", strengthMax: " + strengthMax)
			
			var strength = strengthMin + (strengthMax - strengthMin) / 10 * normalizedDifficulty;
			var stats = strength * 100 / (hp + shield) * (1 / speed);
			var def = Math.max(1, Math.round(stats * (1 - attackFactor)));
			var att = Math.max(1, Math.round(stats * attackFactor));
			
			droppedResources = droppedResources || [ ];
			
			return new EnemyVO(id, name, type, nouns, groupN, activeV, defeatedV, att, def, hp, shield, speed, rarity, droppedResources);
		},

		// get enemies by type (string) and difficulty (campOrdinal and step)
		// by default will also include enemies of one difficulty lower, if restrictDifficulty, then not
		// will return at least one enemy; if no matching enemy exists, one with lower difficulty is returned
		getEnemies: function (type, difficulty, restrictDifficulty) {
			var enemies = [];
			if (difficulty <= 0) return enemies;

			if (!EnemyConstants.enemyDifficulties) this.saveEnemyDifficulties();

			var enemy;
			var enemyDifficulty;
			var enemyList = [];
			if (type) {
				enemyList = EnemyConstants.enemyDefinitions[type];
			} else {
				for (var type in EnemyConstants.enemyTypes) {
					enemyList = enemyList.concat(EnemyConstants.enemyDefinitions[type]);
				}
			}
			
			for (var i = 0; i < enemyList.length; i++) {
				enemy = enemyList[i];
				enemyDifficulty = Math.max(EnemyConstants.enemyDifficulties[enemy.id], 1);
				if (enemyDifficulty === difficulty)
					enemies.push(enemy);
				if (enemyDifficulty === difficulty - 1 && difficulty > 1 && !restrictDifficulty)
					enemies.push(enemy);
			}

			if (enemies.length <= 0) {
				return this.getEnemies(type, difficulty - 1, restrictDifficulty);
			}

			return enemies;
		},
		
		saveEnemyDifficulties: function () {
			EnemyConstants.enemyDifficulties = {};
			var enemy;
			var enemyDifficulty;
			for (var type in EnemyConstants.enemyTypes) {
				for (var i = 0; i < EnemyConstants.enemyDefinitions[type].length; i++) {
					enemy = EnemyConstants.enemyDefinitions[type][i];
					enemyDifficulty = this.getEnemyDifficultyLevel(enemy);
					EnemyConstants.enemyDifficulties[enemy.id] = enemyDifficulty;
				}
			}
		},

		// get the difficulty level (1-3*15, corresponding to camp ordinal and step) of a given enemy
		getEnemyDifficultyLevel: function (enemy) {
			if (EnemyConstants.enemyDifficulties && EnemyConstants.enemyDifficulties[enemy.id]) return EnemyConstants.enemyDifficulties[enemy.id];
			var enemyStats = FightConstants.getStrength(enemy.att, enemy.def, enemy.speed, enemy.maxHP, enemy.maxShield);
			var requiredStats;
			var max = this.getDifficulty(WorldConstants.CAMPS_TOTAL, WorldConstants.CAMP_STEP_END);
			for (var i = 1; i <= max; i++) {
				var campOrdinal = this.getCampOrdinalFromDifficulty(i);
				var step = this.getStepFromDifficulty(i);
				requiredStats = this.getRequiredStrength(campOrdinal, step, false);
				if (requiredStats >= enemyStats) return i;
			}
			return max;
		},
		
		getCampOrdinalFromDifficulty: function (difficulty) {
			return Math.ceil(difficulty/3);
		},
		
		getStepFromDifficulty: function (difficulty) {
			return difficulty - (this.getCampOrdinalFromDifficulty(difficulty) - 1)*3;
		},
		
		getDifficulty: function (campOrdinal, step) {
			return (campOrdinal - 1)*3 + step;
		},
		
		getRequiredStrength: function (campOrdinal, step, isHardLevel) {
			var prevOrdinal = campOrdinal;
			var prevStep = step - 1;
			if (prevStep < WorldConstants.CAMP_STEP_START) {
				prevOrdinal = campOrdinal - 1;
				prevStep = WorldConstants.CAMP_STEP_END;
			}
			var typicalStrength = this.getTypicalStrength(campOrdinal, step, isHardLevel);
			var typicalStrengthPrevious = this.getTypicalStrength(prevOrdinal, prevStep, isHardLevel);
			var result = Math.ceil((typicalStrength + typicalStrengthPrevious) / 2);
			return result;
		},

		getTypicalStrength: function (campOrdinal, step, isHardLevel) {
			if (campOrdinal < 0) campOrdinal = 0;

			var typicalItems = this.getTypicalItems(campOrdinal, step, isHardLevel);
			var typicalStamina = this.getTypicalStamina(campOrdinal, step, isHardLevel)
			var result = FightConstants.getPlayerStrength(typicalStamina, typicalItems);
			// log.i("typical strength: campOrdinal: " + campOrdinal + ", step: " + step + " -> " + result + " | " + numFollowers + " " + typicalHealth);
			return result;
		},
		
		getTypicalItems: function (campOrdinal, step, isHardLevel) {
			var typicalItems = new ItemsComponent();
			var typicalWeapon = ItemConstants.getDefaultWeapon(campOrdinal, step);
			var typicalClothing = GameGlobals.itemsHelper.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.fight_def, isHardLevel);

			if (typicalWeapon) {
				typicalItems.addItem(typicalWeapon, false);
			}

			if (typicalClothing.length > 0) {
				for (let i = 0; i < typicalClothing.length; i++) {
					typicalItems.addItem(typicalClothing[i], false);
				}
			}

			// followers
			var numFollowers = FightConstants.getTypicalNumFollowers(campOrdinal);
			for (var f = 0; f < numFollowers; f++) {
				typicalItems.addItem(ItemConstants.getFollower(13, campOrdinal, 0.5));
			}
			
			typicalItems.autoEquipAll();
			return typicalItems;
		},
		
		getTypicalStamina: function (campOrdinal, step, isHardLevel) {
			// TODO figure out when exactly player gets access to each of the health bonuses
			var healthyPerkFactor = 1;
			if (campOrdinal > 14)
				healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus3).effect;
			else if (campOrdinal > 10)
				healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus2).effect;
			else if (campOrdinal > 8)
				healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus1).effect;
			
			var injuryFactor = 1;
			if (campOrdinal <= 1 && step <= WorldConstants.CAMP_STEP_START)
			 	injuryFactor = 0.5;
			
			let typicalHealth = Math.round(100 * healthyPerkFactor * injuryFactor);
				
			let typicalItems = this.getTypicalItems(campOrdinal, step, isHardLevel);
				
			var typicalStamina = {};
			typicalStamina.health = typicalHealth;
			typicalStamina.maxHP = typicalHealth;
			typicalStamina.maxShield = typicalItems.getCurrentBonus(ItemConstants.itemBonusTypes.fight_shield);
			
			return typicalStamina;
		}
		
	});

	return EnemyCreator;
});
