define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/UIConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/PerkConstants',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/AutoPlayNode',
], function (Ash,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	UIConstants,
	PlayerStatConstants,
	PlayerActionConstants,
	PerkConstants,
	PlayerLocationNode,
	PlayerStatsNode,
	AutoPlayNode,
) {
	var UIOutElementsSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,
		autoPlayNodes: null,

		engine: null,
		
		buttonCalloutSignalParams: { isButtonCalloutElement: true },

		elementsCalloutContainers: null,
		elementsVisibleButtons: [],
		elementsVisibleProgressbars: [],

		buttonStatuses: [], // same indices as visible buttons
		buttonElements: [], // same indices as visible buttons

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);
			
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);

			this.refreshGlobalSavedElements();
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.updateButtonsSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.featureUnlockedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.elementCreatedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.actionButtonClickedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.elementToggledSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onElementsVisibilityChanged);
			
			GlobalSignals.add(this, GlobalSignals.updateButtonsSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.actionStartedSignal, this.onButtonStatusChanged);
			
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.refreshGlobalSavedElements);
			GlobalSignals.add(this, GlobalSignals.calloutsGeneratedSignal, this.refreshGlobalSavedElements);
			this.elementsVisibilityChanged = true;
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerLocationNodes = null;
			this.playerStatsNodes = null;
			this.autoPlayNodes = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (this.elementsVisibilityChanged) {
				this.updateVisibleButtonsList();
				this.updateVisibleProgressbarsList();
				this.updateInfoCallouts();
				this.updateButtons();
				this.elementsVisibilityChanged = false;
				this.buttonStatusChanged = false;
				this.elementsVisibilityChangedFrames++;
			} else {
				this.elementsVisibilityChangedFrames = 0;
			}
			
			if (this.buttonStatusChanged) {
				this.buttonStatusChanged = false;
				this.updateButtons();
			}

			if (this.elementsVisibilityChangedFrames > 5) {
				log.w("element visibility updated too often");
			}

			this.updateProgressbars();
		},

		slowUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.uiStatus.isPaused) return;
			this.updateButtons();
		},

		refreshGlobalSavedElements: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.elementsCalloutContainers = $(".callout-container");
		},

		updateButtons: function () {
			var sys = this;
			var actions = [];
			for (let i = 0; i < this.elementsVisibleButtons.length; i++) {
				var $button = $(this.elementsVisibleButtons[i]);
				var action = $button.attr("action");
				if (!action) {
					continue;
				}
				var buttonStatus = sys.buttonStatuses[i];
				var buttonElements = sys.buttonElements[i];
				var isHardDisabled = sys.updateButtonDisabledState($button, action, buttonStatus, buttonElements);
				sys.updateButtonCallout($button, action, buttonStatus, buttonElements, isHardDisabled);
				actions.push(action + "(" + isHardDisabled + ")");
			}
			// log.i("updated buttons " + actions.join(","));
		},

		updateButtonDisabledState: function ($button, action, buttonStatus, buttonElements) {
			var playerVision = this.playerStatsNodes.head.vision.value;
			var isAutoPlaying = this.autoPlayNodes.head;
			return GameGlobals.buttonHelper.updateButtonDisabledState($button, buttonElements.container, playerVision, isAutoPlaying);
		},

		updateButtonCallout: function ($button, action, buttonStatus, buttonElements, isHardDisabled) {
			var $enabledContent = buttonElements.calloutContentEnabled;
			var $disabledContent = buttonElements.calloutContentDisabled;

			var costs = GameGlobals.playerActionsHelper.getCosts(action);

			var costsStatus = {};
			costsStatus.hasCostBlockers = false;
			costsStatus.bottleneckCostFraction = 1;

			// callout content
			var sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button);
			var disabledReason = GameGlobals.playerActionsHelper.checkRequirements(action, false, sectorEntity).reason;
			let hasCooldown = GameGlobals.buttonHelper.hasButtonCooldown($button);
			var isDisabledOnlyForCooldown = !disabledReason && hasCooldown;
			let showDescription = disabledReason != PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENT_LEVEL;
			
			this.updateButtonCalloutDescription($button, action, buttonStatus, buttonElements, showDescription);
			
			if (!isHardDisabled || isDisabledOnlyForCooldown) {
				GameGlobals.uiFunctions.toggle($enabledContent, true, this.buttonCalloutSignalParams);
				GameGlobals.uiFunctions.toggle($disabledContent, false, this.buttonCalloutSignalParams);
				var hasCosts = action && costs && Object.keys(costs).length > 0;
				if (hasCosts) {
					this.updateButtonCalloutCosts($button, action, buttonStatus, buttonElements, costs, costsStatus);
				}
				this.updateButtonCalloutRisks($button, action, buttonElements);
				this.updateButtonSpecialReqs($button, action, buttonElements);
			} else {
				var lastReason = buttonStatus.disabledReason;
				if (lastReason !== disabledReason) {
					GameGlobals.uiFunctions.toggle($enabledContent, false, this.buttonCalloutSignalParams);
					GameGlobals.uiFunctions.toggle($disabledContent, true, this.buttonCalloutSignalParams);
					buttonElements.calloutSpanDisabledReason.html(disabledReason);
					buttonStatus.disabledReason = disabledReason;
				}
			}

			// overlays
			this.updateButtonCooldownOverlays($button, action, buttonStatus, buttonElements, sectorEntity, isHardDisabled, costsStatus);
		},
		
		updateButtonCalloutDescription: function ($button, action, buttonStatus, buttonElements, showDescription) {
			let baseActionId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			if (!GameGlobals.playerActionsHelper.isImproveBuildingAction(baseActionId)) {
				return;
			}
			
			GameGlobals.uiFunctions.toggle(buttonElements.calloutDisabledDivider, showDescription);
			GameGlobals.uiFunctions.toggle(buttonElements.descriptionSpan, showDescription);
			buttonElements.descriptionSpan.text(GameGlobals.playerActionsHelper.getDescription(action));
		},

		updateButtonCalloutCosts: function ($button, action, buttonStatus, buttonElements, costs, costsStatus) {
			var playerHealth = this.playerStatsNodes.head.stamina.health;
			var showStorage = GameGlobals.resourcesHelper.getCurrentStorageCap();
			if (!buttonStatus.displayedCosts) buttonStatus.displayedCosts = {};
			
			for (var key in costs) {
				var $costSpan = buttonElements.costSpans[key];
				if (!$costSpan || $costSpan.length == 0) {
					log.w("cost span missing: " + key + " " + action);
					continue;
				}
				var value = costs[key];
				var costFraction = GameGlobals.playerActionsHelper.checkCost(action, key);
				var isFullCostBlocker = (isResource(key.split("_")[1]) && value > showStorage) || (key == "stamina" && value > playerHealth * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
				if (isFullCostBlocker) {
					costsStatus.hasCostBlockers = true;
				} else if (costFraction < costsStatus.bottleneckCostFraction) {
					costsStatus.bottleneckCostFraction = costFraction;
				}
				$costSpan.toggleClass("action-cost-blocker", costFraction < 1);
				$costSpan.toggleClass("action-cost-blocker-storage", isFullCostBlocker);

				if (value !== buttonStatus.displayedCosts[key]) {
					var $costSpanValue = buttonElements.costSpanValues[key];
					$costSpanValue.html(UIConstants.getDisplayValue(value));
					GameGlobals.uiFunctions.toggle($costSpan, value > 0, this.buttonCalloutSignalParams);
					buttonStatus.displayedCosts[key] = value;
				}
			}
		},

		updateButtonCalloutRisks: function ($button, action, buttonElements) {
			var sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button) || this.playerLocationNodes.head.entity;
			var playerVision = this.playerStatsNodes.head.vision.value;
			let perksComponent = this.playerStatsNodes.head.perks;
			let playerLuck = perksComponent.getTotalEffect(PerkConstants.perkTypes.luck);
			var hasEnemies = GameGlobals.fightHelper.hasEnemiesCurrentLocation(action);
			var baseActionId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var encounterFactor = GameGlobals.playerActionsHelper.getEncounterFactor(action);
			var sectorDangerFactor = GameGlobals.sectorHelper.getDangerFactor(sectorEntity);

			var injuryRisk = PlayerActionConstants.getInjuryProbability(action, playerVision, playerLuck);
			var injuryRiskBase = injuryRisk > 0 ? PlayerActionConstants.getInjuryProbability(action) : 0;
			var injuryRiskVision = injuryRisk - injuryRiskBase;
			var inventoryRisk = PlayerActionConstants.getLoseInventoryProbability(action, playerVision, playerLuck);
			var inventoryRiskBase = inventoryRisk > 0 ? PlayerActionConstants.getLoseInventoryProbability(action) : 0;
			var inventoryRiskVision = inventoryRisk - inventoryRiskBase;
			var fightRisk = hasEnemies ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision, sectorDangerFactor, encounterFactor) : 0;
			var fightRiskBase = fightRisk > 0 ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision, sectorDangerFactor, encounterFactor) : 0;
			var fightRiskVision = fightRisk - fightRiskBase;
			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInjury, injuryRisk > 0, this.buttonCalloutSignalParams);
			if (injuryRisk > 0)
				buttonElements.calloutRiskInjuryValue.text(UIConstants.roundValue((injuryRiskBase + injuryRiskVision) * 100, true, true));

			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInventory, inventoryRisk > 0, this.buttonCalloutSignalParams);
			if (inventoryRisk > 0)
				buttonElements.calloutRiskInventoryValue.text(UIConstants.roundValue((inventoryRiskBase + inventoryRiskVision) * 100, true, true));

			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskFight, fightRisk > 0, this.buttonCalloutSignalParams);
			if (fightRisk > 0)
				buttonElements.calloutRiskFightValue.text(UIConstants.roundValue((fightRiskBase + fightRiskVision) * 100, true, true));
		},
		
		updateButtonSpecialReqs: function ($button, action, buttonElements) {
			if (!buttonElements.calloutSpecialReqs || buttonElements.calloutSpecialReqs.length == 0) {
				return;
			}
			buttonElements.calloutSpecialReqs.text(GameGlobals.uiFunctions.getSpecialReqsText(action));
		},

		updateButtonCooldownOverlays: function ($button, action, buttonStatus, buttonElements, sectorEntity, isHardDisabled, costsStatus) {
			costsStatus.bottleneckCostFraction = Math.min(costsStatus.bottleneckCostFraction, GameGlobals.playerActionsHelper.checkRequirements(action, false, sectorEntity).value);
			if (costsStatus.hasCostBlockers) costsStatus.bottleneckCostFraction = 0;
			if (isHardDisabled) costsStatus.bottleneckCostFraction = 0;

			if (buttonStatus.bottleneckCostFraction !== costsStatus.bottleneckCostFraction) {
				buttonElements.cooldownReqs.css("width", ((costsStatus.bottleneckCostFraction) * 100) + "%");
				buttonStatus.bottleneckCostFraction = costsStatus.bottleneckCostFraction;
			}
		},

		updateProgressbars: function () {
			for (let i = 0; i < this.elementsVisibleProgressbars.length; i++) {
				var $progressbar = $(this.elementsVisibleProgressbars[i]);
				var id = $progressbar.attr("id");
				
				// bar
				var isAnimated = $progressbar.data("animated") === true;
				if (!isAnimated) {
					var percent = ($progressbar.data('progress-percent') / 100);
					var percentShown = $progressbar.data("progress-percent-shown");
					if (!percentShown && percentShown !== 0) percentShown = -1;
					if (Math.abs(percent - percentShown) > 0.0005) {
						$progressbar.data("animated", true);
						var animationLength = $progressbar.data("animation-counter") > 0 ? ($progressbar.data('animation-length')) : 0;
						var progressWrapWidth = $progressbar.width();
						var progressWidth = percent * progressWrapWidth;
						$progressbar.children(".progress-bar").stop().animate({
							left: progressWidth
						}, animationLength, function () {
							$(this).parent().data("animated", false);
							$(this).parent().data("progress-percent-shown", percent);
							$(this).parent().data("animation-counter", $progressbar.parent().data("animation-counter") + 1);
						});
					}
				} else {
					$progressbar.data("animation-counter", 0);
				}
				
				// change indicator
				var now = new Date().getTime();
				var changeTime = $progressbar.data('change-time');
				var changeAnimTime = $progressbar.data('change-anim-time');
				if (!changeAnimTime || changeTime > changeAnimTime) {
					var changePercent = $progressbar.data('change-percent');
					$progressbar.children(".progress-bar-change").finish().animate({
						width: changePercent + "%",
						left: progressWidth,
						opacity: 1,
					}, animationLength).delay(100).animate({
						opacity: 0
					}, 300);
					$progressbar.data('change-anim-time', now);
				}
			}
		},

		updateInfoCallouts: function () {
			var targets;
			$.each(this.elementsCalloutContainers, function () {
				targets = $(this).children(".info-callout-target");
				if (targets.length > 0) {
					var visible = true;
					$.each(targets, function() {
						visible = visible && $(this).css("display") !== "none";
					});
					$.each(targets.children(), function () {
						visible = visible && $(this).css("display") !== "none";
					});
					GameGlobals.uiFunctions.toggle($(this), visible, this.buttonCalloutSignalParams);
				}
			});
		},

		// TODO performance
		updateButtonContainer: function (button, isVisible) {
			$(button).siblings(".cooldown-reqs").css("display", isVisible ? "block" : "none");
			var container = $(button).parent().parent(".callout-container");
			if (container) {
				$(container).css("display", $(button).css("display"));
			}
		},

		updateVisibleButtonsList: function () {
			this.elementsVisibleButtons = [];
			this.buttonStatuses = [];
			this.buttonElements = [];
			var buttonActions = [];
			var sys = this;
			$.each($("button.action"), function () {
				var $button = $(this);
				var action = $button.attr("action");
				var isVisible = (GameGlobals.uiFunctions.isElementToggled($button) !== false) && GameGlobals.uiFunctions.isElementVisible($button);
				sys.updateButtonContainer($button, isVisible);
				if (isVisible) {
					sys.elementsVisibleButtons.push($button);
					sys.buttonStatuses.push({});

					var elements = {};
					elements.container = $button.parent(".container-btn-action");
					elements.calloutContent = $($button.parent().siblings(".btn-callout").children(".btn-callout-content"));
					elements.calloutContentEnabled = $(elements.calloutContent.children(".btn-callout-content-enabled"));
					elements.calloutContentDisabled = $(elements.calloutContent.children(".btn-callout-content-disabled"));
					elements.calloutSpanDisabledReason = elements.calloutContentDisabled.children(".btn-disabled-reason");
					elements.calloutDisabledDivider = elements.calloutContentDisabled.children(".btn-callout-content-disabled hr");
					elements.calloutRiskInjury = elements.calloutContentEnabled.children(".action-risk-injury");
					elements.calloutRiskInjuryValue = elements.calloutRiskInjury.children(".action-risk-value");
					elements.calloutRiskInventory = elements.calloutContentEnabled.children(".action-risk-inventory");
					elements.calloutRiskInventoryValue = elements.calloutRiskInventory.children(".action-risk-value");
					elements.calloutRiskFight = elements.calloutContentEnabled.children(".action-risk-fight");
					elements.calloutRiskFightValue = elements.calloutRiskFight.children(".action-risk-value");
					elements.calloutSpecialReqs = elements.calloutContentEnabled.children(".action-special-reqs")
					elements.descriptionSpan = elements.calloutContent.children(".action-description");
					elements.cooldownReqs = $button.siblings(".cooldown-reqs");
					elements.cooldownDuration = $button.children(".cooldown-duration");
					elements.cooldownAction = $button.children(".cooldown-action");

					var costs = GameGlobals.playerActionsHelper.getCosts(action);
					elements.costSpans = {};
					elements.costSpanValues = {};
					for (var key in costs) {
						elements.costSpans[key] = elements.calloutContentEnabled.children(".action-cost-" + key);
						elements.costSpanValues[key] = elements.costSpans[key].children(".action-cost-value");
					}
					sys.buttonElements.push(elements);
					buttonActions.push(action);
				}
			});
			// log.i("update visible buttons:" + this.elementsVisibleButtons.length + ":" + buttonActions.join(","));
		},

		updateVisibleProgressbarsList: function () {
			this.elementsVisibleProgressbars = [];
			var sys = this;
			$.each($(".progress-wrap"), function () {
				var $progressbar = $(this);
				if ($progressbar.is(":visible")) {
					sys.elementsVisibleProgressbars.push($progressbar);
				} else {
					$progressbar.data("animation-counter", 0);
				}
			});
		},
		
		onElementsVisibilityChanged: function (elements, show, params) {
			if (params && params.isButtonCalloutElement) {
				return;
			}
			this.elementsVisibilityChanged = true;
		},
		
		onButtonStatusChanged: function () {
			this.buttonStatusChanged = true;
		}
		
	});

	return UIOutElementsSystem;
});
