define([
	'ash',
	'json!game/data/EnemyData.json',
	'game/GameGlobals',
	'game/constants/EnemyConstants',
	'game/constants/ExplorerConstants',
	'game/constants/PerkConstants',
	'game/constants/ItemConstants',
	'game/constants/FightConstants',
	'game/constants/WorldConstants',
	'game/components/player/ItemsComponent',
	'game/components/player/ExplorersComponent',
	'game/vos/EnemyVO',
	'utils/MathUtils',
], function (
	Ash,
	EnemyData,
	GameGlobals,
	EnemyConstants,
	ExplorerConstants,
	PerkConstants,
	ItemConstants,
	FightConstants,
	WorldConstants,
	ItemsComponent,
	ExplorersComponent,
	EnemyVO,
	MathUtils
) {
	let EnemyCreator = Ash.Class.extend({
		
		constructor: function (config) {
			this.progressionConfig = config;
		},
		
		createEnemies: function () {
			EnemyConstants.enemyDefinitions = [];
			
			let templateSuffix = "__template";
			
			// TODO check nouns and verbs and tags for orphans (only one/few enemies using)
			// TODO check all environment tags have a priority
			
			let getTemplateID = function (enemyID) {
				let parts = enemyID.split("__");
				return parts[0] + templateSuffix;
			};
			
			for (enemyID in EnemyData) {
				if (enemyID.indexOf(templateSuffix) > 0) continue;
				let data = EnemyData[enemyID];
				let templateID = getTemplateID(enemyID);
				let template = EnemyData[templateID] || {};
				
				let def = {};
				Object.assign(def, template);
				Object.assign(def, data);
				
				let enemyClass = def.enemyType;
				let textDef = EnemyConstants.enemyTexts[enemyClass] || {};
				def.nouns = (def.nouns || []).concat(textDef.nouns);
				def.groupNouns = (def.groupNouns || []).concat(textDef.groupNouns);
				def.verbsActive = (def.verbsActive || []).concat(textDef.verbsActive);
				def.verbsDefeated = (def.verbsDefeated || []).concat(textDef.verbsDefeated);
				
				if (!def.nouns || !def.nouns[0] || !def.groupNouns || !def.groupNouns[0] || !def.verbsActive || !def.verbsActive[0] || !def.verbsDefeated || !def.verbsDefeated[0]) {
					log.w("enemy missing text: " + enemyID);
				}
				
				let lootDef = EnemyConstants.enemyLoot[enemyClass] || {};
				def.droppedResources = (def.droppedResources || []).concat(lootDef.droppedResources);
				def.droppedIngredients = (def.droppedIngredients || []).concat(lootDef.droppedIngredients);
				
				let causedInjuryTypes = EnemyConstants.enemyInjuries[enemyClass];
				def.causedInjuryTypes = (def.causedInjuryTypes || []).concat(causedInjuryTypes);
				def.curseProbability = def.curseProbability || 0;
				
				let environment = (def.environment || []).concat(template.environment || []);
				let environmentUnique = environment.filter((item, i) => environment.indexOf(item) === i);

				let rarity = def.rarity;
				if (rarity === undefined) rarity = template.rarity;
				if (rarity === undefined) rarity = 1;

				let enemyVO = this.createEnemy(
					enemyID,
					def.name,
					environmentUnique,
					def.nouns, def.groupNouns, def.verbsActive, def.verbsDefeated,
					def.campOrdinal || 0, def.difficulty || 5,
					def.attackRatio || 0.5, def.shieldRatio || 0, def.healthFactor || 1, def.shieldFactor || 1, def.size || 1, def.speed || 1,
					rarity,
					def.droppedResources, def.droppedIngredients, def.causedInjuryTypes
				);

				let tags = def.tags || template.tags || [];
				enemyVO.tags = tags;
				
				enemyVO.enemyClass = enemyClass;
				enemyVO.curseProbability = def.curseProbability || 0;
				
			 	EnemyConstants.enemyDefinitions.push(enemyVO.cloneWithIV(50));

				EnemyConstants.enemyUsage[enemyID] = { numCandidateSectors: 0, numPresentSectors: 0, candidateLevels: [], presentLevels: [], numCandidateDistricts: 0, numSelectedDistricts: 0, };
			}
		},

		// Enemy definitions (speed: around 1, rarity: 0-100)
		createEnemy: function (id, name, environment, nouns, groupN, activeV, defeatedV, campOrdinal, normalizedDifficulty, attRatio, shieldRatio, healthFactor, shieldFactor, size, speed, rarity, droppedResources, droppedIngredients, causedInjuryTypes) {
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
			
			// normalize input values
			speed = Math.max(speed, 0.1);
			shieldRatio = MathUtils.clamp(shieldRatio, 0, 1);
			shieldFactor = MathUtils.clamp(shieldFactor, 0.1, 2);
			healthFactor = MathUtils.clamp(healthFactor, 0.1, 2);
			
			// campOrdinal, step -> reference player stats (adjusted for difficulty factor)
			let playerAtt = this.getStatBase(campOrdinal, step, difficultyFactor, this.getPlayerAtt);
			let playerDef =  this.getStatBase(campOrdinal, step, difficultyFactor, this.getPlayerDef);
			let playerHPShield = this.getStatBase(campOrdinal, step, difficultyFactor, this.getPlayerHpShield);
			let playerSpeed = this.getPlayerSpeed(campOrdinal, step);
			
			// target duration
			// around 5 sec by default but tweaks for edge cases
			// if time for player to kill itself is far from target duration (early game with 100 hp and low stats) then enemy stats get weird (too low hp for enemy)
			let playerVsPlayerDuration = playerHPShield / FightConstants.getDamagePerSec(playerAtt, playerDef, playerSpeed);
			let targetDuration = Math.max(5, Math.round(playerVsPlayerDuration / 3));
			
			// player def, hp, shield + enemy speed -> enemy att
			// goal: targetDuration seconds to kill player
			// + compensate a bit for health/shieldFactor
			let targetDPH = playerHPShield / targetDuration / speed;
			let att = Math.max(1, this.getAttack(targetDPH, playerDef));
			att = att * (1 / (healthFactor * shieldFactor));
			att = Math.round(att);
			
			// att + attRatio -> enemy def
			// goal: att / (att + def) = attRatio
			let attackFactor = MathUtils.clamp(attRatio, 0.1, 0.9);
			let def = Math.max(1, this.getDefence(att, attackFactor));
			def = Math.round(def);
			
			// player att, speed, enemy def -> enemy hp/shield total
			// goal: about 5 seconds to kill player
			let playerDPS = FightConstants.getDamagePerSec(playerAtt, def, playerSpeed);
			let hpshieldtotal = Math.max(20, playerDPS * targetDuration);
			
			// hpshieldtotal, healthFactor (0-1), shieldFactor (0-1), size -> hp and shield
			let hp = MathUtils.roundToMultiple(hpshieldtotal * (1 - shieldRatio) * healthFactor, 5);
			let shield = MathUtils.roundToMultiple(hpshieldtotal * shieldRatio * shieldFactor, 5);
			
			// normalize final values
			size = MathUtils.clamp(size, 0.1, 2);
			rarity = MathUtils.clamp(rarity, 0, 100);
			droppedResources = droppedResources || [];
			droppedIngredients = droppedIngredients || [];
			
			EnemyConstants.enemyDifficulties[id] = this.getDifficulty(campOrdinal, step);
			
			// log.i("goal strength: " + strength + " | actual strength: " + FightConstants.getStrength(att, def, speed));

			return new EnemyVO(id, name, environment, nouns, groupN, activeV, defeatedV, size, att, def, hp, shield, speed, rarity, droppedResources, droppedIngredients, causedInjuryTypes);
		},
		
		getStatBase: function (campOrdinal, step, difficultyFactor, statfunc) {
			let current = statfunc.call(this, campOrdinal, step);
			
			if (campOrdinal == 0) return current;
			
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
			let playerAtt = this.getPlayerAtt(campOrdinal, step);
			let playerDef = this.getPlayerDef(campOrdinal, step);
			let playerSpeed = this.getPlayerSpeed(campOrdinal, step);
			return FightConstants.getStrength(playerAtt, playerDef, playerSpeed);
		},
		
		getPlayerAtt: function (campOrdinal, step) {
			let playerStamina = this.getTypicalStamina(campOrdinal, step);
			let itemsComponent = this.getTypicalItems(campOrdinal, step);
			let explorersComponent = this.getTypicalExplorers(campOrdinal, step);
			return FightConstants.getPlayerAtt(playerStamina, itemsComponent, explorersComponent);
		},
		
		getPlayerDef: function (campOrdinal, step) {
			let playerStamina = this.getTypicalStamina(campOrdinal, step);
			let itemsComponent = this.getTypicalItems(campOrdinal, step);
			let explorersComponent = this.getTypicalExplorers(campOrdinal, step);
			return FightConstants.getPlayerDef(playerStamina, itemsComponent, explorersComponent);
		},
		
		getPlayerSpeed: function (campOrdinal, step) {
			let itemsComponent = this.getTypicalItems(campOrdinal, step);
			return FightConstants.getPlayerSpeed(itemsComponent);
		},
		
		getAttack: function (targetDPH, playerDef) {
			return Math.round(FightConstants.getAttackForDPH(targetDPH, playerDef));
		},
		
		getDefence: function (att, attFactor) {
			return Math.round(att * (1/attFactor - 1));
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
		
		getEnemyHpShield: function (campOrdinal, step) {
			let playerHPShield = this.getPlayerHpShield(campOrdinal, step);
			
			let playerStamina = this.getTypicalStamina(campOrdinal, step);
			let itemsComponent = this.getTypicalItems(campOrdinal, step);
			let explorersComponent = this.getTypicalExplorers(campOrdinal, step);
			let playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent, explorersComponent);
			
			// average of two factors:
			// - player hp and shield (should be comparable)
			// - player attack (nice fight duration since player attack is maximum damage player can do)
			// att matters less as numbers (relative to typical hp) grow and it's balanced by def
			let defaultHP = 100;
			let attFactor = defaultHP / playerAtt / 50;
			return attFactor * playerAtt + (1-attFactor) * playerHPShield;
		},

		// get valid enemies for a sector/area given difficulty level and optional environment tags
		// - difficulty: derived from campOrdinal and step
		// - tags: tags describing the environment (sector) which need to match those on the enemy (ignored if null)
		// - min: minimum number of enemies to return (if not enough matching found, lower difficulties added)
		getEnemies: function (difficulty, tags, min, minRarity, maxRarity, avoidedEnemyIds) {
			min = min || 1;
			minRarity = minRarity || 0;
			maxRarity = maxRarity || -1;
			avoidedEnemyIds = avoidedEnemyIds || [];

			let result = [];

			if (difficulty <= 0) return result;

			let maxDifficulty = difficulty;
			let minDiffulty = Math.max(1, maxDifficulty - 2);
			
			let isMatchingTags = function (enemyVO) {
				if (!tags) return true;
				return EnemyConstants.matchesRequiredTags(tags, enemyVO);
			}
			
			let enemyList = EnemyConstants.enemyDefinitions;
			for (let i = 0; i < enemyList.length; i++) {
				let enemy = enemyList[i];

				if (minRarity > 0 && enemy.rarity < minRarity) continue;
				if (maxRarity > 0 && enemy.rarity > maxRarity) continue;

				if (avoidedEnemyIds.indexOf(enemy.id) >= 0) continue;

				if (!isMatchingTags(enemy)) continue;
				
				let enemyDifficulty = Math.max(EnemyConstants.enemyDifficulties[enemy.id], 1);

				if (enemyDifficulty > maxDifficulty) continue;
				if (enemyDifficulty < minDiffulty) continue;

				result.push(enemy);
			}

			if (result.length < min) {
				let minFallbacks = min - result.length;
				let fallbackEnemies = this.getEnemies(difficulty - 1, tags, minFallbacks);
				// prefer fallbacks with lots of matching tags
				fallbackEnemies.sort(function (a, b) { return b.environment.length - a.environment.length });
				for (let i = 0; i < fallbackEnemies.length; i++) {
					let fallbackEnemy = fallbackEnemies[i];
					if (result.indexOf(fallbackEnemy) >= 0) continue;
					result.push(fallbackEnemy);
					if (result.length >= min) break;
				}
			}

			return result;
		},

		// get the difficulty level (1-3*15, corresponding to camp ordinal and step) of a given enemy
		getEnemyDifficultyLevel: function (enemyVO) {
			if (!EnemyConstants.enemyDifficulties && EnemyConstants.enemyDifficulties[enemyVO.id])  {
				log.w("enemy difficulty not defined: " + enemyVO.id);
				return 0;
			}
			let result = EnemyConstants.enemyDifficulties[enemyVO.id];
			enemyVO.difficulty = result;
			return result;
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
		
		getTypicalItems: function (campOrdinal, step) {
			let typicalItems = new ItemsComponent();

			// TODO get rid of GameGlobals in EnemyCreator
			let typicalWeapon = GameGlobals.itemsHelper.getDefaultWeapon(campOrdinal, step);
			let typicalClothing = GameGlobals.itemsHelper.getDefaultClothing(campOrdinal, step, ItemConstants.itemBonusTypes.fight_def, false);

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
		
		getTypicalExplorers: function (campOrdinal, step) {
			let typicalExplorers = new ExplorersComponent();
			if (!WorldConstants.isHigherOrEqualCampOrdinalAndStep(campOrdinal, step, ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL, WorldConstants.CAMP_STEP_POI_2)) {
				return typicalExplorers;
			}
			
			if (campOrdinal <= this.progressionConfig.unlockCampOrdinals.inn) {
				campOrdinal = ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL;
				step = WorldConstants.CAMP_STEP_POI_2;
			}
			
			// only considering fight related explorers here
			let explorer = ExplorerConstants.getTypicalFighter(campOrdinal, step);
			typicalExplorers.addExplorer(explorer);
			typicalExplorers.setExplorerInParty(explorer, true);
			
			return typicalExplorers;
		},
		
		getTypicalStamina: function (campOrdinal, step) {
			let healthyPerkFactor = 1;
			
			let campAndStepPerk1 = this.progressionConfig.unlockCampOrdinalAndSteps.staminaPerk1;
			let campAndStepPerk2 = this.progressionConfig.unlockCampOrdinalAndSteps.staminaPerk2;

			if (WorldConstants.isHigherOrEqualCampOrdinalAndStep(campOrdinal, step, campAndStepPerk2.campOrdinal, campAndStepPerk2.step)) {
				healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus3).effect;
			} else if (WorldConstants.isHigherOrEqualCampOrdinalAndStep(campOrdinal, step, campAndStepPerk1.campOrdinal, campAndStepPerk1.step)) {
				healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus2).effect;
			}
			
			var injuryFactor = 1;
			if (campOrdinal <= 1 && step <= WorldConstants.CAMP_STEP_START)
			 	injuryFactor = 0.5;
			
			let typicalHealth = Math.round(100 * healthyPerkFactor * injuryFactor);
				
			let typicalItems = this.getTypicalItems(campOrdinal, step);
				
			var typicalStamina = {};
			typicalStamina.health = typicalHealth;
			typicalStamina.maxHP = typicalHealth;
			typicalStamina.maxShield = typicalItems.getCurrentBonus(ItemConstants.itemBonusTypes.fight_shield);
			
			return typicalStamina;
		},

		registerEnemyAsCandidateForSector: function (enemyID, level) {
			let stats = EnemyConstants.enemyUsage;
			stats[enemyID].numCandidateSectors++;
			if (stats[enemyID].candidateLevels.indexOf(level) < 0) stats[enemyID].candidateLevels.push(level);
		},

		registerEnemyAsPresentForSector: function (enemyID, level) {
			let stats = EnemyConstants.enemyUsage;
			stats[enemyID].numPresentSectors++;
			if (stats[enemyID].presentLevels.indexOf(level) < 0) stats[enemyID].presentLevels.push(level);
		},

		registerEnemyAsCandidateForDistrict: function (enemyID, level, districtIndex) {
			let stats = EnemyConstants.enemyUsage;
			stats[enemyID].numCandidateDistricts++;
		},

		registerEnemyAsSelectedForDistrict: function (enemyID, level, districtIndex) {
			let stats = EnemyConstants.enemyUsage;
			stats[enemyID].numSelectedDistricts++;
		}
		
	});

	return EnemyCreator;
});
