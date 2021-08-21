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
			 	EnemyConstants.enemyDefinitions[type].push(enemyVO.cloneWithIV(50));
			}
		},

		// Enemy definitions (speed: around 1, rarity: 0-100)
		createEnemy: function (id, name, type, nouns, groupN, activeV, defeatedV, campOrdinal, normalizedDifficulty, attRatio, shieldRatio, healthFactor, shieldFactor, size, speed, rarity, droppedResources) {
			// normalizedDifficulty (1-10) -> camp step and difficulty within camp step
			normalizedDifficulty = MathUtils.clamp(normalizedDifficulty, 1, 10);
			let step = 0;
			let difficultyFactor = 0;
			if (normalizedDifficulty <= 3) {
				step = WorldConstants.CAMP_STEP_START;
				difficultyFactor = MathUtils.map(normalizedDifficulty, 1, 3, 0, 1);
			} else if (normalizedDifficulty <= 7) {
				step = WorldConstants.CAMP_STEP_POI_2;
				difficultyFactor = MathUtils.map(normalizedDifficulty, 4, 7, 0, 1);
			} else  {
				step = WorldConstants.CAMP_STEP_END;
				difficultyFactor = MathUtils.map(normalizedDifficulty, 8, 10, 0, 1);
			}
			
			// campOrdinal, step, attRatio (0-1) -> att and def
			let attackFactor = MathUtils.clamp(attRatio, 0.1, 0.9);
			let strength = this.getStatBase(campOrdinal, step, difficultyFactor, this.getPlayerStrength);
			let att = Math.max(1, this.getAttack(strength, attackFactor, speed));
			let def = Math.max(1, this.getDefence(strength, attackFactor, speed));
			
			// campOrdinal, step, shieldRatio (0-1), healthFactor (0-1), shieldFactor (0-1), size -> hp and shield
			let hpshieldtotal = Math.max(10, this.getStatBase(campOrdinal, step, difficultyFactor, this.getPlayerHpShield));
			let sizeHPFactor = MathUtils.map(size, 0, 2, 0.5, 1.5);
			let sizeShieldFactor = MathUtils.map(size, 0, 2, 0.75, 1.25);
			let hp = Math.round(hpshieldtotal * (1 - shieldRatio) * healthFactor * sizeHPFactor);
			let shield = Math.round(hpshieldtotal * shieldRatio * shieldFactor * sizeShieldFactor);
			
			// normalize rest
			speed = Math.max(speed, 0.1);
			rarity = MathUtils.clamp(rarity, 1, 100);
			droppedResources = droppedResources || [ ];
			
			EnemyConstants.enemyDifficulties[id] = this.getDifficulty(campOrdinal, step);
			
			// log.i("goal strength: " + strength + " | actual strength: " + FightConstants.getStrength(att, def, speed));

			return new EnemyVO(id, name, type, nouns, groupN, activeV, defeatedV, att, def, hp, shield, speed, rarity, droppedResources);
		},
		
		getStatBase: function (campOrdinal, step, difficultyFactor, statfunc) {
			let current = statfunc.call(this, campOrdinal, step);
			
			let previousTotal = 0;
			let previousNum = 0;
			let prevCamp = campOrdinal;
			let prevStep = step;
			while (previousNum < 6 && prevCamp > 0) {
				prevStep--;
				if (prevStep < WorldConstants.CAMP_STEP_START) {
					prevCamp--;
					prevStep = WorldConstants.CAMP_STEP_END;
				}
				let previous = statfunc.call(this, prevCamp, prevStep);
				previousTotal += previous;
				previousNum++;
				if (previousNum > 1 && previous < current) break;
			}
			
			let min = previousNum > 0 ? previousTotal / previousNum : 0;
			let max = current;
			
			return MathUtils.map(difficultyFactor, 0, 1, min, max);
		},
		
		getPlayerStrength: function (campOrdinal, step) {
			let playerStamina = this.getTypicalStamina(campOrdinal, step);
			let itemsComponent = this.getTypicalItems(campOrdinal, step);
			let playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
			let playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
			let playerSpeed = FightConstants.getPlayerSpeed(itemsComponent);
			return FightConstants.getStrength(playerAtt, playerDef, playerSpeed);
		},
		
		
		getAttack: function (strength, attackFactor, speed) {
			return this.getAttDef(strength, speed) * attackFactor;
		},
		
		getDefence: function (strength, attackFactor, speed) {
			return this.getAttDef(strength, speed) * (1 - attackFactor);
		},
		
		getAttDef: function (strength, speed) {
			// str = att * (F + spd * F) + def;
			// assuming att == def == ad
			let ad = strength / (speed * FightConstants.STRENGTH_ATT_FACTOR + FightConstants.STRENGTH_ATT_FACTOR + 1);
			return ad * 2;
		},
		
		getPlayerHpShield: function (campOrdinal, step) {
			let playerStamina = this.getTypicalStamina(campOrdinal, step);
			return playerStamina.maxHP + playerStamina.maxShield;
		},

		// get enemies by type (string) and difficulty (campOrdinal and step)
		// by default will also include enemies of one difficulty lower, if restrictDifficulty, then not
		// will return at least one enemy; if no matching enemy exists, one with lower difficulty is returned
		getEnemies: function (type, difficulty, restrictDifficulty) {
			var enemies = [];
			if (difficulty <= 0) return enemies;

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

		// get the difficulty level (1-3*15, corresponding to camp ordinal and step) of a given enemy
		getEnemyDifficultyLevel: function (enemy) {
			if (!EnemyConstants.enemyDifficulties && EnemyConstants.enemyDifficulties[enemy.id])  {
				log.w("enemy difficulty not defined: " + enemy.id);
				return 0;
			}
			return EnemyConstants.enemyDifficulties[enemy.id];
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
			
			typicalItems.autoEquipAll();
			return typicalItems;
		},
		
		getTypicalStamina: function (campOrdinal, step, isHardLevel) {
			// TODO figure out when exactly player gets access to each of the health bonuses (two from upgrades, last from exploring somehow)
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
