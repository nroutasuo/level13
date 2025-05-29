// button with cooldowns and callout with action info

define([
    'core/ExceptionHandler', 
    'text/Text',
    'game/GameGlobals',
    'game/constants/PlayerActionConstants',
	'game/constants/UIConstants',
], function (ExceptionHandler, Text, GameGlobals, PlayerActionConstants, UIConstants) {

	let ActionButton = {

        context: "ActionButton",

        isButton: function (elem) {
            let $btn = $(elem);
            return $btn.parent().hasClass("container-btn-action");
        },

        create: function (elem) {
            let $btn = $(elem);
            let id = $btn.attr("id");
            let action = $btn.attr("action");
            let name = id ? "#" + id : "a:" + action;

            if (this.isButton(elem)) {
                log.w("trying to create button again: " + action, this);
                return null;
            }

            this.createLabel($btn, action);
            this.createCooldownIndicators($btn, action);
            this.createHotkeyIndicator($btn, action);
            let $container = this.createContainer($btn, action);
            this.createCallout($btn, $container, action);

            let button = {};
            button.name = name;
            button.action = action;
			button.$container = $container;
			button.$button = $btn;
            return button;
        },

        registerListener: function (button, owner, fn) {
            if (button.$button.hasClass("btn-click-bound")) {
                log.w("trying to register listener twice: " + button.name, this);
                return;
            }
            button.$button.click(ExceptionHandler.wrapClick(() => fn.apply(owner, [ button ])));
            button.$button.addClass("btn-click-bound");
        },

        createLabel: function ($btn, action) {
            let text = $btn.text();
            $btn.text("");
            $btn.append("<span class='btn-label'>" + text + "</span>");
        },

        createCooldownIndicators: function ($btn, action) {
            $btn.append("<div class='cooldown-action' style='display:none' />");
            $btn.append("<div class='cooldown-duration' style='display:none' />");
        },

        createHotkeyIndicator: function ($btn, action) {
            let hotkey = GameGlobals.uiFunctions.getActionHotkey(action);
            if (hotkey) {
                $btn.append("<div class='hotkey-hint hide-in-small-layout'>" + hotkey.displayKeyShort + "</div>");
            }
        },

        createContainer: function ($btn, action) {
            $btn.wrap("<div class='container-btn-action' />");

            let $container = $btn.parent(".container-btn-action");
            if ($container.find(".cooldown-reqs").length > 0) return;
            let costs = GameGlobals.playerActionsHelper.getCosts(action);
            let hasCosts = action && costs && Object.keys(costs).length > 0;
            if (hasCosts) {
                $container.append("<div class='cooldown-reqs' data-action='" + action + "' />");
            }

            return $container;
        },

        createCallout: function ($btn, $container, action) {
            if (!action) return;
            if (action === "fight") return;
            let content = this.getCalloutContent(action);
            if (!content.content) return;

            let calloutClasses = "btn-callout";
            if (!content.hasContent) calloutClasses += " btn-callout-empty"
            
            $container.wrap('<div class="callout-container"></div>');
            $container.after('<div class="' + calloutClasses + '"><div class="callout-arrow-up"></div><div class="btn-callout-content">' + content.content + '</div></div>');
        },
			
        getCalloutContent: function (action) {
            let baseActionId = GameGlobals.playerActionsHelper.getBaseActionID(action);

            let content = "";
            let enabledContent = "";
            let disabledContent = "";

            let hasContent = false;

            // always visible
            // - basic description
            let description = GameGlobals.playerActionsHelper.getDescription(action);
            if (description) {
                content += "<span class='action-description'>" + description + "</span>";
                hasContent = true;
            }

            // - dynamic effect description
            content += "<div class='action-effect-description-container'>";
            if (content.length > 0) content += "<hr/>";
            content += "<span class='action-effect-description'></span>"
            content += "</div>";

            // visible if button is enabled: costs, special requirements, & risks
            // - costs
            let costs = GameGlobals.playerActionsHelper.getCosts(action);
            let costsSpans = UIConstants.getCostsSpans(action, costs);
            if (costsSpans.length > 0) {
                if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
                enabledContent += costsSpans;
                hasContent = true;
            }

            // - time to available
            if (GameGlobals.playerActionsHelper.isOnlyAccumulatingCosts(costs, true)) {
                enabledContent += "<div class='action-costs-countdown-container'>";
                if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
                enabledContent += "<span class='action-costs-countdown'></span>";
                enabledContent += "</div>";
                hasContent = true;
            }

            // - duration
            let duration = PlayerActionConstants.getDuration(action, baseActionId);
            if (duration > 0) {
                if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
                let time = Math.round(duration * 100) / 100 + "s";
                let durationText = Text.t("ui.actions.action_duration_field", time);
                enabledContent += "<span class='action-duration'>" + durationText + "</span>";
                hasContent = true;
            }
            
            // - special requirements (such as max improvements on level)
            let specialReqs = GameGlobals.playerActionsHelper.getSpecialReqs(action);
            if (specialReqs) {
                let s = GameGlobals.uiFunctions.getSpecialReqsText(action);
                if (s.length > 0) {
                    if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
                    enabledContent += "<span class='action-special-reqs'>" + s + "</span>";
                    hasContent = true;
                }
            }

            // - risks
            let encounterFactor = GameGlobals.playerActionsHelper.getEncounterFactor(action);
            let injuryRiskMax = PlayerActionConstants.getInjuryProbability(action, 0, 0);
            let inventoryRiskMax = PlayerActionConstants.getLoseInventoryProbability(action, 0, 0);
            let fightRiskMax = PlayerActionConstants.getRandomEncounterProbability(baseActionId, 0, 1, encounterFactor);
            let fightRiskMin = PlayerActionConstants.getRandomEncounterProbability(baseActionId, 100, 1, encounterFactor);

            if (injuryRiskMax > 0 || inventoryRiskMax > 0 || fightRiskMax > 0) {
                if (content.length > 0 || enabledContent.length) enabledContent += "<hr/>";
                let inventoryRiskLabel = action === "despair" ? "drop items" : "drop item";
                if (injuryRiskMax > 0)
                    enabledContent += "<span class='action-risk action-risk-injury warning'>injury: <span class='action-risk-value'></span>%</span>";
                if (inventoryRiskMax > 0)
                    enabledContent += "<span class='action-risk action-risk-inventory warning'>" + inventoryRiskLabel + ": <span class='action-risk-value'></span>%</span>";
                if (fightRiskMax > 0)
                    enabledContent += "<span class='action-risk action-risk-fight warning'>fight: <span class='action-risk-value'></span>%</span>";
                hasContent = true;
            }

            // visible if button is disabled: disabled reason
            if (content.length > 0 || enabledContent.length > 0) {
                if (content.length > 0) disabledContent += "<hr/>";
                disabledContent += "<span class='btn-disabled-reason action-cost-blocker'></span>";
            }

            if (enabledContent.length > 0) {
                content += "<span class='btn-callout-content-enabled'>" + enabledContent + "</span>";
            }

            if (disabledContent.length > 0) {
                content += "<span class='btn-callout-content-disabled' style='display:none'>" + disabledContent + "</span>";
            }

            return { content: content, hasContent: hasContent };
        },
	};

	return ActionButton;
});