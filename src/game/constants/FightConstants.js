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
		FIGHT_PLAYER_BASE_DEF: 3,
		FIGHT_LENGTH_SECONDS: 5,
		MAX_FOLLOWER_MAX: 5,
		 
		getPlayerAtt: function (playerStamina, itemsComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att, ItemConstants.itemTypes.weapon);
			var healthFactor = (playerStamina.health / 100);
			var playerAtt = Math.floor((this.FIGHT_PLAYER_BASE_ATT + itemBonus) * healthFactor);
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
            return att + def;
        },
        
        getMaxFollowers: function (numCamps) {
			var firstFollowerCamp = UpgradeConstants.getMinimumCampOrdinalForUpgrade("unlock_building_inn");
			var numFollowerCamps = numCamps - firstFollowerCamp + 1;
			var totalFollowerCamps = (WorldCreatorConstants.CAMPS_TOTAL - firstFollowerCamp + 1);
			var maxFollowers = Math.ceil(numFollowerCamps / totalFollowerCamps * this.MAX_FOLLOWER_MAX);
			return Math.max(0, maxFollowers);
        },
        
        // Damage done by player to an enemy per sec
        getEnemyDamagePerSec: function (enemy, playerStamina, itemsComponent) {
            var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
            return (playerAtt / enemy.def);
        },
        
        // Damage done by the enemy to the player per sec
        getPlayerDamagePerSec: function (enemy, playerStamina, itemsComponent) {
            var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
            return (enemy.att / playerDef);
        },
        
        getRandomDamagePerSec: function (enemy, playerStamina, itemsComponent) {
            var playerDamage = FightConstants.getPlayerDamagePerSec(enemy, playerStamina, itemsComponent);
            return enemy.attRandomFactor * playerDamage;
        },
        
        getFightChances: function (enemy, playerStamina, itemsComponent) {
            var probability = this.getFightWinProbability(enemy, playerStamina, itemsComponent);
            if (probability <= 0.05) {
                return "deadly";
            }
            if (probability < 0.2) {
                return "very dangerous";
            }
            if (probability < 0.4) {
                return "dangerous";
            }
            if (probability >= 0.95) {
                return "harmless";
            }
            if (probability > 0.8) {
                return "easy";
            }
            if (probability > 0.6) {
                return "intimidating";
            }
            
            return "risky";
        },
        
        getFightWinProbability: function(enemy, playerStamina, itemsComponent) {
            var avgEnemyDamage = this.getEnemyDamagePerSec(enemy, playerStamina, itemsComponent);
            var avgPlayerDamage = this.getPlayerDamagePerSec(enemy, playerStamina, itemsComponent);
            var randomDamageMin = -0.5 * avgPlayerDamage;
            var randomDamageMax = 0.5 * avgPlayerDamage;
            var totalDamageMin = avgPlayerDamage + randomDamageMin;
            var totalDamageMax = avgPlayerDamage + randomDamageMax;
            var damageRatioMin = avgEnemyDamage / totalDamageMin;
            var damageRatioMax = avgEnemyDamage / totalDamageMax;
            return 0.9 - ((Math.min(1, damageRatioMax) - Math.min(1, damageRatioMin)) / (damageRatioMax - damageRatioMin));
        },
		
		getEnemyLocaleId: function (baseActionID, action, isNeighbour) {
			switch (baseActionID) {
				case "clear_workshop": return LocaleConstants.LOCALE_ID_WORKSHOP;
				case "fight_gang":
					var direction = parseInt(action.split("_")[2]);
					if (isNeighbour) direction = PositionConstants.getOppositeDirection(direction);
					return LocaleConstants.getPassageLocaleId(direction);
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
