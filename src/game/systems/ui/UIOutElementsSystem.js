define([
	'ash',
	'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/UIConstants',
	'game/constants/PlayerActionConstants',
	'game/nodes/PlayerLocationNode',
	'game/nodes/player/PlayerStatsNode',
], function (Ash,
	Text,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	UIConstants,
	PlayerActionConstants,
	PlayerLocationNode,
	PlayerStatsNode
) {
	var UIOutElementsSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		playerStatsNodes: null,

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
			
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);

			this.refreshGlobalSavedElements();
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.updateButtonsSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.featureUnlockedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.elementCreatedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.actionButtonClickedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onElementsVisibilityChanged);
			GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
			
			GlobalSignals.add(this, GlobalSignals.elementToggledSignal, this.onElementToggled);
			GlobalSignals.add(this, GlobalSignals.updateButtonsSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.actionStartedSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.playerMoveStartedSignal, this.onButtonStatusChanged);
			GlobalSignals.add(this, GlobalSignals.playerMoveCompletedSignal, this.onButtonStatusChanged);
			
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.refreshGlobalSavedElements);
			GlobalSignals.add(this, GlobalSignals.calloutsGeneratedSignal, this.refreshGlobalSavedElements);
			this.elementsVisibilityChanged = true;
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerLocationNodes = null;
			this.playerStatsNodes = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.uiStatus.isTransitioning) return;
			
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
				if (GameConstants.isDebugVersion) log.w("element visibility updated too often");
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
			return GameGlobals.buttonHelper.updateButtonDisabledState($button, buttonElements.container, playerVision);
		},

		updateButtonCallout: function ($button, action, buttonStatus, buttonElements, isHardDisabled) {
			let $enabledContent = buttonElements.calloutContentEnabled;
			let $disabledContent = buttonElements.calloutContentDisabled;

			let costs = GameGlobals.playerActionsHelper.getCosts(action);

			let costsStatus = {};
			costsStatus.hasCostBlockers = false;
			costsStatus.bottleneckCostFraction = 1;

			// callout content
			let sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button);
			let disabledReason = GameGlobals.playerActionsHelper.checkRequirements(action, false, sectorEntity).reason;
			let hasCooldown = GameGlobals.buttonHelper.hasButtonCooldown($button);
			let isDisabledOnlyForCooldown = !disabledReason && hasCooldown;
			let showDescription = disabledReason.baseReason != PlayerActionConstants.DISABLED_REASON_MAX_IMPROVEMENT_LEVEL;
			
			this.updateButtonCalloutDescription($button, action, buttonStatus, buttonElements, showDescription);

			// override empty callout for buttons that normally don't have callout but show disabled reason when disabled (such as "take all")
			let showReason = isHardDisabled || isDisabledOnlyForCooldown;
			buttonElements.container.parent().toggleClass("container-btn-action-disabled-reason", showReason);
			
			if (!isHardDisabled && !isDisabledOnlyForCooldown) {
				GameGlobals.uiFunctions.toggle($enabledContent, true, this.buttonCalloutSignalParams);
				GameGlobals.uiFunctions.toggle($disabledContent, false, this.buttonCalloutSignalParams);
				let hasCosts = action && costs && Object.keys(costs).length > 0;
				if (hasCosts) {
					this.updateButtonCalloutCosts($button, action, buttonStatus, buttonElements, costs, costsStatus);
				}
				this.updateButtonCalloutRisks($button, action, buttonElements);
				this.updateButtonSpecialReqs($button, action, buttonElements);
			} else {
				let lastReason = buttonStatus.disabledReason;
				let displayReason = Text.t(disabledReason);
				if (isDisabledOnlyForCooldown) {
					displayReason = "Cooldown " + PlayerActionConstants.getCooldown(action) + "s";
				}
				if (lastReason !== displayReason) {
					GameGlobals.uiFunctions.toggle($enabledContent, false, this.buttonCalloutSignalParams);
					GameGlobals.uiFunctions.toggle($disabledContent, true, this.buttonCalloutSignalParams);
					buttonElements.calloutSpanDisabledReason.html(displayReason);
					buttonStatus.disabledReason = displayReason;
				}
			}
			
			buttonStatus.isInProgress = GameGlobals.playerActionsHelper.isInProgress(action, sectorEntity);

			// overlays
			this.updateButtonCooldownOverlays($button, action, buttonStatus, buttonElements, sectorEntity, isHardDisabled, costsStatus);
		},
		
		updateButtonCalloutDescription: function ($button, action, buttonStatus, buttonElements, showDescription) {
			let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			let dynamicDescription = GameGlobals.playerActionsHelper.getEffectDescription(action);
			let showDynamicDescription = showDescription && dynamicDescription && dynamicDescription.length > 0;

			GameGlobals.uiFunctions.toggle(buttonElements.dynamicDescriptionSpanContainer, showDynamicDescription);
			if (showDynamicDescription) {
				buttonElements.dynamicDescriptionSpan.html(dynamicDescription);
			}

			if (!GameGlobals.playerActionsHelper.isImproveBuildingAction(baseActionID) && !GameGlobals.playerActionsHelper.isBuildImprovementAction(baseActionID)) {
				return;
			}
			
			GameGlobals.uiFunctions.toggle(buttonElements.calloutDisabledDivider, showDescription);
			GameGlobals.uiFunctions.toggle(buttonElements.descriptionSpan, showDescription);
			buttonElements.descriptionSpan.html(GameGlobals.playerActionsHelper.getDescription(action));
		},

		updateButtonCalloutCosts: function ($button, action, buttonStatus, buttonElements, costs, costsStatus) {
			if (!buttonStatus.displayedCosts) buttonStatus.displayedCosts = {};
			GameGlobals.uiFunctions.updateCostsSpans(action, costs, buttonElements, costsStatus, buttonStatus.displayedCosts, this.buttonCalloutSignalParams);
		},

		updateButtonCalloutRisks: function ($button, action, buttonElements) {
			var sectorEntity = GameGlobals.buttonHelper.getButtonSectorEntity($button) || this.playerLocationNodes.head.entity;
			var playerVision = this.playerStatsNodes.head.vision.value;
			var hasEnemies = GameGlobals.fightHelper.hasEnemiesCurrentLocation(action);
			var baseActionId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var encounterFactor = GameGlobals.playerActionsHelper.getEncounterFactor(action);
			var sectorDangerFactor = GameGlobals.sectorHelper.getDangerFactor(sectorEntity);

			let inCamp = GameGlobals.playerHelper.isInCamp();

			let injuryRisk = inCamp ? 0 : GameGlobals.playerActionsHelper.getInjuryProbability(action);
			let inventoryRisk = inCamp ? 0 : GameGlobals.playerActionsHelper.getLoseInventoryProbability(action);
			
			var fightRisk = hasEnemies ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision, sectorDangerFactor, encounterFactor) : 0;
			var fightRiskBase = fightRisk > 0 ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision, sectorDangerFactor, encounterFactor) : 0;
			var fightRiskVision = fightRisk - fightRiskBase;
			
			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInjury, injuryRisk > 0, this.buttonCalloutSignalParams);
			if (injuryRisk > 0)
				buttonElements.calloutRiskInjuryValue.text(UIConstants.roundValue(injuryRisk * 100, true, true));

			GameGlobals.uiFunctions.toggle(buttonElements.calloutRiskInventory, inventoryRisk > 0, this.buttonCalloutSignalParams);
			if (inventoryRisk > 0)
				buttonElements.calloutRiskInventoryValue.text(UIConstants.roundValue(inventoryRisk * 100, true, true));

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
			if (isHardDisabled || buttonStatus.isInProgress) costsStatus.bottleneckCostFraction = 0;

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
			let sys = this;
			$.each(this.elementsCalloutContainers, function () {
				sys.updateInfoCallout($(this));
			});
		},

		updateInfoCallout: function ($elem) {
			let targets = $elem.children(".info-callout-target");
			if (targets.length > 0) {
				var visible = true;
				$.each(targets, function() {
					visible = visible && $elem.css("display") !== "none";
				});
				$.each(targets.children(), function () {
					visible = visible && $elem.css("display") !== "none";
				});
				GameGlobals.uiFunctions.toggle($elem, visible, this.buttonCalloutSignalParams);
			}
			let sideTargets = $elem.children(".info-callout-target-side");
			if (sideTargets.length > 0) {
				$elem.children(".info-callout").css("left", $elem.width() + "px")
			}
		},

		// TODO performance
		updateButtonContainer: function (button, isVisible) {
			$(button).siblings(".cooldown-reqs").css("display", isVisible ? "block" : "none");
			let container = $(button).parent().parent(".callout-container");
			if (container) {
				let buttonDisplay = $(button).css("display");
				let isContainerHidden = buttonDisplay === "none" && !isVisible;
				$(container).css("display", isContainerHidden ? "none" : "inline-block");
			}
		},

		updateVisibleButtonsList: function () {
			this.elementsVisibleButtons = [];
			this.buttonStatuses = [];
			this.buttonElements = [];
			var buttonActions = [];
			var sys = this;

			let currentTab = GameGlobals.gameState.uiStatus.currentTab;

			$.each($("button.action"), function () {
				let $button = $(this);

				let buttonTab = $button.data("tab");
				if (buttonTab && buttonTab !== currentTab) return;

				let action = $button.attr("action");

				let isVisible = GameGlobals.uiFunctions.isElementToggled($button) === true || GameGlobals.uiFunctions.isElementVisible($button);

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
					elements.calloutCostsCountdownContainer = elements.calloutContentEnabled.children(".action-costs-countdown-container")
					elements.calloutCostsCountdown = elements.calloutCostsCountdownContainer.children(".action-costs-countdown")
					elements.descriptionSpan = elements.calloutContent.children(".action-description");
					elements.dynamicDescriptionSpanContainer = elements.calloutContent.children(".action-effect-description-container");
					elements.dynamicDescriptionSpan = elements.dynamicDescriptionSpanContainer.children(".action-effect-description");
					elements.cooldownReqs = $button.siblings(".cooldown-reqs");
					elements.cooldownDuration = $button.children(".cooldown-duration");
					elements.cooldownAction = $button.children(".cooldown-action");
					
					let costs = GameGlobals.playerActionsHelper.getCosts(action);
					UIConstants.getCostsSpansElements(action, costs, elements, elements.calloutContentEnabled);
					
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

		onElementToggled: function ($elem, show, params) {
			this.onElementsVisibilityChanged($elem, show, params);

			$elem = $($elem);

			// if an info callout target was toggled, toggle its parent container asap instead of waiting for general update
			if ($elem && $elem.hasClass("info-callout-target")) {
				this.updateInfoCallout($elem.parent(".callout-container"))
			}
		},
		
		onElementsVisibilityChanged: function (elements, show, params) {
			if (params && params.isButtonCalloutElement) {
				return;
			}
			this.elementsVisibilityChanged = true;
		},
		
		onButtonStatusChanged: function () {
			this.buttonStatusChanged = true;
		},

		onPopupClosed: function () {
			this.elementsVisibilityChanged = true;
			GameGlobals.uiFunctions.updateButtonCooldowns();
		}
		
	});

	return UIOutElementsSystem;
});
