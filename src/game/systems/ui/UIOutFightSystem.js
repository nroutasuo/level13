define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/FightConstants',
    'game/constants/ItemConstants',
    'game/constants/TextConstants',
    'game/constants/UIConstants',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/FightNode',
    'game/components/player/ItemsComponent',
    'game/components/sector/FightComponent',
    'game/components/sector/FightEncounterComponent',
    'game/components/sector/EnemiesComponent'
], function (Ash, GameGlobals, GlobalSignals, FightConstants, ItemConstants, TextConstants, UIConstants, PlayerLocationNode, PlayerStatsNode, FightNode, ItemsComponent, FightComponent, FightEncounterComponent, EnemiesComponent) {
    var UIOutFightSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		fightNodes: null,
		
		lastProgressBarUpdateTimeStamp: 0,
		lastProgressBarUpdateFreq: 300,
        
        wasFightActive: false,
        isFightPopupOpen: false,
	
        constructor: function () {
        },

        addToEngine: function (engine) {
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.fightNodes = engine.getNodeList(FightNode);
            
            var sys = this;
            GlobalSignals.popupOpenedSignal.add(function (popupID) {
                if (popupID === "fight-popup")
                    sys.isFightPopupOpen = true;
            });
            GlobalSignals.popupClosedSignal.add(function (popupID) {
                if (popupID === "fight-popup")
                    sys.isFightPopupOpen = false;
            });
        },

        removeFromEngine: function (engine) {
            this.playerLocationNodes = null;
            this.playerStatsNodes = null;
            this.fightNodes = null;
        },

        update: function (time) {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            if (!this.isFightPopupOpen)
                return;
            
			var fightActive = this.fightNodes.head !== null && this.fightNodes.head.fight.finished !== true;
			var fightFinished = this.fightNodes.head !== null && this.fightNodes.head.fight.finished === true;
			var fightWon = fightFinished && this.fightNodes.head.fight.won;
			
			GameGlobals.uiFunctions.toggle("#out-action-fight-confirm", !fightActive && !fightFinished);
			GameGlobals.uiFunctions.toggle("#out-action-fight-close", fightFinished && !fightWon);
			GameGlobals.uiFunctions.toggle("#out-action-fight-next", fightFinished && fightWon);
            GameGlobals.uiFunctions.toggle("#out-action-fight-cancel", !fightFinished && !fightActive);
            GameGlobals.uiFunctions.toggle("#fight-buttons-main", !fightActive);
            GameGlobals.uiFunctions.toggle("#fight-buttons-infightactions", fightActive);
			
			GameGlobals.uiFunctions.toggle("#fight-popup-control-info", !fightActive);
			GameGlobals.uiFunctions.toggle("#fight-popup-bars", fightActive);
			GameGlobals.uiFunctions.toggle("#fight-popup-self-info", fightActive);
			GameGlobals.uiFunctions.toggle("#list-fight-followers", fightActive);
			GameGlobals.uiFunctions.toggle("#fight-popup-results", fightFinished);
            
			GameGlobals.uiFunctions.toggle("#fight-desc", !fightActive);
			
			$("#fight-popup-enemy-info").toggleClass("strike-through", fightFinished && fightWon);
			
            if (fightActive && !this.wasFightActive) {
                this.initializeFightActive();
            }
            
            // NOTE: can happen in AutoPlay
			var sector = this.playerLocationNodes.head.entity;
            if (sector == null)
                return;
			var encounterComponent = sector.get(FightEncounterComponent);
            if (encounterComponent == null)
                return;
            
			this.updateFightCommon(!fightActive && !fightFinished);
			
			if (fightActive && !fightFinished) {
                this.updateFightActive();
			} else if (fightFinished) {
                this.updateFightFinished();
			} else {
                this.updateFightPending();
			}
            
            this.wasFightActive = fightActive;
		},
        
        initializeFightActive: function () {
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            $("ul#list-fight-followers").empty();
            this.numFollowers = 0;
            var items = itemsComponent.getUnique(true);
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.type !== ItemConstants.itemTypes.follower)
                    continue;
                this.numFollowers++;
                $("ul#list-fight-followers").append("<li>" + UIConstants.getItemDiv(null, item, null, UIConstants.getItemCallout(item, true), true) + "</li>");
            }
            GameGlobals.uiFunctions.generateCallouts("ul#list-fight-followers");
        },
	
		updateFightCommon: function (fightPending) {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
            
			$("#fight-title").text(this.getTitleByContext(encounterComponent));
			
			// Enemy info
			var enemiesComponent = sector.get(EnemiesComponent);
			var currentEnemy = enemiesComponent.getNextEnemy();
			var enemyText = " " + currentEnemy.name + " ";
			enemyText += "<br/>";
			enemyText += " att: " + currentEnemy.att + " | def: " + currentEnemy.def + " ";
			if (fightPending) {
				var playerStamina = this.playerStatsNodes.head.stamina;
                var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
                enemyText += "<br/>";
                enemyText += FightConstants.getFightChances(currentEnemy, playerStamina, itemsComponent);
			}
			$("#fight-popup-enemy-info").html(enemyText);
		},
	
		updateFightPending: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			$("#fight-results-win-res").empty();
			$("#fight-results-win-items").empty();
			$("#fight-bar-enemy").data("animation-length", 100);
			$("#fight-bar-self").data("animation-length", 100);
			$("#fight-desc").text(this.getDescriptionByContext(encounterComponent.context, encounterComponent.enemy));
			this.displayedRewards = null;
		},
		
		updateFightActive: function () {
			$("#fight-results-win-res").empty();
			$("#fight-results-win-items").empty();
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			
            // update progress bars
			var timeStamp = new Date().getTime();
			if (timeStamp - this.lastProgressBarUpdateTimeStamp > this.lastProgressBarUpdateFreq) {
				var enemy = this.fightNodes.head.fight.enemy;
				var playerStamina = this.playerStatsNodes.head.stamina;
				var playerVal = Math.round(playerStamina.hp);
				var enemyVal = Math.round(enemy.hp);
				$("#fight-bar-enemy").data("progress-percent", enemyVal);
				$("#fight-bar-enemy").data("animation-length", this.lastProgressBarUpdateFreq);
				$("#fight-bar-self").data("progress-percent", playerVal);
				$("#fight-bar-self").data("animation-length", this.lastProgressBarUpdateFreq);
					
				var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
				var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
				var playerText = this.numFollowers > 0 ? "Party" : "Wanderer";
				playerText += "<br/>";
				playerText += "att: " + playerAtt + " | def: " + playerDef;
				$("#fight-popup-self-info").html(playerText);
				
				this.lastProgressBarUpdateTimeStamp = new Date().getTime();
			}
            
            // update action buttons
            // TODO remove hard-coding of items usable in fight, instead have fight effect desc in ItemVO (damage, heal, defend, stun)
            // TODO show fight effect of items in fight ui
            var itemsToShow = [];
            if (itemsComponent.getCountById("glowstick_1") > 0) itemsToShow.push(itemsComponent.getItem("glowstick_1", null, false));
            var numItemsShown = $("#fight-buttons-infightactions button").length;
            if (numItemsShown !== itemsToShow.length) {
                $("#fight-buttons-infightactions").empty();
                for(var i = 0; i < itemsToShow.length; i++) {
                    var item = itemsToShow[i];
                    var action = "use_item_fight_" + item.id;
                    $("#fight-buttons-infightactions").append("<button class='action' action='" + action + "'>" + item.name + "</button>");
                }
                
                GameGlobals.uiFunctions.registerActionButtonListeners("#fight-buttons-infightactions");
                GameGlobals.uiFunctions.generateButtonOverlays("#fight-buttons-infightactions");
                GameGlobals.uiFunctions.generateCallouts("#fight-buttons-infightactions");
                GlobalSignals.elementCreatedSignal.dispatch();
            }
		},
		
		updateFightFinished: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			var isWon = this.fightNodes.head.fight.won;
			$("#fight-desc").text(isWon ? this.getWonDescriptionByContext(encounterComponent.context) : this.getLostDescriptionByContext(encounterComponent.context));
			
			GameGlobals.uiFunctions.toggle("#fight-results-win-header", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-win-res", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-win-items", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-lose-header", !isWon && false);
			GameGlobals.uiFunctions.toggle("#fight-results-lose-items", !isWon && false);
			
			if (this.displayedRewards !== this.fightNodes.head.fight.resultVO) {
				$("#fight-popup-results").html(GameGlobals.playerActionResultsHelper.getRewardDiv(this.fightNodes.head.fight.resultVO, true));
				GameGlobals.uiFunctions.generateCallouts("#fight-popup-results");
				this.displayedRewards = this.fightNodes.head.fight.resultVO;
			}
        },
        
        getTitleByContext: function (encounterComponent) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(encounterComponent.context);
            if (baseActionID === "fight_gang") {
                return "Fight " + (encounterComponent.totalEnemies - encounterComponent.pendingEnemies + 1) + " / " + encounterComponent.totalEnemies;
            }
            return baseActionID.replace(/_/g, " ");
        },
		
		getDescriptionByContext: function (context, enemy) {
            var enemiesNoun = TextConstants.getEnemyNoun([enemy]);
			var enemyNoun = TextConstants.depluralify(enemiesNoun);
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(context);
			switch (baseActionID) {
				case "scavenge":
					return "surprised by " + TextConstants.addArticle(enemyNoun) + " while scavenging";
				case "scout_locale_u":
					return "surprised by " + TextConstants.addArticle(enemyNoun) + " while scouting";
				case "scout_locale_i":
					return "attacked while scouting";
				case "clear_workshop":
					return "workshop " + enemy.activeV + " " + enemiesNoun;
				case "fight_gang":
					return TextConstants.addArticle(enemyNoun) + " is blocking passage";
				default:
					return TextConstants.addArticle(enemyNoun) + " approaches";
			}
        },
		
		getWonDescriptionByContext: function (context) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(context);
			switch (baseActionID) {
				case "scavenge":
				case "scout":
				case "use_spring":
                    return "Intruder defeated.";
                    
				case "scout_locale_u":
				case "scout_locale_i":
					return "Area clear.";

				case "clear_workshop":
				case "fight_gang":
				default:
					return "Fight won.";
			}
        },
		
		getLostDescriptionByContext: function (context) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(context);
			switch (baseActionID) {
				case "scavenge":
				case "scout_locale_u":
				case "scout_locale_i":
				case "clear_workshop":
				case "fight_gang":
				default:
					return "fight lost";
			}
		},
		
    });

    return UIOutFightSystem;
});
