define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/LevelConstants',
	'game/constants/UIConstants',
	'game/constants/FollowerConstants',
	'game/constants/ItemConstants',
	'game/constants/FightConstants',
	'game/constants/PerkConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PlayerStatConstants',
	'game/systems/SaveSystem',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/player/AutoPlayNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/nodes/player/DeityNode',
	'game/components/player/BagComponent',
	'game/components/player/DeityComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/ReputationComponent',
	'game/components/type/LevelComponent',
	'utils/UIState',
	'utils/UIAnimations'
], function (Ash,
	GameGlobals, GlobalSignals, GameConstants, CampConstants, LevelConstants, UIConstants, FollowerConstants, ItemConstants, FightConstants, PerkConstants, UpgradeConstants, PlayerStatConstants,
	SaveSystem,
	PlayerStatsNode, AutoPlayNode, PlayerLocationNode, TribeUpgradesNode, DeityNode,
	BagComponent,
	DeityComponent,
	ItemsComponent,
	PlayerActionComponent,
	PositionComponent,
	CampComponent,
	SectorFeaturesComponent,
	SectorImprovementsComponent,
	ReputationComponent,
	LevelComponent,
	UIState,
	UIAnimations
) {
	var UIOutHeaderSystem = Ash.System.extend({

		playerStatsNodes: null,
		deityNodes: null,
		tribeNodes: null,
		currentLocationNodes: null,
		engine: null,
		
		previousShownCampResAmount: {},
		previousStats: {},
		previousStatsUpdates: {},
		
		SCAVENGE_BONUS_TYPES: [
			{ itemBonusType: ItemConstants.itemBonusTypes.scavenge_general, displayName: "general", containerID: "scavenge-bonus-general" },
			{ itemBonusType: ItemConstants.itemBonusTypes.scavenge_ingredients, displayName: "ingredients", containerID: "scavenge-bonus-ingredients" },
			{ itemBonusType: ItemConstants.itemBonusTypes.scavenge_supplies, displayName: "supplies", containerID: "scavenge-bonus-supplies" },
		],

		constructor: function () {
			this.initElements();
			
			this.elements = {};
			this.elements.body = $("body");
			this.elements.locationHeader = $("#grid-location-header h1");
			this.elements.date = $("#in-game-date");
			this.elements.gameMsg = $("#game-msg")
			this.elements.gameVersion = $("#game-version");
			this.elements.valVision = $("#stats-vision .value");
			this.elements.valStamina = $("#stats-stamina .value");
			this.elements.valHealth = $("#stats-health .value");
			this.elements.valRumours = $("#stats-rumours .value");
			this.elements.valEvidence = $("#stats-evidence .value");
			this.elements.valFavour = $("#stats-favour .value");
			this.elements.valScavenge = $("#stats-scavenge .value");
			this.elements.valReputation = $("#header-camp-reputation .value");
			this.elements.changeIndicatorVision = $("#vision-change-indicator");
			this.elements.changeIndicatorHealth = $("#health-change-indicator");
			this.elements.changeIndicatorScavenge = $("#scavenge-change-indicator");
			this.elements.changeIndicatorStamina = $("#stamina-change-indicator");
			this.elements.changeIndicatorReputation = $("#reputation-change-indicator");
			this.elements.changeIndicatorPopulation = $("#population-change-indicator");
			this.elements.changeIndicatorEvidence = $("#evidence-change-indicator");
			this.elements.changeIndicatorRumours = $("#rumours-change-indicator");
			this.elements.changeIndicatorFavour = $("#favour-change-indicator");

			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.deityNodes = engine.getNodeList(DeityNode);
			this.tribeNodes = engine.getNodeList(TribeUpgradesNode);
			this.currentLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.autoPlayNodes = engine.getNodeList(AutoPlayNode);

			var sys = this;
			GlobalSignals.playerMovedSignal.add(function () { sys.onPlayerMoved(); });
			GlobalSignals.playerEnteredCampSignal.add(function () { sys.onPlayerEnteredCamp(); });
			GlobalSignals.playerLeftCampSignal.add(function () { sys.onPlayerLeftCamp(); });
			GlobalSignals.actionStartingSignal.add(function () { sys.onActionStarting(); });
			GlobalSignals.actionStartedSignal.add(function () { sys.onInventoryChanged(); });
			GlobalSignals.visionChangedSignal.add(function () { sys.onVisionChanged(); });
			GlobalSignals.tabChangedSignal.add(function () { sys.onTabChanged(); });
			GlobalSignals.healthChangedSignal.add(function () { sys.onHealthChanged(); });
			GlobalSignals.tribeStatsChangedSignal.add(function () { sys.onTribeStatsChanged(); });
			GlobalSignals.inventoryChangedSignal.add(function () { sys.onInventoryChanged(); });
			GlobalSignals.equipmentChangedSignal.add(function () { sys.onEquipmentChanged(); });
			GlobalSignals.followersChangedSignal.add(function () { sys.onFollowersChanged(); });
			GlobalSignals.actionCompletedSignal.add(function () { sys.onPlayerActionCompleted(); });
			GlobalSignals.slowUpdateSignal.add(function () { sys.slowUpdate(); });
			GlobalSignals.changelogLoadedSignal.add(function () { sys.updateGameVersion(); });
			GlobalSignals.add(this, GlobalSignals.perksChangedSignal, this.onPerksChanged);
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);

			this.generateStatsCallouts();
			this.updateGameVersion();
			this.refreshPerks();
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.engine = null;
			this.playerStatsNodes = null;
			this.deityNodes = null;
			this.currentLocationNodes = null;
			this.autoPlayNodes = null;
		},
		
		initElements: function () {
			let $container = $("#stats-scavenge-bonus");
			for (let i = 0; i < this.SCAVENGE_BONUS_TYPES.length; i++) {
				let bonus = this.SCAVENGE_BONUS_TYPES[i];
				let div = "<div id='" + bonus.containerID + "'>";
				div += "<span class='label'>" + bonus.displayName + "</span>";
				div += "<div class='stats-value-container'><span class='value'>0</span></div>";
				div += "</div>";
				$container.append(div)
			}
			let themedIcons = [];
			$.each($("img.img-themed"), function () {
				themedIcons.push({
					$elem: $(this),
					pathSunlit: $(this).attr("data-src-sunlit"),
					pathDark: $(this).attr("src"),
				});
			});
			this.themedIcons = themedIcons;
		},

		generateStatsCallouts: function () {
			$.each($("#statsbar-self .stats-indicator"), function () {
				$(this).wrap("<div class='info-callout-target info-callout-target-small'></div>");
			});
			$.each($("#header-self-bar .stats-indicator"), function () {
				$(this).wrap("<div class='info-callout-target info-callout-target-small'></div>");
			});
			$.each($("#header-camp-reputation"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
			$.each($("#header-camp-population"), function () {
				$(this).wrap("<div class='info-callout-target'></div>");
			});
		},

		update: function (time) {
			if (!this.currentLocationNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;

			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
			var isInCamp = playerPosition.inCamp;

			this.updateGameMsg();
			this.updateNotifications(isInCamp);
			this.updatePerks();
			
			if (this.pendingResourceUpdateTime) {
				this.pendingResourceUpdateTime -= time;
				if (this.pendingResourceUpdateTime <= 0) {
					this.updateResources();
					this.pendingResourceUpdateTime = 0;
				}
			}
		},

		slowUpdate: function () {
			if (!this.currentLocationNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;

			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var isInCamp = playerPosition.inCamp;
			this.updatePlayerStats();
			this.updateDeity();
			this.updateItems(false, isInCamp);
			this.updateResourcesIfNotPending();
			this.updateItemStats();
			
			GameGlobals.uiFunctions.updateCallouts("ul#list-items-perks");
		},
		
		updateGameVersion: function () {
			this.elements.gameVersion.text("v. " + GameGlobals.changeLogHelper.getCurrentVersionNumber());
		},

		updatePlayerStats: function () {
			if (!this.currentLocationNodes.head) return;
			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var isInCamp = playerPosition.inCamp;
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
			var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			var playerStatsNode = this.playerStatsNodes.head;
			var playerStamina = playerStatsNode.stamina.stamina;
			var playerVision = playerStatsNode.vision.value;
			var maxVision = playerStatsNode.vision.maximum;
			var shownVision = UIConstants.roundValue(playerVision, true, false);
			var maxStamina = UIConstants.roundValue(playerStatsNode.stamina.maxStamina);
			var showStamina = UIConstants.roundValue(Math.min(playerStamina, maxStamina), true, false);
			var isResting = this.isResting();
			var isHealing = busyComponent && busyComponent.getLastActionName() == "use_in_hospital";

			this.elements.valVision.text(shownVision + " / " + maxVision);
			this.updateStatsCallout("Makes exploration safer and scavenging more effective", "stats-vision", playerStatsNode.vision.accSources);
			this.updateChangeIndicator(this.elements.changeIndicatorVision, maxVision - shownVision, shownVision < maxVision);

			this.elements.valHealth.text(Math.round(playerStatsNode.stamina.health));
			this.updateStatsCallout("Determines maximum stamina", "stats-health", playerStatsNode.stamina.healthAccSources, true);
			var healthAccumulation = playerStatsNode.stamina.healthAccumulation;
			this.updateChangeIndicator(this.elements.changeIndicatorHealth, healthAccumulation, healthAccumulation != 0, false);

			GameGlobals.uiFunctions.toggle($("#stats-stamina"), GameGlobals.gameState.unlockedFeatures.scavenge);
			this.elements.valStamina.text(showStamina + " / " + maxStamina);
			this.updateStatsCallout("Required for exploration", "stats-stamina", playerStatsNode.stamina.accSources);
			this.updateChangeIndicator(this.elements.changeIndicatorStamina, playerStatsNode.stamina.accumulation, playerStamina < maxStamina, isResting || isHealing);

			this.elements.valVision.toggleClass("warning", playerVision <= 25);
			this.elements.valStamina.toggleClass("warning", playerStamina <= this.staminaWarningLimit);
			this.elements.valHealth.toggleClass("warning", playerStatsNode.stamina.health <= 25);
			
			let showEvidence = GameGlobals.gameState.unlockedFeatures.evidence;
			let showRumours = playerStatsNode.rumours.value > 0 || playerStatsNode.rumours.isAccumulating;
			let hasDeity = this.deityNodes.head != null;
			
			this.updatePlayerStat("rumours", playerStatsNode.rumours, showRumours, playerStatsNode.rumours.value, playerStatsNode.rumours.maxValue, false, this.elements.valRumours, this.elements.changeIndicatorRumours);
			this.updatePlayerStat("evidence", playerStatsNode.evidence, showEvidence, playerStatsNode.evidence.value, playerStatsNode.evidence.maxValue, false, this.elements.valEvidence, this.elements.changeIndicatorEvidence);
			if (hasDeity) {
				this.updatePlayerStat("favour", this.deityNodes.head.deity, hasDeity, this.deityNodes.head.deity.favour, this.deityNodes.head.deity.maxFavour, false, this.elements.valFavour, this.elements.changeIndicatorFavour);
			} else {
				this.updatePlayerStat("favour", null, hasDeity, 0, this.elements.valFavour, 0, false, this.elements.changeIndicatorFavour);
			}

			GameGlobals.uiFunctions.toggle($("#header-tribe-container"), showEvidence || showRumours || hasDeity);

			var improvements = this.currentLocationNodes.head.entity.get(SectorImprovementsComponent);
			var maxPopulation = CampConstants.getHousingCap(improvements);
			var reputationComponent = this.currentLocationNodes.head.entity.get(ReputationComponent);
			if (campComponent && reputationComponent && maxPopulation > 0) {
				var reqReputationCurrent = CampConstants.getRequiredReputation(Math.floor(campComponent.population));
				var reqReputationNext = CampConstants.getRequiredReputation(Math.floor(campComponent.population) + 1);

				this.elements.valReputation.text(UIConstants.roundValue(reputationComponent.value, true, true) + " / " + UIConstants.roundValue(reputationComponent.targetValue, true, true));
				this.updateChangeIndicator(this.elements.changeIndicatorReputation, reputationComponent.accumulation, true);
				var reputationCalloutContent = "";
				for (let i in reputationComponent.targetValueSources) {
					var source = reputationComponent.targetValueSources[i];
					if (source.amount !== 0) {
						var amount = Math.round(source.amount * 10000)/10000;
						if (amount === 0 && source.amount > 0) {
							amount = "< 0.0001";
						}
						reputationCalloutContent += source.source + ": " + amount + "<br/>";
					}
				}
				this.elements.valReputation.toggleClass("warning", reputationComponent.value < reqReputationCurrent);
				UIConstants.updateCalloutContent("#header-camp-reputation", reputationCalloutContent);

				$("#header-camp-population .value").text(Math.floor(campComponent.population) + " / " + maxPopulation);
				this.updateChangeIndicator(this.elements.changeIndicatorPopulation, campComponent.populationChangePerSec, maxPopulation > 0);
				var populationCalloutContent = "Required reputation:<br/>";
				populationCalloutContent += "current: " + reqReputationCurrent + "<br/>";
				populationCalloutContent += "next: " + reqReputationNext;
				UIConstants.updateCalloutContent("#header-camp-population", populationCalloutContent);
				GameGlobals.uiFunctions.toggle("#header-camp-population", true);
				GameGlobals.uiFunctions.toggle("#header-camp-reputation", true);
			} else {
				GameGlobals.uiFunctions.toggle("#header-camp-population", false);
				GameGlobals.uiFunctions.toggle("#header-camp-reputation", false);
			}

			var itemsComponent = this.playerStatsNodes.head.items;
			
			let showScavangeAbility = GameGlobals.gameState.unlockedFeatures.scavenge && !isInCamp;
			this.updateScavengeAbility(showScavangeAbility, isInCamp, maxVision, shownVision);
			this.updateScavengeBonus(showScavangeAbility);
		},
		
		updateScavengeAbility: function (showScavangeAbility, isInCamp, maxVision, shownVision, maxStamina) {
			let showScavangeAbilityLastUpdate = this.showScavangeAbilityLastUpdate;
			GameGlobals.uiFunctions.toggle("#stats-scavenge", showScavangeAbility);
			if (showScavangeAbility) {
				var scavengeEfficiency = Math.round(GameGlobals.playerActionResultsHelper.getCurrentScavengeEfficiency() * 100);
				if (scavengeEfficiency != this.scavangeAbilityLastUpdateValue) {
					var factors = GameGlobals.playerActionResultsHelper. getCurrentScavengeEfficiencyFactors();
					var scavengeEfficiencyExplanation = "<span class='info-callout-content-section-long'>Rate of finding loot in current sector.</span>";
					var factorsExplanation = "";
					for (var key in factors) {
						var name = key;
						factorsExplanation += key + ": " + Math.round(factors[key] * 100) + "%<br/>";
					}
					UIAnimations.animateOrSetNumber(this.elements.valScavenge, showScavangeAbilityLastUpdate, scavengeEfficiency, "%", false, Math.round);
					UIConstants.updateCalloutContent("#stats-scavenge", scavengeEfficiencyExplanation + "<hr/>" + factorsExplanation);
					this.updateChangeIndicator(this.elements.changeIndicatorScavenge, maxVision - shownVision, shownVision < maxVision);
				}
				this.scavangeAbilityLastUpdateValue = scavengeEfficiency;
			}
			this.showScavangeAbilityLastUpdate = showScavangeAbility;
		},
		
		updateScavengeBonus: function (showScavangeAbility) {
			let scavengeBonusTotal = 0;
			let scavengeBonusByType = {};
			for (let i = 0; i < this.SCAVENGE_BONUS_TYPES.length; i++) {
				let val = (GameGlobals.playerHelper.getCurrentBonus(this.SCAVENGE_BONUS_TYPES[i].itemBonusType) - 1) * 100;
				scavengeBonusTotal += val;
				scavengeBonusByType[this.SCAVENGE_BONUS_TYPES[i].itemBonusType] = val;
			}
			let showScavengeBonus = showScavangeAbility && scavengeBonusTotal > 0;
			GameGlobals.uiFunctions.toggle("#stats-scavenge-bonus", showScavengeBonus);
			if (showScavengeBonus > 0) {
				let scavengeBonusCallout = "";
				for (let i = 0; i < this.SCAVENGE_BONUS_TYPES.length; i++) {
					let bonus = this.SCAVENGE_BONUS_TYPES[i];
					let value = scavengeBonusByType[bonus.itemBonusType];
					let $container = $("#" + bonus.containerID);
					GameGlobals.uiFunctions.toggle($container, value > 0);
					$container.find(".value").text(Math.round(value) + "%");
					
					let party = this.playerStatsNodes.head.followers.getParty();
					for (let j = 0; j < party.length; j++) {
						let follower = party[j];
						let followerContribution = FollowerConstants.getFollowerItemBonus(follower, bonus.itemBonusType);
						if (followerContribution > 0) {
							scavengeBonusCallout += follower.name + ": +" + Math.round(followerContribution * 100 - 100) + "%";
						}
					}
					scavengeBonusCallout += "";
				}
				UIConstants.updateCalloutContent("#stats-scavenge-bonus", scavengeBonusCallout);
			}
		},
		
		updatePlayerStat: function (stat, component, isVisible, currentValue, currentLimit, flipNegative, valueElement, changeIndicatorElement) {
			GameGlobals.uiFunctions.toggle("#stats-" + stat, isVisible);
			if (!isVisible) return;
			
			let isAtLimit = currentLimit > 0 && currentValue >= currentLimit;
			
			let now = GameGlobals.gameState.gameTime;
			let previousValue = this.previousStats[stat] || 0;
			let previousUpdate = this.previousStatsUpdates[stat] || 0;
		
			let animate = UIAnimations.shouldAnimateChange(previousValue, currentValue, previousUpdate, now, component.accumulation);
			UIAnimations.animateOrSetNumber(valueElement, animate, currentValue, "/" + currentLimit, flipNegative, (v) => { return Math.floor(v); });
			
			this.updateStatsCallout("", "stats-" + stat, component.accSources);
			this.updateChangeIndicator(changeIndicatorElement, component.accumulation, isVisible && !isAtLimit);
			this.previousStats[stat] = currentValue;
			this.previousStatsUpdates[stat] = now;
		},

		updateChangeIndicator: function (indicator, accumulation, show, showFastIncrease) {
			if (show) {
				indicator.toggleClass("indicator-fastincrease", showFastIncrease == true);
				indicator.toggleClass("indicator-increase", !showFastIncrease && accumulation > 0);
				indicator.toggleClass("indicator-even", !showFastIncrease && accumulation === 0);
				indicator.toggleClass("indicator-decrease", !showFastIncrease && accumulation < 0);
				GameGlobals.uiFunctions.toggle(indicator, true);
			} else {
				GameGlobals.uiFunctions.toggle(indicator, false);
			}
		},

		updateStatsCallout: function (description, indicatorID, changeSources, hideNumbers) {
			var sources = "";
			var source;
			var total = 0;
			for (let i in changeSources) {
				source = changeSources[i];
				if (source.amount != 0) {
					if (hideNumbers) {
						sources += source.source + "<br/>";
					} else {
						var amount = Math.round(source.amount * 1000)/1000;
						if (amount == 0 && source.amount > 0) {
							amount = "<&nbsp;" + (1/1000);
						}
						sources += source.source + ": " + amount + "/s<br/>";
						total+= source.amount;
					}
				}
			}

			if (sources.length <= 0) {
				sources = "(no change)";
			}
			
			var content = description + (description && sources ? "<hr/>" : "") + sources;
			
			if (!hideNumbers) {
				var totals = "Total: " + Math.round(total * 10000)/10000 + "/s";
				content += (total > 0 ? ("<hr/>" + totals) : "");
			}
			
			UIConstants.updateCalloutContent("#" + indicatorID, content);
		},

		updateDeity: function () {
			var hasDeity = this.deityNodes.head != null;
			GameGlobals.uiFunctions.toggle("#statsbar-deity", hasDeity);
			if (hasDeity) {
				$("#deity-name").text(this.deityNodes.head.deity.name || "?");
			}
		},

		updateItems: function (forced, inCamp) {
			if (inCamp) return;

			var itemsComponent = this.playerStatsNodes.head.items;

			var items = itemsComponent.getUnique(inCamp);
			if (forced || items.length !== this.lastItemsUpdateItemCount) {
				$("ul#list-header-equipment").empty();
				$("ul#list-header-items").empty();
				for (let i = 0; i < items.length; i++) {
					var item = items[i];
					var count = itemsComponent.getCount(item, inCamp);
					switch (item.type) {
						case ItemConstants.itemTypes.bag:
						case ItemConstants.itemTypes.clothing_over:
						case ItemConstants.itemTypes.clothing_upper:
						case ItemConstants.itemTypes.clothing_lower:
						case ItemConstants.itemTypes.clothing_head:
						case ItemConstants.itemTypes.clothing_hands:
						case ItemConstants.itemTypes.shoes:
						case ItemConstants.itemTypes.light:
						case ItemConstants.itemTypes.weapon:
							if (item.equipped)
								$("ul#list-header-equipment").append("<li>" + UIConstants.getItemDiv(itemsComponent, item, null, UIConstants.getItemCallout(item, true), true) + "</li>");
							break;

						case ItemConstants.itemTypes.exploration:
							$("ul#list-header-items").append("<li>" + UIConstants.getItemDiv(itemsComponent, item, count, UIConstants.getItemCallout(item, true)) + "</li>");
							break;
					}
				}

				GameGlobals.uiFunctions.generateCallouts("ul#list-header-items");
				GameGlobals.uiFunctions.generateCallouts("ul#list-header-equipment");

				this.lastItemsUpdateItemCount = items.length;
			}
		},
		
		updateFollowers: function () {
			let inCamp = GameGlobals.playerHelper.isInCamp();
			if (inCamp) return;
			
			let followersComponent = this.playerStatsNodes.head.followers;
			let party = followersComponent.getParty();
			
			$("ul#list-header-followers").empty();
			for (let i = 0; i < party.length; i++) {
				let follower = party[i];
				$("ul#list-header-followers").append("<li>" + UIConstants.getFollowerDiv(follower, true, false, true) + "</li>");
			}
			
			GameGlobals.uiFunctions.generateCallouts("ul#list-header-followers");
		},
		
		refreshPerks: function () {
			if (!this.playerStatsNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var isResting = this.isResting();
			var perksComponent = this.playerStatsNodes.head.perks;
			var perks = perksComponent.getAll();
			var now = new Date().getTime();
			$("ul#list-items-perks").empty();
			for (let i = 0; i < perks.length; i++) {
				let perk = perks[i];
				let desc = this.getPerkDescription(perk, isResting);
				let url = perk.icon;
				let isNegative = PerkConstants.isNegative(perk);
				let liClass = isNegative ? "li-item-negative" : "li-item-positive";
				liClass += " item item-equipped";
				let li =
					"<li class='" + liClass + "' id='perk-header-" + perk.id + "'>" +
					"<div class='info-callout-target info-callout-target-small' description='" + desc + "'>" +
					"<img src='" + url + "' alt='" + perk.name + "'/>" +
					"</div></li>";
				$li = $(li);
				$("ul#list-items-perks").append($li);
				let diff = now - perk.addTimestamp;
				let animate = diff < 100;
				if (animate) {
					$li.toggle(false);
					$li.fadeIn(500);
				}
			}

			GameGlobals.uiFunctions.generateCallouts("ul#list-items-perks");
		},
		
		refreshStatuses: function () {
			// status icons that look like perks but aren't actual perks internally (derived perks)
			if (!this.playerStatsNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			$("ul#list-items-statuses").empty();
			
			let statuses = [];
			
			if (GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.detect_hazards) > 0) {
				statuses.push({ name: "Hazard foresight", icon: "img/status-hazard-prediction.png", isNegative: false });
			}
			
			if (GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.detect_supplies) > 0) {
				statuses.push({ name: "Supplies detection", icon: "img/status-supplies-prediction.png", isNegative: false });
			}
			
			if (GameGlobals.playerHelper.getCurrentBonus(ItemConstants.itemBonusTypes.detect_ingredients) > 0) {
				statuses.push({ name: "Ingredients detection", icon: "img/status-ingredients-prediction.png", isNegative: false });
			}
			
			for (let i = 0; i < statuses.length; i++) {
				var status = statuses[i];
				var isNegative = status.isNegative;
				var liClass = isNegative ? "li-item-negative" : "li-item-positive";
				liClass += " item item-equipped";
				var li =
					"<li class='" + liClass + "'>" +
					"<div class='info-callout-target info-callout-target-small' description='" + status.name + "'>" +
					"<img src='" + status.icon + "' alt='" + status.name + "'/>" +
					"</div></li>";
				$("ul#list-items-statuses").append(li);
			}

			GameGlobals.uiFunctions.generateCallouts("ul#list-items-statuses");
		},

		updatePerks: function () {
			var perksComponent = this.playerStatsNodes.head.perks;
			var perks = perksComponent.getAll();
			var isResting = this.isResting();

			for (let i = 0; i < perks.length; i++) {
				var perk = perks[i];
				var desc = this.getPerkDescription(perk, isResting);
				$("#perk-header-" + perk.id + " .info-callout-target").attr("description", desc);
				$("#perk-header-" + perk.id + " .info-callout-target").toggleClass("event-starting", perk.startTimer >= 0);
				$("#perk-header-" + perk.id + " .info-callout-target").toggleClass("event-ending", perk.removeTimer >= 0 && perk.removeTimer < 5);
			}
		},
		
		getPerkDescription: function (perk, isResting) {
			let desc = perk.name;
			let detailText = UIConstants.getPerkDetailText(perk, isResting);
			if (detailText.length > 0) desc += " (" + detailText + ")";
			return desc;
		},
		
		updateResourcesIfNotPending: function () {
			if (!this.pendingResourceUpdateTime) {
				this.pendingResourceUpdateTime = 0.01;
			} else {
				this.pendingResourceUpdateTime = Math.max(this.pendingResourceUpdateTime, 0.01);
			}
		},

		updateResources: function () {
			if (!this.playerStatsNodes.head) return;
			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var inCamp = playerPosition.inCamp;
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var showResources = this.getShowResources();
			var showResourceAcc = this.getShowResourceAcc();
			var storageCap = GameGlobals.resourcesHelper.getCurrentStorageCap();
			var showStorageName = GameGlobals.resourcesHelper.getCurrentStorageName();
			var currencyComponent = GameGlobals.resourcesHelper.getCurrentCurrency();
			var inventoryUnlocked = false;
			let now = GameGlobals.gameState.gameTime;
			let changedInOut = inCamp != this.lastResourceUpdateInCamp;

			GameGlobals.uiFunctions.toggle("#header-camp-storage", inCamp);
			GameGlobals.uiFunctions.toggle("#header-camp-currency", inCamp && currencyComponent.currency > 0);
			GameGlobals.uiFunctions.toggle("#statsbar-resources", inCamp);
			GameGlobals.uiFunctions.toggle("#header-bag-storage", !inCamp && GameGlobals.gameState.unlockedFeatures.bag);
			GameGlobals.uiFunctions.toggle("#header-bag-currency", !inCamp && currencyComponent.currency > 0);
			GameGlobals.uiFunctions.toggle("#bag-resources", !inCamp);
			$("#header-camp-container").toggleClass("hidden", !inCamp && !GameGlobals.gameState.unlockedFeatures.bag && itemsComponent.getAll().length == 0 && showResources.getTotal() === 0);

			$("#header-camp-currency .value").text(currencyComponent ? currencyComponent.currency : "??");
			$("#header-bag-currency .value").text(currencyComponent ? currencyComponent.currency : "??");

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let currentAmount = showResources.getResource(name);
				let currentAccumulation = showResourceAcc.resourceChange.getResource(name);
				let resourceUnlocked = GameGlobals.gameState.unlockedFeatures.resources[name] === true || currentAmount > 0;
				inventoryUnlocked = inventoryUnlocked || resourceUnlocked;
				if (inCamp) {
					let isVisible = resourceUnlocked && !(currentAmount <= 0 && currentAccumulation <= 0 && this.canHideResource(name));
					let previousAmount = this.previousShownCampResAmount[name] || 0;
					let animate = !changedInOut && UIAnimations.shouldAnimateChange(previousAmount, currentAmount, this.lastCampResourceUpdate, now, currentAccumulation);
					UIConstants.updateResourceIndicator(
						"#resources-" + name,
						Math.floor(currentAmount),
						showResourceAcc == null ? 0 : Math.round(currentAccumulation * 10000) / 10000,
						storageCap,
						true,
						true,
						true,
						name === resourceNames.food || name === resourceNames.water,
						isVisible,
						animate
					);
					if (showResourceAcc) {
						UIConstants.updateResourceIndicatorCallout("#resources-" + name, showResourceAcc.getSources(name));
					}
					$("#header-camp-storage .label").text(showStorageName);
					$("#header-camp-storage .value").text(storageCap);
					this.previousShownCampResAmount[name] = currentAmount;
				} else {
					var isSupplies = name === resourceNames.food || name === resourceNames.water;
					UIConstants.updateResourceIndicator(
						"#resources-bag-" + name,
						Math.floor(currentAmount),
						showResourceAcc == null ? 0 : Math.round(showResourceAcc.resourceChange.getResource(name) * 10000) / 10000,
						storageCap,
						false,
						false,
						false,
						name === resourceNames.food || name === resourceNames.water,
						resourceUnlocked && (name === "water" || name === "food" || showResources.getResource(name) > 0),
						!changedInOut
					);

					var bagComponent = this.playerStatsNodes.head.entity.get(BagComponent);
					$("#header-bag-storage .value").text(Math.floor(bagComponent.usedCapacity * 10) / 10);
					$("#header-bag-storage .value-total").text(UIConstants.getBagCapacityDisplayValue(bagComponent));
				}
			}
			
			if (inCamp) {
				this.lastCampResourceUpdate = now;
			}
			this.lastResourceUpdateInCamp = inCamp;
		},
		
		canHideResource: function (name) {
			switch (name) {
				case resourceNames.food:
				case resourceNames.water:
				case resourceNames.metal:
				case resourceNames.rope:
					return false;
			}
			return true;
		},
		
		completeResourceAnimations: function () {
			for (var key in resourceNames) {
				let name = resourceNames[key];
				UIConstants.completeResourceIndicatorAnimations("#resources-bag-" + name);
				UIConstants.completeResourceIndicatorAnimations("#resources-bag-" + name);
			}
		},

		updateItemStats: function (inCamp) {
			if (!this.currentLocationNodes.head) return;
			var itemsComponent = this.playerStatsNodes.head.items;
			var followersComponent = this.playerStatsNodes.head.followers;
			var playerStamina = this.playerStatsNodes.head.stamina;
			var visibleStats = 0;
			for (var bonusKey in ItemConstants.itemBonusTypes) {
				var bonusType = ItemConstants.itemBonusTypes[bonusKey];
				var bonus = GameGlobals.playerHelper.getCurrentBonus(bonusType);
				var value = bonus;
				var detail = GameGlobals.playerHelper.getCurrentBonusDesc(bonusType);
				var isVisible = true;
				var flipNegative = false;
				switch (bonusType) {
					case ItemConstants.itemBonusTypes.fight_att:
						value = FightConstants.getPlayerAtt(playerStamina, itemsComponent, followersComponent);
						detail = FightConstants.getPlayerAttDesc(playerStamina, itemsComponent, followersComponent);
						isVisible = GameGlobals.gameState.unlockedFeatures.fight;
						break;

					case ItemConstants.itemBonusTypes.fight_def:
						value = FightConstants.getPlayerDef(playerStamina, itemsComponent, followersComponent);
						detail = FightConstants.getPlayerDefDesc(playerStamina, itemsComponent, followersComponent);
						isVisible = GameGlobals.gameState.unlockedFeatures.fight;
						break;

					case ItemConstants.itemBonusTypes.fight_shield:
						value = FightConstants.getPlayerShield(playerStamina, itemsComponent, followersComponent);
						detail = FightConstants.getPlayerShieldDesc(playerStamina, itemsComponent, followersComponent);
						isVisible = GameGlobals.gameState.unlockedFeatures.fight;
						break;
						
					case ItemConstants.itemBonusTypes.movement:
						let perksComponent = this.playerStatsNodes.head.perks;
						value *= GameGlobals.sectorHelper.getBeaconMovementBonus(this.currentLocationNodes.head.entity, this.playerStatsNodes.head.perks);
						value *= GameGlobals.sectorHelper.getDebrisMovementMalus(this.currentLocationNodes.head.entity);
						value = Math.round(value * 10) / 10;
						isVisible = GameGlobals.gameState.unlockedFeatures.camp && value != 1;
						flipNegative = true;
						break;
					
					case ItemConstants.itemBonusTypes.scavenge_cost:
					case ItemConstants.itemBonusTypes.scout_cost:
						isVisible = value != 1;
						value = Math.round(value * 10) / 10;
						flipNegative = true;
						break;
						
					case ItemConstants.itemBonusTypes.scavenge_general:
					case ItemConstants.itemBonusTypes.scavenge_supplies:
					case ItemConstants.itemBonusTypes.scavenge_ingredients:
					case ItemConstants.itemBonusTypes.detect_hazards:
					case ItemConstants.itemBonusTypes.detect_supplies:
					case ItemConstants.itemBonusTypes.detect_ingredients:
					case ItemConstants.itemBonusTypes.light:
					case ItemConstants.itemBonusTypes.bag:
						isVisible = false;
						break;

					default:
						isVisible = true;
						break;
				}
				
				// TODO don't hide if animating to a hidden value (for example scavange cost when deselecting follower that gives a bonus)
				UIAnimations.animateNumber($("#stats-equipment-" + bonusKey + " .value"), value, "", flipNegative, (v) => { return UIConstants.roundValue(v, true, true); });
				GameGlobals.uiFunctions.toggle("#stats-equipment-" + bonusKey, isVisible && value > 0);
				UIConstants.updateCalloutContent("#stats-equipment-" + bonusKey, detail);

				if (isVisible && value > 0)
					visibleStats++;
			}

			GameGlobals.uiFunctions.toggle("#header-self-bar > hr", visibleStats > 1)
		},

		updateGameMsg: function () {
			if (this.engine) {
				var gameMsg = "";
				var saveSystem = this.engine.getSystem(SaveSystem);
				var timeStamp = new Date().getTime();

				if (saveSystem && saveSystem.error)
					gameMsg = saveSystem.error;
				else if (saveSystem && saveSystem.lastSaveTimeStamp > 0 && timeStamp - saveSystem.lastSaveTimeStamp < 3 * 1000)
					gameMsg = "Game saved ";

				if (this.autoPlayNodes.head) gameMsg += "Autoplaying";
				if (GameGlobals.gameState.isPaused) gameMsg += "Paused";

				if (this.lastGameMsg !== gameMsg) {
					this.elements.gameMsg.text(gameMsg);
					this.lastGameMsg = gameMsg;
				}
			}
		},

		updateNotifications: function (inCamp) {
			var isBusy = false;
			if (inCamp) {
				var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
				isBusy = this.playerStatsNodes.head.entity.has(PlayerActionComponent) && busyComponent.isBusy();
				if (isBusy) {
					$("#notification-player-bar").data("progress-percent", busyComponent.getBusyPercentage());
					$("#notification-player-bar .progress-label").text(busyComponent.getBusyDescription());
				}
			}
			GameGlobals.uiFunctions.toggle("#notification-player", inCamp && isBusy);
		},

		updateLocation: function () {
			if (!this.currentLocationNodes.head) return;
			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var inCamp = playerPosition.inCamp;

			this.elements.body.toggleClass("location-inside", inCamp);
			this.elements.body.toggleClass("location-outside", !inCamp);

			var featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sunlit = featuresComponent.sunlit;
			var icon = this.getLevelIcon(inCamp, this.currentLocationNodes.head.entity);
			if ($("#level-icon").attr("src") !== icon.src)
				$("#level-icon").attr("src", icon.src);
			$("#level-icon").attr("alt", icon.desc);
			$("#level-icon").attr("title", icon.desc);

			let hasMap = GameGlobals.playerHelper.hasItem("equipment_map");
			let positionText = "??";
			if (hasMap) {
				let showLevel = GameGlobals.gameState.unlockedFeatures.levels;
				positionText = this.currentLocationNodes.head.entity.get(PositionComponent).getPosition().getInGameFormat(showLevel, true);
			}
			$("#out-position-indicator").text("Position: " + positionText);
		},

		updateTabVisibility: function () {
			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var isInCamp = playerPosition.inCamp;
			GameGlobals.uiFunctions.slideToggleIf("#main-header-camp", null, isInCamp, 250, 50);
			GameGlobals.uiFunctions.slideToggleIf("#main-header-bag", null, !isInCamp, 250, 50);
			GameGlobals.uiFunctions.slideToggleIf("#main-header-equipment", null, !isInCamp, 250, 50);
			GameGlobals.uiFunctions.slideToggleIf("#main-header-items", null, !isInCamp, 250, 50);
			GameGlobals.gameState.uiStatus.isInCamp = isInCamp;
		},

		updateStaminaWarningLimit: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.staminaWarningLimit = PlayerStatConstants.getStaminaWarningLimit(this.playerStatsNodes.head.stamina);
		},

		updateHeaderTexts: function () {
			if (!this.currentLocationNodes.head) return;
			var playerPosition = this.playerStatsNodes.head.entity.get(PositionComponent);
			var campComponent = this.currentLocationNodes.head.entity.get(CampComponent);
			var isInCamp = playerPosition.inCamp;
			var headerText = isInCamp && campComponent ? campComponent.getName() + " (level " + playerPosition.level + ")" : "level " + playerPosition.level;
			this.elements.locationHeader.text(headerText);

			var showCalendar = this.tribeNodes.head.upgrades.hasUpgrade(GameGlobals.upgradeEffectsHelper.getUpgradeIdForUIEffect(UpgradeConstants.upgradeUIEffects.calendar));
			GameGlobals.uiFunctions.toggle(this.elements.date, showCalendar);
			GameGlobals.uiFunctions.toggle("#grid-tab-header", GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.out || isInCamp);

			this.elements.date.text(UIConstants.getInGameDate(GameGlobals.gameState.gameTime));
		},

		updateVisionStatus: function () {
			// update sunlit/dark
			let sunlit = false;
			if (this.currentLocationNodes.head) {
				let featuresComponent = this.currentLocationNodes.head.entity.get(SectorFeaturesComponent);
				sunlit = featuresComponent.sunlit;
			}
			if (GameGlobals.gameState.uiStatus.forceSunlit) sunlit = true;
			if (GameGlobals.gameState.uiStatus.forceDark) sunlit = false;
			this.elements.body.toggleClass("sunlit", sunlit);
			this.elements.body.toggleClass("dark", !sunlit);
			
			// update elements affected by vision
			var visionFactor = this.playerStatsNodes.head.vision.value;
			visionFactor = Math.max(0, visionFactor);
			visionFactor = Math.min(100, visionFactor);
			var visionStep = Math.round(visionFactor / 10);
			UIState.refreshState(this, "vision-step", visionStep, function () {
				for (let i = 0; i <= 10; i++) {
					 this.elements.body.toggleClass("vision-step-" + i, i == visionStep);
				}
			});
			
			// update elements affected by sunligt
			// TODO move to some place more generic
			for (let i = 0; i < this.themedIcons.length; i++) {
				var icon = this.themedIcons[i];
				var path = sunlit ? icon.pathSunlit : icon.pathDark;
				icon.$elem.attr("src", path);
			}
		},
		
		isResting: function () {
			var busyComponent = this.playerStatsNodes.head.entity.get(PlayerActionComponent);
			return busyComponent && busyComponent.getLastActionName() == "use_in_home";
		},
		
		getLevelIcon: function (inCamp, sector) {
			let result = { src: "", desc: "" };
			var position = sector.get(PositionComponent);
			var featuresComponent = sector.get(SectorFeaturesComponent);
			var levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(position.level);
			var levelComponent = levelEntity.get(LevelComponent);
			var sunlit = featuresComponent.sunlit;
			var path = "img/";
			var base = "";
			var desc = "";
			if (inCamp) {
				base = levelComponent.populationFactor < 1 ? "ui-camp-outpost" : "ui-camp-default";
				desc = levelComponent.populationFactor < 1 ? "in camp | outpost" : "in camp | regular";
			} else {
				var surfaceLevel = GameGlobals.gameState.getSurfaceLevel();
				var groundLevel = GameGlobals.gameState.getGroundLevel();
				if (position.level == surfaceLevel) {
					base = "ui-level-sun";
					desc = "outside | surface";
				} else if (position.level == groundLevel) {
					base = "ui-level-ground";
					desc = "outside | ground";
				} else if (!levelComponent.isCampable) {
					switch (levelComponent.notCampableReason) {
						case LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION:
							base = "ui-level-radiation";
							desc = "outside | radiation level";
							break;
						case LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION:
							base = "ui-level-poison";
							desc = "outside | polluted level";
							break;
						default:
							base = "ui-level-empty";
							desc = "outside | uninhabitable level";
							break;
					}
				} else {
					base = "ui-level-default";
					desc = "outside | regular level";
				}
			}
			var suffix = (sunlit ? "" : "-dark");
			result.src = path + base + suffix + ".png";
			result.desc = desc;
			return result;
		},

		getShowResources: function () {
			return GameGlobals.resourcesHelper.getCurrentStorage().resources;
		},

		getShowResourceAcc: function () {
			return GameGlobals.resourcesHelper.getCurrentStorageAccumulation(false);
		},
		
		onActionStarting: function (action) {
			this.completeResourceAnimations();
		},

		onPlayerMoved: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateTabVisibility();
			this.updateStaminaWarningLimit();
			this.updateLocation();
			this.updateHeaderTexts();
			this.updateResourcesIfNotPending();
			this.updatePlayerStats();
		},
		
		onPlayerEnteredCamp: function () {
			this.pendingResourceUpdateTime = 0.75;
			this.updateFollowers();
		},
		
		onPlayerLeftCamp: function () {
			this.updateItems();
			this.updateFollowers();
		},

		onHealthChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateStaminaWarningLimit();
			this.updatePlayerStats();
		},
		
		onTribeStatsChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updatePlayerStats();
		},

		onInventoryChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateResourcesIfNotPending();
			this.updatePlayerStats();
		},
		
		onEquipmentChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updatePlayerStats();
			this.updateItemStats();
			this.refreshPerks();
		},
		
		onFollowersChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updatePlayerStats();
			this.updateItemStats();
			this.updateFollowers();
			this.refreshStatuses();
		},
		
		onPlayerActionCompleted: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updatePlayerStats();
		},

		onVisionChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateVisionStatus();
		},

		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			this.updateVisionStatus();
			this.updateHeaderTexts();
		},
		
		onPerksChanged: function () {
			this.refreshPerks();
		},
		
		onGameShown: function () {
			this.updateTabVisibility();
			this.updateStaminaWarningLimit();
			this.updateLocation();
			this.updateHeaderTexts();
			this.updateResourcesIfNotPending();
			this.updateVisionStatus();
			this.updatePlayerStats();
			this.refreshPerks();
			this.refreshStatuses();
			this.updateItemStats();
		}
	});

	return UIOutHeaderSystem;
});
