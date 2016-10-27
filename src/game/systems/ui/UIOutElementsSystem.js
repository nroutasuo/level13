define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/PlayerStatConstants',
    'game/worldcreator/WorldCreator',
    'game/constants/PlayerActionConstants',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/AutoPlayNode',
    'game/nodes/sector/CampNode',
    'game/nodes/NearestCampNode',
    'game/components/common/CampComponent',
    'game/components/common/PositionComponent',
    'game/components/player/ItemsComponent'
], function (Ash,
    UIConstants,
    ItemConstants,
    PlayerStatConstants,
	WorldCreator,
	PlayerActionConstants,
	PlayerLocationNode,
	PlayerStatsNode,
	AutoPlayNode,
	CampNode,
	NearestCampNode,
	CampComponent,
	PositionComponent,
	ItemsComponent
) {
    var UIOutElementsSystem = Ash.System.extend({
	
        currentLocationNodes: null,
        campNodes: null,
        nearestCampNodes: null,
		playerStatsNodes: null,
		autoPlayNodes: null,
        
        elementsCalloutContainers: null,
        
        gameState: null,
        playerActions: null,
        uiFunctions: null,
        resourcesHelper: null,
        buttonHelper: null,
        engine: null,
    
        constructor: function (uiFunctions, gameState, playerActions, resourcesHelper, fightHelper, buttonHelper, calloutsGeneratedSignal) {
            this.gameState = gameState;
            this.playerActions = playerActions;
            this.uiFunctions = uiFunctions;
            this.resourcesHelper = resourcesHelper;
            this.fightHelper = fightHelper;
            this.buttonHelper = buttonHelper;
            this.calloutsGeneratedSignal = calloutsGeneratedSignal;
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
            this.calloutsGeneratedSignal.add(this.refreshSavedElements);
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
            this.updateButtons();
            this.updateProgressbars();
            this.updateTabVisibility();
            this.updateTabs();
            this.updateInfoCallouts();
        },
        
        refreshSavedElements: function () {            
            this.elementsCalloutContainers = $(".callout-container");
        },
        
        updateButtons: function () {
            var playerActionsHelper = this.playerActions.playerActionsHelper;
            var uiFunctions = this.uiFunctions;
            var fightHelper = this.fightHelper;
            var buttonHelper = this.buttonHelper;
			
            var playerVision = this.playerStatsNodes.head.vision.value;
            var playerHealth = this.playerStatsNodes.head.stamina.health;
			var isAutoPlaying = this.autoPlayNodes.head;
            
            var hasButtonCooldown = function (button) {
                return ($(button).attr("data-hasCooldown") === "true");
            };
			
			var hasButtonDuration = function (button) {
                return ($(button).attr("data-isInProgress") === "true");
            };
			
			var isButtonDisabledVision = function (button) {
                var action = $(button).attr("action");
				if (action) {
					var requirements = playerActionsHelper.getReqs(action);
					if (requirements && requirements.vision) return (playerVision < requirements.vision[0]);
				}
				return false;
			};
            
            var isButtonDisabled = function (button) {
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
                
				var sectorEntity = buttonHelper.getButtonSectorEntity(button);
                return playerActionsHelper.checkRequirements(action, false, sectorEntity).value < 1;
            };
            
            var isButtonDisabledResources = function (button) {
                var action = $(button).attr("action");
                return playerActionsHelper.checkCosts(action, false) < 1;
            };
            
			// TODO performance bottleneck - cache buttons? -> figure out when to update the lists (all/action buttons)
			
            var showStorage = this.resourcesHelper.getCurrentStorageCap();
            $.each($("button"), function () {
                // Update disabled status
                var isVisible = ($(this).is(":visible"));
				
                if (isVisible) {
                    var disabledVision = isButtonDisabledVision($(this));
                    var disabledBasic = !disabledVision && isButtonDisabled($(this));
                    var disabledResources = !disabledVision && !disabledBasic && isButtonDisabledResources($(this));
                    var disabledCooldown = !disabledVision && !disabledBasic && !disabledResources && hasButtonCooldown($(this));
                    var disabledDuration = !disabledVision && !disabledBasic && !disabledResources && !disabledCooldown && hasButtonDuration($(this));
                    var isDisabled = disabledBasic || disabledVision || disabledResources || disabledCooldown || disabledDuration;
                    $(this).toggleClass("btn-disabled", isDisabled);
                    $(this).toggleClass("btn-disabled-basic", disabledBasic);
                    $(this).toggleClass("btn-disabled-vision", disabledVision);
                    $(this).parent(".container-btn-action").toggleClass("btn-disabled-vision", disabledVision);
                    $(this).toggleClass("btn-disabled-resources", disabledResources);
                    $(this).toggleClass("btn-disabled-cooldown", disabledCooldown || disabledDuration);
                    $(this).attr("disabled", isDisabled || isAutoPlaying);
                }
                
                // Update button callouts and cooldowns
                $(this).siblings(".cooldown-reqs").css("display", isVisible ? "block" : "none");
                $(this).parent(".container-btn-action").css("display", $(this).css("display"));
                var action = $(this).attr("action");
				var baseActionId = playerActionsHelper.getBaseActionID(action);
                if (!action) {
                    // console.log("WARN: Action button w unknown action: " + $(this).attr("id"));
                    // skip updating
                } else if (!isVisible) {
                    // skip updating
                } else {
                    var ordinal = playerActionsHelper.getOrdinal(action);
                    var costFactor = playerActionsHelper.getCostFactor(action);
                    var costs = playerActionsHelper.getCosts(action, ordinal, costFactor);
					var duration = PlayerActionConstants.getDuration(action);
                    var hasEnemies = fightHelper.hasEnemiesCurrentLocation(action);
					var injuryRisk = PlayerActionConstants.getInjuryProbability(action, playerVision);
                    var inventoryRisk = PlayerActionConstants.getLoseInventoryProbability(action, playerVision);
					var fightRisk = hasEnemies ? PlayerActionConstants.getRandomEncounterProbability(baseActionId, playerVision) : 0;
					var description = playerActionsHelper.getDescription(action);
                    var hasCosts = action && costs && Object.keys(costs).length > 0;
                    var hasCostBlockers = false;
                    var isHardDisabled = isButtonDisabled($(this)) || isButtonDisabledVision($(this));

                    // Update callout content
                    var content = description;
                    var bottleNeckCostFraction = 1;
					var sectorEntity = buttonHelper.getButtonSectorEntity((this));
                    var disabledReason = playerActionsHelper.checkRequirements(action, false, sectorEntity).reason;
                    var isDisabledOnlyForCooldown = (!(disabledReason) && hasButtonCooldown($(this)));
                    if (!isHardDisabled || isDisabledOnlyForCooldown) {
                        if (hasCosts) {
                            if (content.length > 0) content += "<hr/>";
                            for (var key in costs) {
                                var itemName = key.replace("item_", "");
                                var item = ItemConstants.getItemByID(itemName);
                                var name = (uiFunctions.names.resources[key] ? uiFunctions.names.resources[key] : item !== null ? item.name : key).toLowerCase();
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
                    $(this).siblings(".btn-callout").children(".btn-callout-content").html(content);
                    $(this).parent().siblings(".btn-callout").children(".btn-callout-content").html(content);
                
                    // Check requirements affecting req-cooldown
                    bottleNeckCostFraction = Math.min(bottleNeckCostFraction, playerActionsHelper.checkRequirements(action, false, sectorEntity).value);
					if (hasCostBlockers) bottleNeckCostFraction = 0;
					if (isHardDisabled) bottleNeckCostFraction = 0;
                    
                    // Update cooldown overlays
                    var hasReqsCooldown = ($(this).hasClass("btn-disabled-resources") && hasCosts && !hasCostBlockers);
                    $(this).siblings(".cooldown-reqs").css("width", ((bottleNeckCostFraction) * 100) + "%");
                    $(this).children(".cooldown-action").css("display", !isHardDisabled ? "inherit" : "none");
                    $(this).children(".cooldown-duration").css("display", !isHardDisabled ? "inherit" : "none");
                }
            });
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
            var isInCamp = this.playerStatsNodes.head && this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
            var hasMap = this.playerStatsNodes.head.entity.get(ItemsComponent).getCountById(ItemConstants.itemDefinitions.uniqueEquipment[0].id, true) > 0;
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-in", null, isInCamp, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-upgrades", null, isInCamp && this.gameState.unlockedFeatures.upgrades, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-blueprints", null, this.gameState.unlockedFeatures.blueprints, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-world", null, isInCamp && this.gameState.numCamps > 1, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-bag", null, this.gameState.unlockedFeatures.bag, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-followers", null, this.gameState.unlockedFeatures.followers, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-out", null, true, 0, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-map", null, hasMap, 200, 0);
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
            $.each(this.elementsCalloutContainers, function () {
                targets = $(this).children(".info-callout-target");
				if (targets.length > 0) {
					var visible = true;
					$.each(targets.children(), function () {
						visible = visible && $(this).css("display") !== "none";
					});
					$(this).toggle(visible);
				}
            });
        },
    });

    return UIOutElementsSystem;
});
