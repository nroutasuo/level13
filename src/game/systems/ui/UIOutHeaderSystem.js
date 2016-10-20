define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/constants/UpgradeConstants',
    'game/constants/PlayerStatConstants',
    'game/worldcreator/WorldCreatorHelper',
    'game/systems/SaveSystem',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/AutoPlayNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/tribe/TribeUpgradesNode',
    'game/nodes/player/DeityNode',
    'game/components/player/BagComponent',
    'game/components/player/DeityComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/player/PlayerActionComponent',
    'game/components/common/PositionComponent',
    'game/components/common/CampComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/tribe/UpgradesComponent',
], function (Ash,
    UIConstants, ItemConstants, FightConstants, UpgradeConstants, PlayerStatConstants,
    WorldCreatorHelper, SaveSystem,
	PlayerStatsNode, AutoPlayNode, PlayerLocationNode, TribeUpgradesNode, DeityNode,
    BagComponent,
	DeityComponent,
	ItemsComponent,
	PerksComponent,
	PlayerActionComponent,
	PositionComponent,
    CampComponent,
	SectorFeaturesComponent,
	UpgradesComponent
) {
    var UIOutHeaderSystem = Ash.System.extend({
	
		playerStatsNodes: null,
		deityNodes: null,
		tribeNodes: null,
		currentLocationNodes: null,
		
		gameState: null,
		uiFunctions: null,
		resourcesHelper: null,
        upgradeEffectsHelper: null,
		engine: null,
		
		lastUpdateTimeStamp: 0,
		updateFrequency: 1000 * 1,
	
		constructor: function (uiFunctions, gameState, resourcesHelper, upgradeEffectsHelper) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.resourcesHelper = resourcesHelper;
            this.upgradeEffectsHelper = upgradeEffectsHelper;
			return this;
		},
	
		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.deityNodes = engine.getNodeList(DeityNode);
            this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.currentLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);
			
			this.generateStatsCallouts();
		},
	
		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerStatsNodes = null;
			this.deityNodes = null;
			this.currentLocationNodes = null;
			this.autoPlayNodes = null;
		},
		
		generateStatsCallouts: function () {
			$.each($("#statsbar-self .stats-indicator"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			$.each($("#statsbar-exploration .stats-indicator"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			this.uiFunctions.generateCallouts("#statsbar-self");
			this.uiFunctions.generateCallouts("#statsbar-exploration");
		},
	
		update: function (time) {
			if (!this.currentLocationNodes.head) return;
			
            var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
			var isInCamp = playerPosition.inCamp;
			
			this.updateOverlay();
			this.updateLevelColours();
			this.updateGameMsg();
			this.updateNotifications();
            
            var headerText = isInCamp ? campComponent.getName() + "  (level " + playerPosition.level + ")" : "level " + playerPosition.level;
            var showCalendar = this.tribeNodes.head.upgrades.hasUpgrade(this.upgradeEffectsHelper.getUpgradeIdForUIEffect(UpgradeConstants.upgradeUIEffects.calendar));
            $("#grid-location-header h1").text(headerText);
            $("#in-game-date").text(UIConstants.getInGameDate(this.gameState.gamePlayedSeconds));
            $("#in-game-date").toggle(showCalendar);
            $("#grid-tab-header").toggle(this.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.out || isInCamp);
			
			if (new Date().getTime() - this.lastUpdateTimeStamp < this.updateFrequency) return;
			this.updatePlayerStats(isInCamp);
			this.updateDeity();
			this.updateItems(false, isInCamp);
			this.updatePerks();
			this.updateResources(isInCamp);
			this.lastUpdateTimeStamp = new Date().getTime();
		},
		
		updateOverlay: function () {
			var featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sunlit = featuresComponent.sunlit;
            var visionPercentage = (this.playerStatsNodes.head.vision.value / 100);
			var alphaVal = (0.5 - visionPercentage * 0.5);
            alphaVal = Math.min(alphaVal, 1);
			alphaVal = Math.max(alphaVal, 0);
			
			var bgColorVal = 0;
			if (sunlit) bgColorVal = 255;
			var textColorVal = 255;
			if (sunlit) textColorVal = 0;
			// TODO performance consider appending to stylesheet (https://learn.jquery.com/performance/use-stylesheets-for-changing-css/)
			$("#page-overlay").css("background-color", "rgba(" + bgColorVal + "," + bgColorVal + "," + bgColorVal + "," + (alphaVal * 0.5) + ")");
			$("body").toggleClass("sunlit", sunlit);
			$("body").toggleClass("dark", !sunlit);
			$("img").css("opacity", (1 - alphaVal));
		},
		
		updateLevelColours: function () {
			var levelColour = this.getLevelColour();
			var levelColourS = "rgba(" + levelColour.r + ", " + levelColour.g + ", " + levelColour.b + ", 0.85)";
			$.each($(".level-bg-colour"), function () {
				$(this).css("background-color", levelColourS);
			});
			$.each($(".level-text-colour"), function () {
				$(this).css("color", levelColourS);
			});
		},
		
		updatePlayerStats: function (isInCamp) {
			var playerStatsNode = this.playerStatsNodes.head;
            var playerStamina = playerStatsNode.stamina.stamina;
			var playerVision = playerStatsNode.vision.value;
			var maxVision = playerStatsNode.vision.maximum;
			var maxStamina = Math.round(playerStatsNode.stamina.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
			
			$("#stats-vision").toggle(!isInCamp);
			$("#stats-stamina").toggle(!isInCamp);
			$("#stats-stamina-in").toggle(isInCamp);
			
			$("#stats-vision .value").text(UIConstants.roundValue(playerVision, true, false) + " / " + maxVision);
			this.updateStatsCallout("stats-vision", playerStatsNode.vision.accSources);
			
			$("#stats-stamina .value").text(UIConstants.roundValue(playerStamina, true, false) + " / " + maxStamina);
			$("#stats-stamina-in .value").text(UIConstants.roundValue(playerStamina, true, false) + " / " + maxStamina);
			this.updateStatsCallout("stats-stamina", playerStatsNode.stamina.accSources);
			this.updateStatsCallout("stats-stamina-in", playerStatsNode.stamina.accSources);

            $("#stats-health .value").text(playerStatsNode.stamina.health);
            this.updateStatsCallout("stats-health", null);

            var staminaCostToMoveOneSector = this.uiFunctions.playerActions.playerActionsHelper.getCosts("move_sector_west", 1, 1).stamina;
            var staminaWarningLimit = Math.max(
                this.uiFunctions.playerActions.playerActionsHelper.getCosts("move_camp_level", 1, 100).stamina + staminaCostToMoveOneSector * 3,
                staminaCostToMoveOneSector * 5);
            $("#stats-health .value").toggleClass("warning", playerStatsNode.stamina.health <= 25);
            $("#stats-vision .value").toggleClass("warning", playerVision <= 25);
            $("#stats-stamina .value").toggleClass("warning", playerStamina <= staminaWarningLimit);
            $("#stats-stamina-in .value").toggleClass("warning", playerStamina <= staminaWarningLimit);
			
			$("#stats-reputation .value").text(this.roundStatValue(playerStatsNode.reputation.value) + " / " + playerStatsNode.reputation.limit);
			$("#stats-reputation").toggle(playerStatsNode.reputation.isAccumulating);
			this.updateStatsCallout("stats-reputation", playerStatsNode.reputation.accSources);
			
			$("#stats-rumours .value").text(this.roundStatValue(playerStatsNode.rumours.value));
			$("#stats-rumours").toggle(playerStatsNode.rumours.isAccumulating);
			this.updateStatsCallout("stats-rumours", playerStatsNode.rumours.accSources);
			
			$("#stats-evidence .value").text(this.roundStatValue(playerStatsNode.evidence.value) + " / " + playerStatsNode.evidence.cap);
			$("#stats-evidence").toggle(this.gameState.unlockedFeatures.evidence);
			this.updateStatsCallout("stats-evidence", playerStatsNode.evidence.accSources);
            
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var fightAtt = FightConstants.getPlayerAtt(playerStatsNode.stamina, itemsComponent);
            var fightDef = FightConstants.getPlayerDef(playerStatsNode.stamina, itemsComponent);
            var fightStrength = fightAtt + fightDef;
            
            $("#stats-fight .value").text(fightStrength);
            $("#stats-fight-att .value").text(fightAtt);
            $("#stats-fight-def .value").text(fightDef);
			$("#stats-fight").toggle(this.gameState.unlockedFeatures.fight);
			$("#stats-fight-att").toggle(this.gameState.unlockedFeatures.fight);
			$("#stats-fight-def").toggle(this.gameState.unlockedFeatures.fight);
            
            $("#stats-scavenge").toggle(this.gameState.unlockedFeatures.scavenge);
			var scavengeEfficiency = Math.round(this.uiFunctions.playerActions.playerActionResultsHelper.getScavengeEfficiency() * 200) / 2;
			$("#stats-scavenge .value").text(scavengeEfficiency + "%");
			UIConstants.updateCalloutContent("#stats-scavenge", "health: " + Math.round(maxStamina) + "<br/>vision: " + Math.round(playerVision));
		},
		
		updateStatsCallout: function (indicatorID, changeSources) {
			var content = "";
			var source;
			for (var i in changeSources) {
				source = changeSources[i];
				if (source.amount != 0) {
					var amount = Math.round(source.amount * 10000)/10000;
					if (amount == 0 && source.amount > 0) {
						amount = "< 0.0001";
					}
					content += source.source + ": " + amount + "/s<br/>";
				}
			}
			
			if (content.length <= 0) {
				content = "(no change)";
			}
			UIConstants.updateCalloutContent("#" + indicatorID, content);
		},
		
		updateDeity: function () {
			var hasDeity = this.deityNodes.head != null;
			$("#statsbar-deity").toggle(hasDeity);
			
			if (hasDeity) {
				$("#deity-favour .value").text(Math.round(this.deityNodes.head.deity.favour));
				$("#deity-name").text(this.deityNodes.head.deity.name);
			}
		},
		
		updateItems: function (forced, isInCamp) {
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            $("ul#list-items-items").toggle(!isInCamp);
			
			var items = itemsComponent.getUnique(isInCamp);
			if (forced || items.length !== this.lastItemsUpdateItemCount) {
                $("ul#list-items-items").empty();
                $("ul#list-items-followers").empty();
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    switch (item.type) {                        
                        case ItemConstants.itemTypes.follower:
                            $("ul#list-items-followers").append("<li>" + UIConstants.getItemDiv(item, -1, true, false) + "</li>");
                            break;
                        
                        default:
                            if (item.equipped)
                                $("ul#list-items-items").append("<li>" + UIConstants.getItemDiv(item, -1, true, false) + "</li>");
                            break;
                    }
                }
                
                this.uiFunctions.generateCallouts("ul#list-items-items");
                this.uiFunctions.generateCallouts("ul#list-items-followers");
                
                this.lastItemsUpdateItemCount = items.length;
			}
		},
		
		updatePerks: function (forced) {
			var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
			
			var perks = perksComponent.getAll();
            var resetList = forced || perks.length !== $("ul#list-items-perks li").length;
			if (resetList) {
				$("ul#list-items-perks").empty();
            }
            
            for (var i = 0; i < perks.length; i++) {
                var perk = perks[i];
                var desc = perk.name + " (" + UIConstants.getPerkDetailText(perk) + ")";
                if (resetList) {
                    var url = perk.icon;
                    var isNegative = perksComponent.isNegative(perk);
                    var liClass = isNegative ? "li-item-negative" : "li-item-positive";
                    liClass += " item item-equipped";
                    var li =
                        "<li class='" + liClass + "' id='perk-header-" + perk.id + "'>" +
                        "<div class='info-callout-target info-callout-target-small' description='" + desc + "'>" +
                        "<img src='" + url + "'/>" +
                        "</div></li>";
                } else {
                    $("#perk-header-" + perk.id + " .info-callout-target").attr("description", desc);
                    $("#perk-header-" + perk.id).toggleClass("event-ending", perk.effectTimer >= 0 && perk.effectTimer < 5);
                }
                $("ul#list-items-perks").append(li);
            }
				
            this.uiFunctions.generateCallouts("ul#list-items-perks");
		},
		
		updateResources: function (inCamp) {
			var showResources = this.getShowResources();
			var showResourceAcc = this.getShowResourceAcc();
			var storageCap = this.resourcesHelper.getCurrentStorageCap();
			var showStorageName = this.resourcesHelper.getCurrentStorageName();
			var inventoryUnlocked = false;
            
            this.uiFunctions.slideToggleIf("#main-header-camp", null, inCamp, 250, 50);
            this.uiFunctions.slideToggleIf("#statsbar-exploration", null, !inCamp, 250, 50);
            this.uiFunctions.slideToggleIf("#main-header-bag", null, !inCamp, 250, 50);
            $("#header-camp-storage").toggle(inCamp);
            $("#statsbar-resources").toggle(inCamp);
            $("#header-bag-storage").toggle(!inCamp && this.gameState.unlockedFeatures.bag);
            $("#bag-resources").toggle(!inCamp);
	
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var resourceUnlocked = this.gameState.unlockedFeatures.resources[name] === true;
				inventoryUnlocked = inventoryUnlocked || resourceUnlocked;
                if (inCamp) {
                    UIConstants.updateResourceIndicator(
                        name,
                        "#resources-" + name,
                        showResources.getResource(name),
                        showResourceAcc == null ? 0 : Math.round(showResourceAcc.resourceChange.getResource(name) * 10000) / 10000,
                        storageCap,
                        false,
                        true,
                        true,
                        name === resourceNames.food || name === resourceNames.water,
                        resourceUnlocked
                    );
                    if (showResourceAcc) {
                        UIConstants.updateResourceIndicatorCallout("#resources-" + name, showResourceAcc.getSources(name));
                    }
                    $("#header-camp-storage .label").text(showStorageName);
                    $("#header-camp-storage .value").text(storageCap);
                } else {
                    UIConstants.updateResourceIndicator(
                        name,
                        "#resources-bag-" + name,
                        showResources.getResource(name),
                        showResourceAcc == null ? 0 : Math.round(showResourceAcc.resourceChange.getResource(name) * 10000) / 10000,
                        storageCap,
                        false,
                        false,
                        false,
                        name === resourceNames.food || name === resourceNames.water,
                        resourceUnlocked && (name === "water" || name === "food" || showResources.getResource(name) > 0)
                    );
                    
                    var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
                    $("#header-bag-storage .value").text(Math.floor(bagComponent.usedCapacity * 10) / 10);
                    $("#header-bag-storage .value-total").text(storageCap);
                }
			}
		},
		
		updateGameMsg: function () {
			if (this.engine) {
				var gameMsg = "";
                
				var saveSystem = this.engine.getSystem(SaveSystem);
				var timeStamp = new Date().getTime();
				if (saveSystem.lastSaveTimeStamp > 0 && timeStamp - saveSystem.lastSaveTimeStamp < 3 * 1000)
					gameMsg = "Game saved ";
					
				if (this.autoPlayNodes.head) gameMsg += "Autoplaying";
				
				$("#game-msg").text(gameMsg);
			}
			
			$("#game-version").text("v. " + this.uiFunctions.changeLogHelper.getCurrentVersionNumber());
		},
		
		updateNotifications: function () {
			var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			var isBusy = this.playerStatsNodes.head.entity.has(PlayerActionComponent) && busyComponent.isBusy();
			if (isBusy) {
                $("#notification-player-bar").data("progress-percent", busyComponent.getPercentage());
                $("#notification-player-bar .progress-label").text(busyComponent.getDescription());
			}
			$("#notification-player").css("opacity", isBusy ? 1 : 0);
		},
        
        roundStatValue: function (value) {
            if (value < 10) return Math.floor(value * 100) / 100;
            if (value < 100) return Math.floor(value * 10) / 10;
            return Math.floor(value);
        },
		
		getShowResources: function () {
			return this.resourcesHelper.getCurrentStorage().resources;
		},
		
		getShowResourceAcc: function () {
			return this.resourcesHelper.getCurrentStorageAccumulation(false);
		},
		
		getLevelColour: function () {
			var featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
			var level = this.currentLocationNodes.head.entity.get(PositionComponent).level;
			var maxLevel = WorldCreatorHelper.getHighestLevel(this.gameState.worldSeed);
			var minLevel = WorldCreatorHelper.getBottomLevel(this.gameState.worldSeed);
			var sunlit = featuresComponent.sunlit;
			
			var c = new Object();
			if (sunlit) {
				c.r = 255;
				c.g = 255;
				c.b = 255;
			} else {
				if (level > 3) {
					c.r = Math.pow(level/maxLevel,10)*420;
					c.g = Math.pow(level/maxLevel,8)*335;
					c.b = Math.pow(level/maxLevel,8)*345;
				} else {
					c.r = Math.pow((level-20)/(minLevel-20),8)*2;
					c.g = Math.pow((level-20)/(minLevel-20),9)*120;
					c.b = Math.pow((level-20)/(minLevel-20),8)*80;
				}
			}
			
			c.r = Math.max( Math.min( Math.round(c.r), 255), 0);
			c.g = Math.max( Math.min( Math.round(c.g), 255), 0);
			c.b = Math.max( Math.min( Math.round(c.b), 255), 0);
			
			return c;
		},
    });

    return UIOutHeaderSystem;
});
