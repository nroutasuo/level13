define(['ash',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/LocaleConstants',
	'game/constants/PositionConstants',
	'game/constants/WorldCreatorConstants',
	'game/constants/UpgradeConstants',
	'game/vos/ResourcesVO'],
function (Ash, ItemConstants, PerkConstants, LocaleConstants, PositionConstants, WorldCreatorConstants, UpgradeConstants, ResourcesVO) {

    var FightConstants = {
	
		FIGHT_PLAYER_BASE_ATT: 3,
		FIGHT_PLAYER_BASE_DEF: 1,
		MAX_FOLLOWER_MAX: 3,
        
        HIT_STUN_TIME: 0.25,
        
        // applies both to enemy and player damage and makes fights to faster (with fewer hits)
        FIGHT_DAMAGE_BASE: 18,
        // applies to both enemy and player and makes fights go faster (less time between hits)
        FIGHT_SPEED_FACTOR: 1,
        
        PARTICIPANT_TYPE_FRIENDLY: 0,
        PARTICIPANT_TYPE_ENEMY: 1,
        
        getStrength: function (att, def, hp) {
             var str = (att + def) / 100 * hp;
             return Math.round(str);
        },
        
        getDamagePerSec: function (att, def) {
            var ratio = att / (att + def);
            // damage is part determined by attack, part by a static value
            // -> increases with att but tends to be around reasonable numbers relative to max hp which is around 100
            var result =  ratio * att / 2 + ratio * this.FIGHT_DAMAGE_BASE / 2;
            result = Math.max(1, result);
            return result;
        },
        
        getPlayerAttackTime: function (itemsComponent) {
            var weapons = itemsComponent.getEquipped(ItemConstants.itemTypes.weapon);
            var weapon = weapons.length > 0 ? weapons[0] : null;
            var weaponSpeedBonus = weapon ? weapon.getBonus(ItemConstants.itemBonusTypes.fight_speed) || 1 : 1;
            return weaponSpeedBonus / this.FIGHT_SPEED_FACTOR;
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
            var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def);
            var desc = "player: " + this.FIGHT_PLAYER_BASE_DEF;
            if (itemBonus > 0) desc += "<br/>equipment: " + itemBonus;
            return desc;
        },
        
        getPlayerStrength: function (playerStamina, itemsComponent) {
            var att = this.getPlayerAtt(playerStamina, itemsComponent);
            var def = this.getPlayerDef(playerStamina, itemsComponent);
            return this.getStrength(att, def, playerStamina.maxHP);
        },
        
        getMaxFollowers: function (numCamps) {
			var firstFollowerCamp = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_inn");
			var numFollowerCamps = numCamps - firstFollowerCamp + 1;
			var totalFollowerCamps = (WorldCreatorConstants.CAMPS_TOTAL - firstFollowerCamp + 1);
			var maxFollowers = Math.ceil(numFollowerCamps / totalFollowerCamps * this.MAX_FOLLOWER_MAX);
			return Math.max(0, maxFollowers);
        },
        
        getTypicalFollowers: function (numCamps) {
			var firstFollowerCamp = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_inn");
            if (numCamps <= firstFollowerCamp) return 0;
            return this.getMaxFollowers(numCamps);
        },
        
        getEnemyAttackTime: function (enemy) {
            var enemySpeed = enemy.speed || 1;
            return 1 / enemySpeed / this.FIGHT_SPEED_FACTOR;
        },
        
        // Damage done by player to an enemy per sec
        getEnemyDamagePerSec: function (enemy, playerStamina, itemsComponent) {
            var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
            return this.getDamagePerSec(playerAtt, enemy.def);
        },
        
        getEnemyDamagePerAttack: function (enemy, playerStamina, itemsComponent) {
            var dps = this.getEnemyDamagePerSec(enemy, playerStamina, itemsComponent);
            var attackTime = this.getPlayerAttackTime(itemsComponent);
            return dps * attackTime;
        },
        
        // Damage done by the enemy to the player per sec
        getPlayerDamagePerSec: function (enemy, playerStamina, itemsComponent) {
            var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
            return this.getDamagePerSec(enemy.att, playerDef);
        },
        
        getPlayerDamagePerAttack: function (enemy, playerStamina, itemsComponent) {
            var dps = this.getPlayerDamagePerSec(enemy, playerStamina, itemsComponent);
            var attacktTime = this.getEnemyAttackTime(enemy);
            return dps * attacktTime;
        },
        
        getRandomDamagePerSec: function (enemy, playerStamina, itemsComponent) {
            var playerDamage = this.getPlayerDamagePerSec(enemy, playerStamina, itemsComponent);
            return enemy.attRandomFactor * playerDamage;
        },
        
        getRandomDamagePerAttack: function (enemy, playerStamina, itemsComponent) {
            var dps = this.getRandomDamagePerSec(enemy, playerStamina, itemsComponent);
            var attacktTime = this.getEnemyAttackTime(enemy);
            return dps * attacktTime;
        },
        
        getMissChance: function (participantType) {
            if (participantType == this.PARTICIPANT_TYPE_FRIENDLY)
                return 0.03;
            return 0.06;
        },
        
        getPoorHitChance: function (participantType) {
            if (participantType == this.PARTICIPANT_TYPE_FRIENDLY)
                return 0.07;
            return 0.09;
        },
        
        getGoodHitChance: function (participantType) {
            if (participantType == this.PARTICIPANT_TYPE_FRIENDLY)
                return 0.07;
            return 0.09;
        },
        
        getCriticalHitChance: function (participantType) {
            if (participantType == this.PARTICIPANT_TYPE_FRIENDLY)
                return 0.07;
            return 0.05;
        },
        
        getFightWinProbability: function(enemy, playerStamina, itemsComponent) {
            var enemyDamage = this.getEnemyDamagePerSec(enemy, playerStamina, itemsComponent);
            var playerDamage = this.getPlayerDamagePerSec(enemy, playerStamina, itemsComponent);
            
            var playerDamageRandomMin = playerDamage * -0.5;
            var playerDamageRandomMax = playerDamage * 0.5;
            
            var timeAliveEnemy = enemy.maxHP / enemyDamage * 1.05;
            var timeAlivePlayerMin = playerStamina.maxHP / (playerDamage + playerDamageRandomMax) * 0.95;
            var timeAlivePlayerMax = playerStamina.maxHP / (playerDamage + playerDamageRandomMin) * 1.05;
            
            var ratio =  (timeAlivePlayerMax - timeAliveEnemy) / (timeAlivePlayerMax - timeAlivePlayerMin);
            if (ratio < 0.05) ratio = 0.05;
            if (ratio > 0.95) ratio = 0.95;
            
            log.i("getFightWinProbability: time alive player: " + timeAlivePlayerMin + "-" + timeAlivePlayerMax + ", enemy: " + timeAliveEnemy + " -> " + ratio);
            return ratio;
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
