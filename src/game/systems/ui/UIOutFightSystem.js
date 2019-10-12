define([
    'ash',
    'utils/UIState',
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
], function (Ash, UIState, GameGlobals, GlobalSignals, FightConstants, ItemConstants, TextConstants, UIConstants, PlayerLocationNode, PlayerStatsNode, FightNode, ItemsComponent, FightComponent, FightEncounterComponent, EnemiesComponent) {
    
    var FightPopupStateEnum = {
        CLOSED: 0,
        FIGHT_PENDING: 1,
        FIGHT_ACTIVE: 2,
        FIGHT_FINISHED: 3,
        FIGHT_FLED: 4,
    };
    
    var UIOutFightSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		fightNodes: null,
		
		progressBarAnimationLen: 300,
        
        state: FightPopupStateEnum.CLOSED,
        
        isFightPopupOpen: false,
	
        constructor: function () { },

        addToEngine: function (engine) {
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.fightNodes = engine.getNodeList(FightNode);
            
            GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
            GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
            GlobalSignals.add(this, GlobalSignals.fightUpdateSignal, this.onFightUpdate);
        },

        removeFromEngine: function (engine) {
            GlobalSignals.removeAll(this);
            this.playerLocationNodes = null;
            this.playerStatsNodes = null;
            this.fightNodes = null;
        },

        update: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            if (!this.isFightPopupOpen) return;
            
            this.updateState();
		},
        
        updateState: function () {
            if (!this.isFightPopupOpen) {
                this.setState(FightPopupStateEnum.CLOSED);
            } else if (this.fightNodes.head == null) {
                this.setState(FightPopupStateEnum.FIGHT_PENDING);
            } else if (this.fightNodes.head.fight.fled) {
                this.setState(FightPopupStateEnum.FIGHT_FLED);
            } else if (this.fightNodes.head.fight.finished) {
                this.setState(FightPopupStateEnum.FIGHT_FINISHED);
            } else {
                this.setState(FightPopupStateEnum.FIGHT_ACTIVE);
            }
        },
		
		updateFightActive: function () {
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			
            // update progress bars
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			var playerVal = Math.round(playerStamina.hp);
			var playerChangeVal = Math.round(this.lastPlayerDamage);
			var enemyVal = Math.round(enemy.hp);
			var enemyChangeVal = Math.round(this.lastEnemyDamage);
			$("#fight-bar-enemy").data("progress-percent", enemyVal);
			$("#fight-bar-enemy").data("change-percent", enemyChangeVal);
			$("#fight-bar-enemy").data("change-time", this.lastEnemyDamageUpdated);
			$("#fight-bar-enemy").data("animation-length", this.progressBarAnimationLen);
			$("#fight-bar-self").data("progress-percent", playerVal);
			$("#fight-bar-self").data("change-percent", playerChangeVal);
			$("#fight-bar-self").data("change-time", this.lastPlayerDamageUpdated);
			$("#fight-bar-self").data("animation-length", this.progressBarAnimationLen);
				
			var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
			var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent);
			var playerText = this.numFollowers > 0 ? "Party" : "Wanderer";
			playerText += "<br/>";
			playerText += "att: " + playerAtt + " | def: " + playerDef;
			$("#fight-popup-self-info").html(playerText);
            
            // update action buttons
            // TODO remove hard-coding of items usable in fight, instead have fight effect desc in ItemVO (damage, heal, defend, stun)
            // TODO show fight effect of items in fight ui
            var itemsToShow = [];
            if (itemsComponent.getCountById("glowstick_1") > 0) itemsToShow.push(itemsComponent.getItem("glowstick_1", null, false));
            if (itemsComponent.getCountById("consumable_weapon_1") > 0) itemsToShow.push(itemsComponent.getItem("consumable_weapon_1", null, false));
            if (itemsComponent.getCountById("flee_1") > 0) itemsToShow.push(itemsComponent.getItem("flee_1", null, false));
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
        
        updatePlayerDamage: function (damage) {
            this.lastPlayerDamage = UIConstants.roundValue(damage, true);
            this.lastPlayerDamageUpdated = new Date().getTime();
            $("#fight-damage-indictor-self").text(-this.lastPlayerDamage);
            this.animateDamageIndicator($("#fight-damage-indictor-self"));
        },
        
        updateEnemyDamage: function (damage) {
            this.lastEnemyDamage = UIConstants.roundValue(damage, true);
            this.lastEnemyDamageUpdated = new Date().getTime();
            $("#fight-damage-indictor-enemy").text(-this.lastEnemyDamage);
            this.animateDamageIndicator($("#fight-damage-indictor-enemy"));
        },
        
        refresh: function () {
            this.lastPlayerDamage = 0;
            this.lastEnemyDamage = 0;
        },
        
        refreshState: function () {
            var fightWon = this.state == FightPopupStateEnum.FIGHT_FINISHED && this.fightNodes.head.fight.won;
            
            // visibility: buttons
			GameGlobals.uiFunctions.toggle("#out-action-fight-confirm", this.state == FightPopupStateEnum.FIGHT_PENDING);
			GameGlobals.uiFunctions.toggle("#out-action-fight-close", fightWon || this.state == FightPopupStateEnum.FIGHT_FLED);
			GameGlobals.uiFunctions.toggle("#out-action-fight-next", fightWon);
            GameGlobals.uiFunctions.toggle("#out-action-fight-cancel", this.state == FightPopupStateEnum.FIGHT_PENDING);
            GameGlobals.uiFunctions.toggle("#fight-buttons-main", this.state != FightPopupStateEnum.FIGHT_ACTIVE);
            GameGlobals.uiFunctions.toggle("#fight-buttons-infightactions", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			
            // visibility: other elements
			GameGlobals.uiFunctions.toggle("#fight-popup-control-info", this.state != FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-bars", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-self-info", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#list-fight-followers", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-results", this.state == FightPopupStateEnum.FIGHT_FINISHED);
			GameGlobals.uiFunctions.toggle("#fight-desc", this.state != FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-enemy-info", this.state != FightPopupStateEnum.FIGHT_FLED);
			GameGlobals.uiFunctions.toggle("#fight-damage-indictor-self", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-damage-indictor-enemy", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			
            // texts
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			$("#fight-title").text(this.getTitleByContext(encounterComponent));
			$("#fight-popup-enemy-info").toggleClass("strike-through", fightWon);
			this.refreshEnemyText();
            
            switch (this.state) {
                case FightPopupStateEnum.FIGHT_PENDING:
                    this.refreshFightPending();
                    break;
                case FightPopupStateEnum.FIGHT_ACTIVE:
                    this.refreshFightActive();
                    break;
                case FightPopupStateEnum.FIGHT_FINISHED:
                    this.refreshFightFinished();
                    break;
                case FightPopupStateEnum.FIGHT_FLED:
                    this.refreshFightFled();
                    break;
            }
        },
        
        refreshFightPending: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			$("#fight-results-win-res").empty();
			$("#fight-results-win-items").empty();
			$("#fight-desc").text(this.getDescriptionByContext(encounterComponent.context, encounterComponent.enemy));
        },
        
        refreshFightActive: function () {
            // progress bars
			$("#fight-bar-enemy").data("last-change-value", 0);
			$("#fight-bar-self").data("last-change-value", 0);
            $("#fight-damage-indictor-self").text("");
            $("#fight-damage-indictor-enemy").text("");
            
            // followers
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
            
            this.updateFightActive();
        },
        
		refreshFightFinished: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			var isWon = this.fightNodes.head.fight.won;
			$("#fight-desc").text(isWon ? this.getWonDescriptionByContext(encounterComponent.context) : this.getLostDescriptionByContext(encounterComponent.context));
			
			GameGlobals.uiFunctions.toggle("#fight-results-win-header", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-win-res", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-win-items", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-lose-header", !isWon && false);
			GameGlobals.uiFunctions.toggle("#fight-results-lose-items", !isWon && false);
			
			$("#fight-popup-results").html(GameGlobals.playerActionResultsHelper.getRewardDiv(this.fightNodes.head.fight.resultVO, true));
			GameGlobals.uiFunctions.generateCallouts("#fight-popup-results");
        },
        
        refreshFightFled: function () {
            $("#fight-desc").text("Distracted the enemy and fled");
        },
	
		refreshEnemyText: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			var enemiesComponent = sector.get(EnemiesComponent);
			var currentEnemy = enemiesComponent.getNextEnemy();
			var enemyText = " " + currentEnemy.name + " ";
			enemyText += "<br/>";
			enemyText += " att: " + currentEnemy.att + " | def: " + currentEnemy.def + " ";
            
			if (this.state == FightPopupStateEnum.FIGHT_PENDING) {
				var playerStamina = this.playerStatsNodes.head.stamina;
                var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
                enemyText += "<br/>";
                enemyText += FightConstants.getFightChances(currentEnemy, playerStamina, itemsComponent);
			}
            
			$("#fight-popup-enemy-info").html(enemyText);
		},
        
        animateDamageIndicator: function ($indicator) {
            $indicator.finish().animate({
                opacity: 0,
            }, 5).animate({
                opacity: 1,
            }, 20).delay(380).animate({
                opacity: 0,
            }, 500);
        },
        
        setState: function (state) {
            if (this.state == state) return;
            this.state = state;
            this.refreshState();
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
		
        onPopupOpened: function (popupID) {
            if (popupID === "fight-popup") {
                this.refresh();
                this.isFightPopupOpen = true;
                this.setState(FightPopupStateEnum.FIGHT_PENDING);
            }
        },
        
        onPopupClosed: function (popupID) {
            if (popupID === "fight-popup") {
                this.isFightPopupOpen = false;
                this.setState(FightPopupStateEnum.CLOSED);
            }
        },
        
        onFightUpdate: function (playerDamage, enemyDamage) {
            if (this.state !== FightPopupStateEnum.FIGHT_ACTIVE) return;
            if (playerDamage) {
                this.updatePlayerDamage(playerDamage);
            }
            if (enemyDamage) {
                this.updateEnemyDamage(enemyDamage);
            }
            this.updateFightActive();
        },

    });

    return UIOutFightSystem;
});
