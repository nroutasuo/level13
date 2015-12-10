define([
    'ash',
    'game/constants/UIConstants',
    'game/worldcreator/WorldCreator',
    'game/constants/PlayerActionConstants',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/AutoPlayNode',
    'game/nodes/sector/CampNode',
    'game/nodes/NearestCampNode',
    'game/components/common/CampComponent',
    'game/components/common/PositionComponent',
], function (Ash,
    UIConstants,
	WorldCreator,
	PlayerActionConstants,
	PlayerLocationNode,
	PlayerStatsNode,
	AutoPlayNode,
	CampNode,
	NearestCampNode,
	CampComponent,
	PositionComponent
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
        levelHelper: null,
        engine: null,
    
        constructor: function (uiFunctions, gameState, playerActions, resourcesHelper, levelHelper) {
            this.gameState = gameState;
            this.playerActions = playerActions;
            this.uiFunctions = uiFunctions;
            this.resourcesHelper = resourcesHelper;
            this.levelHelper = levelHelper;
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
        
        updateButtons: function () {
            var playerActionsHelper = this.playerActions.playerActionsHelper;
            var uiFunctions = this.uiFunctions;
            var levelHelper = this.levelHelper;
			
            var playerVision = this.playerStatsNodes.head.vision.value;
			var isAutoPlaying = this.autoPlayNodes.head;
            
            var hasButtonCooldown = function (button) {
                return ($(button).attr("data-hasCooldown") === "true");
            };
			
			var hasButtonDuration = function (button) {
                return ($(button).attr("data-isInProgress") === "true");
            };
			
			var getButtonSectorEntity = function (button) {
				var sector = $(button).attr("sector");
				var sectorEntity = null;
                if (sector) {
                    var l = parseInt(sector.split("-")[0]);
                    var s = parseInt(sector.split("-")[1]);
                    sectorEntity = levelHelper.getSectorByPosition(l, s);
                }
				return sectorEntity;
			};
			
			var isButtonDisabledVision = function (button) {
                var action = $(button).attr("action");
				if (action) {
					var requirements = playerActionsHelper.getReqs(action);
					if (requirements) return (playerVision < requirements.vision);
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
                
				var sectorEntity = getButtonSectorEntity(button);
                return playerActionsHelper.checkRequirements(action, false, sectorEntity).value < 1;
            };
            
            var isButtonDisabledResources = function (button) {
                var action = $(button).attr("action");
                return playerActionsHelper.checkCosts(action, false) < 1;
            };
            
			// TODO performance bottleneck - cache buttons? -> figure out when to update the lists (all/action buttons)
			
            // Update disabled status
            $.each($("button"), function () {
                var isVisible = ($(this).is(":visible"));
				if (!isVisible) return;
				
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
            });
            
            // Update button callouts and cooldowns
            var showStorage = this.resourcesHelper.getCurrentStorageCap();
            $.each($("button.action"), function () {
                var isVisible = ($(this).is(":visible"));
                $(this).siblings(".cooldown-reqs").css("display", isVisible ? "block" : "none");
                $(this).parent(".container-btn-action").css("display", $(this).css("display"));
                var action = $(this).attr("action");
                if (!action) {
                    // console.log("WARN: Action button w unknown action: " + $(this).attr("id"));
                    // skip updating
                } else if (!isVisible) {
                    // skip updating
                } else {
                    var ordinal = playerActionsHelper.getOrdinal(action);
                    var costFactor = playerActionsHelper.getCostFactor(action);
                    var costs = playerActionsHelper.getCosts(action, ordinal, costFactor);
                    var content = playerActionsHelper.getDescription(action);
                    var hasCosts = action && costs && Object.keys(costs).length > 0;
                    var hasCostBlockers = false;
                    var isHardDisabled = isButtonDisabled($(this)) || isButtonDisabledVision($(this));
                    var isResDisabled = isButtonDisabledResources($(this));

                    // Update callout content
                    var bottleNeckCostFraction = 1;
					var sectorEntity = getButtonSectorEntity((this));
                    var disabledReason = playerActionsHelper.checkRequirements(action, false, sectorEntity).reason;
                    var isDisabledOnlyForCooldown = (!(disabledReason) && hasButtonCooldown($(this)));
                    if (!isHardDisabled || isDisabledOnlyForCooldown) {
                        if (hasCosts) {
                            if (content.length > 0) content += "<hr/>";
                            for (var key in costs) {
                                var name = uiFunctions.names.resources[key] ? uiFunctions.names.resources[key] : key;
                                var value = costs[key];
                                var classes = "action-cost";
                                var costFraction = playerActionsHelper.checkCost(action, key);
                                if (costFraction < 1) classes += " action-cost-blocker";
                                if (isResource(key.split("_")[1]) && value > showStorage) {
                                    classes += " action-cost-blocker-storage";
                                    hasCostBlockers = true;
                                }
                                else if (costFraction < bottleNeckCostFraction) bottleNeckCostFraction = costFraction;
                                
								if (value > 0) content += "<span class='" + classes + "'>" + name + ": " + value + "</span><br/>";
                            }
                        }
                    } else {
                        if (content.length > 0) content += "<hr/>";
                        content += "<span class='btn-disabled-reason action-cost-blocker'>" + disabledReason + "</span>";
                    }
                    $(this).siblings(".btn-callout").children(".btn-callout-content").html(content);
                    $(this).parent().siblings(".btn-callout").children(".btn-callout-content").html(content);
                
                    // Check requirements affecting req-cooldown
                    bottleNeckCostFraction = Math.min(bottleNeckCostFraction, playerActionsHelper.checkRequirements(action, false).value);
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
            var levelHasCamp = this.nearestCampNodes.head != null;
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-in", null, levelHasCamp, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-upgrades", null, this.gameState.unlockedFeatures.upgrades, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-world", null, this.gameState.numCamps > 1, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-bag", null, this.gameState.unlockedFeatures.bag, 200, 0);
            this.uiFunctions.tabToggleIf("#switch-tabs #switch-out", null, true, 0, 0);
        },
        
        updateTabs: function () {
            var posHasCamp = this.currentLocationNodes.head != null && this.currentLocationNodes.head.entity.has(CampComponent);
            var levelCamp = this.nearestCampNodes.head;
            var currentCamp = levelCamp ? levelCamp.entity : null;
            if (currentCamp) {
				var campComponent = currentCamp.get(CampComponent);
				$("#switch-tabs #switch-in").text(campComponent.getName());
				$("#switch-tabs #switch-in").toggleClass("disabled", !posHasCamp);
            }
        },
        
        updateInfoCallouts: function () {
            // TODO performance bottleeck
            $.each($(".callout-container"), function () {
				if ($(this).children(".info-callout-target").length > 0) {
					var visible = true;
					$.each($(this).children(".info-callout-target").children(), function () {
						visible = visible && $(this).css("display") !== "none";
					});
					$(this).toggle(visible);
				}
            });
        },
    });

    return UIOutElementsSystem;
});
