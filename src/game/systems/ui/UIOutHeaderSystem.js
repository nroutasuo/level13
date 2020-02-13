define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/constants/CampConstants',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/constants/UpgradeConstants',
    'game/constants/PlayerStatConstants',
    'game/systems/SaveSystem',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/AutoPlayNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/nodes/player/DeityNode',
    'game/components/player/BagComponent',
    'game/components/player/DeityComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/player/PlayerActionComponent',
    'game/components/common/PositionComponent',
    'game/components/common/CampComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/ReputationComponent',
    'utils/UIState'
], function (Ash,
    GameGlobals, GlobalSignals, GameConstants, CampConstants, UIConstants, ItemConstants, FightConstants, UpgradeConstants, PlayerStatConstants,
    SaveSystem,
	PlayerStatsNode, AutoPlayNode, PlayerLocationNode, TribeUpgradesNode, DeityNode,
    BagComponent,
	DeityComponent,
	ItemsComponent,
	PerksComponent,
	PlayerActionComponent,
	PositionComponent,
    CampComponent,
	SectorFeaturesComponent,
    SectorImprovementsComponent,
    ReputationComponent,
    UIState
) {
    var UIOutHeaderSystem = Ash.System.extend({

		playerStatsNodes: null,
		deityNodes: null,
		tribeNodes: null,
		currentLocationNodes: null,
		engine: null,

		constructor: function () {
            this.elements = {};
            this.elements.body = $("body");
            this.elements.locationHeader = $("#grid-location-header h1");
            this.elements.date = $("#in-game-date");
            this.elements.gameMsg = $("#game-msg")
            this.elements.gameVersion = $("#game-version");
            this.elements.valVision = $("#stats-vision .value");
            this.elements.valStamina = $("#stats-stamina .value");
            this.elements.valHealth = $("#stats-health .value");
            this.elements.valRumours = $("#stats-rumours .value");
            this.elements.valEvidence = $("#stats-evidence .value");
            this.elements.valScavenge = $("#stats-scavenge .value");
            this.elements.valReputation = $("#header-camp-reputation .value");
            this.elements.changeIndicatorVision = $("#vision-change-indicator");
            this.elements.changeIndicatorScavenge = $("#scavenge-change-indicator");
            this.elements.changeIndicatorStamina = $("#stamina-change-indicator");
            this.elements.changeIndicatorReputation = $("#reputation-change-indicator");
            this.elements.changeIndicatorPopulation = $("#population-change-indicator");
            this.elements.changeIndicatorEvidence = $("#evidence-change-indicator");
            this.elements.changeIndicatorRumours = $("#rumours-change-indicator");
            this.elements.changeIndicatorFavour = $("#favour-change-indicator");

			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.deityNodes = engine.getNodeList(DeityNode);
            this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.currentLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);

            var sys = this;
            GlobalSignals.playerMovedSignal.add(function () { sys.onPlayerMoved(); });
            GlobalSignals.actionStartedSignal.add(function () { sys.onInventoryChanged(); });
            GlobalSignals.visionChangedSignal.add(function () { sys.onVisionChanged(); });
            GlobalSignals.tabChangedSignal.add(function () { sys.onTabChanged(); });
            GlobalSignals.healthChangedSignal.add(function () { sys.onHealthChanged(); });
            GlobalSignals.tribeStatsChangedSignal.add(function () { sys.onTribeStatsChanged(); });
            GlobalSignals.inventoryChangedSignal.add(function () { sys.onInventoryChanged(); });
            GlobalSignals.slowUpdateSignal.add(function () { sys.slowUpdate(); });
            GlobalSignals.changelogLoadedSignal.add(function () { sys.updateGameVersion(); });
            GlobalSignals.add(this, GlobalSignals.perksChangedSignal, this.onPerksChanged);
            GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);

			this.generateStatsCallouts();
            this.updateGameVersion();
            this.refreshPerks();
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerStatsNodes = null;
			this.deityNodes = null;
			this.currentLocationNodes = null;
			this.autoPlayNodes = null;
		},

		generateStatsCallouts: function () {
			$.each($("#statsbar-self .stats-indicator"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			$.each($("#header-self-bar .stats-indicator"), function () {
				$(this).wrap("<div class='info-callout-target info-callout-target-small'></div>");
			});
			$.each($("#header-camp-reputation"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			$.each($("#header-camp-population"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			GameGlobals.uiFunctions.generateCallouts("#statsbar-self");
		},

		update: function (time) {
			if (!this.currentLocationNodes.head) return;
            if (GameGlobals.gameState.uiStatus.isHidden) return;

            var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
			var isInCamp = playerPosition.inCamp;

			this.updateGameMsg();
			this.updateNotifications(isInCamp);
			this.updatePerks();

            if (isInCamp && !campComponent) return;
		},

        slowUpdate: function () {
			if (!this.currentLocationNodes.head) return;
            if (GameGlobals.gameState.uiStatus.isHidden) return;

            var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
            var isInCamp = playerPosition.inCamp;
			this.updatePlayerStats(isInCamp);
			this.updateDeity();
			this.updateItems(false, isInCamp);
			this.updateResources();
            this.updateItemStats();
        },
        
        updateGameVersion: function () {
			this.elements.gameVersion.text("v. " + GameGlobals.changeLogHelper.getCurrentVersionNumber());
        },

		updatePlayerStats: function (isInCamp) {
            if (!this.currentLocationNodes.head) return;
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
            var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			var playerStatsNode = this.playerStatsNodes.head;
            var playerStamina = playerStatsNode.stamina.stamina;
			var playerVision = playerStatsNode.vision.value;
			var maxVision = playerStatsNode.vision.maximum;
            var shownVision = UIConstants.roundValue(playerVision, true, false);
			var maxStamina = Math.round(playerStatsNode.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
            var isResting = this.isResting();
            var isHealing = busyComponent && busyComponent.getLastActionName() == "use_in_hospital";

			this.elements.valVision.text(shownVision + " / " + maxVision);
			this.updateStatsCallout("Makes exploration safer", "stats-vision", playerStatsNode.vision.accSources);
            this.updateChangeIndicator(this.elements.changeIndicatorVision, maxVision - shownVision, shownVision < maxVision);

            this.elements.valHealth.text(playerStatsNode.stamina.health);
            this.updateStatsCallout("Determines maximum stamina", "stats-health", null);

            GameGlobals.uiFunctions.toggle($("#stats-stamina"), GameGlobals.gameState.unlockedFeatures.scavenge);
			this.elements.valStamina.text(UIConstants.roundValue(playerStamina, true, false) + " / " + maxStamina);
			this.updateStatsCallout("Required for exploration", "stats-stamina", playerStatsNode.stamina.accSources);
            this.updateChangeIndicator(this.elements.changeIndicatorStamina, playerStatsNode.stamina.accumulation, playerStamina < maxStamina, isResting || isHealing);

            this.elements.valVision.toggleClass("warning", playerVision <= 25);
            this.elements.valStamina.toggleClass("warning", playerStamina <= this.staminaWarningLimit);
            this.elements.valHealth.toggleClass("warning", playerStatsNode.stamina.health <= 25);

			this.elements.valRumours.text(UIConstants.roundValue(playerStatsNode.rumours.value, true, false));
			GameGlobals.uiFunctions.toggle("#stats-rumours", playerStatsNode.rumours.isAccumulating);
			this.updateStatsCallout("", "stats-rumours", playerStatsNode.rumours.accSources);
            this.updateChangeIndicator(this.elements.changeIndicatorRumours, playerStatsNode.rumours.accumulation, playerStatsNode.rumours.isAccumulating);

			this.elements.valEvidence.text(UIConstants.roundValue(playerStatsNode.evidence.value, true, false));
			GameGlobals.uiFunctions.toggle("#stats-evidence", GameGlobals.gameState.unlockedFeatures.evidence);
			this.updateStatsCallout("", "stats-evidence", playerStatsNode.evidence.accSources);
            this.updateChangeIndicator(this.elements.changeIndicatorEvidence, playerStatsNode.evidence.accumulation, GameGlobals.gameState.unlockedFeatures.evidence);

            GameGlobals.uiFunctions.toggle($("#header-tribe-container"), GameGlobals.gameState.unlockedFeatures.evidence || playerStatsNode.rumours.isAccumulating);

            var improvements = this.currentLocationNodes.head.entity.get(SectorImprovementsComponent);
            var maxPopulation = CampConstants.getHousingCap(improvements);
			var reputationComponent = this.currentLocationNodes.head.entity.get(ReputationComponent);
            if (campComponent && reputationComponent && maxPopulation > 0) {
                var reqReputationCurrent = CampConstants.getRequiredReputation(Math.floor(campComponent.population));
                var reqReputationNext = CampConstants.getRequiredReputation(Math.floor(campComponent.population) + 1);

                this.elements.valReputation.text(UIConstants.roundValue(reputationComponent.value, true, true) + " / " + UIConstants.roundValue(reputationComponent.targetValue, true, true));
                this.updateChangeIndicator(this.elements.changeIndicatorReputation, reputationComponent.accumulation, true);
                var reputationCalloutContent = "";
                for (var i in reputationComponent.targetValueSources) {
                    var source = reputationComponent.targetValueSources[i];
                    if (source.amount !== 0) {
                        var amount = Math.round(source.amount * 10000)/10000;
                        if (amount === 0 && source.amount > 0) {
                            amount = "< 0.0001";
                        }
                        reputationCalloutContent += source.source + ": " + amount + "<br/>";
                    }
                }
                this.elements.valReputation.toggleClass("warning", reputationComponent.value < reqReputationCurrent);
                UIConstants.updateCalloutContent("#header-camp-reputation", reputationCalloutContent);

                $("#header-camp-population .value").text(Math.floor(campComponent.population) + " / " + maxPopulation);
                this.updateChangeIndicator(this.elements.changeIndicatorPopulation, campComponent.populationChangePerSec, maxPopulation > 0);
                var populationCalloutContent = "Required reputation:<br/>";
                populationCalloutContent += "current: " + reqReputationCurrent + "<br/>";
                populationCalloutContent += "next: " + reqReputationNext;
                UIConstants.updateCalloutContent("#header-camp-population", populationCalloutContent);
                GameGlobals.uiFunctions.toggle("#header-camp-population", true);
                GameGlobals.uiFunctions.toggle("#header-camp-reputation", true);
            } else {
                GameGlobals.uiFunctions.toggle("#header-camp-population", false);
                GameGlobals.uiFunctions.toggle("#header-camp-reputation", false);
            }

			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var fightAtt = FightConstants.getPlayerAtt(playerStatsNode.stamina, itemsComponent);
            var fightDef = FightConstants.getPlayerDef(playerStatsNode.stamina, itemsComponent);
            var fightStrength = FightConstants.getStrength(fightAtt, fightDef, playerStatsNode.stamina.maxHP);

            $("#stats-fight .value").text(fightStrength);
            $("#stats-fight-att .value").text(fightAtt);
            $("#stats-fight-def .value").text(fightDef);
			GameGlobals.uiFunctions.toggle("#stats-fight", GameGlobals.gameState.unlockedFeatures.fight);
			GameGlobals.uiFunctions.toggle("#stats-fight-att", GameGlobals.gameState.unlockedFeatures.fight);
			GameGlobals.uiFunctions.toggle("#stats-fight-def", GameGlobals.gameState.unlockedFeatures.fight);

            GameGlobals.uiFunctions.toggle("#stats-scavenge", GameGlobals.gameState.unlockedFeatures.scavenge && !isInCamp);
			var scavengeEfficiency = Math.round(GameGlobals.playerActionResultsHelper.getScavengeEfficiency() * 100);
			this.elements.valScavenge.text(scavengeEfficiency + "%");
			UIConstants.updateCalloutContent("#stats-scavenge", "Increases scavenge loot<hr/>health: " + Math.round(maxStamina/10) + "<br/>vision: " + Math.round(playerVision));
            this.updateChangeIndicator(this.elements.changeIndicatorScavenge, maxVision - shownVision, shownVision < maxVision);
		},

        updateChangeIndicator: function (indicator, accumulation, show, showFastIncrease) {
            if (show) {
                indicator.toggleClass("indicator-fastincrease", showFastIncrease == true);
                indicator.toggleClass("indicator-increase", !showFastIncrease && accumulation > 0);
                indicator.toggleClass("indicator-even", !showFastIncrease && accumulation === 0);
                indicator.toggleClass("indicator-decrease", !showFastIncrease && accumulation < 0);
                GameGlobals.uiFunctions.toggle(indicator, true);
            } else {
                GameGlobals.uiFunctions.toggle(indicator, false);
            }
        },

		updateStatsCallout: function (description, indicatorID, changeSources) {
            var sources = "";
			var source;
            var total = 0;
			for (var i in changeSources) {
				source = changeSources[i];
				if (source.amount != 0) {
					var amount = Math.round(source.amount * 1000)/1000;
					if (amount == 0 && source.amount > 0) {
						amount = "<&nbsp;" + (1/1000);
					}
					sources += source.source + ": " + amount + "/s<br/>";
                    total+= source.amount;
				}
			}

			if (sources.length <= 0) {
				sources = "(no change)";
			}
            
            var totals =  "Total: " + Math.round(total * 10000)/10000 + "/s";
            var content = description + (description && sources ? "<hr/>" :  "") + sources + (total > 0 ? ("<hr/>" + totals) : "");
			UIConstants.updateCalloutContent("#" + indicatorID, content);
		},

		updateDeity: function () {
			var hasDeity = this.deityNodes.head != null;
			GameGlobals.uiFunctions.toggle("#statsbar-deity", hasDeity);

			if (hasDeity) {
				$("#deity-favour .value").text(Math.round(this.deityNodes.head.deity.favour));
				$("#deity-name").text(this.deityNodes.head.deity.name);
			}
		},

		updateItems: function (forced, inCamp) {
            if (inCamp) return;

			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);

			var items = itemsComponent.getUnique(inCamp);
			if (forced || items.length !== this.lastItemsUpdateItemCount) {
                $("ul#list-header-equipment").empty();
                $("ul#list-header-items").empty();
                $("ul#list-items-followers").empty();
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    var count = itemsComponent.getCount(item, inCamp);
                    switch (item.type) {
                        case ItemConstants.itemTypes.follower:
                            $("ul#list-items-followers").append("<li>" + UIConstants.getItemDiv(itemsComponent, item, null, UIConstants.getItemCallout(item, true), true) + "</li>");
                            break;

                        case ItemConstants.itemTypes.bag:
                        case ItemConstants.itemTypes.clothing_over:
                        case ItemConstants.itemTypes.clothing_upper:
                        case ItemConstants.itemTypes.clothing_lower:
                        case ItemConstants.itemTypes.clothing_head:
                        case ItemConstants.itemTypes.clothing_hands:
                        case ItemConstants.itemTypes.shoes:
                        case ItemConstants.itemTypes.light:
                        case ItemConstants.itemTypes.weapon:
                            if (item.equipped)
                                $("ul#list-header-equipment").append("<li>" + UIConstants.getItemDiv(itemsComponent, item, null, UIConstants.getItemCallout(item, true), true) + "</li>");
                            break;

                        case ItemConstants.itemTypes.exploration:
                            $("ul#list-header-items").append("<li>" + UIConstants.getItemDiv(itemsComponent, item, count, UIConstants.getItemCallout(item, true)) + "</li>");
                            break;
                    }
                }

                GameGlobals.uiFunctions.generateCallouts("ul#list-header-items");
                GameGlobals.uiFunctions.generateCallouts("ul#list-header-equipment");
                GameGlobals.uiFunctions.generateCallouts("ul#list-items-followers");

                this.lastItemsUpdateItemCount = items.length;
			}
		},
        
        refreshPerks: function () {
            if (!this.playerStatsNodes.head) return;
            var isResting = this.isResting();
			var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
			var perks = perksComponent.getAll();
            var now = new Date().getTime();
            $("ul#list-items-perks").empty();
            for (var i = 0; i < perks.length; i++) {
                var perk = perks[i];
                var desc = perk.name + " (" + UIConstants.getPerkDetailText(perk, isResting) + ")";
                var url = perk.icon;
                var isNegative = perksComponent.isNegative(perk);
                var liClass = isNegative ? "li-item-negative" : "li-item-positive";
                liClass += " item item-equipped";
                var li =
                    "<li class='" + liClass + "' id='perk-header-" + perk.id + "'>" +
                    "<div class='info-callout-target info-callout-target-small' description='" + desc + "'>" +
                    "<img src='" + url + "' alt='" + perk.name + "'/>" +
                    "</div></li>";
                $li = $(li);
                $("ul#list-items-perks").append($li);
                var diff = now - perk.timestamp;
                var animate = diff < 100;
                if (animate) {
                    $li.toggle(false);
                    $li.fadeIn(500);
                }
            }

            GameGlobals.uiFunctions.generateCallouts("ul#list-items-perks");
        },

		updatePerks: function () {
			var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
			var perks = perksComponent.getAll();
            var isResting = this.isResting();

            for (var i = 0; i < perks.length; i++) {
                var perk = perks[i];
                var desc = perk.name + " (" + UIConstants.getPerkDetailText(perk, isResting) + ")";
                $("#perk-header-" + perk.id + " .info-callout-target").attr("description", desc);
                $("#perk-header-" + perk.id + " .info-callout-target").toggleClass("event-ending", perk.effectTimer >= 0 && perk.effectTimer < 5);
            }
            
            // TODO performance bottleneck - don't call every frame? only if timed perks?
            GameGlobals.uiFunctions.updateCallouts("ul#list-items-perks");
		},

		updateResources: function () {
            if (!this.playerStatsNodes.head) return;
            var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
            var inCamp = playerPosition.inCamp;
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var showResources = this.getShowResources();
			var showResourceAcc = this.getShowResourceAcc();
			var storageCap = GameGlobals.resourcesHelper.getCurrentStorageCap();
			var showStorageName = GameGlobals.resourcesHelper.getCurrentStorageName();
			var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
			var inventoryUnlocked = false;

            GameGlobals.uiFunctions.toggle("#header-camp-storage", inCamp);
            GameGlobals.uiFunctions.toggle("#header-camp-currency", inCamp && GameGlobals.gameState.unlockedFeatures.currency);
            GameGlobals.uiFunctions.toggle("#statsbar-resources", inCamp);
            GameGlobals.uiFunctions.toggle("#header-bag-storage", !inCamp && GameGlobals.gameState.unlockedFeatures.bag);
            GameGlobals.uiFunctions.toggle("#header-bag-currency", !inCamp && currencyComponent.currency > 0);
            GameGlobals.uiFunctions.toggle("#bag-resources", !inCamp);
            $("#header-camp-container").toggleClass("hidden", !inCamp && !GameGlobals.gameState.unlockedFeatures.bag && itemsComponent.getAll().length == 0 && showResources.getTotal() === 0);

            $("#header-camp-currency .value").text(currencyComponent ? currencyComponent.currency : "??");
            $("#header-bag-currency .value").text(currencyComponent ? currencyComponent.currency : "??");

			for (var key in resourceNames) {
				var name = resourceNames[key];
                var currentAmount = showResources.getResource(name);
				var resourceUnlocked = GameGlobals.gameState.unlockedFeatures.resources[name] === true || currentAmount > 0;
				inventoryUnlocked = inventoryUnlocked || resourceUnlocked;
                if (inCamp) {
                    UIConstants.updateResourceIndicator(
                        "#resources-" + name,
                        Math.floor(currentAmount),
                        showResourceAcc == null ? 0 : Math.round(showResourceAcc.resourceChange.getResource(name) * 10000) / 10000,
                        storageCap,
                        false,
                        true,
                        true,
                        true,
                        name === resourceNames.food || name === resourceNames.water,
                        resourceUnlocked
                    );
                    if (showResourceAcc) {
                        UIConstants.updateResourceIndicatorCallout("#resources-" + name, showResourceAcc.getSources(name));
                    }
                    $("#header-camp-storage .label").text(showStorageName);
                    $("#header-camp-storage .value").text(storageCap);
                } else {
                    var isSupplies = name === resourceNames.food || name === resourceNames.water;
                    UIConstants.updateResourceIndicator(
                        "#resources-bag-" + name,
                        Math.floor(currentAmount),
                        showResourceAcc == null ? 0 : Math.round(showResourceAcc.resourceChange.getResource(name) * 10000) / 10000,
                        storageCap,
                        false,
                        false,
                        false,
                        false,
                        name === resourceNames.food || name === resourceNames.water,
                        resourceUnlocked && (name === "water" || name === "food" || showResources.getResource(name) > 0)
                    );

                    var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
                    $("#header-bag-storage .value").text(Math.floor(bagComponent.usedCapacity * 10) / 10);
                    $("#header-bag-storage .value-total").text(storageCap);
                }
			}
		},

        updateItemStats: function (inCamp) {
            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var playerStamina = this.playerStatsNodes.head.stamina;
            var visibleStats = 0;
            for (var bonusKey in ItemConstants.itemBonusTypes) {
                var bonusType = ItemConstants.itemBonusTypes[bonusKey];
                var bonus = itemsComponent.getCurrentBonus(bonusType);
                var value = bonus;
                var detail = itemsComponent.getCurrentBonusDesc(bonusType);
                var isVisible = true;
                switch (bonusType) {
                    case ItemConstants.itemBonusTypes.fight_att:
                        value = FightConstants.getPlayerAtt(playerStamina, itemsComponent);
                        detail = FightConstants.getPlayerAttDesc(playerStamina, itemsComponent);
                        isVisible = GameGlobals.gameState.unlockedFeatures.fight;
                        break;

                    case ItemConstants.itemBonusTypes.fight_def:
                        value = FightConstants.getPlayerDef(playerStamina, itemsComponent);
                        detail = FightConstants.getPlayerDefDesc(playerStamina, itemsComponent);
                        isVisible = GameGlobals.gameState.unlockedFeatures.fight;
                        break;

                    case ItemConstants.itemBonusTypes.light:
                    case ItemConstants.itemBonusTypes.bag:
                        isVisible = false;
                        break;

                    default:
                        isVisible = true;
                        break;
                }
                $("#stats-equipment-" + bonusKey + " .value").text(UIConstants.roundValue(value, true, true));
                GameGlobals.uiFunctions.toggle("#stats-equipment-" + bonusKey, isVisible && value > 0);
                UIConstants.updateCalloutContent("#stats-equipment-" + bonusKey, detail);

                if (isVisible && value > 0)
                    visibleStats++;
            }

            GameGlobals.uiFunctions.toggle("#header-self-bar > hr", visibleStats > 0)
        },

		updateGameMsg: function () {
			if (this.engine) {
				var gameMsg = "";
				var saveSystem = this.engine.getSystem(SaveSystem);
				var timeStamp = new Date().getTime();

                if (saveSystem && saveSystem.error)
                    gameMsg = saveSystem.error;
				else if (saveSystem && saveSystem.lastSaveTimeStamp > 0 && timeStamp - saveSystem.lastSaveTimeStamp < 3 * 1000)
					gameMsg = "Game saved ";

				if (this.autoPlayNodes.head) gameMsg += "Autoplaying";
                if (GameGlobals.gameState.isPaused) gameMsg += "Paused";

                if (this.lastGameMsg !== gameMsg) {
                    this.elements.gameMsg.text(gameMsg);
                    this.lastGameMsg = gameMsg;
                }
			}
		},

		updateNotifications: function (inCamp) {
            var isBusy = false;
            if (inCamp) {
                var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
                isBusy = this.playerStatsNodes.head.entity.has(PlayerActionComponent) && busyComponent.isBusy();
                if (isBusy) {
                    $("#notification-player-bar").data("progress-percent", busyComponent.getBusyPercentage());
                    $("#notification-player-bar .progress-label").text(busyComponent.getBusyDescription());
                }
            }
            GameGlobals.uiFunctions.toggle("#notification-player", inCamp && isBusy);
		},

        updateLocation: function () {
            if (!this.currentLocationNodes.head) return;
            var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var inCamp = playerPosition.inCamp;

			this.elements.body.toggleClass("location-inside", inCamp);
			this.elements.body.toggleClass("location-outside", !inCamp);

            var featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
            var sunlit = featuresComponent.sunlit;
            var imgName = "img/ui-" + (inCamp ? "camp" : "explore") + (sunlit ? "" : "-dark") + ".png";
            if ($("#header-self-inout img").attr("src") !== imgName)
                $("#header-self-inout img").attr("src", imgName);
            $("#header-self-inout img").attr("alt", (inCamp ? "in camp" : "outside"));
            $("#header-self-inout img").attr("title", (inCamp ? "in camp" : "outside"));
            $("#header-self-inout img").toggleClass("rotate-on-hover", !inCamp);

            var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var hasMap = itemsComponent.getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) > 0;
            $("#out-position-indicator").text(hasMap ? this.currentLocationNodes.head.entity.get(PositionComponent).getPosition().getInGameFormat(false) : "??");
        },

        updateTabVisibility: function () {
            var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var isInCamp = playerPosition.inCamp;
            GameGlobals.uiFunctions.slideToggleIf("#main-header-camp", null, isInCamp, 250, 50);
            GameGlobals.uiFunctions.slideToggleIf("#main-header-bag", null, !isInCamp, 250, 50);
            GameGlobals.uiFunctions.slideToggleIf("#main-header-equipment", null, !isInCamp, 250, 50);
            GameGlobals.uiFunctions.slideToggleIf("#main-header-items", null, !isInCamp, 250, 50);
            GameGlobals.gameState.uiStatus.isInCamp = isInCamp;
        },

        updateStaminaWarningLimit: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.staminaWarningLimit = PlayerStatConstants.getStaminaWarningLimit(this.playerStatsNodes.head.stamina);
        },

        updateHeaderTexts: function () {
            if (!this.currentLocationNodes.head) return;
            var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
            var isInCamp = playerPosition.inCamp;
            var headerText = isInCamp && campComponent ? campComponent.getName() + "  (level " + playerPosition.level + ")" : "level " + playerPosition.level;
            this.elements.locationHeader.text(headerText);

            var showCalendar = this.tribeNodes.head.upgrades.hasUpgrade(GameGlobals.upgradeEffectsHelper.getUpgradeIdForUIEffect(UpgradeConstants.upgradeUIEffects.calendar));
            GameGlobals.uiFunctions.toggle(this.elements.date, showCalendar);
            GameGlobals.uiFunctions.toggle("#grid-tab-header", GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.out || isInCamp);

            this.elements.date.text(UIConstants.getInGameDate(GameGlobals.gameState.gamePlayedSeconds));
        },

        updateVisionStatus: function () {
            if (!this.currentLocationNodes.head) return;
            
            // update sunlit/dark
			var featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sunlit = featuresComponent.sunlit;
            if (GameGlobals.gameState.uiStatus.forceSunlit) sunlit = true;
            if (GameGlobals.gameState.uiStatus.forceDark) sunlit = false;
			this.elements.body.toggleClass("sunlit", sunlit);
			this.elements.body.toggleClass("dark", !sunlit);
            
            // update elements affected by vision
            var visionFactor = this.playerStatsNodes.head.vision.value;
            visionFactor = Math.max(0, visionFactor);
            visionFactor = Math.min(100, visionFactor);
            var visionStep = Math.round(visionFactor / 10);
            UIState.refreshState(this, "vision-step", visionStep, function () {
                for (var i = 0; i <= 10; i++) {
		             this.elements.body.toggleClass("vision-step-" + i, i == visionStep);
                }
            });
        },
        
        isResting: function () {
            var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
            return busyComponent && busyComponent.getLastActionName() == "use_in_home";
        },

		getShowResources: function () {
			return GameGlobals.resourcesHelper.getCurrentStorage().resources;
		},

		getShowResourceAcc: function () {
			return GameGlobals.resourcesHelper.getCurrentStorageAccumulation(false);
		},

        onPlayerMoved: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateTabVisibility();
            this.updateStaminaWarningLimit();
            this.updateLocation();
            this.updateHeaderTexts();
            this.updateResources();
        },

        onHealthChanged: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateStaminaWarningLimit();
            this.updatePlayerStats();
        },
        
        onTribeStatsChanged: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updatePlayerStats();
        },

        onInventoryChanged: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateResources();
            this.updatePlayerStats();
        },

		onVisionChanged: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateVisionStatus();
		},

		onTabChanged: function () {
		    if (GameGlobals.gameState.uiStatus.isHidden) return;
            this.updateVisionStatus();
            this.updateHeaderTexts();
		},
        
        onPerksChanged: function () {
            this.refreshPerks();
        },
        
        onGameShown: function () {
            this.updateTabVisibility();
            this.updateStaminaWarningLimit();
            this.updateLocation();
            this.updateHeaderTexts();
            this.updateResources();
            this.updateVisionStatus();
            this.updatePlayerStats();
        }
    });

    return UIOutHeaderSystem;
});
