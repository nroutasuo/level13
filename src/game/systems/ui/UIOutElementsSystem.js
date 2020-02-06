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
            
            GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);

			this.refreshGlobalSavedElements();
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.updateButtonsSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.featureUnlockedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.elementToggledSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.elementCreatedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.actionButtonClickedSignal, this.onElementsVisibilityChanged);
            
			GlobalSignals.add(this, GlobalSignals.updateButtonsSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.actionStartedSignal, this.onButtonStatusChanged);
            
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.refreshGlobalSavedElements);
			GlobalSignals.add(this, GlobalSignals.calloutsGeneratedSignal, this.refreshGlobalSavedElements);
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
            this.updateVisibleButtonsList();
            this.updateButtons();
        },

		refreshGlobalSavedElements: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.elementsCalloutContainers = $(".callout-container");
		},

		updateButtons: function () {
			var sys = this;
            var actions = [];
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
                actions.push(action + "(" + isHardDisabled + ")");
			}
            // log.i("updated buttons " + actions.join(","));
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

			var costs = GameGlobals.playerActionsHelper.getCosts(action);

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
					GameGlobals.uiFunctions.toggle($costSpan, value > 0);
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
			var fightRiskBase = fightRisk > 0 ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision) : 0;
			var fightRiskVision = fightRisk - fightRiskBase;
			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInjury, injuryRisk > 0);
			if (injuryRisk > 0)
				buttonElements.calloutRiskInjuryValue.text(UIConstants.roundValue((injuryRiskBase + injuryRiskVision) * 100, true, true));

			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInventory, inventoryRisk > 0);
			if (inventoryRisk > 0)
				buttonElements.calloutRiskInventoryValue.text(UIConstants.roundValue((inventoryRiskBase + inventoryRiskVision) * 100, true, true));

			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskFight, fightRisk > 0);
			if (fightRisk > 0)
				buttonElements.calloutRiskFightValue.text(UIConstants.roundValue((fightRiskBase + fightRiskVision) * 100, true, true));
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
                var id = $progressbar.attr("id");
                
                // bar
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
        
        onElementsVisibilityChanged: function () {
            this.elementsVisibilityChanged = true;
        },
        
        onButtonStatusChanged: function () {
            this.buttonStatusChanged = true;
        }
        
	});

	return UIOutElementsSystem;
});
