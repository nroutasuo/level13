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
            
            this.refreshSavedElements();
            GlobalSignals.calloutsGeneratedSignal.add(this.refreshSavedElements);
            this.updateTabVisibility();
            
            var sys = this;
            GlobalSignals.calloutsGeneratedSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.improvementBuiltSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.featureUnlockedSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.playerMovedSignal.add(function () { sys.updateTabVisibility(); });
            GlobalSignals.gameShownSignal.add(function () { sys.updateTabVisibility(); });
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
        
        onFeatureUnlocked: function () {
            this.updateTabVisibility();
        },
        
        onImprovementBuilt: function () {
            this.updateTabVisibility();
        },
    
        update: function (time) {
            this.updateButtons();
            this.updateProgressbars();
            this.updateTabs();
            this.updateInfoCallouts();
        },
        
        refreshSavedElements: function () {            
            this.elementsCalloutContainers = $(".callout-container");
        },
        
        updateButtons: function () {
            var sys = this;
            
            var uiFunctions = this.uiFunctions;
            
            $.each($("button.action"), function () {
                var isVisible = uiFunctions.isElementVisible(this);
                sys.updateButtonContainer($(this), isVisible);                
                if (!isVisible)
                    return;
                
                var action = $(this).attr("action");
                
                if (!action)
                    return;

                var isHardDisabled = sys.updateButtonDisabledState(this, action);
				sys.updateButtonCallout(this, action, isHardDisabled);
            });
        },
        
        updateButtonContainer: function (button, isVisible) {
            try {
                $(button).siblings(".cooldown-reqs").css("display", isVisible ? "block" : "none");
                $(button).parent(".container-btn-action").css("display", $(this).css("display"));
            } catch (ex) {
            }
        },
        
        updateButtonDisabledState: function (button, action) {
			var isAutoPlaying = this.autoPlayNodes.head;
            var disabledBase = this.isButtonDisabled($(button));
            var disabledVision = this.isButtonDisabledVision($(button));
            var disabledBasic = !disabledVision && disabledBase;
            var disabledResources = !disabledVision && !disabledBasic && this.isButtonDisabledResources($(button));
            var disabledCooldown = !disabledVision && !disabledBasic && !disabledResources && this.hasButtonCooldown($(button));
            var disabledDuration = !disabledVision && !disabledBasic && !disabledResources && !disabledCooldown && this.hasButtonDuration($(button));
            var isDisabled = disabledBasic || disabledVision || disabledResources || disabledCooldown || disabledDuration;
            $(button).toggleClass("btn-disabled", isDisabled);
            $(button).toggleClass("btn-disabled-basic", disabledBasic);
            $(button).toggleClass("btn-disabled-vision", disabledVision);
            $(button).parent(".container-btn-action").toggleClass("btn-disabled-vision", disabledVision);
            $(button).toggleClass("btn-disabled-resources", disabledResources);
            $(button).toggleClass("btn-disabled-cooldown", disabledCooldown || disabledDuration);
            $(button).attr("disabled", isDisabled || isAutoPlaying);
            return disabledBase || disabledVision;
        },
        
        updateButtonCallout: function (button, action, isHardDisabled) {			
            var playerActionsHelper = this.playerActions.playerActionsHelper;
            var fightHelper = this.fightHelper;
            var buttonHelper = this.buttonHelper;
            
            var playerVision = this.playerStatsNodes.head.vision.value;
            var playerHealth = this.playerStatsNodes.head.stamina.health;
            var showStorage = this.resourcesHelper.getCurrentStorageCap();
            
            var baseActionId = playerActionsHelper.getBaseActionID(action);
            var ordinal = playerActionsHelper.getOrdinal(action);
            var costFactor = playerActionsHelper.getCostFactor(action);
            var costs = playerActionsHelper.getCosts(action, ordinal, costFactor);
            var hasEnemies = fightHelper.hasEnemiesCurrentLocation(action);
            var injuryRisk = PlayerActionConstants.getInjuryProbability(action, playerVision);
            var inventoryRisk = PlayerActionConstants.getLoseInventoryProbability(action, playerVision);
            var fightRisk = hasEnemies ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision) : 0;
            var description = playerActionsHelper.getDescription(action);
            var hasCostBlockers = false;

            // Update callout content
            var content = description;
            var bottleNeckCostFraction = 1;
            var sectorEntity = buttonHelper.getButtonSectorEntity((button));
            var disabledReason = playerActionsHelper.checkRequirements(action, false, sectorEntity).reason;
            var isDisabledOnlyForCooldown = (!(disabledReason) && this.hasButtonCooldown($(button)));
            if (!isHardDisabled || isDisabledOnlyForCooldown) {
                var hasCosts = action && costs && Object.keys(costs).length > 0;
                if (hasCosts) {
                    if (content.length > 0) content += "<hr/>";
                    for (var key in costs) {
                        var itemName = key.replace("item_", "");
                        var item = ItemConstants.getItemByID(itemName);
                        var name = (this.uiFunctions.names.resources[key] ? this.uiFunctions.names.resources[key] : item !== null ? item.name : key).toLowerCase();
                        var value = costs[key];
                        var classes = "action-cost";
                        var costFraction = playerActionsHelper.checkCost(action, key);
                        if (costFraction < 1) classes += " action-cost-blocker";
                        if (isResource(key.split("_")[1]) && value > showStorage || key == "stamina" && value > playerHealth * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR) {
                            classes += " action-cost-blocker-storage";
                            hasCostBlockers = true;
                        }
                        else if (costFraction < bottleNeckCostFraction) bottleNeckCostFraction = costFraction;

                        if (value > 0) content += "<span class='" + classes + "'>" + name + ": " + value + "</span><br/>";
                    }
                }

                var duration = PlayerActionConstants.getDuration(baseActionId);
                if (duration > 0) {
                    if (content.length > 0) content += "<hr/>";
                    content += "<span class='action-duration'>duration: " + Math.round(duration * 100)/100 + "s</span>";
                }

                if (injuryRisk > 0 || fightRisk > 0 || inventoryRisk > 0) {
                    var inventoryRiskLabel = action === "despair" ? "lose items" : "lose item";
                    if (content.length > 0) content += "<hr/>";
                    if (injuryRisk > 0) content += "<span class='action-risk warning'>risk of injury: " + Math.round(injuryRisk * 100 * 100) / 100 + "%</span><br/>";
                    if (fightRisk > 0) content += "<span class='action-risk warning'>risk of fight: " + Math.round(fightRisk * 100 * 100) / 100 + "%</span><br/>";
                    if (inventoryRisk > 0) content += "<span class='action-risk warning'>" + inventoryRiskLabel + ": " + Math.round(inventoryRisk * 100 * 100) / 100 + "%</span>";
                }
            } else {
                if (content.length > 0) content += "<hr/>";
                content += "<span class='btn-disabled-reason action-cost-blocker'>" + disabledReason + "</span>";
            }
            
            $(button).siblings(".btn-callout").children(".btn-callout-content").html(content);
            $(button).parent().siblings(".btn-callout").children(".btn-callout-content").html(content);

            // Check requirements affecting req-cooldown
            bottleNeckCostFraction = Math.min(bottleNeckCostFraction, playerActionsHelper.checkRequirements(action, false, sectorEntity).value);
            if (hasCostBlockers) bottleNeckCostFraction = 0;
            if (isHardDisabled) bottleNeckCostFraction = 0;

            // Update cooldown overlays
            $(button).siblings(".cooldown-reqs").css("width", ((bottleNeckCostFraction) * 100) + "%");
            $(button).children(".cooldown-action").css("display", !isHardDisabled ? "inherit" : "none");
            $(button).children(".cooldown-duration").css("display", !isHardDisabled ? "inherit" : "none");
        },
        
        hasButtonCooldown: function (button) {
            return ($(button).attr("data-hasCooldown") === "true");
        },
			
        hasButtonDuration: function (button) {
            return ($(button).attr("data-isInProgress") === "true");
        },

        isButtonDisabledVision: function (button) {
            var action = $(button).attr("action");
            if (action) {
                var playerVision = this.playerStatsNodes.head.vision.value;
                var requirements = this.playerActions.playerActionsHelper.getReqs(action);
                if (requirements && requirements.vision) return (playerVision < requirements.vision[0]);
            }
            return false;
        },
            
        isButtonDisabled: function (button) {
            if ($(button).hasClass("btn-meta")) return false;

            if ($(button).attr("data-type") === "minus") {
                var input = $(button).siblings("input");
                return parseInt(input.val()) <= parseInt(input.attr("min"));
            }

            if ($(button).attr("data-type") === "plus") {
                var input = $(button).siblings("input");
                return parseInt(input.val()) >= parseInt(input.attr("max"));
            }

            if (!($(button).hasClass("action"))) return false;

            var action = $(button).attr("action");
            if (!action) return false;

            var sectorEntity = this.buttonHelper.getButtonSectorEntity(button);
            return this.playerActions.playerActionsHelper.checkRequirements(action, false, sectorEntity).value < 1;
        },

        isButtonDisabledResources: function (button) {
            var action = $(button).attr("action");
            return this.playerActions.playerActionsHelper.checkCosts(action, false) < 1;
        },
        
        updateProgressbars: function () {
            $.each($(".progress-wrap"), function () {
                if ($(this).is(":visible") && !($(this).data("animated") === true)) {
                    $(this).data("animated", true);
                    var percent = ($(this).data('progress-percent') / 100);
                    var animationLength = $(this).data("animation-counter") > 0 ? ($(this).data('animation-length')) : 0;
                    var progressWrapWidth = $(this).width();
                    var progressWidth = percent * progressWrapWidth;
                    $(this).children(".progress-bar").stop().animate({ left: progressWidth}, animationLength, function() {
                    $(this).parent().data("animated", false);
                    $(this).parent().data("animation-counter", $(this).parent().data("animation-counter") + 1);
                    });
                } else {
                    $(this).data("animation-counter", 0);
                }
            });
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
					uiFunctions.toggle(this, visible);
				}
            });
        },
    });

    return UIOutElementsSystem;
});
