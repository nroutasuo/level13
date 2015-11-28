define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/FightConstants',
    'game/constants/TextConstants',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/FightNode',
    'game/components/player/ItemsComponent',
    'game/components/sector/FightComponent',
    'game/components/sector/FightEncounterComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/SectorControlComponent',
], function (Ash, UIConstants, FightConstants, TextConstants, PlayerLocationNode, PlayerStatsNode, FightNode, ItemsComponent, FightComponent, FightEncounterComponent, EnemiesComponent, SectorControlComponent) {
    var UIOutFightSystem = Ash.System.extend({
	
		uiFunctions: null,
		playerActionResultsHelper: null,
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		fightNodes: null,
		
		lastUpdateTimeStamp: 0,
		updateFrequency: 500,
	
        constructor: function (uiFunctions, playerActionResultsHelper) {
			this.uiFunctions = uiFunctions;
			this.playerActionResultsHelper = playerActionResultsHelper;
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
			$("#out-action-fight-close").toggle(fightFinished && !fightWon);
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
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			$("#fight-desc").toggle(fightPending);
			$("#fight-desc").text(this.getDescriptionByContext(encounterComponent.context, encounterComponent.enemy));
			
			// Enemy info
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
			var enemies = sectorControlComponent.getCurrentEnemies(encounterComponent.context);
			var maxEnemies = sectorControlComponent.getMaxEnemies(encounterComponent.context);
            $("#out-action-fight-cancel").text(enemies > 0 ? "flee" : "close");
			$("#fight-popup-control-info").text(this.getSectorControlDesc(enemies, maxEnemies, encounterComponent.context));
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
			$("#fight-results-lose-items").toggle(!isWon && false);
			
			$("#fight-popup-results").html(this.playerActionResultsHelper.getRewardDiv(this.fightNodes.head.fight.resultVO));
			this.uiFunctions.generateCallouts("#fight-popup");
        },
		
		getSectorControlDesc: function (enemies, maxEnemies, context) {
			var ratioLeft = enemies / maxEnemies;
			var areaName = context ? "place" : "area";
			
			if (ratioLeft > 0.3) {
				return "many enemies left in this " + areaName;
			} else if (ratioLeft > 0.1) {
				return "some enemies left in this " + areaName;
			} else if (ratioLeft > 0) {
				return "few enemies left in this " + areaName;
			} else {
				return "no enemies left here";
			}
		},
		
		getDescriptionByContext: function (context, enemy) {
			var enemyNoun = TextConstants.depluralify(TextConstants.getEnemyNoun([enemy]));
			switch (context) {
				case "scavenge":
					return "surprised while scavenging";
				case "scout_locale_u":
					return "surprised while scouting";
				case "scout_locale_i":
					return "attacked while scouting";
				case "clear_workshop":
					return "workshop " + enemy.activeV + " " + TextConstants.addArticle(enemyNoun);
				default:
					return TextConstants.addArticle(enemyNoun) + " approaches";
			}
		},
		
    });

    return UIOutFightSystem;
});
