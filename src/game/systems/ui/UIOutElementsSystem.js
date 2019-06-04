define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/UIConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/PlayerActionConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/AutoPlayNode',
], function (Ash,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	UIConstants,
	PlayerStatConstants,
	PlayerActionConstants,
	PlayerStatsNode,
	AutoPlayNode,
) {
	var UIOutElementsSystem = Ash.System.extend({

		playerStatsNodes: null,
		autoPlayNodes: null,

		engine: null,

		elementsCalloutContainers: null,
		elementsVisibleButtons: [],
		elementsVisibleProgressbars: [],

		buttonStatuses: [], // same indices as visible buttons
		buttonElements: [], // same indices as visible buttons

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);

			this.refreshGlobalSavedElements();
			GlobalSignals.calloutsGeneratedSignal.add(this.refreshGlobalSavedElements);

			var sys = this;
			GlobalSignals.featureUnlockedSignal.add(function () {
				sys.elementsVisibilityChanged = true;
			});
			GlobalSignals.playerMovedSignal.add(function () {
				sys.elementsVisibilityChanged = true;
			});
			GlobalSignals.gameShownSignal.add(function () {
				sys.refreshGlobalSavedElements();
				sys.elementsVisibilityChanged = true;
			});
			GlobalSignals.elementToggledSignal.add(function () {
				sys.elementsVisibilityChanged = true;
			});
			GlobalSignals.tabChangedSignal.add(function () {
				sys.elementsVisibilityChanged = true;
			});
			GlobalSignals.elementCreatedSignal.add(function () {
				sys.elementsVisibilityChanged = true;
			});
			GlobalSignals.actionButtonClickedSignal.add(function () {
				sys.elementsVisibilityChanged = true;
			});

			this.elementsVisibilityChanged = true;
		},

		removeFromEngine: function (engine) {
			this.engine = null;
            this.playerStatsNodes = null;
			this.autoPlayNodes = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (this.elementsVisibilityChanged) {
				this.updateVisibleButtonsList();
				this.updateVisibleProgressbarsList();
    			this.updateInfoCallouts();
				this.elementsVisibilityChanged = false;
				this.elementsVisibilityChangedFrames++;
			} else {
				this.elementsVisibilityChangedFrames = 0;
			}

			if (GameConstants.logWarnings) {
				if (this.elementsVisibilityChangedFrames > 5) {
					console.log("WARN: element visibility updated too often");
				}
			}

			this.updateButtons();
			this.updateProgressbars();
		},

		refreshGlobalSavedElements: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.elementsCalloutContainers = $(".callout-container");
		},

		updateButtons: function () {
			var sys = this;
			for (var i = 0; i < this.elementsVisibleButtons.length; i++) {
				var $button = $(this.elementsVisibleButtons[i]);
                var action = $button.attr("action");
				if (!action) {
					continue;
                }

				var buttonStatus = sys.buttonStatuses[i];
				var buttonElements = sys.buttonElements[i];
				var isHardDisabled = sys.updateButtonDisabledState($button, action, buttonStatus, buttonElements);
				sys.updateButtonCallout($button, action, buttonStatus, buttonElements, isHardDisabled);
			}
		},

		updateButtonDisabledState: function ($button, action, buttonStatus, buttonElements) {
			var isAutoPlaying = this.autoPlayNodes.head;
			var disabledBase = this.isButtonDisabled($button);
			var disabledVision = this.isButtonDisabledVision($button);
			var disabledBasic = !disabledVision && disabledBase;
			var disabledResources = !disabledVision && !disabledBasic && this.isButtonDisabledResources($button);
			var disabledCooldown = !disabledVision && !disabledBasic && !disabledResources && this.hasButtonCooldown($button);
			var disabledDuration = !disabledVision && !disabledBasic && !disabledResources && !disabledCooldown && this.hasButtonDuration($button);
			var isDisabled = disabledBasic || disabledVision || disabledResources || disabledCooldown || disabledDuration;
            
			$button.toggleClass("btn-disabled", isDisabled);
			$button.toggleClass("btn-disabled-basic", disabledBasic);
			$button.toggleClass("btn-disabled-vision", disabledVision);
			buttonElements.container.toggleClass("btn-disabled-vision", disabledVision);
			$button.toggleClass("btn-disabled-resources", disabledResources);
			$button.toggleClass("btn-disabled-cooldown", disabledCooldown || disabledDuration);
			$button.attr("disabled", isDisabled || isAutoPlaying);
			return disabledBase || disabledVision;
		},

		updateButtonCallout: function ($button, action, buttonStatus, buttonElements, isHardDisabled) {
			var $enabledContent = buttonElements.calloutContentEnabled;
			var $disabledContent = buttonElements.calloutContentDisabled;

			var costFactor = GameGlobals.playerActionsHelper.getCostFactor(action);
			var costs = GameGlobals.playerActionsHelper.getCosts(action, costFactor);

			var costsStatus = {};
			costsStatus.hasCostBlockers = false;
			costsStatus.bottleneckCostFraction = 1;

			// callout content
			var sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button);
			var disabledReason = GameGlobals.playerActionsHelper.checkRequirements(action, false, sectorEntity).reason;
			var isDisabledOnlyForCooldown = (!(disabledReason) && this.hasButtonCooldown($button));
			if (!isHardDisabled || isDisabledOnlyForCooldown) {
				GameGlobals.uiFunctions.toggle($enabledContent, true);
				GameGlobals.uiFunctions.toggle($disabledContent, false);
				var hasCosts = action && costs && Object.keys(costs).length > 0;
				if (hasCosts) {
					this.updateButtonCalloutCosts($button, action, buttonStatus, buttonElements, costs, costsStatus);
				}
				this.updateButtonCalloutRisks($button, action, buttonElements);
			} else {
				var lastReason = buttonStatus.disabledReason;
				if (lastReason !== disabledReason) {
					GameGlobals.uiFunctions.toggle($enabledContent, false);
					GameGlobals.uiFunctions.toggle($disabledContent, true);
					buttonElements.calloutSpanDisabledReason.html(disabledReason);
					buttonStatus.disabledReason = disabledReason;
				}
			}

			// overlays
			this.updateButtonCooldownOverlays($button, action, buttonStatus, buttonElements, sectorEntity, isHardDisabled, costsStatus);
		},

		updateButtonCalloutCosts: function ($button, action, buttonStatus, buttonElements, costs, costsStatus) {
			var playerHealth = this.playerStatsNodes.head.stamina.health;
			var showStorage = GameGlobals.resourcesHelper.getCurrentStorageCap();
			if (!buttonStatus.displayedCosts) buttonStatus.displayedCosts = {};
			for (var key in costs) {
				var $costSpan = buttonElements.costSpans[key];
				if (!$costSpan) {
					console.log("WARN: cost span missing: " + key + " " + action);
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
					buttonStatus.displayedCosts[key] = value;
				}
			}
		},

		updateButtonCalloutRisks: function ($button, action, buttonElements) {
			var playerVision = this.playerStatsNodes.head.vision.value;
			var hasEnemies = GameGlobals.fightHelper.hasEnemiesCurrentLocation(action);
			var baseActionId = GameGlobals.playerActionsHelper.getBaseActionID(action);

			var injuryRisk = PlayerActionConstants.getInjuryProbability(action, playerVision);
			var injuryRiskBase = injuryRisk > 0 ? PlayerActionConstants.getInjuryProbability(action) : 0;
			var injuryRiskVision = injuryRisk - injuryRiskBase;
			var inventoryRisk = PlayerActionConstants.getLoseInventoryProbability(action, playerVision);
			var inventoryRiskBase = inventoryRisk > 0 ? PlayerActionConstants.getLoseInventoryProbability(action) : 0;
			var inventoryRiskVision = inventoryRisk - inventoryRiskBase;
			var fightRisk = hasEnemies ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision) : 0;
			var fightRiskBase = fightRisk > 0 ? PlayerActionConstants.getRandomEncounterProbability(baseActionId) : 0;
			var fightRiskVision = fightRisk - fightRiskBase;

			if (injuryRisk > 0 || fightRisk > 0 || inventoryRisk > 0) {
				GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInjury, injuryRisk > 0);
				if (injuryRisk > 0)
					buttonElements.calloutRiskInjuryValue.text(UIConstants.roundValue((injuryRiskBase + injuryRiskVision) * 100, true, true));

				GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInventory, inventoryRisk > 0);
				if (inventoryRisk > 0)
					buttonElements.calloutRiskInventoryValue.text(UIConstants.roundValue((inventoryRiskBase + inventoryRiskVision) * 100, true, true));

				GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskFight, fightRisk > 0);
				if (fightRisk > 0)
					buttonElements.calloutRiskFightValue.text(UIConstants.roundValue((fightRiskBase + fightRiskVision) * 100, true, true));
			}
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

		hasButtonCooldown: function ($button) {
			return ($button.attr("data-hasCooldown") === "true");
		},

		hasButtonDuration: function (button) {
			return ($(button).attr("data-isInProgress") === "true");
		},

		isButtonDisabledVision: function ($button) {
			var action = $button.attr("action");
			if (action) {
				var playerVision = this.playerStatsNodes.head.vision.value;
				var requirements = GameGlobals.playerActionsHelper.getReqs(action);
				if (requirements && requirements.vision) return (playerVision < requirements.vision[0]);
			}
			return false;
		},

		isButtonDisabled: function ($button) {
			if ($button.hasClass("btn-meta")) return false;

			if ($button.attr("data-type") === "minus") {
				var input = $button.siblings("input");
				return parseInt(input.val()) <= parseInt(input.attr("min"));
			}

			if ($button.attr("data-type") === "plus") {
				var input = $button.siblings("input");
				return parseInt(input.val()) >= parseInt(input.attr("max"));
			}

			if (!($button.hasClass("action"))) return false;

			var action = $button.attr("action");
			if (!action) return false;

			var sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button);
			var reqsCheck = GameGlobals.playerActionsHelper.checkRequirements(action, false, sectorEntity);

			return reqsCheck.value < 1 && reqsCheck.reason !== PlayerActionConstants.UNAVAILABLE_REASON_LOCKED_RESOURCES;
		},

		isButtonDisabledResources: function (button) {
			var action = $(button).attr("action");
			return GameGlobals.playerActionsHelper.checkCosts(action, false) < 1;
		},

		updateProgressbars: function () {
			for (var i = 0; i < this.elementsVisibleProgressbars.length; i++) {
				var $progressbar = $(this.elementsVisibleProgressbars[i]);
				var isAnimated = $progressbar.data("animated") === true;
				if (!isAnimated) {
					$progressbar.data("animated", true);
					var percent = ($progressbar.data('progress-percent') / 100);
					var animationLength = $progressbar.data("animation-counter") > 0 ? ($progressbar.data('animation-length')) : 0;
					var progressWrapWidth = $progressbar.width();
					var progressWidth = percent * progressWrapWidth;
					$progressbar.children(".progress-bar").stop().animate({
						left: progressWidth
					}, animationLength, function () {
						$(this).parent().data("animated", false);
						$(this).parent().data("animation-counter", $progressbar.parent().data("animation-counter") + 1);
					});
				} else {
					$progressbar.data("animation-counter", 0);
				}
			}
		},

		updateInfoCallouts: function () {
			var targets;
			$.each(this.elementsCalloutContainers, function () {
				targets = $(this).children(".info-callout-target");
				if (targets.length > 0) {
					var visible = true;
					$.each(targets.children(), function () {
						visible = visible && $(this).css("display") !== "none";
					});
					GameGlobals.uiFunctions.toggle($(this), visible);
				}
			});
		},

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
					elements.calloutRiskInjury = elements.calloutContentEnabled.children(".action-risk-injury");
					elements.calloutRiskInjuryValue = elements.calloutRiskInjury.children(".action-risk-value");
					elements.calloutRiskInventory = elements.calloutContentEnabled.children(".action-risk-inventory");
					elements.calloutRiskInventoryValue = elements.calloutRiskInventory.children(".action-risk-value");
					elements.calloutRiskFight = elements.calloutContentEnabled.children(".action-risk-fight");
					elements.calloutRiskFightValue = elements.calloutRiskFight.children(".action-risk-value");
					elements.cooldownReqs = $button.siblings(".cooldown-reqs");
					elements.cooldownDuration = $button.children(".cooldown-duration");

					var costFactor = GameGlobals.playerActionsHelper.getCostFactor(action);
					var costs = GameGlobals.playerActionsHelper.getCosts(action, costFactor);
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
            // console.log("update visible buttons:" + this.elementsVisibleButtons.length + ":" + buttonActions.join(","));
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
        
	});

	return UIOutElementsSystem;
});
