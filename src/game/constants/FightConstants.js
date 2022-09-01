define(['ash',
	'game/GameGlobals',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/LocaleConstants',
	'game/constants/PositionConstants',
	'game/constants/UpgradeConstants',
	'game/constants/WorldConstants',
	'game/vos/ResourcesVO'],
function (Ash, GameGlobals, ItemConstants, PerkConstants, LocaleConstants, PositionConstants, UpgradeConstants, WorldConstants, ResourcesVO) {

	var FightConstants = {
	
		FIGHT_PLAYER_BASE_ATT: 3,
		FIGHT_PLAYER_BASE_DEF: 0,
		
		FIGHT_SPEED_FACTOR: 1,
		
		PARTICIPANT_TYPE_FRIENDLY: 0,
		PARTICIPANT_TYPE_ENEMY: 1,
		
		STRENGTH_ATT_FACTOR: 1,
		
		STATUS_STUNNED: "STUNNED",
		
		getDamagePerHit: function (att, def) {
			// att scaled by att / def ratio:
			// - if def = 0 -> dmg = att
			// - if def = att -> dmg = att/2
			// - never more than att
			// - never 0
			if (att <= 0) return 0;
			def = Math.max(def, 0);
			var dmg = att * att / (att + def);
			
			dmg = Math.round(dmg * 4)/4;
			
			return Math.max(1, dmg);
		},
		
		getAttackForDPH: function (dph, def) {
			// the messy function below is the damage formula solved for att:
			// dph = att * att / (att + def)
			// -> att = 1/2 (sqrt(dph) sqrt(4 def + dph) + dph)
			return 0.5 * (Math.sqrt(dph) * Math.sqrt(4 * def + dph) + dph);
		},
		
		// two fight participants with similar strength will do similar damage per sec to each other
		// att matters more than def, and speed matters more in propotion to att than def
		getStrength: function (att, def, spd) {
			return att * (FightConstants.STRENGTH_ATT_FACTOR + spd * FightConstants.STRENGTH_ATT_FACTOR) + def;
		},
		
		getDamagePerSec: function (att, def, speed) {
			let attackTime = this.getAttackTime(speed);
			return this.getDamagePerHit(att, def) / attackTime;
		},
		
		getAttackTime: function (speed) {
			return 1 / speed / this.FIGHT_SPEED_FACTOR;
		},
		
		getFirstTurnTime: function (attackTime, startRoll) {
			let modifiedProbability = 0.2;
			if (startRoll < (modifiedProbability / 4))
				return attackTime * 0.5;
			if (startRoll < (modifiedProbability / 2))
				return attackTime * 0.75;
			if (startRoll > (1 - modifiedProbability / 4))
				return attackTime * 1.5;
			if (startRoll > (1 - modifiedProbability / 2))
				return attackTime * 1.25;
			return attackTime;
		},
		
		getHitsToKill: function (attackerAtt, defenderDef, defenderHP, defenderShield) {
			return Math.ceil((defenderHP + defenderShield) / this.getDamagePerHit(attackerAtt, defenderDef));
		},
		
		getSecToKill: function (attackerAtt, attackerSpeed, defenderDef, defenderHP, defenderShield) {
			return this.getHitsToKill(attackerAtt, defenderDef, defenderHP, defenderShield) * this.getAttackTime(attackerSpeed);
		},
		
		getPlayerAttackTime: function (itemsComponent) {
			let playerSpeed = this.getPlayerSpeed(itemsComponent);
			return this.getAttackTime(playerSpeed);
		},
		 
		getPlayerAtt: function (playerStamina, itemsComponent, followersComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att, ItemConstants.itemTypes.weapon);
			var playerAtt = itemBonus;
			if (itemBonus <= 0)
				playerAtt = this.FIGHT_PLAYER_BASE_ATT;
			var followerBonus = followersComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att);
			return playerAtt + followerBonus;
		},
		 
		getPlayerAttDesc: function (playerStamina, itemsComponent, followersComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att, ItemConstants.itemTypes.weapon);
			var healthFactor = (playerStamina.health/100);
			var followerBonus = followersComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att);
			var desc = "";
			if (itemBonus <= 0) desc += "player: " + this.FIGHT_PLAYER_BASE_ATT;
			if (itemBonus > 0) desc += "equipment: " + itemBonus;
			if (healthFactor < 1) desc += "<br/>health: -" + Math.round((1-healthFactor) * 1000) / 10 + "%";
			if (followerBonus > 0) desc += "<br/>followers: " + followerBonus;
			return desc;
		},
		
		getPlayerDef: function (playerStamina, itemsComponent, followersComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def);
			var playerDef = itemBonus;
			if (itemBonus <= 0)
			 	playerDef = this.FIGHT_PLAYER_BASE_DEF;
			var followerBonus = followersComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def);
			return playerDef + followerBonus;
		},
		
		getPlayerDefDesc: function (playerStamina, itemsComponent, followersComponent) {
			let itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def);
			let desc = "";
			if (itemBonus > 0) desc += "equipment: " + itemBonus;
			else desc += "player: " + this.FIGHT_PLAYER_BASE_DEF;
			var followerBonus = followersComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def);
			if (followerBonus > 0) desc += "<br/>followers: " + followerBonus;
			return desc;
		},
		
		getPlayerShield: function (playerStamina, itemsComponent) {
			return itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_shield);
		},
		
		getPlayerShieldDesc: function (playerStamina, itemsComponent) {
			return "equipment: " + itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_shield);
		},
		
		getPlayerSpeed: function (itemsComponent) {
			let weapons = itemsComponent.getEquipped(ItemConstants.itemTypes.weapon);
			let weapon = weapons.length > 0 ? weapons[0] : null;
			let weaponSpeedBonus = weapon ? weapon.getCurrentBonus(ItemConstants.itemBonusTypes.fight_speed) || 1 : 1;
			return weaponSpeedBonus;
		},
		
		getEnemyAttackTime: function (enemy) {
			return this.getAttackTime(enemy.getSpeed());
		},
		
		// Damage done by player to an enemy per sec
		getDamageByPlayerPerSec: function (enemy, playerStamina, itemsComponent, followersComponent) {
			if (!enemy) return 0;
			var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent, followersComponent);
			let playerSpeed = FightConstants.getPlayerSpeed(itemsComponent);
			return this.getDamagePerSec(playerAtt, enemy.getDef(), playerSpeed);
		},
		
		getDamageByPlayerPerHit: function (enemy, playerStamina, itemsComponent, followersComponent) {
			var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent, followersComponent);
			return this.getDamagePerHit(playerAtt, enemy.getDef());
		},
		
		// Damage done by the enemy to the player per sec
		getDamageByEnemyPerSec: function (enemy, playerStamina, itemsComponent, followersComponent) {
			var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent, followersComponent);
			return this.getDamagePerSec(enemy.getAtt(), playerDef, enemy.getSpeed());
		},
		
		getDamageByEnemyPerHit: function (enemy, playerStamina, itemsComponent, followersComponent) {
			var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent, followersComponent);
			return this.getDamagePerHit(enemy.getAtt(), playerDef);
		},
		
		getMissChance: function (participantType, fightTime) {
			fightTime = fightTime || 0;
			let baseChance = participantType == this.PARTICIPANT_TYPE_FRIENDLY ? 0.025 : 0.05;
			if (fightTime < 10)
				return baseChance;
			if (fightTime < 15)
				return baseChance / 2;
			return 0;
		},
		
		getCriticalHitChance: function (participantType, fightTime) {
			fightTime = fightTime || 0;
			let baseChance = 0.05;
			if (fightTime < 5)
				return baseChance;
			if (fightTime < 10)
				return baseChance * 1.5;
			return baseChance * 2;
		},
		
		isWin: function (playerHP, enemyHP) {
			return enemyHP <= 0 && playerHP > 0;
		},
		
		getTurnScenarios: function (participantType, enemy, playerStamina, itemsComponent, followersComponent, fightTime) {
			let missChance = Math.round(FightConstants.getMissChance(participantType, fightTime) * 1000)/1000;
			let criticalChance = Math.round(FightConstants.getCriticalHitChance(participantType, fightTime) * 1000)/1000;
			let regularChance = 1 - missChance - criticalChance;
			
			let participantName = participantType == FightConstants.PARTICIPANT_TYPE_FRIENDLY ? "player" : "enemy";
			let regularDamage = participantType == FightConstants.PARTICIPANT_TYPE_FRIENDLY ?
				FightConstants.getDamageByPlayerPerHit(enemy, playerStamina, itemsComponent, followersComponent) :
				FightConstants.getDamageByEnemyPerHit(enemy, playerStamina, itemsComponent, followersComponent);
			
			let result = [];
			if (regularChance > 0) {
				result.push({ probability: regularChance, type: "HIT", damage: regularDamage, logMessage: participantName + " hit: " + regularDamage })
			}
			if (missChance > 0) {
				result.push({ probability: missChance, type: "MISS", damage: 0, logMessage: participantName + " missed" });
			}
			if (criticalChance > 0) {
				let criticalDamage = regularDamage * 2;
				result.push({ probability: criticalChance, type: "CRIT", damage: criticalDamage, logMessage: participantName + " critical hit: " + criticalDamage})
			}
			return result;
		},
		
		getFightWinProbability: function (enemy, playerStamina, itemsComponent, followersComponent) {
			return new Promise((resolve, reject) => {
				if (!enemy) resolve(1);
				
				let maxTime = 60 * 10;
				let endedBranches = [];
				let activeBranches = [];
				
				var playerAttackTime = FightConstants.getPlayerAttackTime(itemsComponent);
				let enemyAttackTime = FightConstants.getEnemyAttackTime(enemy);
				
				let rollIncrement = 0.05;
				for (let i = 0; i <= 1; i += rollIncrement) {
					for (let j = 0; j <= 1; j += rollIncrement) {
						activeBranches.push({
							nextTurnPlayer: FightConstants.getFirstTurnTime(playerAttackTime, i), nextTurnEnemy: FightConstants.getFirstTurnTime(enemyAttackTime, j),
							playerHP: playerStamina.maxHP + playerStamina.maxShield, enemyHP: enemy.maxHP + enemy.maxShield,
							playerTurns: [], enemyTurns: [],
						 	isEnded: false,
							probability: rollIncrement * rollIncrement
						});
					}
				}
				
				let getBranchId = function (branch) {
					return branch.nextTurnPlayer + "-" + branch.nextTurnEnemy + "-" + branch.isEnded + "-" + branch.playerHP + "-" + branch.enemyHP;
				}
				
				let combineBranches = function (branches) {
					let branchesById = {};
					for (let i = 0; i < branches.length; i++) {
						let branch = branches[i];
						let id = getBranchId(branch);
						if (branchesById[id]) {
							numResolvedBranches++;
							branchesById[id].probability += branch.probability;
						} else {
							branchesById[id] = branch;
						}
					}
					
					let newActiveBranches = [];
					for (let id in branchesById) {
						newActiveBranches.push(branchesById[id]);
					}
					
					activeBranches = newActiveBranches;
				}
				
				let totalTime = 0;
				let minNextTurn = Math.min(activeBranches[0].nextTurnPlayer, activeBranches[0].nextTurnEnemy);
				let minProb = -1;
				let maxProb = -1;
				let minPlayerHP = -1;
				let maxPlayerHP = -1;
				let numDiscardedBranches = 0;
				let numResolvedBranches = 0;
				
				let returnResult = function () {
					if (endedBranches.length == 0) {
						reject("couldn't calculate fight probability");
						return;
					}
					
					let isWin = function (branch) {
						return FightConstants.isWin(branch.playerHP, branch.enemyHP);
					};
					
					let result = 0;
					let highestProbability = 0;
					let mostProbableBranch = null;
					for (let i = 0; i < endedBranches.length; i++) {
						let win = isWin(endedBranches[i]);
						if (win) {
							result += endedBranches[i].probability;
						}
						if (endedBranches[i].probability > highestProbability) {
							highestProbability = endedBranches[i].probability;
							mostProbableBranch = endedBranches[i];
						}
					}
					
					result = Math.max(0, result);
					result = Math.min(result, 1);
					
					resolve(result);
				};
				
				let applyStep = function () {
					let stepTime = minNextTurn;
					totalTime += stepTime;
					minNextTurn = 5;
					minProb = -1;
					maxProb = -1;
					minPlayerHP = -1;
					maxPlayerHP = -1;
					
					// apply fight step to branches
					let newActiveBranches = [];
					for (let i = 0; i < activeBranches.length; i++) {
						let branch = activeBranches[i];
						if (branch.probability < 0.00001) {
							numDiscardedBranches++;
							continue;
						}
						let resultBranches = FightConstants.applyFightStepToProbabilityBranch(branch, enemy, playerStamina, itemsComponent, followersComponent, stepTime, totalTime);
						for (let j = 0; j < resultBranches.length; j++) {
							let resultBranch = resultBranches[j];
							if (resultBranch.isEnded) {
								numResolvedBranches++;
								endedBranches.push(resultBranch);
							} else {
								newActiveBranches.push(resultBranch);
							}
							minNextTurn = Math.min(minNextTurn, resultBranch.nextTurnPlayer || minNextTurn, resultBranch.nextTurnEnemy || minNextTurn);
							minProb = minProb < 0 ? resultBranch.probability : Math.min(minProb, resultBranch.probability);
							maxProb = maxProb < 0 ? resultBranch.probability : Math.max(maxProb, resultBranch.probability);
							minPlayerHP = minPlayerHP < 0 ? resultBranch.playerHP : Math.min(minPlayerHP, resultBranch.playerHP);
							maxPlayerHP = maxPlayerHP < 0 ? resultBranch.playerHP : Math.max(maxPlayerHP, resultBranch.playerHP);
						}
					}
					activeBranches = newActiveBranches;
					
					combineBranches(activeBranches);
					
					if (activeBranches.length == 0) {
						clearInterval(loopId);
						returnResult();
						return;
					}
					
					if (totalTime > maxTime) {
						log.w("interrupting fight branch calculation at " + activeBranches.length + " branches");
						clearInterval(loopId);
						returnResult();
						return;
					}
				};
				
				let loopId = setInterval(applyStep, 1);
			});
		},
		
		applyFightStepToProbabilityBranch: function (branch, enemy, playerStamina, itemsComponent, followersComponent, stepTime, fightTime) {
			let resultBranches = [];
			
			var playerAttackTime = FightConstants.getPlayerAttackTime(itemsComponent);
			let enemyAttackTime = FightConstants.getEnemyAttackTime(enemy);
			
			branch.nextTurnPlayer -= stepTime;
			branch.nextTurnEnemy -= stepTime;
			
			let turnScenariosPlayer = [];
			let isPlayerTurn = false;
			if (branch.nextTurnPlayer <= 0) {
				isPlayerTurn = true;
				turnScenariosPlayer = FightConstants.getTurnScenarios(FightConstants.PARTICIPANT_TYPE_FRIENDLY, enemy, playerStamina, itemsComponent, followersComponent, fightTime);
				branch.nextTurnPlayer = playerAttackTime;
			} else {
				turnScenariosPlayer.push({ probability: 1, type: "WAIT", damage: 0 });
			}
			
			let turnScenariosEnemy = [];
			if (!isPlayerTurn && branch.nextTurnEnemy <= 0) {
				turnScenariosEnemy = FightConstants.getTurnScenarios(FightConstants.PARTICIPANT_TYPE_ENEMY, enemy, playerStamina, itemsComponent, followersComponent, fightTime);
				branch.nextTurnEnemy = enemyAttackTime;
			} else {
				turnScenariosEnemy.push({ probability: 1, type: "WAIT",  damage: 0 });
			}
			
			for (let i = 0; i < turnScenariosPlayer.length; i++) {
				let playerScenario = turnScenariosPlayer[i];
				for (let j = 0; j < turnScenariosEnemy.length; j++) {
					let enemyScenario = turnScenariosEnemy[j];
					let playerHP = branch.playerHP - enemyScenario.damage;
					let enemyHP = branch.enemyHP - playerScenario.damage;
					let probability = branch.probability * playerScenario.probability * enemyScenario.probability;
					let isEnded = playerHP <= 0 || enemyHP <= 0;
					let resultBranch = {
						nextTurnPlayer: branch.nextTurnPlayer, nextTurnEnemy: branch.nextTurnEnemy,
						playerHP: playerHP, enemyHP: enemyHP,
						// note: this is a performance killer but nice for debugging
						//playerTurns: branch.playerTurns.concat(playerScenario.type), enemyTurns: branch.enemyTurns.concat(enemyScenario.type),
						isEnded: isEnded,
						probability: probability
					};
					resultBranches.push(resultBranch);
				}
			}
			
			return resultBranches;
		},
		
		getFightExpectedDuration: function (enemy, playerStamina, itemsComponent, followersComponent) {
			let playerAtt = this.getPlayerAtt(playerStamina, itemsComponent, followersComponent);
			let playerDef = this.getPlayerDef(playerStamina, itemsComponent, followersComponent);
			let playerSpeed = this.getPlayerSpeed(itemsComponent);
			let playerHP = playerStamina.maxHP;
			let playerShield = playerStamina.maxShield;
			return Math.min(
				this.getSecToKill(playerAtt, playerSpeed, enemy.getDef(), enemy.maxHP, enemy.maxShield),
				this.getSecToKill(enemy.getAtt(), enemy.getSpeed(), playerDef, playerHP, playerShield)
			);
		},
				
		getEnemyLocaleId: function (baseActionID, action, isNeighbour) {
			switch (baseActionID) {
				case "clear_workshop": return LocaleConstants.LOCALE_ID_WORKSHOP;
				default: return null;
			}
		},
		
		getRelatedSectorDirection: function (baseActionID, action) {
			switch (baseActionID) {
				case "fight_gang": return parseInt(action.split("_")[2]);
				default: return PositionConstants.DIRECTION_NONE;
			}
		},
	
	};
	
	return FightConstants;
	
});
