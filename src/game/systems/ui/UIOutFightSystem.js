define([
	'ash',
	'text/Text',
	'utils/UIState',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/FightConstants',
	'game/constants/FollowerConstants',
	'game/constants/ItemConstants',
	'game/constants/TextConstants',
	'game/constants/UIConstants',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/FightNode',
	'game/components/player/ItemsComponent',
	'game/components/sector/FightEncounterComponent',
	'game/components/sector/EnemiesComponent'
], function (Ash, Text, UIState, GameGlobals, GlobalSignals, GameConstants, FightConstants, FollowerConstants, ItemConstants, TextConstants, UIConstants, PlayerLocationNode, PlayerStatsNode, FightNode, ItemsComponent, FightEncounterComponent, EnemiesComponent) {
	
	var FightPopupStateEnum = {
		CLOSED: 0,
		FIGHT_PENDING: 1,
		FIGHT_ACTIVE: 2,
		FIGHT_FINISHED: 3,
		FIGHT_FLED: 4,
		CLOSING: 5,
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
			GlobalSignals.add(this, GlobalSignals.popupClosingSignal, this.onPopupClosing);
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
			} else if (this.isFightPopupClosing) {
				this.setState(FightPopupStateEnum.CLOSING);
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
			var itemsComponent = this.playerStatsNodes.head.items;
			var followersComponent = this.playerStatsNodes.head.followers;
			
			// update progress bars
			var enemy = this.fightNodes.head.fight.enemy;
			var playerStamina = this.playerStatsNodes.head.stamina;
			
			var playerHPVal = Math.round(playerStamina.hp / playerStamina.maxHP * 100);
			var playerShieldVal = playerStamina.maxShield > 0 ? Math.round(playerStamina.shield / playerStamina.maxShield * 100) : 0;
			
			var playerTotalChange = Math.round(this.lastDamageToPlayer);
			var playerMissingHealth = playerStamina.maxHP - playerStamina.hp;
			var playerShieldBeforeDamage = playerShieldVal > 0 ? playerShieldVal + playerTotalChange : Math.max(0, playerTotalChange - playerMissingHealth);
			var playerShieldChange = playerShieldBeforeDamage - playerShieldVal;
			
			var enemyHPVal = Math.round(enemy.hp / enemy.maxHP * 100);
			var enemyShieldVal = enemy.maxShield > 0 ? Math.round(enemy.shield / enemy.maxShield * 100) : 0;
			
			var enemyTotalChange = Math.round(this.lastDamageToEnemy);
			var enemyMissingHealth = enemy.maxHP - enemy.hp;
			var enemyShieldBeforeDamage = enemyShieldVal > 0 ? enemyShieldVal + enemyTotalChange : Math.max(0, enemyTotalChange - enemyMissingHealth);
			var enemyShieldChange = enemyShieldBeforeDamage - enemyShieldVal;
			
			$("#fight-bar-enemy").data("progress-percent", enemyHPVal);
			if (enemy.maxHP > 0) {
				let enemyHPChange = enemyTotalChange - enemyShieldChange;
				$("#fight-bar-enemy").data("change-percent", Math.round(enemyHPChange / enemy.maxHP * 100));
				$("#fight-bar-enemy").data("change-time", this.lastDamageToEnemyUpdated);
				$("#fight-bar-enemy").data("animation-length", this.progressBarAnimationLen);
			}
			
			$("#fight-bar-enemy-shield").data("progress-percent", enemyShieldVal);
			if (enemy.maxShield > 0) {
				$("#fight-bar-enemy-shield").data("change-percent", Math.round(enemyShieldChange / enemy.maxShield * 100));
				$("#fight-bar-enemy-shield").data("change-time", this.lastDamageToEnemyUpdated);
				$("#fight-bar-enemy-shield").data("animation-length", this.progressBarAnimationLen);
			}
			
			$("#fight-bar-self").data("progress-percent", playerHPVal);
			if (playerStamina.maxHP > 0) {
				let playerHPChange = playerTotalChange - playerShieldChange;
				$("#fight-bar-self").data("change-percent", Math.round(playerHPChange / playerStamina.maxHP * 100));
				$("#fight-bar-self").data("change-time", this.lastDamageToPlayerUpdated);
				$("#fight-bar-self").data("animation-length", this.progressBarAnimationLen);
			}
			
			$("#fight-bar-self-shield").data("progress-percent", playerShieldVal);
			if (playerStamina.maxShield > 0) {
				$("#fight-bar-self-shield").data("change-percent", Math.round(playerShieldChange / playerStamina.maxShield * 100));
				$("#fight-bar-self-shield").data("change-time", this.lastDamageToPlayerUpdated);
				$("#fight-bar-self-shield").data("animation-length", this.progressBarAnimationLen);
			}
				
			var playerAtt = FightConstants.getPlayerAtt(playerStamina, itemsComponent, followersComponent);
			var playerDef = FightConstants.getPlayerDef(playerStamina, itemsComponent, followersComponent);
			var playerSpeed = FightConstants.getPlayerSpeed(itemsComponent);
			var playerHP = playerStamina.maxHP;
			var playerShield = playerStamina.maxShield;
			$("#fight-popup-self-name").text(this.numFollowers > 0 ? " Party " : " Wanderer ");
			$("#fight-popup-self-stats").text(this.getStatsText(playerAtt, playerDef, playerSpeed, playerHP, playerShield));
			
			// update action buttons
			// TODO remove hard-coding of items usable in fight, instead have fight effect desc in ItemVO (damage, heal, defend, stun)
			// TODO show fight effect of items in fight ui
			var itemsToShow = [];
			if (itemsComponent.getCountById("glowstick_1") > 0) itemsToShow.push(itemsComponent.getItem("glowstick_1", null, false));
			if (itemsComponent.getCountById("consumable_weapon_1") > 0) itemsToShow.push(itemsComponent.getItem("consumable_weapon_1", null, false));
			if (itemsComponent.getCountById("consumable_weapon_mechanical") > 0) itemsToShow.push(itemsComponent.getItem("consumable_weapon_mechanical", null, false));
			if (itemsComponent.getCountById("consumable_weapon_bio") > 0) itemsToShow.push(itemsComponent.getItem("consumable_weapon_bio", null, false));
			if (itemsComponent.getCountById("flee_1") > 0) itemsToShow.push(itemsComponent.getItem("flee_1", null, false));
			var numItemsShown = $("#fight-buttons-infightactions button").length;
			if (numItemsShown !== itemsToShow.length) {
				$("#fight-buttons-infightactions").empty();
				for(let i = 0; i < itemsToShow.length; i++) {
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
		
		updateDamageToPlayer: function (damage) {
			this.lastDamageToPlayer = UIConstants.roundValue(damage, true);
			this.lastDamageToPlayerUpdated = new Date().getTime();
			$("#fight-damage-indictor-self").text(-this.lastDamageToPlayer);
			this.animateDamageIndicator($("#fight-damage-indictor-self"));
		},
		
		updateDamageToEnemy: function (damage) {
			this.lastDamageToEnemy = UIConstants.roundValue(damage, true);
			this.lastDamageToEnemyUpdated = new Date().getTime();
			$("#fight-damage-indictor-enemy").text(-this.lastDamageToEnemy);
			this.animateDamageIndicator($("#fight-damage-indictor-enemy"));
		},
		
		updatePlayerDodge: function () {
			$("#fight-status-indictor-self").text("dodge");
			this.animateDamageIndicator($("#fight-status-indictor-self"));
		},
		
		updateEnemyDodge: function () {
			$("#fight-status-indictor-enemy").text("dodge");
			this.animateDamageIndicator($("#fight-status-indictor-enemy"));
		},
		
		updatePlayerStatus: function (status) {
			$("#fight-popup-self-name").toggleClass("fight-status-stunned", status == FightConstants.STATUS_STUNNED);
		},
		
		updateEnemyStatus: function (status) {
			$("#fight-popup-enemy-name").toggleClass("fight-status-stunned", status == FightConstants.STATUS_STUNNED);
		},
		
		refresh: function () {
			this.lastDamageToPlayer = 0;
			this.lastDamageToEnemy = 0;
			$("#fight-popup-enemy-stats").css("opacity", 0);
		},
		
		refreshState: function () {
			if (this.state == FightPopupStateEnum.CLOSED || this.state == FightPopupStateEnum.CLOSING) return;
			
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			var fightWon = this.state == FightPopupStateEnum.FIGHT_FINISHED && this.fightNodes.head.fight.won;
			var fightLost = this.state == FightPopupStateEnum.FIGHT_FINISHED && !this.fightNodes.head.fight.won;
			var hasNext = encounterComponent.pendingEnemies > 1;
			
			// visibility: buttons
			GameGlobals.uiFunctions.toggle("#out-action-fight-confirm", this.state == FightPopupStateEnum.FIGHT_PENDING);
			GameGlobals.uiFunctions.toggle("#out-action-fight-cancel", this.state == FightPopupStateEnum.FIGHT_PENDING);
			GameGlobals.uiFunctions.toggle("#out-action-fight-close", this.state == FightPopupStateEnum.FIGHT_FLED);
			GameGlobals.uiFunctions.toggle("#out-action-fight-continue", fightLost);
			GameGlobals.uiFunctions.toggle("#out-action-fight-takeselected", fightWon);
			GameGlobals.uiFunctions.toggle("#out-action-fight-takeall", fightWon);
			GameGlobals.uiFunctions.toggle("#fight-buttons-main", this.state != FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-buttons-infightactions", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			
			// visibility: other elements
			GameGlobals.uiFunctions.toggle("#fight-popup-control-info", this.state != FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-bars", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-self-info", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#list-fight-items", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#list-fight-followers", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-results", this.state == FightPopupStateEnum.FIGHT_FINISHED);
			GameGlobals.uiFunctions.toggle("#fight-desc", this.state != FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-enemy-info", this.state != FightPopupStateEnum.FIGHT_FLED && !fightWon);
			GameGlobals.uiFunctions.toggle("#fight-popup-enemy-difficulty", this.state == FightPopupStateEnum.FIGHT_PENDING);
			GameGlobals.uiFunctions.toggle("#fight-damage-indictor-self", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-damage-indictor-enemy", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-status-indictor-self", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-status-indictor-enemy", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			GameGlobals.uiFunctions.toggle("#fight-popup-items", this.state == FightPopupStateEnum.FIGHT_ACTIVE);
			
			// texts
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
			
			GlobalSignals.elementToggledSignal.dispatch();
			GlobalSignals.popupResizedSignal.dispatch();
		},
		
		refreshFightPending: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			
			$("#fight-results-win-res").empty();
			$("#fight-results-win-items").empty();
			$("#fight-desc").text(this.getDescriptionByContext(encounterComponent.context, encounterComponent.enemy));
			
			this.refreshWinProbabilityText();
		},
		
		refreshFightActive: function () {
			// progress bars
			$.each($("#fight-popup-bars .progress-wrap"), function () {
				$(this).data("last-change-value", 0);
				$(this).data("progress-percent", 100);
			});
			
			var currentEnemy = this.getCurrentEnemy();
			
			$("#fight-bar-enemy").css("width", Math.ceil(currentEnemy.maxHP / (currentEnemy.maxHP + currentEnemy.maxShield) * 100) + "%");
			$("#fight-bar-enemy-shield").css("width", Math.floor(currentEnemy.maxShield / (currentEnemy.maxHP + currentEnemy.maxShield) * 100) + "%");
			
			var playerStamina = this.playerStatsNodes.head.stamina;
			$("#fight-bar-self").css("width", Math.ceil(playerStamina.maxHP / (playerStamina.maxHP + playerStamina.maxShield) * 100) + "%");
			$("#fight-bar-self-shield").css("width", Math.floor(playerStamina.maxShield / (playerStamina.maxHP + playerStamina.maxShield) * 100) + "%");
			
			$("#fight-damage-indictor-self").text("");
			$("#fight-damage-indictor-enemy").text("");
			
			$("#fight-status-indictor-self").text("");
			$("#fight-status-indictor-enemy").text("");
			
			// items
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			$("ul#list-fight-items").empty();
			this.numItems = 0;
			var items = itemsComponent.getEquipped();
			for (let i = 0; i < items.length; i++) {
				var item = items[i];
				var bonusatt = item.getCurrentBonus(ItemConstants.itemBonusTypes.fight_att) > 0;
				var bonusDef = item.getCurrentBonus(ItemConstants.itemBonusTypes.fight_def) > 0;
				if (bonusatt || bonusDef) {
					this.numItems++;
					$("ul#list-fight-items").append("<li>" + UIConstants.getItemDiv(null, item, null, UIConstants.getItemCallout(item, true), true) + "</li>");
				}
			}
			GameGlobals.uiFunctions.generateCallouts("ul#list-fight-items");
			
			// followers
			$("ul#list-fight-followers").empty();
			this.numFollowers = 0;
			var followers = this.playerStatsNodes.head.followers.getParty();
			for (let i = 0; i < followers.length; i++) {
				var follower = followers[i];
				var bonusatt = FollowerConstants.getFollowerItemBonus(follower, ItemConstants.itemBonusTypes.fight_att) > 0;
				var bonusDef = FollowerConstants.getFollowerItemBonus(follower, ItemConstants.itemBonusTypes.fight_def) > 0;
				if (bonusatt || bonusDef) {
					this.numFollowers++;
					$("ul#list-fight-followers").append("<li>" + UIConstants.getFollowerDiv(follower, true, false, true) + "</li>");
				}
			}
			GameGlobals.uiFunctions.generateCallouts("ul#list-fight-followers");
			
			GameGlobals.uiFunctions.toggle("#fight-popup-itemlist-separator", this.numFollowers > 0 && this.numItems > 0);
			this.updateFightActive();
		},
		
		refreshFightFinished: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			var isWon = this.fightNodes.head.fight.won;
			var resultVO = this.fightNodes.head.fight.resultVO;
			
			if (isWon) {
				var rewardDec = "";
				$("#fight-desc").text(this.getWonDescriptionByContext(encounterComponent.context));
			} else {
				$("#fight-desc").text(this.getLostDescriptionByContext(encounterComponent.context));
			}
			
			GameGlobals.uiFunctions.toggle("#fight-results-win-header", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-win-res", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-win-items", isWon);
			GameGlobals.uiFunctions.toggle("#fight-results-lose-header", !isWon && false);
			GameGlobals.uiFunctions.toggle("#fight-results-lose-items", !isWon && false);
			
			GameGlobals.playerActionResultsHelper.preCollectRewards(resultVO);
			$("#fight-popup-results").html(GameGlobals.playerActionResultsHelper.getRewardDiv(resultVO, true));
			GameGlobals.uiFunctions.generateCallouts("#fight-popup-results");
		},
		
		refreshFightFled: function () {
			$("#fight-desc").text("Distracted the enemy and fled");
		},
	
		refreshEnemyText: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			var enemiesComponent = sector.get(EnemiesComponent);
			var currentEnemy = encounterComponent.enemy;
			if (currentEnemy == null) return;
			var statsText = this.getStatsText(currentEnemy.getAtt(), currentEnemy.getDef(), currentEnemy.getSpeed(), currentEnemy.maxHP, currentEnemy.maxShield);
			
			$("#fight-popup-enemy-name").html(" " + currentEnemy.name.toLowerCase() + " ");
			$("#fight-popup-enemy-stats").html(statsText);
		},
		
		refreshWinProbabilityText: function () {
			$("#fight-popup-enemy-difficulty").toggleClass("warning", false);
			$("#fight-popup-enemy-difficulty").toggleClass("p-meta", true);
			$("#fight-popup-enemy-difficulty").text("-");
			
			var currentEnemy = this.getCurrentEnemy();
			if (currentEnemy == null) return;
			
			$("#fight-popup-enemy-stats").animate({
				opacity: 1.0
			}, 250);
			
			$("#fight-popup-enemy-difficulty").animate({
				opacity: 1.0
			}, 500);
			
			var playerStamina = this.playerStatsNodes.head.stamina;
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var followersComponent = this.playerStatsNodes.head.followers;
			
			FightConstants.getFightWinProbability(currentEnemy, playerStamina, itemsComponent, followersComponent).
				then(chances => {
					var chancesText = TextConstants.getFightChancesText(chances);
					if (GameConstants.isDebugVersion) {
						chancesText += " [" + Math.round(chances * 100)  + "%]";
					}
					$("#fight-popup-enemy-difficulty").text(chancesText)
					$("#fight-popup-enemy-difficulty").toggleClass("p-meta", false);
					$("#fight-popup-enemy-difficulty").toggleClass("warning", chances < 0.4);
				})
				.catch(ex => { log.e(ex) });
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
			var enemyNoun = TextConstants.getEnemyNoun([enemy]);
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(context);
			switch (baseActionID) {
				case "scavenge":
					return "surprised by " + Text.addArticle(enemyNoun) + " while scavenging";
				case "investigate":
					return "surprised by " + Text.addArticle(enemyNoun) + " while investigating";
				case "scout_locale_u":
					return "surprised by " + Text.addArticle(enemyNoun) + " while scouting";
				case "scout_locale_i":
					return "attacked while scouting";
				case "clear_workshop":
					 var enemyActiveV = TextConstants.getEnemyActiveVerb([ enemy ]);
					return "workshop " + enemyActiveV + " " + Text.pluralify(enemyNoun);
				case "fight_gang":
					return Text.addArticle(enemyNoun) + " is blocking passage";
				default:
					return Text.addArticle(enemyNoun) + " approaches";
			}
		},
		
		getStatsText: function (att, def, speed, hp, shield) {
			let result = "";
			result += " ";
			result += "att: " + att;
			result += " | ";
			result += "def: " + def;
			result += " | ";
			result += "spd: " + Math.round(speed * 20)/20;
			result += " | ";
			
			if (hp > 0) {
				result += "hp: " + hp;
			}
			if  (hp > 0 && shield > 0) {
				result += " | ";
			}
			if (shield > 0) {
				result += "shield: " + shield;
			}
			
			result += " ";
			return result;
		},
		
		getWonDescriptionByContext: function (context) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(context);
			switch (baseActionID) {
				case "scavenge":
				case "investigate":
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
		
		getCurrentEnemy: function () {
			var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
			return encounterComponent.enemy;
		},
		
		onPopupOpened: function (popupID) {
			if (popupID === "fight-popup") {
				this.refresh();
				this.isFightPopupOpen = true;
				this.setState(FightPopupStateEnum.FIGHT_PENDING);
			}
		},
		
		onPopupClosing: function (popupID) {
			if (popupID == "fight-popup") {
				this.isFightPopupClosing = true;
				this.setState(FightPopupStateEnum.CLOSING);
			}
		},
		
		onPopupClosed: function (popupID) {
			if (popupID === "fight-popup") {
				this.isFightPopupOpen = false;
				this.isFightPopupClosing = false;
				this.setState(FightPopupStateEnum.CLOSED);
			}
		},
		
		onFightUpdate: function (damageToPlayer, damageToEnemy, playerMissed, enemyMissed, playerStatus, enemyStatus) {
			if (this.state !== FightPopupStateEnum.FIGHT_ACTIVE) return;
			if (damageToPlayer) {
				this.updateDamageToPlayer(damageToPlayer);
			}
			if (damageToEnemy) {
				this.updateDamageToEnemy(damageToEnemy);
			}
			if (playerMissed) {
				this.updateEnemyDodge();
			}
			if (enemyMissed) {
				this.updatePlayerDodge();
			}
			this.updatePlayerStatus(playerStatus);
			this.updateEnemyStatus(enemyStatus);
			this.updateFightActive();
		},

	});

	return UIOutFightSystem;
});
