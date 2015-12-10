define([
    'ash',
    'game/constants/UIConstants',
    'game/worldcreator/WorldCreatorHelper',
    'game/systems/SaveSystem',
    'game/nodes/player/PlayerStatsNode',
    'game/nodes/player/AutoPlayNode',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/DeityNode',
    'game/components/player/DeityComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/common/PlayerActionComponent',
    'game/components/common/PositionComponent',
    'game/components/sector/SectorFeaturesComponent',
], function (Ash,
    UIConstants, WorldCreatorHelper, SaveSystem,
	PlayerStatsNode, AutoPlayNode, PlayerLocationNode, DeityNode,
	DeityComponent,
	ItemsComponent,
	PerksComponent,
	PlayerActionComponent,
	PositionComponent,
	SectorFeaturesComponent
) {
    var UIOutHeaderSystem = Ash.System.extend({
	
		playerStatsNodes: null,
		deityNodes: null,
		currentLocationNodes: null,
		
		gameState: null,
		uiFunctions: null,
		resourcesHelper: null,
		engine: null,
		
		lastUpdateTimeStamp: 0,
		updateFrequency: 1000 * 2,
	
		constructor: function (uiFunctions, gameState, resourcesHelper) {
			this.gameState = gameState;
			this.uiFunctions = uiFunctions;
			this.resourcesHelper = resourcesHelper;
			return this;
		},
	
		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.deityNodes = engine.getNodeList(DeityNode);
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
			this.uiFunctions.generateCallouts("#statsbar-self");
		},
	
		update: function (time) {
			if (!this.currentLocationNodes.head) return;
			this.updateOverlay();
			this.updateLevelColours();
			this.updateGameMsg();
			this.updateNotifications();
			
			if (new Date().getTime() - this.lastUpdateTimeStamp < this.updateFrequency) return;
			this.updatePlayerStats();
			this.updateDeity();
			this.updateItems();
			this.updatePerks();
			this.updateResources();
			this.lastUpdateTimeStamp = new Date().getTime();
		},
		
		updateOverlay: function () {
			var featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sunlit = featuresComponent.sunlit;
            var visionPercentage = (this.playerStatsNodes.head.vision.value / 100);
			var alphaVal = (0.8 - visionPercentage * 0.8);
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
		
		updatePlayerStats: function () {
			var playerStatsNode = this.playerStatsNodes.head;
			var maxVision = playerStatsNode.vision.maximum;
			var maxStamina = Math.round(playerStatsNode.stamina.health);
			
			$("#stats-vision .value").text(Math.round(playerStatsNode.vision.value) + " / " + maxVision);
			this.updateStatsCallout("stats-vision", playerStatsNode.vision.accSources);
			
			$("#stats-stamina .value").text(Math.round(playerStatsNode.stamina.stamina) + " / " + maxStamina);
			this.updateStatsCallout("stats-stamina", playerStatsNode.stamina.accSources);
			
			$("#stats-reputation .value").text(Math.round(playerStatsNode.reputation.value) + " / " + playerStatsNode.reputation.limit);
			$("#stats-reputation").toggle(playerStatsNode.reputation.isAccumulating);
			this.updateStatsCallout("stats-reputation", playerStatsNode.reputation.accSources);
			
			$("#stats-rumours .value").text(Math.floor(playerStatsNode.rumours.value));
			$("#stats-rumours").toggle(playerStatsNode.rumours.isAccumulating);
			this.updateStatsCallout("stats-rumours", playerStatsNode.rumours.accSources);
			
			$("#stats-evidence .value").text(Math.round(playerStatsNode.evidence.value) + " / " + playerStatsNode.evidence.cap);
			$("#stats-evidence").toggle(this.gameState.unlockedFeatures.evidence);
			this.updateStatsCallout("stats-evidence", playerStatsNode.evidence.accSources);
		},
		
		updateStatsCallout: function( indicatorID, changeSources ) {
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
		
		updateItems: function(forced) {
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			
			var items = itemsComponent.getEquipped();
			if (forced || items.length != $("#statsbar-items ul#list-items-items li").length) {
			$("#statsbar-items ul#list-items-items").empty();
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				var li = UIConstants.getItemLI(item);
				$("#statsbar-items ul#list-items-items").append(li);
			}
			
			this.uiFunctions.generateCallouts("#statsbar-items");
			}
		},
		
		updatePerks: function (forced) {
			var perksComponent = this.playerStatsNodes.head.entity.get(PerksComponent);
			
			var perks = perksComponent.getAll();
			if (forced || perks.length !== $("#statsbar-items ul#list-items-perks li").length) {
				$("#statsbar-items ul#list-items-perks").empty();
				for (var i = 0; i < perks.length; i++) {
					var perk = perks[i];
					var url = perk.icon;
					var isNegative = perksComponent.isNegative(perk);
					var liClass = isNegative ? "li-item-negative" : "li-item-positive";
					liClass += " " + "item-equipped";
					var li =
					"<li class='" + liClass + "'>"+
					"<div class='info-callout-target info-callout-target-small' description='" +
					perk.name + " (" + perk.effect + ")" + 
					"'><img src='" + url + "'/></div></li>"
					$("#statsbar-items ul#list-items-perks").append(li);
				}
				
				this.uiFunctions.generateCallouts("#statsbar-items");
			}
		},
		
		updateResources: function () {
			var inCamp = this.playerStatsNodes.head.entity.get(PositionComponent).inCamp;
			var showResources = this.getShowResources();
			var showResourceAcc = this.getShowResourceAcc();
			var storageCap = this.resourcesHelper.getCurrentStorageCap();
			var showStorageName = this.resourcesHelper.getCurrentStorageName();
			var inventoryUnlocked = false;
	
			// Update indicators
			// TODO Noora decide where to put the res details; only show in camp? where? layout?
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var resourceUnlocked = this.gameState.unlockedFeatures.resources[name] === true;
				inventoryUnlocked = inventoryUnlocked || resourceUnlocked;
                UIConstants.updateResourceIndicator(
                    name,
                    "#resources-" + name,
                    showResources.getResource(name),
                    showResourceAcc == null ? 0 : Math.round(showResourceAcc.resourceChange.getResource(name) * 10000) / 10000,
                    storageCap,
					true,
                    false,//inCamp,
                    false,//inCamp,
                    resourceUnlocked
                );
                if (showResourceAcc) {
                    UIConstants.updateResourceIndicatorCallout("#resources-" + name, showResourceAcc.getSources(name));
                }
			}
			
			// TODO decide if this is needed
			$("#resources-storage").toggle(false)//inventoryUnlocked);
			$("#resources-storage .label").text(showStorageName);
			$("#resources-storage .value").text(storageCap);
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
			$("#notification-player").toggle(isBusy);
			if (isBusy) {
				$("#notification-player p").html(busyComponent.getDescription());
			}
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
