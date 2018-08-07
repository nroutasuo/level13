define([
    'ash',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/PlayerStatConstants',
    'game/constants/PlayerActionConstants',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/AutoPlayNode',
    'game/nodes/sector/CampNode',
    'game/nodes/NearestCampNode',
    'game/components/common/CampComponent',
    'game/components/common/PositionComponent',
    'game/components/player/ItemsComponent',
    'game/components/sector/improvements/SectorImprovementsComponent'
], function (Ash,
    GlobalSignals,
    UIConstants,
    ItemConstants,
    PlayerStatConstants,
	PlayerActionConstants,
	PlayerLocationNode,
	PlayerStatsNode,
	AutoPlayNode,
	CampNode,
	NearestCampNode,
	CampComponent,
	PositionComponent,
	ItemsComponent,
    SectorImprovementsComponent
) {
    var UIOutElementsSystem = Ash.System.extend({
	
        currentLocationNodes: null,
        campNodes: null,
        nearestCampNodes: null,
		playerStatsNodes: null,
		autoPlayNodes: null,
        
        gameState: null,
        playerActions: null,
        uiFunctions: null,
        resourcesHelper: null,
        buttonHelper: null,
        engine: null,
		
        elementsCalloutContainers: null,
        elementsVisibleButtons: [],
        elementsVisibleProgressbars: [],
        
        buttonStatuses: [], // same indices as visible buttons
        buttonElements: [], // same indices as visible buttons
    
        constructor: function (uiFunctions, gameState, playerActions, resourcesHelper, fightHelper, buttonHelper) {
            this.gameState = gameState;
            this.playerActions = playerActions;
            this.uiFunctions = uiFunctions;
            this.resourcesHelper = resourcesHelper;
            this.fightHelper = fightHelper;
            this.buttonHelper = buttonHelper;            
            return this;
        },
    
        addToEngine: function (engine) {
            this.engine = engine;
            this.currentLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.campNodes = engine.getNodeList(CampNode);
            this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);
            
            this.campNodes.nodeAdded.add(this.onCampNodeAdded, this);
            this.campNodes.nodeRemoved.add(this.onCampNodeRemoved, this);
            
            this.refreshGlobalSavedElements();
            GlobalSignals.calloutsGeneratedSignal.add(this.refreshGlobalSavedElements);
            this.updateTabVisibility();
            
            var sys = this;
            GlobalSignals.calloutsGeneratedSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.improvementBuiltSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.featureUnlockedSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.playerMovedSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.gameShownSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.elementToggledSignal.add(function () { sys.elementsVisibilityChanged = true; });
            GlobalSignals.elementCreatedSignal.add(function () { sys.elementsVisibilityChanged = true; });
        },
    
        removeFromEngine: function (engine) {
            this.engine = null;
            this.currentLocationNodes = null;
            this.campNodes = null;
            this.nearestCampNodes = null;
			this.autoPlayNodes = null;
        },
        
        onCampNodeAdded: function (node) {
            this.updateTabVisibility();
        },
        
        onCampNodeRemoved: function (node) {
            this.updateTabVisibility();
        },
    
        update: function (time) {
            if (this.elementsVisibilityChanged) {
                this.updateVisibleButtonsList();
                this.updateVisibleProgressbarsList();
                this.elementsVisibilityChanged = false;
            }
            
            this.updateButtons();
            this.updateProgressbars();
            this.updateTabs();
            this.updateInfoCallouts();
        },
        
        refreshGlobalSavedElements: function () {            
            this.elementsCalloutContainers = $(".callout-container");
        },
        
        updateButtons: function () {
            var sys = this;            
            var uiFunctions = this.uiFunctions;
            
            for (var i = 0; i < this.elementsVisibleButtons.length; i++) {
                var $button = $(this.elementsVisibleButtons[i]);                
                var action = $button.attr("action");
                if (!action)
                    return;

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

            var playerActionsHelper = this.playerActions.playerActionsHelper;
            var buttonHelper = this.buttonHelper;
            
            var ordinal = playerActionsHelper.getOrdinal(action);
            var costFactor = playerActionsHelper.getCostFactor(action);
            var costs = playerActionsHelper.getCosts(action, ordinal, costFactor);
            
            var costsStatus = {};
            costsStatus.hasCostBlockers = false;
            costsStatus.bottleneckCostFraction = 1;

            // callout content
            var sectorEntity = buttonHelper.getButtonSectorEntity($button);
            var disabledReason = playerActionsHelper.checkRequirements(action, false, sectorEntity).reason;
            var isDisabledOnlyForCooldown = (!(disabledReason) && this.hasButtonCooldown($button));
            if (!isHardDisabled || isDisabledOnlyForCooldown) {
                this.uiFunctions.toggle($enabledContent, true);
                this.uiFunctions.toggle($disabledContent, false);
                var hasCosts = action && costs && Object.keys(costs).length > 0;
                if (hasCosts) {
                    this.updateButtonCalloutCosts($button, action, buttonStatus, buttonElements, costs, costsStatus);
                }
                this.updateButtonCalloutRisks($button, action, buttonElements);
            } else {
                var lastReason = buttonStatus.disabledReason;
                if (lastReason !== disabledReason) {
                    this.uiFunctions.toggle($enabledContent, false);
                    this.uiFunctions.toggle($disabledContent, true);
                    buttonElements.calloutSpanDisabledReason.html(disabledReason);
                    buttonStatus.disabledReason = disabledReason;
                }
            }

            // overlays
            this.updateButtonCooldownOverlays($button, action, buttonStatus, buttonElements, sectorEntity, isHardDisabled, costsStatus);
        },
        
        updateButtonCalloutCosts: function($button, action, buttonStatus, buttonElements, costs, costsStatus) {
            var playerHealth = this.playerStatsNodes.head.stamina.health;
            var showStorage = this.resourcesHelper.getCurrentStorageCap();
            if (!buttonStatus.displayedCosts) buttonStatus.displayedCosts = {};
            for (var key in costs) {
                var $costSpan = buttonElements.costSpans[key];
                var value = costs[key];
                var costFraction = this.playerActions.playerActionsHelper.checkCost(action, key);
                var isFullCostBlocker = (isResource(key.split("_")[1]) && value > showStorage) || (key == "stamina" && value > playerHealth * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
                if (isFullCostBlocker) {
                    costsStatus.hasCostBlockers = true;
                }
                else if (costFraction < costsStatus.bottleneckCostFraction)  {
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
            var hasEnemies = this.fightHelper.hasEnemiesCurrentLocation(action);
            var baseActionId = this.playerActions.playerActionsHelper.getBaseActionID(action);
            
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
                this.uiFunctions.toggle(buttonElements.calloutRiskInjury, injuryRisk > 0);
                if (injuryRisk > 0) 
                    buttonElements.calloutRiskInjuryValue.text(UIConstants.roundValue((injuryRiskBase + injuryRiskVision) * 100, true, true));

                this.uiFunctions.toggle(buttonElements.calloutRiskInventory, inventoryRisk > 0);
                if (inventoryRisk > 0) 
                    buttonElements.calloutRiskInventoryValue.text(UIConstants.roundValue((inventoryRiskBase + inventoryRiskVision) * 100, true, true));

                this.uiFunctions.toggle(buttonElements.calloutRiskFight, fightRisk > 0);
                if (fightRisk > 0) 
                    buttonElements.calloutRiskFightValue.text(UIConstants.roundValue((fightRiskBase + fightRiskVision) * 100, true, true));
            }
        },
        
        updateButtonCooldownOverlays: function($button, action, buttonStatus, buttonElements, sectorEntity, isHardDisabled, costsStatus) {
            costsStatus.bottleneckCostFraction = Math.min(costsStatus.bottleneckCostFraction, this.playerActions.playerActionsHelper.checkRequirements(action, false, sectorEntity).value);
            if (costsStatus.hasCostBlockers) costsStatus.bottleneckCostFraction = 0;
            if (isHardDisabled) costsStatus.bottleneckCostFraction = 0;
                
            if (buttonStatus.bottleneckCostFraction !== costsStatus.bottleneckCostFraction) {
                buttonElements.cooldownReqs.css("width", ((costsStatus.bottleneckCostFraction) * 100) + "%");
                buttonStatus.bottleneckCostFraction = costsStatus.bottleneckCostFraction;
            }
            if (buttonStatus.isHardDisabled !== isHardDisabled) {
                buttonElements.cooldownDuration.css("display", !isHardDisabled ? "inherit" : "none");
                buttonStatus.isHardDisabled = isHardDisabled;
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
                var requirements = this.playerActions.playerActionsHelper.getReqs(action);
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

            var sectorEntity = this.buttonHelper.getButtonSectorEntity($button);
            var reqsCheck = this.playerActions.playerActionsHelper.checkRequirements(action, false, sectorEntity);
            
            return reqsCheck.value < 1 && reqsCheck.reason !== PlayerActionConstants.UNAVAILABLE_REASON_LOCKED_RESOURCES;
        },

        isButtonDisabledResources: function (button) {
            var action = $(button).attr("action");
            return this.playerActions.playerActionsHelper.checkCosts(action, false) < 1;
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
                    $progressbar.children(".progress-bar").stop().animate({ left: progressWidth}, animationLength, function() {
                        $(this).parent().data("animated", false);
                        $(this).parent().data("animation-counter", $progressbar.parent().data("animation-counter") + 1);
                    });
                } else {
                    $progressbar.data("animation-counter", 0);
                }
            }
        },
        
        updateTabVisibility: function () {
            if (!this.playerStatsNodes.head) return;
            var levelCamp = this.nearestCampNodes.head;
            var currentCamp = levelCamp ? levelCamp.entity : null;
            var isInCamp = this.playerStatsNodes.head && this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
            var hasMap = this.playerStatsNodes.head.entity.get(ItemsComponent).getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) > 0;
            var hasProjects = this.gameState.unlockedFeatures.projects;
            var hasTradingPost = currentCamp && currentCamp.get(SectorImprovementsComponent).getCount(improvementNames.tradepost) > 0;
            
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-in", null, isInCamp, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-upgrades", null, isInCamp && this.gameState.unlockedFeatures.upgrades, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-blueprints", null, this.gameState.unlockedFeatures.blueprints, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-world", null, isInCamp && this.gameState.numCamps > 1, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-bag", null, this.gameState.unlockedFeatures.bag, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-followers", null, this.gameState.unlockedFeatures.followers, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-out", null, true, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-map", null, hasMap, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-trade", null, isInCamp && hasTradingPost, 100, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-projects", null, isInCamp && hasProjects, 100, 0);
        },        
        
        updateButtonContainer: function (button, isVisible) {
            $(button).siblings(".cooldown-reqs").css("display", isVisible ? "block" : "none");
            var container = $(button).parent().parent(".callout-container");
            if (container) {
                $(container).css("display", $(button).css("display"));
            }
        },
        
        updateVisibleButtonsList: function () {
            var playerActionsHelper = this.playerActions.playerActionsHelper;
            this.elementsVisibleButtons = [];
            this.buttonStatuses = [];
            this.buttonElements = [];
            var sys = this;
            $.each($("button.action"), function () {
                var $button = $(this);          
                var action = $button.attr("action");
                var isVisible = (sys.uiFunctions.isElementToggled($button) !== false) && sys.uiFunctions.isElementVisible($button);
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
            
                    var ordinal = playerActionsHelper.getOrdinal(action);
                    var costFactor = playerActionsHelper.getCostFactor(action);
                    var costs = playerActionsHelper.getCosts(action, ordinal, costFactor);            
                    elements.costSpans = {};
                    elements.costSpanValues = {};
                    for (var key in costs) {
                        elements.costSpans[key] = elements.calloutContentEnabled.children(".action-cost-" + key);
                        elements.costSpanValues[key] = elements.costSpans[key].children(".action-cost-value");
                    }
                    sys.buttonElements.push(elements);
                }
            });
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
        
        updateTabs: function () {
            var posHasCamp = this.currentLocationNodes.head != null && this.currentLocationNodes.head.entity.has(CampComponent);
            var levelCamp = this.nearestCampNodes.head;
            var currentCamp = levelCamp ? levelCamp.entity : null;
            if (currentCamp) {
				var campComponent = currentCamp.get(CampComponent);
				$("#switch-tabs #switch-in .name").text(campComponent.getType());
				$("#switch-tabs #switch-in").toggleClass("disabled", !posHasCamp);
				$("#switch-tabs #switch-world").toggleClass("disabled", !posHasCamp);
            }
        },
        
        updateInfoCallouts: function () {
            var targets;
            var uiFunctions = this.uiFunctions;
            $.each(this.elementsCalloutContainers, function () {
                targets = $(this).children(".info-callout-target");
				if (targets.length > 0) {
					var visible = true;
					$.each(targets.children(), function () {
						visible = visible && $(this).css("display") !== "none";
					});
					uiFunctions.toggle($(this), visible);
				}
            });
        },
    });

    return UIOutElementsSystem;
});
