define(['ash',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/LocaleConstants',
	'game/constants/WorldCreatorConstants',
	'game/constants/PlayerActionConstants',
	'game/vos/ResourcesVO'],
function (Ash, ItemConstants, PerkConstants, LocaleConstants, WorldCreatorConstants, PlayerActionConstants, ResourcesVO) {

    var FightConstants = {
	
		FIGHT_PLAYER_BASE_ATT: 3,
		FIGHT_PLAYER_BASE_DEF: 3,
		FIGHT_LENGTH_SECONDS: 3,
		MAX_FOLLOWER_MAX: 5,
		 
		getPlayerAtt: function (playerStamina, itemsComponent) {
			var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemTypes.weapon);
			var healthFactor = (playerStamina.health / 100);
			var playerAtt = Math.floor((this.FIGHT_PLAYER_BASE_ATT + itemBonus) * healthFactor);
			var followerBonus = itemsComponent.getCurrentBonus(ItemConstants.itemTypes.follower);
            return playerAtt + followerBonus;
        },
		 
        getPlayerAttDesc: function (playerStamina, itemsComponent) {
            var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemTypes.weapon);
            var healthFactor = (playerStamina.health/100);
            var followerBonus = itemsComponent.getCurrentBonus(ItemConstants.itemTypes.follower);
            var desc = "Player: " + this.FIGHT_PLAYER_BASE_ATT;
            if (itemBonus > 0) desc += "<br>Weapons: " + itemBonus;
            if (healthFactor < 1) desc += "<br>Health: -" + (1-healthFactor) * 100 + "%";
            if (followerBonus > 0) desc += "<br>Followers: " + followerBonus;
            return desc;
        },
        
        getPlayerDef: function (playerStamina, itemsComponent) {
            var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemTypes.clothing);
            return this.FIGHT_PLAYER_BASE_DEF + itemBonus;
        },
        
        getPlayerDefDesc: function (playerStamina, itemsComponent) {
            var itemBonus = itemsComponent.getCurrentBonus(ItemConstants.itemTypes.clothing);
            var desc = "Player: " + this.FIGHT_PLAYER_BASE_DEF;
            if (itemBonus > 0 ) desc += "</br>Clothing: " + itemBonus;
            return desc;
        },
        
        getPlayerStrength: function (playerStamina, itemsComponent) {
            var att = this.getPlayerAtt(playerStamina, itemsComponent);
            var def = this.getPlayerDef(playerStamina, itemsComponent);
            return att + def;
        },
        
        getMaxFollowers: function (numCamps) {
			var firstFollowerCamp = PlayerActionConstants.getFirstCampForUpgrade("unlock_building_inn");
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
        
        getFightChances: function (enemy, playerStamina, itemComponent) {
            var avgEnemyDamage = this.getEnemyDamagePerSec(enemy, playerStamina, itemComponent);
            var avgPlayerDamage = this.getPlayerDamagePerSec(enemy, playerStamina, itemComponent);
            var damageRatio = avgPlayerDamage / avgEnemyDamage;
            console.log(enemy.name + " " + Math.round(damageRatio * 100) / 100 + " | " + Math.round(enemy.attRandomFactor * 100) / 100);
            if (damageRatio > 1.2) {
                return "dangerous";
            }
            
            if (damageRatio < 0.8) {
                return "easy";
            }
            
            return "risky";
        },
		
		getEnemyLocaleId: function (baseActionID, action) {
			switch (baseActionID) {
				case "clear_workshop": return LocaleConstants.LOCALE_ID_WORKSHOP;
				case "fight_gang":
					return LocaleConstants.getPassageLocaleId(parseInt(action.split("_")[2]));
				default: return null;
			}
		},
	
    };
    
    return FightConstants;
    
});
