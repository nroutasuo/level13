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
		FIGHT_PLAYER_BASE_DEF: 1,
		MAX_FOLLOWER_MAX: 3,
		
		FIGHT_SPEED_FACTOR: 1,
		
		PARTICIPANT_TYPE_FRIENDLY: 0,
		PARTICIPANT_TYPE_ENEMY: 1,
		
		getDamagePerHit: function (att, def) {
			// att scaled by att / def ratio:
			// - if def = 0 -> dmg = att
			// - if def = att -> dmg = att/2
			// - never more than att
			// - never 0
			if (att <= 0) return 0;
			def = Math.max(def, 0);
			var dmg = att * att / (att + def);
			return Math.max(1, dmg);
		},
		
		getDamagePerSec: function (att, def, speed) {
			let attackTime = this.getAttackTime(speed);
			return this.getDamagePerHit(att, def)
		},
		
		getAttackTime: function (speed) {
			return 1 / speed / this.FIGHT_SPEED_FACTOR;
		},
		
		getHitsToKill: function (attackerAtt, defenderDef, defenderHP) {
			return Math.ceil(defenderHP / this.getDamagePerHit(attackerAtt, defenderDef));
		},
		
		getSecToKill: function (attackerAtt, attackerSpeed, defenderDef, defenderHP) {
			return this.getHitsToKill(attackerAtt, defenderDef, defenderHP) * this.getAttackTime(attackerSpeed);
		},
		
		getStrength: function (att, def, speed, hp) {
			var str = (att + def) / 100 * hp;
			return Math.round(str * speed);
		},
		
		getPlayerAttackTime: function (itemsComponent) {
			let playerSpeed = this.getPlayerSpeed(itemsComponent);
			return this.getAttackTime(playerSpeed);
		},
		 
		getPlayerAtt: function (playerStamina, itemsComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att, ItemConstants.itemTypes.weapon);
			var playerAtt = Math.floor(this.FIGHT_PLAYER_BASE_ATT + itemBonus);
			var followerBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att, ItemConstants.itemTypes.follower);
			return playerAtt + followerBonus;
		},
		 
		getPlayerAttDesc: function (playerStamina, itemsComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att, ItemConstants.itemTypes.weapon);
			var healthFactor = (playerStamina.health/100);
			var followerBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att, ItemConstants.itemTypes.follower);
			var desc = "player: " + this.FIGHT_PLAYER_BASE_ATT;
			if (itemBonus > 0) desc += "<br/>equipment: " + itemBonus;
			if (healthFactor < 1) desc += "<br/>health: -" + Math.round((1-healthFactor) * 1000) / 10 + "%";
			if (followerBonus > 0) desc += "<br/>followers: " + followerBonus;
			return desc;
		},
		
		getPlayerDef: function (playerStamina, itemsComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def);
			return this.FIGHT_PLAYER_BASE_DEF + itemBonus;
		},
		
		getPlayerDefDesc: function (playerStamina, itemsComponent) {
			let itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def);
			let desc = "player: " + this.FIGHT_PLAYER_BASE_DEF;
			if (itemBonus > 0) desc += "<br/>equipment: " + itemBonus;
			return desc;
		},
		
		getPlayerSpeed: function (itemsComponent) {
			let weapons = itemsComponent.getEquipped(ItemConstants.itemTypes.weapon);
			let weapon = weapons.length > 0 ? weapons[0] : null;
			let weaponSpeedBonus = weapon ? weapon.getBonus(ItemConstants.itemBonusTypes.fight_speed) || 1 : 1;
			return weaponSpeedBonus;
		},
		
		getPlayerStrength: function (playerStamina, itemsComponent) {
			let att = this.getPlayerAtt(playerStamina, itemsComponent);
			let def = this.getPlayerDef(playerStamina, itemsComponent);
			let speed = this.getPlayerSpeed(itemsComponent);
			return this.getStrength(att, def, speed, playerStamina.maxHP);
		},
		
		getMaxFollowers: function (numCamps) {
			var firstFollowerCamp = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_inn");
			var numFollowerCamps = numCamps - firstFollowerCamp + 1;
			var totalFollowerCamps = (WorldConstants.CAMPS_TOTAL - firstFollowerCamp + 1);
			var maxFollowers = Math.ceil(numFollowerCamps / totalFollowerCamps * this.MAX_FOLLOWER_MAX);
			return Math.max(0, maxFollowers);
		},
		
		getTypicalFollowers: function (numCamps) {
			var firstFollowerCamp = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_inn");
			if (numCamps <= firstFollowerCamp) return 0;
			return this.getMaxFollowers(numCamps);
		},
		
		getEnemyAttackTime: function (enemy) {
			return this.getAttackTime(enemy.getSpeed());
		},
		
		// Damage done by player to an enemy per sec
		getDamageByPlayerPerSec: function (enemy, playerStamina, itemsComponent) {
			if (!enemy) return 0;
			var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
			let playerSpeed = FightConstants.getPlayerSpeed(itemsComponent);
			return this.getDamagePerSec(playerAtt, enemy.getDef(), playerSpeed);
		},
		
		getDamageByPlayerPerHit: function (enemy, playerStamina, itemsComponent) {
			var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
			return this.getDamagePerHit(playerAtt, enemy.getDef());
		},
		
		// Damage done by the enemy to the player per sec
		getDamageByEnemyPerSec: function (enemy, playerStamina, itemsComponent) {
			var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
			return this.getDamagePerSec(enemy.getAtt(), playerDef, enemy.getSpeed());
		},
		
		getDamageByEnemyPerHit: function (enemy, playerStamina, itemsComponent) {
			var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
			return this.getDamagePerHit(enemy.getAtt(), playerDef);
		},
		
		getMissChance: function (participantType) {
			if (participantType == this.PARTICIPANT_TYPE_FRIENDLY)
				return 0.03;
			return 0.06;
		},
		
		getCriticalHitChance: function (participantType) {
			if (participantType == this.PARTICIPANT_TYPE_FRIENDLY)
				return 0.07;
			return 0.05;
		},
		
		getFightWinProbability: function(enemy, playerStamina, itemsComponent) {
			if (!enemy) return 1;
			var damageByEnemy = this.getDamageByEnemyPerSec(enemy, playerStamina, itemsComponent);
			var damageByPlayer = this.getDamageByPlayerPerSec(enemy, playerStamina, itemsComponent);
			
			var damageByPlayerMin = damageByEnemy * -0.5;
			var damageByPlayerMax = damageByEnemy * 0.5;
			
			var timeAliveEnemy = enemy.getMaxHP() / damageByPlayer * 1.05;
			var timeAlivePlayerMin = playerStamina.maxHP / (damageByEnemy + damageByPlayerMax) * 0.95;
			var timeAlivePlayerMax = playerStamina.maxHP / (damageByEnemy + damageByPlayerMin) * 1.05;
			
			var ratio = (timeAlivePlayerMax - timeAliveEnemy) / (timeAlivePlayerMax - timeAlivePlayerMin);
			if (ratio < 0.05) ratio = 0.05;
			if (ratio > 0.95) ratio = 0.95;
			
			return ratio;
		},
		
		getFightExpectedDuration: function (enemy, playerStamina, itemsComponent) {
			let playerAtt = this.getPlayerAtt(playerStamina, itemsComponent);
			let playerDef = this.getPlayerDef(playerStamina, itemsComponent);
			let playerSpeed = this.getPlayerSpeed(itemsComponent);
			let playerHP = playerStamina.maxHP;
			return Math.min(
				this.getSecToKill(playerAtt, playerSpeed, enemy.getDef(), enemy.getMaxHP()),
				this.getSecToKill(enemy.getAtt(), enemy.getSpeed(), playerDef, playerHP)
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
