// A class that checks raw user input from the DOM and passes game-related actions to PlayerActionFunctions
define(['ash',
        'game/GlobalSignals',
        'game/constants/GameConstants',
        'game/constants/UIConstants',
        'game/constants/ItemConstants',
        'game/constants/PlayerActionConstants',
        'game/constants/PositionConstants',
        'game/helpers/ui/UIPopupManager',
        'game/helpers/ui/ChangeLogHelper',
        'game/vos/ResourcesVO'],
function (Ash, GlobalSignals, GameConstants, UIConstants, ItemConstants, PlayerActionConstants, PositionConstants, UIPopupManager, ChangeLogHelper, ResourcesVO) {
    var UIFunctions = Ash.Class.extend({
        
        playerActions: null,
        gameState: null,
        saveSystem: null,
        cheatSystem: null,
        
        popupManager: null,
        changeLogHelper: null,
        
        elementIDs: {
            tabs: {
                bag: "switch-bag",
                followers: "switch-followers",
                projects: "switch-projects",
                map: "switch-map",
                trade: "switch-trade",
                in: "switch-in",
                out: "switch-out",
                upgrades: "switch-upgrades",
                blueprints: "switch-blueprints",
                world: "switch-world"
            },
        },
        
        names: {
            resources: {
                stamina: "stamina",
                resource_metal: "metal",
                resource_fuel: "fuel",
                resource_rope: "rope",
                resource_food: "food",
                resource_water: "water",
                resource_concrete: "concrete",
                resource_herbs: "herbs",
                resource_medicine: "medicine",
                resource_tools: "tools",
                item_exploration_1: "lock pick",
                rumours: "rumours",
                evidence: "evidence",
            }
        },
        
        constructor: function (playerActions, gameState, saveSystem, cheatSystem) {
            this.playerActions = playerActions;
            this.gameState = gameState;
            this.saveSystem = saveSystem;
            this.cheatSystem = cheatSystem;

            this.generateElements();
            this.registerListeners();
            
            this.popupManager = new UIPopupManager(this.gameState, this.playerActions.playerActionResultsHelper, this);
            this.changeLogHelper = new ChangeLogHelper();
        },
        
        registerListeners: function () {
            var elementIDs = this.elementIDs;
            var gameState = this.gameState;
            var playerActions = this.playerActions;
            var uiFunctions = this;
            
            $(window).resize(this.onResize());
            
            // Switch tabs
            var onTabClicked = this.onTabClicked;
            $.each($("#switch-tabs li"), function () {
                $(this).click(function () {
                    if (!($(this).hasClass("disabled"))) {
                        onTabClicked(this.id, gameState, uiFunctions);
                    }
                });
            });
            
            // Collapsible divs
            $(".collapsible-header").click(function () {
                $(this).toggleClass("collapsible-collapsed", $(this).next(".collapsible-content").is(":visible"));
                $(this).toggleClass("collapsible-open", !($(this).next(".collapsible-content").is(":visible")));
                $(this).next(".collapsible-content").slideToggle(300);
            });
            $.each($(".collapsible-header"), function () {
                $(this).next(".collapsible-content").slideToggle(300);
                $(this).toggleClass("collapsible-collapsed", !($(this).next(".collapsible-content").is(":visible")));
                $(this).toggleClass("collapsible-open", $(this).next(".collapsible-content").is(":visible"));
            });
            
            // Steppers and stepper buttons
            this.registerStepperListeners("");
            
            // Action buttons buttons
            this.registerActionButtonListeners("");
            
            // Meta/non-action buttons
            var saveSystem = this.saveSystem;
            $("#btn-save").click(function (e) {saveSystem.save() });
            $("#btn-restart").click(function (e) {
                uiFunctions.showConfirmation(
                    "Do you want to restart the game? Your progress will be lost.",
                    function () {
                        uiFunctions.restart();
                    });
            });
            $("#btn-more").click(function (e) {
                $("#game-options-extended").toggle();
                $(this).text($("#game-options-extended").is(":visible") ? "less" : "more");
            });
            $("#btn-importexport").click(function (e) {
                uiFunctions.showInfoPopup(UIConstants.FEATURE_MISSING_TITLE, UIConstants.FEATURE_MISSING_COPY);
            });
            $("#btn-info").click(function (e) {
                uiFunctions.showInfoPopup("Level 13", uiFunctions.getGameInfoDiv());
            });
            
            $("#in-assign-workers button").click( function (e) {
                var scavengers = parseInt($("#stepper-scavenger input").val());
                var trappers = parseInt($("#stepper-trapper input").val());
                var waters = parseInt($("#stepper-water input").val());
                var ropers = parseInt($("#stepper-rope input").val());
                var chemists = parseInt($("#stepper-fuel input").val());
                var apothecaries = parseInt($("#stepper-medicine input").val());
                var smiths = parseInt($("#stepper-smith input").val());
                var concrete = parseInt($("#stepper-concrete input").val());
                var soldiers = parseInt($("#stepper-soldier input").val());
                playerActions.assignWorkers(scavengers, trappers, waters, ropers, chemists, apothecaries, smiths, concrete, soldiers);
            });
            
            // Buttons: In: Other
            $("#btn-header-rename").click(function(e) {
                var prevCampName = playerActions.getNearestCampName();
                uiFunctions.showInput(
                    "Rename Camp",
                    "Give your camp a new name",
                    prevCampName,
                    function (input) {
                        playerActions.setNearestCampName(input);
                    });
            });
            
            // Cheats
            if (GameConstants.isCheatsEnabled) {
                $("#btn-cheats").click(function (e) {
                    var cheatListDiv = uiFunctions.cheatSystem.getCheatListDiv();
                    uiFunctions.showInput("Cheats", "Enter cheat<br/>" + cheatListDiv, "", function (input) {
                        uiFunctions.cheatSystem.applyCheat(input)
                    });
                });
            }
        },
        
        registerActionButtonListeners: function (scope) {
            var uiFunctions = this;
            var gameState = this.gameState;
            var playerActions = this.playerActions;
            
            // All action buttons
            $(scope + " button.action").click(function (e) {
                var action = $(this).attr("action");
                if (!action) {
                    console.log("No action mapped for button.");
                    return;   
                }
                
                var param = null;
                var actionIDParam = playerActions.playerActionsHelper.getActionIDParam(action);
                if (actionIDParam) param = actionIDParam;                
                var isProject = $(this).hasClass("action-level-project");
                if (isProject) param = $(this).attr("sector");
                
                var locationKey = uiFunctions.getLocationKey($(this));
                var isStarted = playerActions.startAction(action, param);
                if (!isStarted)
                    return;
                
                var baseId = playerActions.playerActionsHelper.getBaseActionID(action);
                var duration = PlayerActionConstants.getDuration(baseId);
                if (duration > 0) {
                    uiFunctions.gameState.setActionDuration(action, locationKey, duration);
                    uiFunctions.startButtonDuration($(this), duration);
                }
            });
            
            // Special actions
            $(scope + "#out-action-fight-confirm").click(function (e) {
                playerActions.fightHelper.startFight();
            });
            $(scope + "#out-action-fight-close").click(function (e) {
                playerActions.fightHelper.endFight();
            });
            $(scope + "#out-action-fight-next").click(function (e) {
                playerActions.fightHelper.endFight();
            });
            $(scope + "#out-action-fight-cancel").click(function (e) {
                playerActions.flee();
                playerActions.fightHelper.endFight();
            });
            $(scope + "#inn-popup-btn-cancel").click(function (e) {                
                uiFunctions.popupManager.closePopup("inn-popup");
            });
            $(scope + "#incoming-caravan-popup-cancel").click(function (e) {
                uiFunctions.popupManager.closePopup("incoming-caravan-popup");
            });
            $(scope + " button[action='leave_camp']").click(function (e) {
                gameState.uiStatus.leaveCampItems = {};
                gameState.uiStatus.leaveCampRes = {};
                
                var selectedResVO = new ResourcesVO();
                $.each($("#embark-resources tr"), function () {
                    var resourceName = $(this).attr("id").split("-")[2];
                    var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
                    selectedResVO.setResource(resourceName, selectedVal);
                    gameState.uiStatus.leaveCampRes[resourceName] = selectedVal;
                });
                
                var selectedItems = {};
                $.each($("#embark-items tr"), function () {
                    var itemID = $(this).attr("id").split("-")[2];
                    var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
                    gameState.uiStatus.leaveCampItems[itemID] = selectedVal;
                    selectedItems[itemID] = selectedVal;
                });
                
                playerActions.updateCarriedItems(selectedItems);
                playerActions.moveResFromCampToBag(selectedResVO);
                playerActions.leaveCamp();
            });
            
            // Buttons: Bag: Item details
            // some in UIOoutBagSystem
        },
        
        registerStepperListeners: function (scope) {
            $(scope + " .stepper button").click(this.onStepperButtonClicked);
            $(scope + " .stepper input.amount").focusin(function () {
                $(this).data('oldValue', $(this).val());
            });
            $(scope + ' .stepper input.amount').change(this.onStepperInputChanged);
            
            // All number inputs
            $(scope + " input.amount").keydown(this.onNumberInputKeyDown);
        },
        
        generateElements: function () {
            this.generateTabBubbles();
            this.generateResourceIndicators();
            this.generateSteppers("body");
            this.generateButtonOverlays("body");
            this.generateCallouts("body");
            
            // building project info
            $.each($("#out-improvements tr"), function () {
                var actionName = $(this).find("button.action-build").attr("action");
                if (actionName) {
                    var costSource = PlayerActionConstants.getCostSource(actionName);
                    if (costSource == PlayerActionConstants.COST_SOURCE_CAMP) {
                        var infotd = $(this).find("td")[2];
                        $(infotd).html("<span class='p-meta'></span>");
                    }
                }
            });
            
            // equipment stats labels
            for (var bonusKey in ItemConstants.itemBonusTypes) {
                var bonusType = ItemConstants.itemBonusTypes[bonusKey];
                var div = "<div id='stats-equipment-" + bonusKey + "' class='stats-indicator stats-indicator-secondary'>";
                div += "<span class='label'>" + UIConstants.getItemBonusName(bonusType).replace(" ", "<br/>") + "</span>";
                div += "<br/>";
                div += "<span class='value'/></div>";
                $("#container-equipment-stats").append(div);
            }
            
            // cheats
            if (GameConstants.isCheatsEnabled) {
                $("#game-options-extended li:first-child").before("<li><button class='btn-meta' id='btn-cheats'>Cheats</button></li>")
            }
        },
        
        generateTabBubbles: function () {
            $("#switch li").append("<div class='bubble'>1</div>");
        },
        
        generateResourceIndicators: function () {
            for (var key in resourceNames) {
                var name = resourceNames[key];
                var isSupplies = name === resourceNames.food || name === resourceNames.water;
                $("#statsbar-resources").append(UIConstants.createResourceIndicator(name, false, "resources-" + name, true, true));
                $("#bag-resources").append(UIConstants.createResourceIndicator(name, false, "resources-bag-" + name, true, true, isSupplies));
                
                var indicatorEmbark = UIConstants.createResourceIndicator(name, true, "embark-resources-" + name, true, false);
                $("#embark-resources").append(
                    "<tr id='embark-assign-" + name + "'>" + 
                    "<td>" + indicatorEmbark + "</td>" +
                    "<td><div class='stepper' id='stepper-embark-" + name + "'></div></td>" +
                    "</tr>"
                );
            }
        },
        
        generateCallouts: function (scope) {
            // Info callouts
            $(scope + " .info-callout-target").wrap('<div class="callout-container"></div>');
            $(scope + " .info-callout-target").after(function () {
                var description = $(this).attr("description");
                var content = description;
                content = '<div class="arrow-up"></div><div class="info-callout-content">' + content + "</div>";
                return '<div class="info-callout">' + content + '</div>'
            });
            
            // Button callouts
            var playerActions = this.playerActions;
            $(scope + " div.container-btn-action").wrap('<div class="callout-container"></div>');
            $(scope + " div.container-btn-action").after(function () {
                var action = $($(this).children("button")[0]).attr("action");
                var ordinal = playerActions.playerActionsHelper.getOrdinal(action);
                var costFactor =  playerActions.playerActionsHelper.getCostFactor(action);
                var costs = playerActions.playerActionsHelper.getCosts(action, ordinal, costFactor);
                var description = playerActions.playerActionsHelper.getDescription(action);
                if ((costs && Object.keys(costs).length > 0) || description) {
                    var content = '<div class="arrow-up"></div><div class="btn-callout-content">' + "" + "</div>";
                    return '<div class="btn-callout">' + content + '</div>'
                } else {
                    if (!(action === "take_all" || action === "accept_inventory" || action === "use_in_inn_cancel" || action === "fight"))
                        console.log("WARN: No callout could be created for action button with action " + action + ". Description and costs both missing.");
                    return "";
                }
            });
            
            GlobalSignals.calloutsGeneratedSignal.dispatch();
        },
        
        generateSteppers: function (scope) {
            $(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='minus' data-field=''>-</button>");
            $(scope + " .stepper").append("<input class='amount' type='text' min='0' max='100' autocomplete='false' value='0' name=''></input>");  
            $(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='plus' data-field=''>+</button>");
            $(scope + " .stepper button").attr("data-field", function (i, val) {
                return $(this).parent().attr("id") + "-input";
            });
            $(scope + " .stepper button").attr("action", function (i, val) {
                return $(this).parent().attr("id") + "-" + $(this).attr("data-type");
            });
            $(scope + " .stepper input").attr("name", function (i, val) {
                return $(this).parent().attr("id") + "-input";
            });
        },
        
        generateButtonOverlays: function (scope) {
            $(scope + " button.action").append("<div class='cooldown-action' style='display:none' />");
            $(scope + " button.action").append("<div class='cooldown-duration' style='display:none' />");
            $(scope + " button.action").wrap("<div class='container-btn-action' />");
            $(scope + " div.container-btn-action").append("<div class='cooldown-reqs' />");
        },
        
        /**
         * Resets cooldown for an action. Should be called directly after an action is completed and any relevant popup is closed.
         * @param {type} action action
         */
        completeAction: function (action) {
            var button = $("button[action='" + action + "']");
            var baseId = this.playerActions.playerActionsHelper.getBaseActionID(action);
            var cooldown = PlayerActionConstants.getCooldown(baseId);
            if (cooldown > 0) {
                var locationKey = this.getLocationKey($(button));
                this.gameState.setActionCooldown(action, locationKey, cooldown);
                this.startButtonCooldown($(button), cooldown);
            }
        },
        
        showGame: function () {
            $(".sticky-footer").css("display", "block");
            $("#grid-main").css("display", "block");
            $("#unit-main").css("display", "block");
            $(".loading-content").css("display", "none");
            GlobalSignals.gameShownSignal.dispatch();
        },
        
        hideGame: function (showLoading) {
            if (showLoading)
                $(".loading-content").css("display", "block");
            $("#unit-main").css("display", "none");
            $(".sticky-footer").css("display", "none");
            $("#grid-main").css("display", "none");
        },
        
        restart: function () {            
            $("#log ul").empty();
            this.onTabClicked(this.elementIDs.tabs.out, this.gameState, this);
            this.saveSystem.restart(false);
        },
        
        onResize: function () {
        },
        
        getGameInfoDiv: function () {
            var html = "";
            html += "<span id='changelog-version'>version " + this.changeLogHelper.getCurrentVersionNumber() + "<br/>updated " + this.changeLogHelper.getCurrentVersionDate() + "</span>";
            html += "<p>Please note that this game is still in development and many features are incomplete and unbalanced. Updates might break your save. Feedback and bug reports are very much appreciated!</p>";
            html += "<p><a href='https://github.com/nroutasuo/level13' target='github'>github</a><br/><a href='https://plaza.dsolver.ca/m/nroutasuo'>incremental games plaza</a></p>";
            html += "<h4 class='infobox-scrollable-header'>Changelog</h4>";
            html += "<div id='changelog' class='infobox infobox-scrollable'>" + this.changeLogHelper.getChangeLogHTML() + "</div>";
            return html;
        },
        
        onTabClicked: function (tabID, gameState, uiFunctions) {
            $("#switch-tabs li").removeClass("selected");
            $("#switch-tabs li#" + tabID).addClass("selected");
            $("#tab-header h2").text(tabID);
            
            var transition = !(gameState.uiStatus.currentTab === tabID);
            var transitionTime = transition ? 200 : 0;
            gameState.uiStatus.currentTab = tabID;
            
            $.each($(".tabelement"), function () {
                uiFunctions.slideToggleIf($(this), null, $(this).attr("data-tab") === tabID, transitionTime, 200);
            });
            
            GlobalSignals.tabChangedSignal.dispatch(tabID);
        },
        
        onStepperButtonClicked: function(e) {
            e.preventDefault();    
            var fieldName = $(this).attr('data-field');
            var type = $(this).attr('data-type');
            var input = $("input[name='"+fieldName+"']");
            var currentVal = parseInt(input.val());
            if (!isNaN(currentVal)) {
                if(type == 'minus') {
                    var min = input.attr('min');
                    if(currentVal > min) {
                        input.val(currentVal - 1).change();
                    } 
                    if(parseInt(input.val()) == input.attr('min')) {
                        $(this).attr('disabled', true);
                    }
        
                } else if(type == 'plus') {
                    var max = input.attr('max');
                    if(currentVal < max) {
                        input.val(currentVal + 1).change();
                    }
                    if(parseInt(input.val()) == input.attr('max')) {
                        $(this).attr('disabled', true);
                    }        
                }
            } else {
                input.val(0);
            }
        },
        
        onStepperInputChanged: function() {    
            minValue =  parseInt($(this).attr('min'));
            maxValue =  parseInt($(this).attr('max'));
            valueCurrent = parseInt($(this).val());            
            name = $(this).attr('name');
            
            
            if (isNaN(valueCurrent)) {
                $(this).val($(this).data('oldValue'));
                return;
            }
            
            if(valueCurrent >= minValue) {
                $(".btn-glyph[data-type='minus'][data-field='"+name+"']").removeAttr('disabled')
            } else {
                $(this).val(minValue);
            }
            if(valueCurrent <= maxValue) {
                $(".btn-glyph[data-type='plus'][data-field='"+name+"']").removeAttr('disabled')
            } else {
                $(this).val(maxValue);
            }
        },
        
        onNumberInputKeyDown: function (e) {
            // Allow: backspace, delete, tab, escape, enter and .
            if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 190]) !== -1 ||
            // Allow: Ctrl+A
            (e.keyCode == 65 && e.ctrlKey === true) || 
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
                return;
            }                
            // Ensure that it's a number and stop the keypress
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        },
        
        onTextInputKeyDown: function(e) {
            // Allow: backspace, delete, tab, escape and enter
            if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110]) !== -1 ||
                 // Allow: Ctrl+A
                (e.keyCode == 65 && e.ctrlKey === true) || 
                 // Allow: home, end, left, right
                (e.keyCode >= 35 && e.keyCode <= 39)) {
                    // let it happen, don't do anything
                     return;
            }
        },
        
        onTextInputKeyUp: function(e) {
            var value = $(e.target).val();
            value = value.replace(/[&\/\\#,+()$~%.'":*?<>{}\[\]=]/g,'_');
            $(e.target).val(value)
        },
        
        onPlayerMoved: function() {
            var uiFunctions = this;
            var cooldownLeft;
            var cooldownTotal;
            var durationLeft;
            var durationTotal;
            $.each($("button.action-location"), function() {
                var action = $(this).attr("action");
                var baseId = uiFunctions.playerActions.playerActionsHelper.getBaseActionID(action);
                if (action) {
                    var locationKey = uiFunctions.getLocationKey($(this));
                    cooldownTotal = PlayerActionConstants.getCooldown(action);
                    cooldownLeft = Math.min(cooldownTotal, uiFunctions.gameState.getActionCooldown(action, locationKey) / 1000);
                    durationTotal = PlayerActionConstants.getDuration(baseId);
                    durationLeft = Math.min(durationTotal, uiFunctions.gameState.getActionDuration(action, locationKey) / 1000);
                    if (cooldownLeft > 0) uiFunctions.startButtonCooldown($(this), cooldownTotal, cooldownLeft);
                    else uiFunctions.stopButtonCooldown($(this));
                    if (durationLeft > 0) uiFunctions.startButtonDuration($(this), cooldownTotal, durationLeft);
                }
            });
        },
        
        slideToggleIf: function(element, replacement, show, durationIn, durationOut) {
            var visible = this.isElementToggled(element);            
            var toggling = ($(element).attr("data-toggling") == "true");
            var sys = this;
            
            if (show && (visible == false || visible == null) && !toggling) {
				if(replacement) sys.toggle(replacement, false);
                $(element).attr("data-toggling", "true");
				$(element).slideToggle(durationIn, function () {
                    sys.toggle(element, true);
                    $(element).attr("data-toggling", "false");
                });
			} else if (!show && (visible == true || visible == null) && !toggling) {
                $(element).attr("data-toggling", "true");
				$(element).slideToggle(durationOut, function () {
					if(replacement) sys.toggle(replacement, true);
                    sys.toggle(element, false);
                    $(element).attr("data-toggling", "false");
				});
			}
        },
        
        tabToggleIf: function(element, replacement, show, durationIn, durationOut) {
            var visible = $(element).is(":visible");
            var toggling = ($(element).attr("data-toggling") == "true");
            var sys = this;
            
            if (show && !visible && !toggling) {
				if(replacement) sys.toggle(replacement, false);
                $(element).attr("data-toggling", "true");
				$(element).fadeToggle(durationIn, function () {
                    sys.toggle(element, true);
                    $(element).attr("data-toggling", "false");
                });
			} else if (!show && visible && !toggling) {
                $(element).attr("data-toggling", "true");
				$(element).fadeToggle(durationOut, function () {
					if(replacement) sys.toggle(replacement, true);
                    sys.toggle(element, false);
                    $(element).attr("data-toggling", "false");
				});
			}
        },
        
        toggle: function (element, show) {
            if ($(element).length === 0)
                return;
            if (typeof(show) === "undefined")
                show = false;
            if (show === null)
                show = false;
            if (!show)
                show = false;
            if (this.isElementToggled(element) === show)
                return;
            //if (GameConstants.isDebugOutputEnabled)
            //    console.log("toggle " + element + ": " + show);
            $(element).attr("data-visible", show);
            $(element).toggle(show);
            GlobalSignals.elementToggled.dispatch(element, true);
        },
        
        isElementToggled: function (element) {
            var visible = true;
            var visibletag = ($(element).attr("data-visible"));
            if (typeof visibletag !== typeof undefined) {
                visible = (visibletag == "true");
            } else {
                visible = null;
            }
            return visible;
        },
        
        isElementVisible: function (element) {
            var toggled = this.isElementToggled(element);
            if (toggled === false)
                return false;
            return ($(element).is(":visible"));
        },
        
        stopButtonCooldown: function (button) {
            $(button).children(".cooldown-action").stop(true, true);
            $(button).attr("data-hasCooldown", "false");
            $(button).children(".cooldown-action").css("display", "none");
            $(button).children(".cooldown-action").css("width", "100%");
        },
        
        startButtonCooldown: function (button, cooldown, cooldownLeft) {
            var action = $(button).attr("action");
            if (!cooldownLeft) cooldownLeft = cooldown;
            var uiFunctions = this;
            var startingWidth = (cooldownLeft/cooldown * 100);
            $(button).attr("data-hasCooldown", "true");
            $(button).children(".cooldown-action").stop(true, false).css("display", "inherit").css("width", startingWidth + "%").animate(
                { width: 0 },
                cooldownLeft * 1000,
                'linear',
                function() {
                    uiFunctions.stopButtonCooldown($(this).parent());
                }
            );
        },
        
        stopButtonDuration: function (button, complete) {
            $(button).children(".cooldown-duration").stop(true, true);
            $(button).children(".cooldown-duration").css("display", "none");
            $(button).children(".cooldown-duration").css("width", "0%");
            $(button).attr("data-isInProgress", "false");
        },
        
        startButtonDuration: function (button, duration, durationLeft) {
            if (!durationLeft) durationLeft = duration;
            var uiFunctions = this;
            var startingWidth = (1-durationLeft/duration) * 100;
            $(button).attr("data-isInProgress", "true");
            $(button).children(".cooldown-duration").stop(true, false).css("display", "inherit").css("width", startingWidth + "%").animate(
                { width: '100%' },
                durationLeft * 1000,
                'linear',
                function() {
                    uiFunctions.stopButtonDuration($(this).parent(), true);
                }
            );
        },
        
        getLocationKey: function(button) {
            var action = $(button).attr("action");
            var isLocationAction = PlayerActionConstants.isLocationAction(action);
            var playerPos = this.playerActions.playerPositionNodes.head.position;
            return this.gameState.getActionLocationKey(isLocationAction, playerPos);
        },
        
        showTab: function (tabID) {
            this.onTabClicked(tabID, this.gameState, this);
        },
        
        showFight: function () {
            this.showSpecialPopup("fight-popup");
        },
        
        showInnPopup: function (availableFollowers) {
            $("table#inn-popup-options-followers").empty();
            $("table#inn-popup-options-followers").append("<tr></tr>");
            for (var i = 0; i < availableFollowers.length; i++) {
                var td = "<td id='td-item-use_in_inn_select-" + availableFollowers[i].id + "'>";
                td += UIConstants.getItemDiv(availableFollowers[i], false);
                td += "</td>";
                $("table#inn-popup-options-followers tr").append(td);
            }
            $("table#inn-popup-options-followers").append("<tr></tr>");
            for (var j = 0; j < availableFollowers.length; j++) {
                var td = "<td>";
                td += "<button class='action btn-narrow' action='use_in_inn_select_" + availableFollowers[j].id + "' followerID='" + availableFollowers[j].id + "'>Recruit</button>";
                td += "</td>";
                $($("table#inn-popup-options-followers tr")[1]).append(td);
            }
			this.generateButtonOverlays("#inn-popup-options-followers");
            this.showSpecialPopup("inn-popup");
        },
        
        showIncomingCaravanPopup: function () {
            this.showSpecialPopup("incoming-caravan-popup");
        },
        
        showSpecialPopup: function (popupID) {
            if ($("#" + popupID).is(":visible")) return;
            $("#" + popupID).wrap("<div class='popup-overlay level-bg-colour' style='display:none'></div>");
            var uiFunctions = this;
            $(".popup-overlay").fadeIn(200, function () {
                uiFunctions.popupManager.onResize();
                GlobalSignals.popupOpenedSignal.dispatch(popupID);
                $("#" + popupID).fadeIn(200, uiFunctions.popupManager.onResize);
            });
            this.generateCallouts("#" + popupID); 
        },
        
        showInfoPopup: function (title, msg, buttonLabel, resultVO) {
            if (!buttonLabel) buttonLabel = "Continue";
            this.popupManager.showPopup(title, msg, buttonLabel, false, resultVO);
            this.generateCallouts(".popup");
        },
        
        showResultPopup: function (title, msg, resultVO, callback) {
            this.popupManager.showPopup(title, msg, "Continue", false, resultVO, callback);
            this.generateCallouts(".popup");
        },
        
        showConfirmation: function (msg, callback) {
            var uiFunctions = this;
            var okCallback = function(e) {
                uiFunctions.popupManager.closePopup("common-popup");
                callback();
            };
            var cancelCallback = function() {
                uiFunctions.popupManager.closePopup("common-popup");
            };
            this.popupManager.showPopup("Confirmation", msg, "Confirm", true, null, okCallback, cancelCallback);
            this.generateCallouts(".popup");
        },
        
        showQuestionPopup: function (title, msg, buttonLabel, callbackOK, callbackNo) {
            var uiFunctions = this;
            var okCallback = function(e) {
                uiFunctions.popupManager.closePopup("common-popup");
                callbackOK();
            };
            var cancelCallback = function() {
                uiFunctions.popupManager.closePopup("common-popup");
                callbackNo();
            };
            this.popupManager.showPopup(title, msg, buttonLabel, true, null, okCallback, cancelCallback);
            this.generateCallouts(".popup");
        },
        
        showInput: function(title, msg, defaultValue, callback) {
            var okCallback = function () {
                var input = $("#common-popup input").val();
                callback(input);
            };
            this.popupManager.showPopup(title, msg, "Confirm", true, null, okCallback);
            this.generateCallouts(".popup");
            
            var uiFunctions = this;
            var maxChar = 40;
            this.toggle("#common-popup-input-container", true);
            $("#common-popup-input-container input").attr("maxlength", maxChar);
            
            $("#common-popup input").val(defaultValue);
            $("#common-popup input").keydown( uiFunctions.onTextInputKeyDown);
            $("#common-popup input").keyup( uiFunctions.onTextInputKeyUp);
        },
    });

    return UIFunctions;
});
