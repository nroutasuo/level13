// A class that checks raw user input from the DOM and passes game-related actions to PlayerActionFunctions
define(['ash',
        'game/constants/UIConstants',
        'game/constants/PlayerActionConstants',
        'game/helpers/ui/UIPopupManager',
        'game/helpers/ui/ChangeLogHelper',
        'game/vos/ResourcesVO'],
function (Ash, UIConstants, PlayerActionConstants, UIPopupManager, ChangeLogHelper, ResourcesVO) {
    var UIFunctions = Ash.Class.extend({
        
        playerActions: null,
        gameState: null,
        saveSystem: null,
        
        popupManager: null,
        changeLogHelper: null,
        
        elementIDs: {
            tabs: {
                bag: "switch-bag",
                in: "switch-in",
                out: "switch-out",
                upgrades: "switch-upgrades",
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
                resource_tools: "tools",
                item_res_silk: "spider silk",
                item_res_bands: "rubber band",
                item_res_matches: "match",
                rumours: "rumours",
                evidence: "evidence",
            }
        },
        
        actionToFunctionMap: {
        },
        
        constructor: function (playerActions, gameState, saveSystem) {
            this.playerActions = playerActions;
            this.gameState = gameState;
            this.saveSystem = saveSystem;

            this.mapActions();
            this.generateElements();
            this.registerListeners();
            
            this.popupManager = new UIPopupManager();
            this.changeLogHelper = new ChangeLogHelper();
        },
        
        mapActions: function () {
            var playerActions = this.playerActions;
            // Out improvements
            this.actionToFunctionMap["build_out_collector_water"] = this.playerActions.buildBucket;
            this.actionToFunctionMap["build_out_collector_food"] = this.playerActions.buildTrap;
            this.actionToFunctionMap["use_out_collector_water"] = this.playerActions.collectWater;
            this.actionToFunctionMap["use_out_collector_food"] = this.playerActions.collectFood;
            this.actionToFunctionMap["build_out_camp"] = this.playerActions.buildCamp;
            this.actionToFunctionMap["build_out_bridge"] = this.playerActions.buildBridge;
            this.actionToFunctionMap["build_out_bridge"] = this.playerActions.buildBridge;
            this.actionToFunctionMap["build_out_passage_down_stairs"] = this.playerActions.buildPassageDownStairs;
            this.actionToFunctionMap["build_out_passage_down_elevator"] = this.playerActions.buildPassageDownElevator;
            this.actionToFunctionMap["build_out_passage_down_hole"] = this.playerActions.buildPassageDownHole;
            this.actionToFunctionMap["build_out_passage_up_stairs"] = this.playerActions.buildPassageUpStairs;
            this.actionToFunctionMap["build_out_passage_up_elevator"] = this.playerActions.buildPassageUpElevator;
            this.actionToFunctionMap["build_out_passage_up_hole"] = this.playerActions.buildPassageUpHole;
            // In improvements
            this.actionToFunctionMap["build_in_campfire"] = this.playerActions.buildCampfire;
            this.actionToFunctionMap["build_in_house"] = this.playerActions.buildHouse;
            this.actionToFunctionMap["build_in_house2"] = this.playerActions.buildHouse2;
            this.actionToFunctionMap["build_in_storage"] = this.playerActions.buildStorage;
            this.actionToFunctionMap["build_in_darkfarm"] = this.playerActions.buildDarkFarm;
            this.actionToFunctionMap["build_in_hospital"] = this.playerActions.buildHospital;
            this.actionToFunctionMap["build_in_ceiling"] = this.playerActions.buildCeiling;
            this.actionToFunctionMap["build_in_inn"] = this.playerActions.buildInn;
            this.actionToFunctionMap["build_in_tradingPost"] = this.playerActions.buildTradingPost;
            this.actionToFunctionMap["build_in_library"] = this.playerActions.buildLibrary;
            this.actionToFunctionMap["build_in_market"] = this.playerActions.buildMarket;
            this.actionToFunctionMap["build_in_fortification"] = this.playerActions.buildFortification;
            this.actionToFunctionMap["build_in_barracks"] = this.playerActions.buildBarracks;
            this.actionToFunctionMap["build_in_apothecary"] = this.playerActions.buildApothecary;
            this.actionToFunctionMap["build_in_smithy"] = this.playerActions.buildSmithy;
            this.actionToFunctionMap["build_in_cementmill"] = this.playerActions.buildCementMill;
            this.actionToFunctionMap["build_in_radio"] = this.playerActions.buildRadioTower;
            this.actionToFunctionMap["build_in_lights"] = this.playerActions.buildLights;
            this.actionToFunctionMap["use_in_campfire"] = this.playerActions.useCampfire;
            this.actionToFunctionMap["use_in_hospital"] = this.playerActions.useHospital;
            this.actionToFunctionMap["use_in_hospital2"] = this.playerActions.useHospital2;
            this.actionToFunctionMap["use_in_inn"] = this.playerActions.useInn;
            // Crafting
            this.actionToFunctionMap["craft"] = this.playerActions.craftItem;
            // Non-improvement actions
            this.actionToFunctionMap["scavenge"] = this.playerActions.scavenge;
            this.actionToFunctionMap["scout"] = this.playerActions.scout;
            this.actionToFunctionMap["scout_locale"] = playerActions.scoutLocale;
            this.actionToFunctionMap["despair"] = playerActions.despair;
            this.actionToFunctionMap["unlock_upgrade"] = playerActions.unlockUpgrade;
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
                        onTabClicked(this.id, elementIDs, gameState, playerActions);
                    }
                });
            });
            $("button[action='move_camp_level']").click(function (e) {
                onTabClicked(elementIDs.tabs.in, elementIDs, gameState, playerActions);
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
            $(".stepper button").click(this.onStepperButtonClicked);
            $(".stepper input.amount").focusin(function () {
                $(this).data('oldValue', $(this).val());
            });
            $('.stepper input.amount').change(this.onStepperInputChanged);
            
            // All number inputs
            $("input.amount").keydown(this.onNumberInputKeyDown);
            
            // Action buttons buttons
            this.registerActionButtonListeners("");
            
            // Meta/non-action buttons
            var saveSystem = this.saveSystem;
            $("#btn-save").click(function (e) {saveSystem.save() });
            $("#btn-restart").click(function (e) {
                uiFunctions.showConfirmation(
                    "Do you want to restart the game? Your progrss will be lost.",
                    function () {
                        $("#log ul").empty();
                        onTabClicked(elementIDs.tabs.out, elementIDs, gameState, playerActions);
                        saveSystem.restart();
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
                    "Give your camp a new name",
                    prevCampName,
                    function(input) {
                        playerActions.setNearestCampName(input);
                    });
            });
        },
        
        registerActionButtonListeners: function (scope) {
            var uiFunctions = this;
            var gameState = this.gameState;
            var playerActions = this.playerActions;
            
            // All action buttons
            $(scope + " button.action").click(function (e) {
                var action = $(this).attr("action");
                if (action) {
                    var cooldown = PlayerActionConstants.getCooldown(action);
                    if (cooldown > 0) {
                        var locationKey = uiFunctions.getLocationKey($(this));
                        uiFunctions.gameState.setActionCooldown(action, locationKey, cooldown);
                        uiFunctions.startButtonCooldown($(this), cooldown);
                    }
                    
                    var baseId = playerActions.playerActionsHelper.getBaseActionID(action);
                    var func = uiFunctions.actionToFunctionMap[baseId];
                    if (func) {
                        var param = null;
                        var isProject = $(this).hasClass("action-level-project");
                        if (isProject) param = $(this).attr("sector");
                        var actionIDParam = playerActions.playerActionsHelper.getActionIDParam(action);
                        if (actionIDParam) param = actionIDParam;
                        func.call(playerActions, param);
                    } else {
                        switch(action) {
                            case "move_sector_left": break;
                            case "move_sector_right": break;
                            case "leave_camp": break;
                            default:
                            console.log("WARN: No function found for button with action " + action);
                            break;
                        }
                    }
                } else {
                    // console.log("WARN: button.action with no action (#"+ $(this).attr('id') +")");
                }
            }); 
            
            // Special actions
            var onMoveButtonClicked = this.onMoveButtonClicked;
            $(scope + " button.action-move").click( function(e) {
                onMoveButtonClicked(this, playerActions);
            });
            $(scope + " #out-action-fight").click( function(e) {
                playerActions.initFight();
                $("body").css("overflow", "hidden");
                $("#fight-popup").wrap("<div class='popup-overlay level-bg-colour' style='display:none'></div>");
                $(".popup-overlay").fadeIn(200, function() {
                    uiFunctions.popupManager.onResize();
                    $("#fight-popup").fadeIn(200, uiFunctions.popupManager.onResize);
                });
            });
            $(scope + " #out-action-fight-confirm").click( function(e) {
                playerActions.startFight();
            });
            $(scope + " #out-action-fight-close").click( function(e) {
                uiFunctions.popupManager.closePopup("fight-popup", true);
                playerActions.endFight();
            });
            $(scope + " #out-action-fight-next").click( function(e) {
                playerActions.endFight();
                playerActions.initFight();
            });
            $(scope + " #out-action-fight-cancel").click( function(e) {
                uiFunctions.popupManager.closePopup("fight-popup", true);
                playerActions.endFight();
            });
            $(scope + " button[action='leave_camp']").click( function(e) {
                var selectedResVO = new ResourcesVO();                
                $.each($("#embark-resources tr"), function() {
                    var resourceName = $(this).attr("id").split("-")[2];
                    var selectedVal = parseInt($(this).children("td").children(".stepper").children("input").val());
                    selectedResVO.setResource(resourceName, selectedVal);
                    gameState.uiStatus.leaveCampRes[resourceName] = selectedVal;
                });
                
                playerActions.moveResFromCampToBag(selectedResVO);
                playerActions.leaveCamp();
            });
            
            // Buttons: Bag: Item details
            // some in UIOoutBagSystem
        },
        
        generateElements: function() {
            this.generateResourceIndicators();
            this.generateSteppers("body");
            this.generateButtonOverlays("body");
            this.generateCallouts("body");
            
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
        },
        
        generateResourceIndicators: function () {
            for (var key in resourceNames) {
                var name = resourceNames[key];
                $("#statsbar-resources").append(UIConstants.createResourceIndicator(name, true, "resources-" + name, true, true));
                
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
                    console.log("WARN: No callout could be created for action button with action " + action);
                    return "";
                }
            });
        },
        
        generateSteppers: function (scope) {
            $(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='minus' data-field=''>-</button>");
            $(scope + " .stepper").append("<input class='amount' type='text' min='0' max='100' autocomplete='false' value='0' name=''></input>");  
            $(scope + " .stepper").append("<button type='button' class='btn-glyph' data-type='plus' data-field=''>+</button>");
            $(scope + " .stepper button").attr("data-field", function( i, val ) {
                return $(this).parent().attr("id") + "-input";
            });
            $(scope + " .stepper button").attr("action", function( i, val ) {
                return $(this).parent().attr("id") + "-" + $(this).attr("data-type");
            });
            $(scope + " .stepper input").attr("name", function( i, val ) {
                return $(this).parent().attr("id") + "-input";
            });
        },
        
        generateButtonOverlays: function(scope) {
            $(scope + " button.action").append("<div class='cooldown-action' style='display:none' />");
            $(scope + " button.action").wrap("<div class='container-btn-action' />");
            $(scope + " div.container-btn-action").append("<div class='cooldown-reqs' />");
        },
        
        getGameInfoDiv: function () {
            var html = "<p>Please note that this game is still in development and many features are incomplete and unbalanced. Feedback and bug reports are much appreciated!</p>";
            html += "<p><b>Links</b>: <a href='https://github.com/nroutasuo/level13' target='_blank'>github</a></p>";
            html += "<p><b>Changelog</b><br/>";
            html += "Current version: <span id='changelog-version'>" + this.changeLogHelper.getCurrentVersionNumber() + "</span></p>";
            html += "<div id='changelog' class='infobox infobox-scrollable'>" + this.changeLogHelper.getChangeLogHTML() + "</div>";
            return html;
        },
        
        onResize: function() {
        },
        
        onTabClicked: function(tabID, elementIDs, gameState, playerActions) {
            $("#switch-tabs li").removeClass("selected");
            $("#tab-header h2").text(tabID);
            
            var transition = !(gameState.uiStatus.currentTab == tabID);
            var transitionTime = transition ? 200 : 0;
            gameState.uiStatus.currentTab = tabID;
            
            switch(tabID)
            {
                case elementIDs.tabs.out:
                    $("#switch-tabs li#switch-out").addClass("selected");
                    $("#btn-header-rename").slideUp(transitionTime);
                    $("#container-tab-vis-out").slideUp(transitionTime);
                    $("#container-tab-vis-in").slideUp(transitionTime);
                    $("#container-tab-enter-out").slideDown(transitionTime);
                    $("#container-tab-two-in").slideUp(transitionTime);
                    $("#container-tab-two-out").slideUp(transitionTime);
                    $("#container-tab-two-bag").slideUp(transitionTime);
                    $("#container-tab-two-upgrades").slideUp(transitionTime);
                    $("#container-tab-two-world").slideUp(transitionTime);
                    $("#container-tab-footer").slideUp(transitionTime);
                    playerActions.enterOutTab();
                    break;
                
                case elementIDs.tabs.in:
                    $("#switch-tabs li#switch-in").addClass("selected");
                    $("#btn-header-rename").slideDown(transitionTime);
                    $("#container-tab-vis-in").slideDown(transitionTime);
                    $("#container-tab-vis-out").slideUp(transitionTime);
                    $("#container-tab-enter-out").slideUp(transitionTime);
                    $("#container-tab-5-4").slideDown(transitionTime);
                    $("#container-tab-1-8").slideUp(transitionTime);
                    $("#container-tab-two-in").slideDown(transitionTime);
                    $("#container-tab-two-out").slideUp(transitionTime);
                    $("#container-tab-two-bag").slideUp(transitionTime);
                    $("#container-tab-two-upgrades").slideUp(transitionTime);
                    $("#container-tab-two-world").slideUp(transitionTime);
                    $("#container-tab-footer").slideUp(transitionTime);
                    playerActions.enterCamp(true);
                    break;
                
                case elementIDs.tabs.world:
                    $("#switch-tabs li#switch-world").addClass("selected");
                    $("#btn-header-rename").slideUp(transitionTime);
                    $("#container-tab-vis-out").slideUp(transitionTime);
                    $("#container-tab-vis-in").slideUp(transitionTime);
                    $("#container-tab-enter-out").slideUp(transitionTime);
                    $("#container-tab-two-in").slideUp(transitionTime);
                    $("#container-tab-two-out").slideUp(transitionTime);
                    $("#container-tab-two-bag").slideUp(transitionTime);
                    $("#container-tab-two-upgrades").slideUp(transitionTime);
                    $("#container-tab-two-world").slideDown(transitionTime);
                    $("#container-tab-footer").slideUp(transitionTime);
                    break;
                
                case elementIDs.tabs.upgrades:
                    $("#switch-tabs li#switch-upgrades").addClass("selected");
                    $("#btn-header-rename").slideUp(transitionTime);
                    $("#container-tab-vis-out").slideUp(transitionTime);
                    $("#container-tab-vis-in").slideUp(transitionTime);
                    $("#container-tab-enter-out").slideUp(transitionTime);
                    $("#container-tab-two-in").slideUp(transitionTime);
                    $("#container-tab-two-out").slideUp(transitionTime);
                    $("#container-tab-two-bag").slideUp(transitionTime);
                    $("#container-tab-two-upgrades").slideDown(transitionTime);
                    $("#container-tab-two-world").slideUp(transitionTime);
                    $("#container-tab-footer").slideUp(transitionTime);
                    break;
                
                case elementIDs.tabs.bag:
                    $("#switch-tabs li#switch-bag").addClass("selected");
                    $("#btn-header-rename").slideUp(transitionTime);
                    $("#container-tab-vis-out").slideUp(transitionTime);
                    $("#container-tab-vis-in").slideUp(transitionTime);
                    $("#container-tab-enter-out").slideUp(transitionTime);
                    $("#container-tab-two-in").slideUp(transitionTime);
                    $("#container-tab-two-out").slideUp(transitionTime);
                    $("#container-tab-two-bag").slideDown(transitionTime);
                    $("#container-tab-two-upgrades").slideUp(transitionTime);
                    $("#container-tab-two-world").slideUp(transitionTime);
                    $("#container-tab-footer").slideUp(transitionTime);
                    break;
            }
            
            playerActions.tabChangedSignal.dispatch(tabID);
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
                $(".btn-number[data-type='minus'][data-field='"+name+"']").removeAttr('disabled')
            } else {
                $(this).val(minValue);
            }
            if(valueCurrent <= maxValue) {
                $(".btn-number[data-type='plus'][data-field='"+name+"']").removeAttr('disabled')
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
        
        onMoveButtonClicked: function(target, playerActions) {
            var direction = null;
            var id = $(target).attr("id");
            
            switch (id) {
                case "out-action-move-left":
                    direction = playerActions.directions.left;
                    break;
                case "out-action-move-right":
                    direction = playerActions.directions.right;
                    break;
                case "out-action-move-up":
                    direction = playerActions.directions.up;
                    break;
                case "out-action-move-down":
                    direction = playerActions.directions.down;
                    break;
                case "out-action-move-camp":
                    direction = playerActions.directions.camp;
                    break;
            }
            
            if (id.indexOf("out-action-move-camp-") >= 0) {
                var level = id.split("-")[4];
                playerActions.moveToCamp(level);    
            } else {
                playerActions.moveTo(direction);
            }
            
        },
        
        onPlayerMoved: function() {
            var uiFunctions = this;
            var cooldownLeft;
            var cooldownTotal;
            $.each($("button.action-location"), function() {
                var action = $(this).attr("action");
                if (action) {
                    var locationKey = uiFunctions.getLocationKey($(this));
                    cooldownTotal = PlayerActionConstants.getCooldown(action);
                    cooldownLeft = Math.min(cooldownTotal, uiFunctions.gameState.getActionCooldown(action, locationKey) / 1000);
                    if (cooldownLeft > 0) uiFunctions.startButtonCooldown($(this), cooldownTotal, cooldownLeft);
                    else uiFunctions.stopButtonCooldown($(this));
                }
            });
        },
        
        slideToggleIf: function(element, replacement, show, durationIn, durationOut) {
            var visible = $(element).is(":visible");
            var toggling = ($(element).attr("data-toggling") == "true");
            
            if (show && !visible && !toggling) {
				if(replacement) $(replacement).toggle(false);
                $(element).attr("data-toggling", "true");
				$(element).slideToggle(durationIn, function () {
                    $(element).toggle(true);
                    $(element).attr("data-toggling", "false");
                });
			} else if (!show && visible && !toggling) {
                $(element).attr("data-toggling", "true");
				$(element).slideToggle(durationOut, function () {
					if(replacement) $(replacement).toggle(true);
                    $(element).toggle(false);
                    $(element).attr("data-toggling", "false");
				});
			}
        },
        
        tabToggleIf: function(element, replacement, show, durationIn, durationOut) {
            var visible = $(element).is(":visible");
            var toggling = ($(element).attr("data-toggling") == "true");
            
            if (show && !visible && !toggling) {
				if(replacement) $(replacement).toggle(false);
                $(element).attr("data-toggling", "true");
				$(element).fadeToggle(durationIn, function () {
                    $(element).toggle(true);
                    $(element).attr("data-toggling", "false");
                });
			} else if (!show && visible && !toggling) {
                $(element).attr("data-toggling", "true");
				$(element).fadeToggle(durationOut, function () {
					if(replacement) $(replacement).toggle(true);
                    $(element).toggle(false);
                    $(element).attr("data-toggling", "false");
				});
			}
        },
        
        stopButtonCooldown: function(button) {
            $(button).children(".cooldown-action").stop(true, true);
            var action = $(button).attr("action");
            $(button).attr("data-hasCooldown", "false");
            $(button).children(".cooldown-action").css("display", "none");
        },
        
        startButtonCooldown: function(button, cooldown, cooldownLeft) {
            var action = $(button).attr("action");
            if (!cooldownLeft) cooldownLeft = cooldown;

            var uiFunctions = this;
            var startingWidth = (cooldownLeft/cooldown * 100);
            $(button).attr("data-hasCooldown", "true");
            $(button).children(".cooldown-action").stop(true, false).css("display", "inherit").css("width", startingWidth + "%").animate(
                { width: '0%' },
                cooldownLeft * 1000,
                'linear',
                function() {
                    uiFunctions.stopButtonCooldown($(this).parent());
                }
            );
        },
        
        getLocationKey: function(button) {
            var isLocationAction = $(button).hasClass("action-location");
            var playerPos = this.playerActions.playerPositionNodes.head.position;
            var locationKey = ""
            if (isLocationAction) locationKey = playerPos.level + "-" + playerPos.sector;
            return locationKey;
        },
        
        showTab: function(tabID) {
            this.onTabClicked(tabID, this.elementIDs, this.gameState, this.playerActions);
        },
        
        showInfoPopup: function(title, msg, buttonLabel, resultVO) {
            if (!buttonLabel) buttonLabel = "Continue";
            this.popupManager.showPopup("info-popup", title, msg, buttonLabel, false, resultVO);
        },
        
        showConfirmation: function(msg, callback) {
            this.popupManager.showPopup("confirmation-popup", "Confirmation", msg, "Confirm", true);
                  
            var uiFunctions = this;
            $("#confirmation-cancel").click( function(e) {
                uiFunctions.popupManager.closePopup("confirmation-popup");
            });
            $("#info-ok").click( function(e) {
                uiFunctions.popupManager.closePopup("confirmation-popup");
                callback();
            });
        },
        
        showInput: function(msg, defaultValue, callback) {
            this.popupManager.showPopup("input-popup", "Input", msg, "Confirm", true);
            
            var uiFunctions = this;
            var maxChar = 40;
            $("<p><input class='text' autocomplete='false' autofocus='true' maxlength='" + maxChar + "' /></p>").insertBefore($("#input-popup .buttonbox"));
            
            $("#input-popup input").val(defaultValue);
            $("#input-popup input").keydown( uiFunctions.onTextInputKeyDown );
            $("#input-popup input").keyup( uiFunctions.onTextInputKeyUp );
            
            $("#confirmation-cancel").click( function(e) {
                uiFunctions.popupManager.closePopup("input-popup");
            });
            $("#info-ok").click( function(e) {
                uiFunctions.popupManager.closePopup("input-popup");
                var input = $("#input-popup input").val();
                callback(input);
            });
        },
    });

    return UIFunctions;
});
