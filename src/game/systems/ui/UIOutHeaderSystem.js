define([
	'ash',
	'text/Text',
	'utils/MathUtils',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/ColorConstants',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/LevelConstants',
	'game/constants/UIConstants',
	'game/constants/ExplorerConstants',
	'game/constants/ItemConstants',
	'game/constants/FightConstants',
	'game/constants/PerkConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PlayerStatConstants',
	'game/systems/SaveSystem',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/player/DeityNode',
	'game/components/player/BagComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/common/MovementComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/ReputationComponent',
	'game/components/type/LevelComponent',
	'utils/UIState',
	'utils/UIAnimations'
], function (Ash,
	Text,
	MathUtils,
	UIList, 
	GameGlobals, GlobalSignals, 
	ColorConstants, GameConstants, CampConstants, LevelConstants, UIConstants, ExplorerConstants, ItemConstants, FightConstants, PerkConstants, UpgradeConstants, PlayerStatConstants,
	SaveSystem,
	PlayerStatsNode, PlayerLocationNode, TribeUpgradesNode, DeityNode,
	BagComponent,
	ItemsComponent,
	PlayerActionComponent,
	PositionComponent,
	CampComponent,
	MovementComponent,
	SectorFeaturesComponent,
	SectorImprovementsComponent,
	ReputationComponent,
	LevelComponent,
	UIState,
	UIAnimations
) {
	let UIOutHeaderSystem = Ash.System.extend({
		
		context: "UIOutHeaderSystem",

		playerStatsNodes: null,
		deityNodes: null,
		tribeNodes: null,
		currentLocationNodes: null,
		engine: null,
		
		previousShownCampResAmount: {},
		previousStats: {},
		previousStatsUpdates: {},
		
		currentThemeTransitionID: null,
		currentThemeTransitionTargetValue: null,

		pendingResourceUpdateTime: null, // if not null, a resource update has been queued (can be used to trigger update immediately or after a delay)
		pendingResourceBarUpdateTime: null, 
		
		SCAVENGE_BONUS_TYPES: [
			{ itemBonusType: ItemConstants.itemBonusTypes.scavenge_general, displayName: "general", containerID: "scavenge-bonus-general" },
			{ itemBonusType: ItemConstants.itemBonusTypes.scavenge_ingredients, displayName: "ingredients", containerID: "scavenge-bonus-ingredients" },
			{ itemBonusType: ItemConstants.itemBonusTypes.scavenge_supplies, displayName: "supplies", containerID: "scavenge-bonus-supplies" },
		],

		constructor: function () {
			this.initElements();
			
			this.elements = {};
			this.elements.body = $("body");
			this.elements.locationHeader = $("#grid-location-header h1");
			this.elements.gameMsg = $("#game-msg")
			this.elements.gameVersion = $("#game-version");

			this.elements.statIndicatorVision = $(".stat-indicator-vision");
			this.elements.valVision = $(".stat-indicator-vision .value");
			this.elements.changeIndicatorVision = $(".change-indicator-vision");

			this.elements.statIndicatorStamina = $(".stat-indicator-stamina");
			this.elements.valStamina = $(".stat-indicator-stamina .value");
			this.elements.changeIndicatorStamina = $(".change-indicator-stamina");

			this.elements.statIndicatorHealth = $(".stat-indicator-health");
			this.elements.valHealth = $(".stat-indicator-health .value");
			this.elements.changeIndicatorHealth = $(".change-indicator-health");

			this.elements.statIndicatorEvidence = $(".stat-indicator-evidence");
			this.elements.valEvidence = $(".stat-indicator-evidence .value");
			this.elements.changeIndicatorEvidence = $(".change-indicator-evidence");

			this.elements.statIndicatorRumours = $(".stat-indicator-rumours");
			this.elements.valRumours = $(".stat-indicator-rumours .value");
			this.elements.changeIndicatorRumours = $(".change-indicator-rumours");

			this.elements.statIndicatorHope = $(".stat-indicator-hope");
			this.elements.valHope = $(".stat-indicator-hope .value");
			this.elements.changeIndicatorHope = $(".change-indicator-hope");

			this.elements.statIndicatorInsight = $(".stat-indicator-insight");
			this.elements.valInsight = $(".stat-indicator-insight .value");
			this.elements.changeIndicatorInsight = $(".change-indicator-insight");

			this.elements.valReputation = $(".header-camp-reputation .value");
			this.elements.changeIndicatorReputation = $(".header-camp-reputation .change-indicator");
			this.elements.changeIndicatorPopulation = $(".header-camp-population .change-indicator");
			
			this.elements.notificationContainer = $(".notification-player");
			this.elements.notificationBar = $(".notification-player-bar");
			this.elements.notificationLabel = $(".notification-player-bar .progress-label");

			this.pendingResourceUpdateTime = null;
			this.pendingResourceBarUpdateTime = null;
			
			this.updateLayoutMode();

			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.deityNodes = engine.getNodeList(DeityNode);
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.currentLocationNodes = engine.getNodeList(PlayerLocationNode);

			let sys = this;
			GlobalSignals.playerEnteredCampSignal.add(function () { sys.onPlayerEnteredCamp(); });
			GlobalSignals.playerLeftCampSignal.add(function () { sys.onPlayerLeftCamp(); });
			GlobalSignals.actionStartingSignal.add(function () { sys.onActionStarting(); });
			GlobalSignals.actionStartedSignal.add(function () { sys.onInventoryChanged(); });
			GlobalSignals.visionChangedSignal.add(function () { sys.onVisionChanged(); });
			GlobalSignals.tabChangedSignal.add(function () { sys.onTabChanged(); });
			GlobalSignals.healthChangedSignal.add(function () { sys.onHealthChanged(); });
			GlobalSignals.tribeStatsChangedSignal.add(function () { sys.onTribeStatsChanged(); });
			GlobalSignals.inventoryChangedSignal.add(function () { sys.onInventoryChanged(); });
			GlobalSignals.equipmentChangedSignal.add(function () { sys.onEquipmentChanged(); });
			GlobalSignals.explorersChangedSignal.add(function () { sys.onExplorersChanged(); });
			GlobalSignals.actionCompletedSignal.add(function () { sys.onPlayerActionCompleted(); });
			GlobalSignals.elementCreatedSignal.add(function () { sys.onElementCreated(); });
			GlobalSignals.slowUpdateSignal.add(function () { sys.slowUpdate(); });
			GlobalSignals.visualUpdateSignal.add(function () { sys.visualUpdate(); });
			GlobalSignals.changelogLoadedSignal.add(function () { sys.updateGameVersion(); });
			GlobalSignals.add(this, GlobalSignals.playerMoveStartedSignal, this.onPlayerMoveStarted);
			GlobalSignals.add(this, GlobalSignals.playerLocationChangedSignal, this.onPlayerLocationChanged);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged);
			GlobalSignals.add(this, GlobalSignals.playerMoveCompletedSignal, this.onPlayerMoveCompleted);
			GlobalSignals.add(this, GlobalSignals.perksChangedSignal, this.onPerksChanged);
			GlobalSignals.add(this, GlobalSignals.storageCapacityChangedSignal, this.onStorageCapacityChanged);
			GlobalSignals.add(this, GlobalSignals.gameResetSignal, this.onGameReset);
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);
			GlobalSignals.add(this, GlobalSignals.levelTypeRevealedSignal, this.onLevelTypeRevealed);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
			GlobalSignals.add(this, GlobalSignals.workersAssignedSignal, this.queueResourceUpdate);
			GlobalSignals.add(this, GlobalSignals.launchCompletedSignal, this.onLaunchCompleted);
			GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
			GlobalSignals.add(this, GlobalSignals.windowResizedSignal, this.onWindowResized);

			this.generateStatsCallouts();
			this.updateGameVersion();
			this.updateVisionStatus();
			this.refreshPerks();
			
			this.updateLayoutMode();
			this.updateLayout();
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.engine = null;
			this.playerStatsNodes = null;
			this.deityNodes = null;
			this.currentLocationNodes = null;
		},
		
		initElements: function () {
			let statDiv = "";

			// tribe stats
			let tribeStatNames = [ "evidence", "rumours", "hope", "insight" ];
			for (let i = 0; i < tribeStatNames.length; i++) {
				let tribeStatName = tribeStatNames[i];
				let playerStatTextKey = "game.stats." + tribeStatName + "_name";
				statDiv = "";
				statDiv += "<div class='info-callout-target info-callout-target-small'>";
				statDiv += "<div class='stat-indicator stat-indicator-" + tribeStatName + "'>";
				statDiv += "<span class='label text-key' data-text-key='" + playerStatTextKey + "'></span>";
				statDiv += "<span class='value'>0</span>";
				statDiv += "<span class='change-indicator change-indicator-" + tribeStatName + "'><span>";
				statDiv += "</div>";
				statDiv += "</div>";
				$(".statsbar-tribe-stats").append(statDiv);
			}

			// player stats
			let playerStatNames = [ "vision", "health", "stamina", "scavenge-bonus" ];
			for (let i = 0; i < playerStatNames.length; i++) {
				let playerStatName = playerStatNames[i];
				let playerStatTextKey = "game.stats." + playerStatName + "_name";
				if (playerStatName == "scavenge") playerStatTextKey += "_short";

				statDiv = "";
				statDiv += "<div class='info-callout-target-small'>";
				statDiv += "<div class='stat-indicator-" + playerStatName + " stat-indicator'>";
				statDiv += "<span class='label text-key' data-text-key='" + playerStatTextKey + "'></span>";
				statDiv += "<div class='stats-value-container'>";
				statDiv += "<span class='value'>0</span>";
				statDiv += "<span class='change-indicator change-indicator-" + playerStatName + "'><span>";
				statDiv += "</div>";
				statDiv += "</div>";
				statDiv += "</div>";
				$(".player-stats-container").append(statDiv);
			}

			// equipment stats
			for (var bonusKey in ItemConstants.itemBonusTypes) {
				let bonusType = ItemConstants.itemBonusTypes[bonusKey];
				if (!this.showItemBonusTypeInEquipmentStats(bonusType)) continue;
				
				let bonusName = UIConstants.getItemBonusName(bonusType);
				let icons = UIConstants.getIconOrFallback(ItemConstants.getItemBonusIcons(bonusType));
				let div = "";
				div += "<div class='stats-equipment-" + bonusKey + " stat-indicator stat-indicator-secondary'>";
				div += "<img class='stat-icon img-themed' src='" + icons.dark + "' data-src-sunlit='" + icons.sunlit + "' alt='" + bonusName + "'/>";
				div += "<span class='value'/>";
				div += "</div>";
				
				$(".container-equipment-stats").append(div);
			}
		
			// scavenge stats
			let $container = $("#stats-scavenge-bonus");
			for (let i = 0; i < this.SCAVENGE_BONUS_TYPES.length; i++) {
				let bonus = this.SCAVENGE_BONUS_TYPES[i];
				let div = "<div id='" + bonus.containerID + "'>";
				div += "<span class='label'>" + bonus.displayName + "</span>";
				div += "<div class='stats-value-container'><span class='value'>0</span></div>";
				div += "</div>";
				$container.append(div)
			}
			
			// themed icons (dark/light)
			this.updateThemedIconsCache();

			// vision-based dynamic background items
			this.initDynamicBackgroundItems();

			// perks list
			this.perksListDefault = UIList.create(this, $("#player-perks-list-regular"), this.createPerkListItem, this.updatePerkListItem, this.isPerkListItemDataSame, this.isPerkListItemDataUnchanged);
			this.perksListMobile = UIList.create(this, $("#player-perks-list-mobile"), this.createPerkListItem, this.updatePerkListItem, this.isPerkListItemDataSame, this.isPerkListItemDataUnchanged);
		},

		updateThemedIconsCache: function () {
			let themedIcons = [];
			$.each($("img.img-themed"), function () {
				let pathSunlit =  $(this).attr("data-src-sunlit");
				let pathDark = $(this).attr("data-src-dark") || $(this).attr("src");
				themedIcons.push({
					$elem: $(this),
					pathSunlit: pathSunlit,
					pathDark: pathDark,
				});
			});
			
			this.themedIcons = themedIcons;
		},

		initDynamicBackgroundItems: function () {
			let isSunlit = $("body").hasClass("sunlit");
			if (isSunlit) {
				log.w("can't init dynamic background items while sunlit theme is active");
				return;
			}

			let dynamicBackgroundItems = [];
			let init = function () {
				let background =  $(this).css("background");
				if (!background || background === "none") return;
				dynamicBackgroundItems.push({
					$elem: $(this),
					originalBackgroundDark: background
				});
			};
			$.each($(".vision-background"), init);
			$.each($(".lvl13-box-1"), init);
			$.each($(".lvl13-box-2"), init);

			this.dynamicBackgroundItems = dynamicBackgroundItems;
		},

		generateStatsCallouts: function () {
			$.each($("#statsbar-self .stat-indicator"), function () {
				$(this).wrap("<div class='info-callout-target info-callout-target-small'></div>");
			});
			$.each($("#header-self-bar .stat-indicator"), function () {
				$(this).wrap("<div class='info-callout-target info-callout-target-small'></div>");
			});
			$.each($(".header-camp-storage"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			$.each($(".header-camp-reputation"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			$.each($(".header-camp-population"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
		},

		update: function (time) {
			if (!this.currentLocationNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			if (GameGlobals.gameState.isLaunchCompleted) {
				this.updateEndingView();
				return;
			}

			this.updateGameMsg();
			this.updateNotifications();
			this.updatePerks();

			// resource update outside of the regular visual update loop (when something needs feedback immediately or after a delay)
			if (this.pendingResourceUpdateTime != null) {
				this.pendingResourceUpdateTime -= time;
				if (this.pendingResourceUpdateTime <= 0) {
					this.updateResources();
					this.pendingResourceUpdateTime = null;
				}
			}
			
			if (this.pendingResourceBarUpdateTime != null) {
				this.pendingResourceBarUpdateTime -= time;
				if (this.pendingResourceBarUpdateTime <= 0) {
					this.updateResourcesBar();
					this.pendingResourceBarUpdateTime = null;
				}
			}
		},

		slowUpdate: function () {
			if (!this.currentLocationNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;

			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var isInCamp = playerPosition.inCamp;
			this.updateDeity();
			this.updateItems(false, isInCamp);
			this.updateItemStats();
			
			GameGlobals.uiFunctions.updateInfoCallouts("ul.player-perks-list");
		},

		visualUpdate: function () {
			this.updateResources();
			this.updatePlayerStats();
			this.updateCurrency();
		},
		
		updateGameVersion: function () {
			this.elements.gameVersion.text("v. " + GameGlobals.changeLogHelper.getCurrentVersionNumber());
		},

		updatePlayerStats: function () {
			if (GameGlobals.uiFunctions.popupManager.hasOpenPopup()) return;
			if (!this.currentLocationNodes.head) return;
			
			let isSmallLayout = this.elements.body.hasClass("layout-small");
			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var isInCamp = playerPosition.inCamp;
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
			var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			var playerStatsNode = this.playerStatsNodes.head;
			var playerStamina = playerStatsNode.stamina.stamina;
			var playerVision = playerStatsNode.vision.value;
			var maxVision = playerStatsNode.vision.maximum;
			var shownVision = UIConstants.roundValue(playerVision, true, false);
			var maxStamina = UIConstants.roundValue(playerStatsNode.stamina.maxStamina);
			var showStamina = UIConstants.roundValue(Math.min(playerStamina, maxStamina), true, false);
			var isResting = this.isResting();
			var isHealing = busyComponent && busyComponent.getLastActionName() == "use_in_hospital";

			GameGlobals.uiFunctions.toggle(this.elements.statIndicatorVision, !isSmallLayout || !isInCamp);
			this.elements.valVision.text(shownVision + " / " + maxVision);
			this.updateStatsCallout("Makes exploration safer and scavenging more effective", this.elements.statIndicatorVision, playerStatsNode.vision.accSources);
			this.updateChangeIndicator(this.elements.changeIndicatorVision, maxVision - shownVision, shownVision < maxVision);

			GameGlobals.uiFunctions.toggle(this.elements.statIndicatorHealth, !isSmallLayout);
			this.elements.valHealth.text(Math.round(playerStatsNode.stamina.health));
			this.updateHealthStatCallout("Determines maximum stamina", this.elements.statIndicatorHealth);
			let healthAccumulation = playerStatsNode.stamina.healthAccumulation;
			this.updateChangeIndicator(this.elements.changeIndicatorHealth, healthAccumulation, healthAccumulation != 0, false);

			GameGlobals.uiFunctions.toggle($("#stats-stamina"), GameGlobals.gameState.unlockedFeatures.scavenge);
			this.elements.valStamina.text(showStamina + " / " + maxStamina);
			this.updateStatsCallout("Required for exploration", this.elements.statIndicatorStamina, playerStatsNode.stamina.accSources);
			this.updateChangeIndicator(this.elements.changeIndicatorStamina, playerStatsNode.stamina.accumulation, playerStamina < maxStamina, isResting || isHealing);

			this.elements.valVision.toggleClass("warning", playerVision <= 25);
			this.elements.valStamina.toggleClass("warning", playerStamina <= this.staminaWarningLimit);
			this.elements.valHealth.toggleClass("warning", playerStatsNode.stamina.health <= 25);
			
			let showEvidence = GameGlobals.gameState.unlockedFeatures.evidence;
			let showRumours = playerStatsNode.rumours.value > 0 || playerStatsNode.rumours.isAccumulating;
			let showHope = playerStatsNode.hope.hope > 0 || GameGlobals.gameState.unlockedFeatures.hope;
			let hasDeity = GameGlobals.tribeHelper.hasDeity();
			let hasInsight = playerStatsNode.insight.value > 0;
			
			this.updatePlayerStat("rumours", playerStatsNode.rumours, showRumours, playerStatsNode.rumours.value, playerStatsNode.rumours.maxValue, false, this.elements.valRumours, this.elements.changeIndicatorRumours);
			this.updatePlayerStat("evidence", playerStatsNode.evidence, showEvidence, playerStatsNode.evidence.value, playerStatsNode.evidence.maxValue, false, this.elements.valEvidence, this.elements.changeIndicatorEvidence);
			this.updatePlayerStat("hope", playerStatsNode.hope, showHope, playerStatsNode.hope.hope, playerStatsNode.hope.maxHope, false, this.elements.valHope, this.elements.changeIndicatorHope);
			this.updatePlayerStat("insight", playerStatsNode.insight, hasInsight, playerStatsNode.insight.value, playerStatsNode.insight.maxValue, false, this.elements.valInsight, this.elements.changeIndicatorInsight);

			GameGlobals.uiFunctions.toggle($(".statsbar-tribe-stats"), showEvidence || showRumours || hasDeity || hasInsight);

			var improvements = this.currentLocationNodes.head.entity.get(SectorImprovementsComponent);
			var maxPopulation = CampConstants.getHousingCap(improvements);
			var reputationComponent = this.currentLocationNodes.head.entity.get(ReputationComponent);
			if (isInCamp && campComponent && reputationComponent && maxPopulation > 0) {
				var reqReputationCurrent = CampConstants.getRequiredReputation(Math.floor(campComponent.population));
				var reqReputationNext = CampConstants.getRequiredReputation(Math.floor(campComponent.population) + 1);

				this.elements.valReputation.text(UIConstants.roundValue(reputationComponent.value, true, true) + " / " + UIConstants.roundValue(reputationComponent.targetValue, true, true));
				this.updateChangeIndicator(this.elements.changeIndicatorReputation, reputationComponent.accumulation, true);
				let reputationCalloutContent = Text.t("ui.tribe.current_reputatiion_description");
				reputationCalloutContent += "<hr>";
				for (let i in reputationComponent.targetValueSources) {
					let source = reputationComponent.targetValueSources[i];
					if (source.amount !== 0) {
						reputationCalloutContent += this.getTargetValueSourceText(source);
					}
				}
				this.elements.valReputation.toggleClass("warning", reputationComponent.value < reqReputationCurrent);
				UIConstants.updateCalloutContent($(".header-camp-reputation"), reputationCalloutContent);

				$(".header-camp-population .value").text(Math.floor(campComponent.population) + " / " + maxPopulation);
				this.updateChangeIndicator(this.elements.changeIndicatorPopulation, campComponent.populationChangePerSecWithoutCooldown, maxPopulation > 0);
				var populationCalloutContent = "Required reputation:<br/>";
				populationCalloutContent += "current: " + reqReputationCurrent + "<br/>";
				populationCalloutContent += "next: " + reqReputationNext;
				UIConstants.updateCalloutContent($(".header-camp-population"), populationCalloutContent);
				GameGlobals.uiFunctions.toggle(".header-camp-population", true);
				GameGlobals.uiFunctions.toggle(".header-camp-reputation", true);
			} else {
				GameGlobals.uiFunctions.toggle(".header-camp-population", false);
				GameGlobals.uiFunctions.toggle(".header-camp-reputation", false);
			}
			
			let isOnLevelPage = GameGlobals.gameState.uiStatus.currentTab == GameGlobals.uiFunctions.elementIDs.tabs.out;
			let showScavangeAbility = false;//GameGlobals.gameState.unlockedFeatures.scavenge && !isInCamp && isOnLevelPage;
			this.updateScavengeBonus(showScavangeAbility);
		},
		
		getTargetValueSourceText: function (source) {
			let amount = Math.round(source.amount * 10000)/10000;
			if (amount === 0 && source.amount > 0) {
				amount = "< 0.0001";
			}
			let displayValue = amount;
			if (source.isPercentage && source.percentageValue) {
				displayValue = (source.amount > 0 ? "+" : "") + Math.round(source.percentageValue) + "%";
			}
			return source.source + ": " + displayValue + "<br/>";
		},
		
		updateScavengeBonus: function (showScavangeAbility) {
			let scavengeBonusTotal = 0;
			let scavengeBonusByType = {};
			for (let i = 0; i < this.SCAVENGE_BONUS_TYPES.length; i++) {
				let val = (GameGlobals.playerHelper.getCurrentBonus(this.SCAVENGE_BONUS_TYPES[i].itemBonusType) - 1) * 100;
				scavengeBonusTotal += val;
				scavengeBonusByType[this.SCAVENGE_BONUS_TYPES[i].itemBonusType] = val;
			}
			let showScavengeBonus = showScavangeAbility && scavengeBonusTotal > 0;
			GameGlobals.uiFunctions.toggle(".stat-indicator-scavenge-bonus", showScavengeBonus);
			if (showScavengeBonus > 0) {
				let scavengeBonusCallout = "";
				for (let i = 0; i < this.SCAVENGE_BONUS_TYPES.length; i++) {
					let bonus = this.SCAVENGE_BONUS_TYPES[i];
					let value = scavengeBonusByType[bonus.itemBonusType];
					let $container = $("#" + bonus.containerID);
					GameGlobals.uiFunctions.toggle($container, value > 0);
					$container.find(".value").text(Math.round(value) + "%");
					
					let party = this.playerStatsNodes.head.explorers.getParty();
					for (let j = 0; j < party.length; j++) {
						let explorer = party[j];
						let explorerContribution = ExplorerConstants.getExplorerItemBonus(explorer, party, bonus.itemBonusType);
						if (explorerContribution > 0) {
							scavengeBonusCallout += explorer.name + ": +" + Math.round(explorerContribution * 100 - 100) + "%";
						}
					}
					scavengeBonusCallout += "";
				}
				UIConstants.updateCalloutContent($(".stat-indicator-scavenge-bonus"), scavengeBonusCallout);
			}
		},
		
		updatePlayerStat: function (stat, component, isVisible, currentValue, currentLimit, flipNegative, valueElement, changeIndicatorElement) {
			let $container = $(".stat-indicator-" + stat);
			GameGlobals.uiFunctions.toggle($container, isVisible);
			if (!isVisible) return;

			let displayValue = Math.floor(currentValue);
			
			let isSmallLayout = this.elements.body.hasClass("layout-small");
			let isAtLimit = currentLimit > 0 && currentValue >= currentLimit;
			
			let now = GameGlobals.gameState.gameTime;
			let previousValue = this.previousStats[stat] || 0;
			let previousUpdate = this.previousStatsUpdates[stat] || 0;
			let suffix = isSmallLayout ? "" : " / " + currentLimit;
		
			$container.children(".value").toggleClass("warning", isAtLimit);

			let isAnimating = UIAnimations.isActivelyAnimating(valueElement, previousUpdate, now);
			if (isAnimating) return;

			let animate = UIAnimations.shouldAnimateChange(previousValue, currentValue, previousUpdate, now, component.accumulation);
			UIAnimations.animateOrSetNumber(valueElement, animate, displayValue, suffix, flipNegative, (v) => { return Math.floor(v); });
			
			this.updateStatsCallout("", $container, component.accSources);
			this.updateChangeIndicator(changeIndicatorElement, component.accumulation, isVisible && !isAtLimit);
			this.previousStats[stat] = currentValue;
			this.previousStatsUpdates[stat] = now;
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

		updateHealthStatCallout: function (description, $indicatorElem) {
			let perksComponent = this.playerStatsNodes.head.perks;
			let modifiers = "";
			
			let perks = perksComponent.getAll();
			for (let i = 0; i < perks.length; i++) {
				let perkVO = perks[i];
				switch (perkVO.type) {
					case PerkConstants.perkTypes.injury:
					case PerkConstants.perkTypes.health:
						modifiers += this.getPerkDescription(perkVO) + "<br/>";
						break;
				}
			}
			
			let content = description + (description && modifiers ? "<hr/>" : "") + modifiers;
			
			UIConstants.updateCalloutContent($indicatorElem, content);
		},

		updateStatsCallout: function (description, $indicatorElem, changeSources, hideNumbers) {
			var sources = "";
			var source;
			var total = 0;
			for (let i in changeSources) {
				source = changeSources[i];
				if (source.amount != 0) {
					if (hideNumbers) {
						sources += source.source + "<br/>";
					} else {
						var amount = Math.round(source.amount * 1000)/1000;
						if (amount == 0 && source.amount > 0) {
							amount = "<&nbsp;" + (1/1000);
						}
						sources += source.source + ": " + amount + "/s<br/>";
						total+= source.amount;
					}
				}
			}

			if (sources.length <= 0) {
				sources = "(no change)";
			}
			
			var content = description + (description && sources ? "<hr/>" : "") + sources;
			
			if (!hideNumbers) {
				var totals = "Total: " + Math.round(total * 10000)/10000 + "/s";
				content += (total > 0 ? ("<hr/>" + totals) : "");
			}
			
			UIConstants.updateCalloutContent($indicatorElem, content);
		},

		updateDeity: function () {
			let hasDeity = GameGlobals.tribeHelper.hasDeity();
			GameGlobals.uiFunctions.toggle(".statsbar-deity", hasDeity);
			if (hasDeity) {
				$(".deity-name").text(this.deityNodes.head.deity.deityName || "?");
			}
		},

		updateItems: function (forced, inCamp) {
			GameGlobals.uiFunctions.toggle("#list-header-items-mobile", !inCamp);
			if (inCamp) return;

			let itemsComponent = this.playerStatsNodes.head.items;
			let items = itemsComponent.getUniqueByID(inCamp);
			
			if (forced || items.length !== this.lastItemsUpdateItemCount) {
				$("ul.list-header-items").empty();
				for (let i = 0; i < items.length; i++) {
					var item = items[i];
					var count = itemsComponent.getCount(item, inCamp);
					switch (item.type) {
						case ItemConstants.itemTypes.bag:
						case ItemConstants.itemTypes.clothing_over:
						case ItemConstants.itemTypes.clothing_upper:
						case ItemConstants.itemTypes.clothing_lower:
						case ItemConstants.itemTypes.clothing_head:
						case ItemConstants.itemTypes.clothing_hands:
						case ItemConstants.itemTypes.shoes:
						case ItemConstants.itemTypes.light:
						case ItemConstants.itemTypes.weapon:
							break;
							
						case ItemConstants.itemTypes.voucher:
						case ItemConstants.itemTypes.exploration:
						case ItemConstants.itemTypes.note:
							$("ul.list-header-items").append("<li>" + UIConstants.getItemDiv(itemsComponent, item, null, UIConstants.getItemCallout(item, true)) + "</li>");
							break;
					}
				}

				GameGlobals.uiFunctions.generateInfoCallouts("ul.list-header-items");

				this.lastItemsUpdateItemCount = items.length;
			}
		},
		
		updateExplorers: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			if (inCamp) return;
			
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let party = explorersComponent.getParty();
			
			$("ul.list-header-explorers").empty();
			for (let i = 0; i < party.length; i++) {
				let explorer = party[i];
				$("ul.list-header-explorers").append("<li>" + UIConstants.getExplorerDivSimple(explorer, true, false, true) + "</li>");
			}
			
			GameGlobals.uiFunctions.generateInfoCallouts("ul.list-header-explorers");
		},
		
		refreshPerks: function () {
			if (GameGlobals.gameState.isPaused) return;
			if (!this.playerStatsNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;

			let isSmallLayout = this.elements.body.hasClass("layout-small");

			let perksComponent = this.playerStatsNodes.head.perks;
			let perks = perksComponent.getAll();
			let perksList = isSmallLayout ? this.perksListMobile : this.perksListDefault;
			let newItems = UIList.update(perksList, perks);

			this.handleNewPerks(newItems);
		},
		
		refreshStatuses: function () {
			// status icons that look like perks but aren't actual perks internally (derived perks)
			if (!this.playerStatsNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			let $container = $(".player-statuses-list");
			$container.empty();
			
			let statuses = [];
			
			if (GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.detect_hazards) > 0) {
				statuses.push({ name: "Hazard foresight", icon: "img/status-hazard-prediction.png", isNegative: false });
			}
			
			if (GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.detect_supplies) > 0) {
				statuses.push({ name: "Supplies detection", icon: "img/status-supplies-prediction.png", isNegative: false });
			}
			
			if (GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.detect_ingredients) > 0) {
				statuses.push({ name: "Ingredients detection", icon: "img/status-ingredients-prediction.png", isNegative: false });
			}
			
			if (GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.detect_poi) > 0) {
				statuses.push({ name: "POI detection", icon: "img/status-poi-prediction.png", isNegative: false });
			}
			
			for (let i = 0; i < statuses.length; i++) {
				var status = statuses[i];
				var isNegative = status.isNegative;
				var liClass = isNegative ? "li-item-negative" : "li-item-positive";
				liClass += " item item-equipped";
				var li =
					"<li class='" + liClass + "'>" +
					"<div class='info-callout-target info-callout-target-side' description='" + status.name + "'>" +
					"<img src='" + status.icon + "' alt='" + status.name + "'/>" +
					"</div></li>";
				$container.append(li);
			}

			GameGlobals.uiFunctions.generateInfoCallouts(".player-statuses-list");
		},

		updatePerks: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;

			let isSmallLayout = this.elements.body.hasClass("layout-small");

			let perksComponent = this.playerStatsNodes.head.perks;
			let perks = perksComponent.getAll();

			let perksList = isSmallLayout ? this.perksListMobile : this.perksListDefault;
			let sunlit = this.elements.body.hasClass("sunlit");
			let themeChanged = sunlit != this.lastPerkUpdateSunlit;
			let newItems = UIList.update(perksList, perks, themeChanged);

			this.handleNewPerks(newItems);

			this.lastPerkUpdateSunlit = sunlit;
		},

		handleNewPerks: function (newItems) {
			for (let i = 0; i < newItems.length; i++) {
				newItems[i].$root.toggle(false);
				newItems[i].$root.fadeIn(500);
			}

			if (newItems.length > 0) {
				GameGlobals.uiFunctions.generateInfoCallouts(".player-perks-list");
			}
		},
		
		createPerkListItem: function () {
			let li = {};
			li.$root = $("<li class='item item-equipped'><div class='info-callout-target'><img /></div></li>");
			li.$calloutTarget = li.$root.find("div");
			li.$icon = li.$root.find("img");

			return li;
		},
		
		updatePerkListItem: function (li, data) {
			let perk = data;

			let isSmallLayout = this.elements.body.hasClass("layout-small");
			let isResting = this.isResting();
			let now = new Date().getTime();
			let sunlit = this.elements.body.hasClass("sunlit");
			let isNegative = PerkConstants.isNegative(perk);
			let backgroundColor = ColorConstants.getColor(sunlit, "bg_box_1");
			
			let fillColor = isNegative ? ColorConstants.getColor(sunlit, "bg_warning_stronger") : ColorConstants.getColor(sunlit, "bg_element_1");
			let warningPercentage = perk.removeTimer > 0 ? 
				perk.effectFactor * 100:
				PerkConstants.getPerkActivePercent(perk) * 100;
			
			let backgroundValue = "conic-gradient(" + fillColor + " " + warningPercentage + "%, " + backgroundColor + " 0%)";

			li.$root.toggleClass("li-item-negative", isNegative);
			li.$root.toggleClass("li-item-positive", !isNegative);
			li.$root.attr("data-percentage", warningPercentage);
			li.$root.css("background", warningPercentage > 0 ? backgroundValue : "initial");

			let desc = this.getPerkDescription(perk, isResting);
			li.$calloutTarget.attr("description", desc);
			li.$calloutTarget.toggleClass("event-starting", perk.startTimer >= 0);
			li.$calloutTarget.toggleClass("event-ending", perk.removeTimer >= 0 && perk.removeTimer < 5);
			li.$calloutTarget.toggleClass("info-callout-target-small", isSmallLayout);
			li.$calloutTarget.toggleClass("info-callout-target-side", !isSmallLayout);

			li.$icon.attr("src", perk.icon);
			li.$icon.attr("alt", perk.name);
		},
		
		isPerkListItemDataSame: function (d1, d2) {
			return d1.id == d2.id;
		},

		isPerkListItemDataUnchanged: function (d1, d2) {
			if (d1.startTimer != d2.startTimer) return false;
			if (d1.removeTimer != d2.removeTimer) return false;
			if (d1.effectFactor != d2.effectFactor) return false;
			return true;
		},
		
		getPerkDescription: function (perk, isResting) {
			let desc = perk.name;
			let detailText = UIConstants.getPerkDetailText(perk, isResting);
			if (detailText.length > 0) desc += " (" + detailText + ")";
			return desc;
		},
		
		queueResourceUpdate: function (delay) {
			delay = delay || 0;

			if (this.pendingResourceUpdateTime == null) {
				this.pendingResourceUpdateTime = delay;
			} else {
				this.pendingResourceUpdateTime = Math.max(this.pendingResourceUpdateTime, delay);
			}
		},

		
		queueResourceBarUpdate: function () {
			this.pendingResourceBarUpdateTime = 0;
		},

		// update visibility of various containers and other less often changing elements in the resources bar but not the resources amounts themselves
		updateResourcesBar: function () {
			let playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			let inCamp = playerPosition.inCamp;
			let isSmallLayout = this.elements.body.hasClass("layout-small");
			
			// camp
			GameGlobals.uiFunctions.toggle(".header-camp-storage", inCamp);
			GameGlobals.uiFunctions.toggle(".statsbar-resources", inCamp);
			if (inCamp) {
				let storageCap = GameGlobals.resourcesHelper.getCurrentStorageCap();
				$(".header-camp-storage .value").text(storageCap);

				let showStorageNameKey = GameGlobals.resourcesHelper.getCurrentStorageNameKey(isSmallLayout);
				UIConstants.updateCalloutContent(".header-camp-storage", "Amount of each resource that can be stored");
				GameGlobals.uiFunctions.setText(".header-camp-storage .label", showStorageNameKey);
			}

			// out
			
			GameGlobals.uiFunctions.toggle(".header-bag-storage", !inCamp && GameGlobals.gameState.unlockedFeatures.bag);
			GameGlobals.uiFunctions.toggle(".bag-resources", !inCamp);

			if (!inCamp) {
				let bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
				let bagUsedCapacityDisplayValue = Math.floor(bagComponent.usedCapacity * 10) / 10;
				let bagCapacityDisplayValue = UIConstants.getBagCapacityDisplayValue(bagComponent, true);
				$(".header-bag-storage .value").text(bagUsedCapacityDisplayValue);
				UIAnimations.animateOrSetNumber($(".header-bag-storage .value-total"), true, bagCapacityDisplayValue);
			}
		},

		updateCurrency: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			let currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();

			let currentCurrency = currencyComponent.currency || 0;
			
			GameGlobals.uiFunctions.toggle(".header-camp-currency", inCamp && currentCurrency > 0);
			GameGlobals.uiFunctions.toggle(".header-bag-currency", !inCamp && currentCurrency > 0);

			let $valueLabel = inCamp ? $(".header-camp-currency .value") : $(".header-bag-currency .value");
			UIAnimations.animateOrSetNumber($valueLabel, true, Math.round(currentCurrency || 0));
		},

		// update resource amounts in the resources bar
		// - forced: update even if update currently paused by pendingResourceUpdateTime and do not animate
		updateResources: function (forced) {
			if (!this.playerStatsNodes || !this.playerStatsNodes.head) return;
			if (!forced && this.pendingResourceUpdateTime > 0) return;
			if (!forced && GameGlobals.gameState.isPaused) return;

			let isSmallLayout = this.elements.body.hasClass("layout-small");

			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var inCamp = playerPosition.inCamp;
			var showResources = this.getShowResources();
			var showResourceAcc = this.getShowResourceAcc();
			var storageCap = GameGlobals.resourcesHelper.getCurrentStorageCap();
			var inventoryUnlocked = false;
			let now = GameGlobals.gameState.gameTime;
			let changedPosition = inCamp != this.lastResourceUpdateInCamp || this.lastResourceUpdateLevel != playerPosition.level;

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let currentAmount = showResources.getResource(name);
				let currentAccumulation = showResourceAcc.resourceChange.getResource(name);
				let isSupplies = name === resourceNames.food || name === resourceNames.water;
				let resourceUnlocked = GameGlobals.gameState.unlockedFeatures["resource_" + name] === true || currentAmount > 0 || isSupplies;
				inventoryUnlocked = inventoryUnlocked || resourceUnlocked;

				if (inCamp) {
					let isVisible = resourceUnlocked && !(currentAmount <= 0 && currentAccumulation <= 0 && this.canHideResource(name));
					let previousAmount = this.previousShownCampResAmount[name] || 0;
					let animate = !forced && !changedPosition && UIAnimations.shouldAnimateChange(previousAmount, currentAmount, this.lastCampResourceUpdate, now, currentAccumulation);
					let elemIDCamp = isSmallLayout ? "#resources-camp-mobile-" + name : "#resources-camp-regular-" + name;

					UIConstants.updateResourceIndicator(
						elemIDCamp,
						currentAmount,
						showResourceAcc == null ? 0 : Math.round(currentAccumulation * 10000) / 10000,
						storageCap,
						true,
						!isSmallLayout,
						!isSmallLayout,
						isSupplies,
						isVisible,
						animate,
						this.lastCampResourceUpdate,
						now
					);
					if (showResourceAcc) {
						UIConstants.updateResourceIndicatorCallout(elemIDCamp, name, showResourceAcc.getSources(name));
					}
					this.previousShownCampResAmount[name] = currentAmount;
				} else {
					let elemIDBag = isSmallLayout ? "#resources-bag-mobile-" + name : "#resources-bag-regular-" + name;
					let animate = !forced && !changedPosition;
					UIConstants.updateResourceIndicator(
						elemIDBag,
						currentAmount,
						showResourceAcc == null ? 0 : Math.round(showResourceAcc.resourceChange.getResource(name) * 10000) / 10000,
						storageCap,
						false,
						false,
						false,
						isSupplies,
						resourceUnlocked && (name === "water" || name === "food" || showResources.getResource(name) > 0),
						animate
					);
				}
			}
			
			if (inCamp) {
				this.lastCampResourceUpdate = now;
			}

			this.lastResourceUpdateInCamp = inCamp;
			this.lastResourceUpdateLevel = playerPosition.level;
		},
		
		canHideResource: function (name) {
			switch (name) {
				case resourceNames.food:
				case resourceNames.water:
				case resourceNames.metal:
				case resourceNames.rope:
				case resourceNames.herbs:
				case resourceNames.medicine:
					return false;
			}
			return true;
		},
		
		completeResourceAnimations: function () {
			for (var key in resourceNames) {
				let name = resourceNames[key];
				UIConstants.completeResourceIndicatorAnimations("#resources-bag-regular-" + name);
				UIConstants.completeResourceIndicatorAnimations("#resources-bag-mobile-" + name);
			}
		},

		updateItemStats: function (inCamp) {
			if (!this.currentLocationNodes.head) return;
			
			let itemsComponent = this.playerStatsNodes.head.items;
			let explorersComponent = this.playerStatsNodes.head.explorers;
			let playerStamina = this.playerStatsNodes.head.stamina;
			let visibleStats = 0;
			
			for (var bonusKey in ItemConstants.itemBonusTypes) {
				let bonusType = ItemConstants.itemBonusTypes[bonusKey];
				if (!this.showItemBonusTypeInEquipmentStats(bonusType)) continue;
				let bonusName = UIConstants.getItemBonusName(bonusType);
				let bonus = GameGlobals.playerHelper.getCurrentBonus(bonusType);
				let value = bonus;
				
				let detail = GameGlobals.playerHelper.getCurrentBonusDesc(bonusType);
				let isVisible = true;
				let flipNegative = false;
				
				switch (bonusType) {
					case ItemConstants.itemBonusTypes.fight_att:
						value = FightConstants.getPlayerAtt(playerStamina, itemsComponent, explorersComponent);
						detail = FightConstants.getPlayerAttDesc(playerStamina, itemsComponent, explorersComponent);
						isVisible = GameGlobals.gameState.unlockedFeatures.fight;
						break;

					case ItemConstants.itemBonusTypes.fight_def:
						value = FightConstants.getPlayerDef(playerStamina, itemsComponent, explorersComponent);
						detail = FightConstants.getPlayerDefDesc(playerStamina, itemsComponent, explorersComponent);
						isVisible = GameGlobals.gameState.unlockedFeatures.fight;
						break;

					case ItemConstants.itemBonusTypes.fight_shield:
						value = FightConstants.getPlayerShield(playerStamina, itemsComponent, explorersComponent);
						detail = FightConstants.getPlayerShieldDesc(playerStamina, itemsComponent, explorersComponent);
						isVisible = GameGlobals.gameState.unlockedFeatures.fight;
						break;
						
					case ItemConstants.itemBonusTypes.movement:
						value *= GameGlobals.sectorHelper.getBeaconMovementBonus(this.currentLocationNodes.head.entity, this.playerStatsNodes.head.perks);
						value *= GameGlobals.sectorHelper.getHazardsMovementMalus(this.currentLocationNodes.head.entity);
						value = Math.round(value * 10) / 10;
						isVisible = GameGlobals.gameState.unlockedFeatures.camp;
						flipNegative = true;
						break;
					
					case ItemConstants.itemBonusTypes.scavenge_cost:
					case ItemConstants.itemBonusTypes.scout_cost:
						isVisible = value != 1;
						value = Math.round(value * 10) / 10;
						flipNegative = true;
						break;

					default:
						isVisible = true;
						break;
				}
				
				let indicatorClass = "stats-equipment-" + bonusKey;
				let isElementVisible = isVisible && value != 0;
				let wasElementVisible = GameGlobals.uiFunctions.isElementToggled("." + indicatorClass);
				let animating = UIAnimations.animateNumber($("." + indicatorClass + " .value"), value, "", flipNegative, (v) => { return UIConstants.roundValue(v, true, true); });
				if (animating) {
					UIAnimations.animateIcon($("#" + indicatorClass + " img"));
				}
				let toggleDelay = wasElementVisible && animating ? UIAnimations.DEFAULT_ANIM_DURATION + 300 : 0;
				GameGlobals.uiFunctions.toggle("." + indicatorClass, isElementVisible, null, toggleDelay);
				UIConstants.updateCalloutContent("." + indicatorClass, bonusName + "<hr/>" + detail);

				if (isVisible && value > 0) visibleStats++;
			}

			GameGlobals.uiFunctions.toggle("#header-self-bar > hr", visibleStats > 0);
		},

		updateGameMsg: function () {
			if (!this.engine) return;
			let gameMsgKey = "";
			let saveSystem = this.engine.getSystem(SaveSystem);
			let timeStamp = new Date().getTime();

			if (saveSystem && saveSystem.error) {
				gameMsgKey = saveSystem.error;
			} else if (saveSystem && saveSystem.lastDefaultSaveTimestamp > 0 && timeStamp - saveSystem.lastDefaultSaveTimestamp < 3 * 1000) {
				gameMsgKey = "ui.meta.game_saved_message";
			} else if (GameGlobals.gameState.isPaused) {
				gameMsgKey = "ui.meta.game_paused_message";
			} else if (GameConstants.systemMessage) {
				gameMsgKey = GameConstants.systemMessage;
			}

			if (this.lastGameMsg !== gameMsgKey) {
				this.elements.gameMsg.text(Text.t(gameMsgKey));
				this.lastGameMsg = gameMsgKey;
			}
		},

		updateNotifications: function () {
			if (GameGlobals.gameState.isPaused) return;
			let busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			let isBusy = this.playerStatsNodes.head.entity.has(PlayerActionComponent) && busyComponent.isBusy();
			if (isBusy) {
				this.elements.notificationBar.data("progress-percent", busyComponent.getBusyPercentage());
				this.elements.notificationLabel.text(busyComponent.getBusyDescription());
			}
			GameGlobals.uiFunctions.toggle(this.elements.notificationContainer, isBusy);
		},

		updateLocation: function () {
			if (!this.currentLocationNodes.head) return;
			let playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			let inCamp = playerPosition.inCamp;

			this.elements.body.toggleClass("location-inside", inCamp);
			this.elements.body.toggleClass("location-outside", !inCamp);

			let featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);

			let hasMap = GameGlobals.playerHelper.hasItem("equipment_map");
			let positionText = "??";
			if (hasMap) {
				let showLevel = GameGlobals.gameState.unlockedFeatures.levels;
				positionText = this.currentLocationNodes.head.entity.get(PositionComponent).getPosition().getInGameFormat(showLevel, true);
			}
			$("#out-position-indicator").text("Position: " + positionText);
			
			this.updateLevelIcon();
		},
		
		updateLevelIcon: function (animate) {
			if (!this.currentLocationNodes.head) return;
			let playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			let inCamp = playerPosition.inCamp;
			
			let icon = this.getLevelIcon(inCamp, this.currentLocationNodes.head.entity);
			if ($("#level-icon").attr("src") !== icon.src)
				$("#level-icon").attr("src", icon.src);
			$("#level-icon").attr("alt", icon.desc);
			
			UIConstants.updateCalloutContent("#level-icon", icon.desc);
			
			if (animate) {
				UIAnimations.animateIcon($("#level-icon"), UIAnimations.LONG_ANIM_DURATION);
			}
		},

		updateLayoutMode: function () {
			let wasSmallLayout = this.elements.body.hasClass("layout-small");
			let isSmallLayout =  $(window).width() <= UIConstants.SMALL_LAYOUT_THRESHOLD;
			this.elements.body.toggleClass("layout-small", isSmallLayout);
			this.elements.body.toggleClass("layout-regular", !isSmallLayout);
			GameGlobals.uiFunctions.toggle(".debug-info", GameConstants.isDebugVersion);
			if (wasSmallLayout == isSmallLayout) return;
			GlobalSignals.layoutChangedSignal.dispatch();
			this.updateResources(true);
		},

		updateLayout: function () {
			let isSmallLayout = this.elements.body.hasClass("layout-small");
			let isInCamp = GameGlobals.playerHelper.isInCamp();
			let isInCampTab = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.camp;
			GameGlobals.uiFunctions.toggle("#mobile-header-status", isSmallLayout && !isInCamp);
			GameGlobals.uiFunctions.toggle("#mobile-header-camp-res", isSmallLayout && isInCamp);
			let padding = isSmallLayout ? Math.ceil($("#mobile-header").height()) + 20 : 15;
			$("#unit-main").css("padding-top", padding + "px");
			$("#log-container").css("padding-top", (padding + 10) + "px");
		},

		updateTabVisibility: function () {
			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var isInCamp = playerPosition.inCamp;
			GameGlobals.uiFunctions.toggle("#main-header-camp", isInCamp);
			GameGlobals.uiFunctions.toggle("#main-header-bag", !isInCamp);
			GameGlobals.uiFunctions.toggle("#main-header-items", !isInCamp);
			GameGlobals.gameState.uiStatus.isInCamp = isInCamp;
		},

		updateStaminaWarningLimit: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.staminaWarningLimit = PlayerStatConstants.getStaminaWarningLimit(this.playerStatsNodes.head.stamina);
		},

		updateHeaderTexts: function () {
			if (!this.currentLocationNodes.head) return;
			let playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			let campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
			let isInCamp = playerPosition.inCamp;
			let isGround = playerPosition.level == GameGlobals.gameState.getGroundLevel();
			let isSurface = playerPosition.level == GameGlobals.gameState.getSurfaceLevel();

			let headerText; 
			if (isInCamp && campComponent) { 
				let campCount = GameGlobals.gameState.numCamps;
				if (campCount > 1) {
					headerText = Text.t("ui.main.location_header_in_onecamp", { name: campComponent.getName(), level: playerPosition.level });
				} else {
					headerText = Text.t("ui.main.location_header_in_default", { name: campComponent.getName(), level: playerPosition.level });
				}
			} else if (isGround) {
				headerText = Text.t("ui.main.location_header_out_ground", playerPosition.level);
			} else if (isSurface) {
				headerText = Text.t("ui.main.location_header_out_surface", playerPosition.level);
			} else {
				headerText = Text.t("ui.main.location_header_out", playerPosition.level);
			}

			this.elements.locationHeader.text(headerText);

			GameGlobals.uiFunctions.toggle("#grid-tab-header", GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.out || isInCamp);
		},

		updateVisionStatus: function () {
			this.updateTheme();
			this.updateVisionLevel();
		},
		
		updateTheme: function () {
			let sunlit = false;
			
			if (this.currentLocationNodes.head) {
				let featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
				sunlit = featuresComponent.sunlit;
			}
			
			if (GameGlobals.gameState.isFinished || GameGlobals.gameState.isLaunchCompleted) {
				sunlit = false;
			}
			
			if (this.playerStatsNodes.head && this.playerStatsNodes.head.entity.has(MovementComponent)) {
				let movementComponent = this.playerStatsNodes.head.entity.get(MovementComponent);
				let movementSector = GameGlobals.levelHelper.getSectorByPosition(movementComponent.level, movementComponent.sectorX, movementComponent.sectorY);
				if (movementSector) {
					let movementSectorFeaturesComponent = movementSector.get(SectorFeaturesComponent);
					sunlit = movementSectorFeaturesComponent.sunlit;
				}
			}
			
			if (GameGlobals.gameState.uiStatus.forceSunlit) sunlit = true;
			if (GameGlobals.gameState.uiStatus.forceDark) sunlit = false;

			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			this.updateThemeTo(sunlit);
		},
		
		updateThemeTo: function (sunlit) {
			let wasSunlit = this.elements.body.hasClass("sunlit");
			if (sunlit == wasSunlit) {
				return;
			}
			
			log.w("[ui] update theme to: " + (sunlit ? "sunlit" : "dark"));
			this.transitionTheme(wasSunlit, sunlit);
		},
		
		updateThemedIcons: function () {
			let sunlit = this.elements.body.hasClass("sunlit");
			for (let i = 0; i < this.themedIcons.length; i++) {
				let icon = this.themedIcons[i];
				let path = sunlit ? icon.pathSunlit : icon.pathDark;
				if (path) {
					// save paths before overriding src
					icon.$elem.attr("data-src-sunlit", icon.pathSunlit);
					icon.$elem.attr("data-src-dark", icon.pathDark);
					icon.$elem.attr("src", path);
				} else {
					log.w("no path defined for themed icon " + icon.$elem.attr("id"));
				}
			}
		},
		
		updateVisionLevel: function () {
			let visionValue = 0;
			let visionMaxValue = 0;
			
			if (this.playerStatsNodes.head) {
				visionValue = this.playerStatsNodes.head.vision.value;
				visionMaxValue = this.playerStatsNodes.head.vision.maximum;
			}
			
			let visionFactor = visionValue;
			visionFactor = Math.max(0, visionFactor);
			visionFactor = Math.min(100, visionFactor);
			let visionStep = Math.round(visionFactor / 10);
			
			UIState.refreshState(this, "vision-step", visionStep, function () {
				log.i("update vision step: " + visionStep);
				for (let i = 0; i <= 10; i++) {
					this.elements.body.toggleClass("vision-step-" + i, i == visionStep);
				}
			});

			let visionMaxFactor = visionValue;
			visionMaxFactor = Math.max(0, visionMaxFactor);
			visionMaxFactor = Math.min(100, visionMaxFactor);
			let visionLevel = Math.ceil(visionMaxFactor / 25);

			this.visionLevel = visionLevel;

			UIState.refreshState(this, "vision-level", visionLevel, function () {
				log.i("update vision level: " + visionLevel);
				this.updatePageBackgroundColor();
				for (let i = 1; i <= 4; i++) {
					this.elements.body.toggleClass("vision-level-" + i, i == visionLevel);
				}
				$(".hidden-when-down").css("opacity", visionLevel > 0 ? 1 : 0);
			});
		},

		updatePageBackgroundColor: function () {
			let visionLevel = this.visionLevel;
			let sunlit = this.elements.body.hasClass("sunlit");
			let backgroundColor = ColorConstants.getColor(sunlit, "bg_page_vision_level_" + visionLevel);

			log.i("update page background color: sunlit:" + sunlit + " | visionLevel:" + visionLevel);
			
			$("body").css("background", backgroundColor);
			
			for (let i = 0; i < this.dynamicBackgroundItems.length; i++) {
				let item = this.dynamicBackgroundItems[i];
				if (sunlit) {
					item.$elem.css("background", "");
				} else {
					let originalBackground = item.originalBackgroundDark;
					let newBackground = this.getDynamicBackgroundColor(originalBackground, visionLevel);
					item.$elem.stop().animate({ "background-color": newBackground });
				}
			}
		},

		getDynamicBackgroundColor: function (originalBackground, visionLevel) {
			let alpha = 1;
			if (visionLevel == 0) alpha = 0.6;
			if (visionLevel == 1) alpha = 0.8;
			return ColorConstants.getColorWithAlpha(originalBackground, alpha);
		},
		
		updateEndingView: function () {
			log.i("updateEndingView");
			if (GameGlobals.gameState.isFinished) {
				$(".game-opacity-controller").css("opacity", 0);
				$("#container-tab-vis-in").css("display", "none");
				$("#container-tab-two-in").css("display", "none");
			}
		},
		
		transitionTheme: function (oldValue, newValue) {
			if (oldValue == newValue) return;
			if (this.currentThemeTransitionTargetValue != null && this.currentThemeTransitionTargetValue === newValue) {
				return;
			}
			
			log.w("transitionTheme " + oldValue + " -> " + newValue + " | " + this.currentThemeTransitionID);
			
			if (this.currentThemeTransitionID) {
				clearTimeout(this.currentThemeTransitionID);
			}
			
			this.currentThemeTransitionTargetValue = newValue;
			
			$("body").toggleClass("theme-transition", true);
			
			let sys = this;

			let duration = UIConstants.THEME_TRANSITION_DURATION;
			if (!this.playerStatsNodes.head) {
				// game not started or restarting
				duration /= 3;
			}

			let fadeOutDuration = duration * 0.4;
			let transitionDuration = duration * 0.2;
			let fadeInDuration = duration * 0.4;
			
			$("#theme-transition-overlay").css("display", "block");
			$("#theme-transition-overlay").stop(true).animate({ opacity: 1 }, fadeOutDuration).delay(transitionDuration).animate({ opacity: 0 }, fadeInDuration);
			
			this.currentThemeTransitionID = setTimeout(function () {
				sys.elements.body.toggleClass("sunlit", newValue);
				sys.elements.body.toggleClass("dark", !newValue);
				
				sys.updatePageBackgroundColor();
				sys.updateVisionStatus();
				sys.updateThemedIcons();
				sys.updateResources(true); // resource fill progress bar color
				
				GlobalSignals.themeToggledSignal.dispatch();
				
				sys.currentThemeTransitionID = setTimeout(function () {
					$("body").toggleClass("theme-transition", false);
					$("#theme-transition-overlay").css("display", "none");
					sys.currentThemeTransitionID = null;
					sys.currentThemeTransitionTargetValue = null;
				}, transitionDuration + fadeOutDuration);
			}, fadeOutDuration);
		
		},
		
		isResting: function () {
			var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			return busyComponent && busyComponent.getLastActionName() == "use_in_home";
		},
		
		getLevelIcon: function (inCamp, sector) {
			let result = { src: "", desc: "" };
			let position = sector.get(PositionComponent);
			
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(position.level);
			let levelComponent = levelEntity.get(LevelComponent);
			
			let path = "img/";
			let base = "";
			let desc = "";
			
			if (inCamp) {
				base = levelComponent.habitability < 1 ? "ui-camp-outpost" : "ui-camp-default";
				desc = levelComponent.habitability < 1 ? "in camp | outpost" : "in camp | regular";
			} else if (!GameGlobals.levelHelper.isLevelTypeRevealed(position.level)) {
				base = "ui-level-unknown";
				desc = "outside | unknown level";
			} else {
				var surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
				var groundLevel = GameGlobals.gameState.getGroundLevel();
				if (position.level == surfaceLevel) {
					base = "ui-level-sun";
					desc = "outside | surface";
				} else if (position.level == groundLevel) {
					base = "ui-level-ground";
					desc = "outside | ground";
				} else if (!levelComponent.isCampable) {
					switch (levelComponent.notCampableReason) {
						case LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION:
							base = "ui-level-radiation";
							desc = "outside | radiation level";
							break;
						case LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION:
							base = "ui-level-poison";
							desc = "outside | polluted level";
							break;
						default:
							base = "ui-level-empty";
							desc = "outside | uninhabitable level";
							break;
					}
				} else {
					base = "ui-level-default";
					desc = "outside | regular level";
				}
			}
			
			let featuresComponent = sector.get(SectorFeaturesComponent);
			let sunlit = featuresComponent.sunlit;
			let suffix = (sunlit ? "" : "-dark");
			result.src = path + base + suffix + ".png";
			result.desc = desc;
			return result;
		},

		getShowResources: function () {
			return GameGlobals.resourcesHelper.getCurrentStorage().resources;
		},

		getShowResourceAcc: function () {
			return GameGlobals.resourcesHelper.getCurrentStorageAccumulation(false);
		},
		
		showItemBonusTypeInEquipmentStats: function (bonusType) {
			if (bonusType == ItemConstants.itemBonusTypes.bag) return false;
			if (bonusType == ItemConstants.itemBonusTypes.fight_speed) return false;
			if (bonusType == ItemConstants.itemBonusTypes.detect_ingredients) return false;
			if (bonusType == ItemConstants.itemBonusTypes.detect_supplies) return false;
			if (bonusType == ItemConstants.itemBonusTypes.detect_hazards) return false;
			if (bonusType == ItemConstants.itemBonusTypes.detect_poi) return false;
			if (bonusType == ItemConstants.itemBonusTypes.scavenge_general) return false;
			if (bonusType == ItemConstants.itemBonusTypes.scavenge_blueprints) return false;
			if (bonusType == ItemConstants.itemBonusTypes.scavenge_ingredients) return false;
			if (bonusType == ItemConstants.itemBonusTypes.scavenge_supplies) return false;
			if (bonusType == ItemConstants.itemBonusTypes.scavenge_valuables) return false;
			if (bonusType == ItemConstants.itemBonusTypes.collector_cost) return false;
			if (bonusType == ItemConstants.itemBonusTypes.scavenge_cost) return false;
			if (bonusType == ItemConstants.itemBonusTypes.scout_cost) return false;
			return true;
		},
		
		onActionStarting: function (action) {
			this.completeResourceAnimations();
			GameGlobals.uiFunctions.showGameOptions(false);
		},

		onPlayerPositionChanged: function () {
			// update these just for setting the right visibility on containers while the player is moving already
			this.queueResourceBarUpdate();
			this.updatePlayerStats();
			this.updateTabVisibility();

			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateStaminaWarningLimit();
			this.updateLocation();
			this.updateHeaderTexts();
			this.queueResourceUpdate();
		},
		
		onPlayerMoveCompleted: function () {
			this.updatePlayerStats();
			this.updateLocation();
			this.updateLayout();
			this.updateItemStats();
			this.updatePageBackgroundColor();
		},
		
		onPlayerLocationChanged: function () {
			this.updateLocation();
		},
		
		onPlayerMoveStarted: function () {
			this.updateTheme();
		},
		
		onPlayerEnteredCamp: function () {
			this.queueResourceBarUpdate();
			this.updateCurrency();
			this.queueResourceUpdate(0.25);
			this.updateExplorers();
			GameGlobals.uiFunctions.scrollToTabTop();
		},
		
		onPlayerLeftCamp: function () {
			this.queueResourceBarUpdate();
			this.updateCurrency();
			this.updateItems();
			this.updateExplorers();
			GameGlobals.uiFunctions.scrollToTabTop();
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
			this.queueResourceUpdate();
			this.queueResourceBarUpdate();
			this.updateCurrency();
			this.updatePlayerStats();
			this.updateItems(true);
		},
		
		onEquipmentChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.queueResourceBarUpdate();
			this.updatePlayerStats();
			this.updateItemStats();
			this.refreshPerks();
		},
		
		onExplorersChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updatePlayerStats();
			this.updateItemStats();
			this.updateExplorers();
			this.refreshStatuses();
		},
		
		onPlayerActionCompleted: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updatePlayerStats();
			this.queueResourceBarUpdate();
		},

		onVisionChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateVisionStatus();
			this.refreshPerks();
		},

		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateVisionStatus();
			this.updateHeaderTexts();
			this.updatePlayerStats();
			this.updateLayout();
		},

		onElementCreated: function () {
			this.updateThemedIconsCache();
			this.updateThemedIcons();
		},
		
		onPerksChanged: function () {
			this.refreshPerks();
		},
		
		onStorageCapacityChanged: function () {
			this.queueResourceBarUpdate();
		},
		
		onLevelTypeRevealed: function (level) {
			let playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			if (playerPosition.level == level) {
				this.updateLevelIcon(true);
			}
		},

		onImprovementBuilt: function () {
			this.queueResourceBarUpdate();
			this.queueResourceUpdate();
		},
		
		onLaunchCompleted: function () {
			this.updateTheme();
		},
		
		onGameShown: function () {
			this.updateTabVisibility();
			this.queueResourceBarUpdate();
			this.updateStaminaWarningLimit();
			this.updateLocation();
			this.updateHeaderTexts();
			this.queueResourceUpdate();
			this.updateVisionStatus();
			this.updatePlayerStats();
			this.refreshPerks();
			this.refreshStatuses();
			this.updateItemStats();
			this.updateExplorers();
			this.updateLayout();
			this.updatePageBackgroundColor();
		},

		onGameReset: function () {
			this.updateTheme();
			this.updatePageBackgroundColor();
		},

		onPopupClosed: function () {
			// update evidence etc immediately after scout popup
			this.updatePlayerStats();
		},

		onWindowResized: function () {
			this.updateLayoutMode();
			this.updateLayout();
		}
	});

	return UIOutHeaderSystem;
});
