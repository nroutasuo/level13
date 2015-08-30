define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/FightConstants',
    'game/nodes/PlayerLocationNode',
    'game/nodes/PlayerStatsNode',
    'game/nodes/FightNode',
    'game/components/player/ItemsComponent',
    'game/components/sector/FightComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/SectorControlComponent',
], function (Ash, UIConstants, FightConstants, PlayerLocationNode, PlayerStatsNode, FightNode, ItemsComponent, FightComponent, EnemiesComponent, SectorControlComponent) {
    var UIOutFightSystem = Ash.System.extend({
	
		uiFunctions: null,
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		fightNodes: null,
		
		lastUpdateTimeStamp: 0,
		updateFrequency: 500,
	
        constructor: function (uiFunctions) {
			this.uiFunctions = uiFunctions;
        },

        addToEngine: function (engine) {
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.fightNodes = engine.getNodeList(FightNode);
        },

        removeFromEngine: function (engine) {
            this.playerLocationNodes = null;
            this.playerStatsNodes = null;
            this.fightNodes = null;
        },

        update: function (time) {
			if (!($("#fight-popup").is(":visible")) || $("#fight-popup").data("fading") == true) return;
			
			var sector = this.playerLocationNodes.head.entity;
			
			var fightActive = this.fightNodes.head != null && this.fightNodes.head.fight.finished !== true;
			var fightFinished = this.fightNodes.head != null && this.fightNodes.head.fight.finished === true;
			var fightWon = fightFinished && this.fightNodes.head.fight.won;
			
			$("#out-action-fight-cancel").toggle(!fightActive && !fightFinished);
			$("#out-action-fight-confirm").toggle(!fightActive && !fightFinished);
			$("#out-action-fight-close").toggle(fightFinished);
			$("#out-action-fight-next").toggle(fightFinished);
			
			$("#fight-popup-control-info").toggle(!fightActive);
			$("#fight-popup-bars").toggle(fightActive);
			$("#fight-popup-self-info").toggle(fightActive);
			$("#fight-popup-results").toggle(fightFinished);
			
			$("#fight-popup-enemy-info").toggleClass("strike-through", fightFinished && fightWon);
            
			
			this.updateFightCommon(!fightActive && !fightFinished);
			
			if (fightActive && !fightFinished) {
                this.updateFightActive();
			} else if (fightFinished) {
                this.updateFightFinished();
			} else {
                this.updateFightPending();
			}
		},
	
		updateFightCommon: function (fightPending) {
			// Enemy info
			var sector = this.playerLocationNodes.head.entity;
			var enemiesComponent = sector.get(EnemiesComponent);
			var currentEnemy = enemiesComponent.getNextEnemy();
			var enemyText = currentEnemy.name;
			enemyText += "<br/>";
			enemyText += "att: " + currentEnemy.att + " | def: " + currentEnemy.def;
			if (fightPending) {
				var playerStamina = this.playerStatsNodes.head.stamina;
                var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
                enemyText += "<br/>";
                enemyText += FightConstants.getFightChances(currentEnemy, playerStamina, itemsComponent);
			}
			$("#fight-popup-enemy-info").html(enemyText);
			
			// Sector control
			var sectorControlComponent = sector.get(SectorControlComponent);
			var enemies = sectorControlComponent.currentUndefeatedEnemies;
			var maxEnemies = sectorControlComponent.maxUndefeatedEnemies;
			var sectionControlDesc = enemies + " / " + maxEnemies + " enemies in this area";
			if (enemies <= 0) sectionControlDesc = "no enemies left here";
            $("#out-action-fight-cancel").text(enemies > 0 ? "flee" : "close");
			$("#fight-popup-control-info").text(sectionControlDesc);
		},
	
		updateFightPending: function () {
			$("#fight-results-win-res").empty();
			$("#fight-results-win-items").empty();
			$("#fight-bar-enemy").data("animation-length", 100);
			$("#fight-bar-self").data("animation-length", 100);
			$("#fight-popup h3").text("Fight");
		},
		
		updateFightActive: function () {
			$("#fight-results-win-res").empty();
			$("#fight-results-win-items").empty();
			$("#fight-popup h3").text("Fight");
			
			var timeStamp = new Date().getTime();
			if (timeStamp - this.lastUpdateTimeStamp > this.updateFrequency) {
				var enemy = this.fightNodes.head.fight.enemy;
				var playerStamina = this.playerStatsNodes.head.stamina;
				var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);	
				var playerVal = Math.round(playerStamina.hp);
				var enemyVal = Math.round(enemy.hp);
				$("#fight-bar-enemy").data("progress-percent", enemyVal);
				$("#fight-bar-enemy").data("animation-length", this.updateFrequency);
				$("#fight-bar-self").data("progress-percent", playerVal);
				$("#fight-bar-self").data("animation-length", this.updateFrequency);
					
				var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
				var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
				var playerText = "Wanderer";
				playerText += "<br/>";
				playerText += "att: " + playerAtt + " | def: " + playerDef;
				$("#fight-popup-self-info").html(playerText);
				
				this.lastUpdateTimeStamp = new Date().getTime();
			}
		},
		
		updateFightFinished: function () {
			var isWon = this.fightNodes.head.fight.won;
			$("#fight-popup h3").text(isWon ? "Won" : "Lost");
			
			$("#fight-results-win-header").toggle(isWon);
			$("#fight-results-win-res").toggle(isWon);
			$("#fight-results-win-items").toggle(isWon);
			$("#fight-results-lose-header").toggle(!isWon && false);
			$("#fight-results-lose-items").toggle(!isWon && false); // TODO show lost followers
			
			if ($("#fight-results-win-items li").length <= 0) {
				for (var key in resourceNames) {
					var name = resourceNames[key];
					var amount = this.fightNodes.head.fight.rewards.resources.getResource(name);
					if (amount > 0) {
						var li = UIConstants.getResourceLi(name, amount);
						$("#fight-results-win-items").append(li);
					}
				}
			
				if (this.fightNodes.head.fight.rewards.items.length > 0) {
					for (var i=0; i < this.fightNodes.head.fight.rewards.items.length; i++) {
						var item = this.fightNodes.head.fight.rewards.items[i];
						var li = UIConstants.getItemLI(item, 1);
						$("#fight-results-win-items").append(li);
					}
				}
				
				if (this.fightNodes.head.fight.rewards.reputation > 0) {
					var li = "<li>" + this.fightNodes.head.fight.rewards.reputation  + " reputation</li>";
					$("#fight-results-win-items").append(li);
				}
				
				this.uiFunctions.generateCallouts("#fight-popup");
			}
			
			$("#fight-results-lose-injury").toggle(this.fightNodes.head.fight.injuries.length > 0);
        },
		
    });

    return UIOutFightSystem;
});
