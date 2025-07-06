// Singleton with helper methods for UI elements used throughout the game
define(['ash',
	'text/Text',
	'game/GameGlobals',
	'game/constants/CharacterConstants',
	'game/constants/ColorConstants',
	'game/constants/GameConstants',
	'game/constants/StoryConstants',
	'game/constants/ExplorerConstants',
	'game/constants/ItemConstants',
	'game/constants/BagConstants',
	'game/constants/PerkConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/TextConstants',
	'utils/UIAnimations'
], function (Ash, Text, GameGlobals,
	CharacterConstants, ColorConstants, GameConstants, StoryConstants, ExplorerConstants, ItemConstants, BagConstants, PerkConstants, UpgradeConstants, PlayerActionConstants, TextConstants,
	UIAnimations) {

	var UIConstants = {

		FEATURE_MISSING_TITLE: "Missing feature",
		FEATURE_MISSING_COPY: "This feature is not yet implemented. Come back later!",

		MAP_MINIMAP_SIZE: 7,
		SCROLL_INDICATOR_SIZE: 5,

		SMALL_LAYOUT_THRESHOLD: 850,  // make sure this corresponds to something in gridism.css
		
		UNLOCKABLE_FEATURE_WORKER_AUTO_ASSIGNMENT: "workerAutoAssignment",
		UNLOCKABLE_FEATURE_MAP_MODES: "mapModes",
		
		ICON_FALLBACK: "img/eldorado/icon_placeholder.png",
		
		LAUNCH_FADEOUT_DURATION: 1000,
		THEME_TRANSITION_DURATION: 1200,

		POPUP_OVERLAY_FADE_IN_DURATION: 50,
		POPUP_OVERLAY_FADE_OUT_DURATION: 50,
		POPUP_FADE_IN_DURATION: 100,
		POPUP_FADE_OUT_DURATION: 50,

		names: {
			resources: {
				stamina: "stamina",
				resource_metal: "metal",
				resource_fuel: "fuel",
				resource_rubber: "rubber",
				resource_rope: "rope",
				resource_food: "food",
				resource_water: "water",
				resource_concrete: "concrete",
				resource_herbs: "herbs",
				resource_medicine: "medicine",
				resource_tools: "tools",
				resource_robots: "robots",
				item_exploration_1: "lock pick",
				rumours: "rumours",
				evidence: "evidence",
				insight: "insight",
			}
		},

		soundTriggerIDs: {
			actionStarted: "actionStarted",
			actionCompleted: "actionCompleted",
			buttonClicked: "buttonClicked",
			moveTransition: "moveTransition",
			moveNormal: "moveNormal",
			logMessage: "logMessage",
			openPopup: "openPopup",
			closePopup: "closePopup",
		},
		
		getIconOrFallback: function (icon) {
			if (icon) return icon;
			return this.ICON_FALLBACK;
		},

		getItemDiv: function (itemsComponent, item, count, calloutContent, hideComparisonIndicator) {
			var url = item ? item.icon : null;
			var hasCount = count || count === 0;

			var classes = "item";
			if (item && item.equipped) classes += " item-equipped";
			if (item && item.broken) classes += " item-broken";
			if (hasCount) classes += " item-with-count";
			
			let div = "";

			if (item && calloutContent) {
				div += "<div class='info-callout-target info-callout-target-small' description='" + this.cleanupText(calloutContent) + "'>";
			}
			
			div += "<div class='" + classes + (item ? "' data-itemid='" + item.id + "' data-iteminstanceid='" + item.itemID + "'>" : ">");

			let itemName = ItemConstants.getItemDisplayName(item);
			if (item) div += "<img src='" + url + "' alt='" + itemName + "'/>";

			if (hasCount)
				div += "<div class='item-count lvl13-box-1 vision-text'>" + count + "x </div>";

			if (!hideComparisonIndicator && item && item.equippable) {
				var comparisonClass = "indicator-even";
				if (item.equipped) {
					comparisonClass = "indicator-equipped";
				} else {
					var comparison = itemsComponent.getEquipmentComparison(item);
					if (comparison > 0) {
						comparisonClass = "indicator-increase";
					} else if (comparison < 0) {
						comparisonClass = "indicator-decrease";
					}
				}
				div += "<div class='item-comparison-badge'><div class='item-comparison-indicator " + comparisonClass + "'/></div>";
			}

			if (calloutContent) div += "</div>";

			div += "</div>"

			return div;
		},
		
		getItemSlot: function (itemsComponent, item, count, isLost, simple, showBagOptions, bagOptions, tab) {
			let itemCategory = ItemConstants.getItemCategory(item);
			let itemDev = this.getItemDiv(itemsComponent, item, count, this.getItemCallout(item, false, showBagOptions, bagOptions, tab));
			let imageDiv = "<div class='item-slot-image'>"+ itemDev + "</div>";
			let liclasses = "item-slot item-slot-small lvl13-box-1 ";
			if (simple) liclasses += "item-slot-simple";
			if (isLost) liclasses += "item-slot-lost";
			if (itemCategory == ItemConstants.itemCategories.equipment) liclasses += " item-slot-equipment";
			if (itemCategory == ItemConstants.itemCategories.ingredient) liclasses += " item-slot-ingredient";
			if (itemCategory == ItemConstants.itemCategories.consumable) liclasses += " item-slot-consumable";
			if (itemCategory == ItemConstants.itemCategories.other) liclasses += " item-slot-other";
			return "<li class='" + liclasses + "'>" + imageDiv + "</li>"
		},

		updateItemSlot: function (slot, count) {
			var $slot = this.parseElement(slot);
			if (!$slot) return;
			$slot.find(".item-count").text(Text.t("ui.common.item_count_field", count));
			GameGlobals.uiFunctions.toggle($slot, count > 0);
		},

		getItemCallout: function (item, smallCallout, showBagOptions, bagOptions, tab) {
			if (!item) return "";
			var detail = " (" + this.getItemBonusDescription(item, false) + ")";
			if (detail.length < 5) detail = "";
			var weight = BagConstants.getItemCapacity(item);
			let itemName = ItemConstants.getItemDisplayName(item);
			var itemCalloutContent = "<b>" + itemName + "</b><br/>Type: " + ItemConstants.getItemTypeDisplayName(item.type, false) + " " + detail;
			itemCalloutContent += "</br>Weight: " + weight;
			if (ItemConstants.hasItemTypeQualityLevels(item.type)) {
				let quality = ItemConstants.getItemQuality(item);
				itemCalloutContent += "</br>Quality: " + ItemConstants.getQualityDisplayName(quality);
			}
			if (item.broken) itemCalloutContent += "<br><span class='warning'>Broken</span>";
			itemCalloutContent += "</br>" + ItemConstants.getItemDescription(item);
			if (smallCallout) itemCalloutContent = itemName + (detail.length > 0 ? " " + detail : "");
			
			var makeButton = function (action, name) {
				if (!tab) {
					 return "<button class='action btn-narrow' action='" + action + "'>" + name + "</button>";
				} else {
					 return "<button class='action tabbutton btn-narrow' data-tab='" + tab + "' action='" + action + "'>" + name + "</button>";
				}
			};

			if (showBagOptions) {
				let options = "<div class='item-bag-options'>";

				if (bagOptions.canUse) {
					var action = "use_item_" + item.id;
					options += makeButton(action, ItemConstants.getUseItemVerb(item));
				}

				if (bagOptions.canRepair) {
					var action = "repair_item_" + item.itemID;
					options += makeButton(action, "Repair");
				}

				if (bagOptions.canEquip) {
					var action = "equip_" + item.itemID;
					options += makeButton(action, "Equip");
				} else if (bagOptions.canUnequip) {
					var action = "unequip_" + item.id;
					options += makeButton(action, "Unequip");
				}

				if (bagOptions.canDiscard) {
					var action = "discard_" + item.id;
					options += makeButton(action, "Discard");
				}

				options += "</div>";
				itemCalloutContent += options;
			}

			return itemCalloutContent;
		},

		getItemList: function (items) {
			var html = "";
			var itemsCounted = {};
			var itemsById = {};
			for (let i = 0; i < items.length; i++) {
				if (typeof itemsCounted[items[i].id] === 'undefined') {
					itemsCounted[items[i].id] = 1;
					itemsById[items[i].id] = items[i];
				} else {
					itemsCounted[items[i].id]++;
				}
			}

			for (var key in itemsById) {
				var item = itemsById[key];
				var amount = itemsCounted[key];
				html += "<li>" + this.getItemDiv(itemsComponent, item, amount, this.getItemCallout(item, true)) + "</li>";
			}
			return html;
		},

		getExplorerDivWithOptions: function (explorerVO, isRecruited, isInCamp, questTextKey, isForced) {
			let classes = "npc-container";
			let div = "<div class='" + classes + "' data-explorerid='" + explorerVO.id + "'>";
			let isAnimal = ExplorerConstants.isAnimal(explorerVO.abilityType);
			
			// portrait
			let calloutContent = this.getExplorerCallout(explorerVO, isRecruited, isInCamp, true, questTextKey, isForced);

			let hideComparisonIndicator = explorerVO.inParty;
			
			div += "<div class='npc-portrait info-callout-target info-callout-target-small' description='" + this.cleanupText(calloutContent) + "'>";
			div += UIConstants.getExplorerPortrait(explorerVO);

			div += "</div>";

			// name
			div += "<span>" + this.warning(explorerVO.name, explorerVO.injuredTimer >= 0) + "</span>";

			// status icons
			div += "<span class='explorer-icons'>";

			let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorerVO.abilityType);
			let explorerTypeIconDefault = "img/eldorado/icon_explorer_type_" + explorerType + "-dark.png";
			let explorerTypeIconSunlit = "img/eldorado/icon_explorer_type_" + explorerType + ".png";
			div += "<img class='stat-icon img-themed' src='" + explorerTypeIconDefault + "' data-src-sunlit='" + explorerTypeIconSunlit + "' alt='" + explorerType + "'/>";

			if (!hideComparisonIndicator) {
				div += "<div class='item-comparison-indicator indicator-even'></div>";
			}
			div += "<div class='npc-dialogue-indicator'></div>";

			if (!explorerVO.inParty && explorerVO.injuredTimer >= 0) {
				let healIconDefault = "img/eldorado/icon_heal-dark.png";
				let healIconSunlit = "img/eldorado/icon_heal.png";
				div += "<img class='stat-icon img-themed' src='" + healIconDefault + "' data-src-sunlit='" + healIconSunlit + "' alt='healing'/>";
			}

			div += "<div class='npc-quest-indicator hidden'></div>";

			div += "<div class='bubble hidden'>!</div>";
			
			div += "</span>";

			// interaction options
			let talkLabel = Text.t(isAnimal ? "ui.actions.start_dialogue_pet_label" : "ui.actions.start_dialogue_default_label");
			let talkAction = "start_explorer_dialogue_" + explorerVO.id;
			let switchLabel = "⇵";
			let switchAction = explorerVO.inParty ? "deselect_explorer_" + explorerVO.id : "select_explorer_" + explorerVO.id;
			let dismissLabel = "×";
			let dismissAction = "dismiss_explorer_" + explorerVO.id;
			let healAction = "heal_explorer_" + explorerVO.id;
			div += "<div class='interaction-options'>";
			div += "<button class='action btn-narrow' action='" + talkAction + "'>" + talkLabel + "</button>";
			div += "<table class='button-row-2'><tr>";
			div += "<td><button class='action btn-mini' action='" + switchAction + "' aria-label='switch'>" + switchLabel + "</button></td>";
			div += "<td><button class='action btn-mini' action='" + dismissAction + "' aria-label='dismiss'>" + dismissLabel + "</button></td>";
			div += "</tr></table>";

			// hack to avoid temporary empty space in layout when changing to explorers tab
			// this assumes an explorer never gets injured while this div is active (explorers tab open)
			if (!isInCamp && explorerVO.injuredTimer > 0) div += "<button class='action btn-narrow btn-heal-explorer' action='" + healAction + "' style='display:none'>heal</button>";
			div += "</div>";

			div += "</div>";
			
			return div;
		},
		
		getExplorerDivSimple: function (explorer, isRecruited, isInCamp, hideComparisonIndicator, questTextKey, isForced) {
			let classes = "npc-container npc-container-mini";
			let div = "<div class='" + classes + "' data-explorerid='" + explorer.id + "'>";
			let calloutContent = this.getExplorerCallout(explorer, isRecruited, isInCamp, false, questTextKey, isForced);
			
			div += "<div class='info-callout-target info-callout-target-small' description='" + this.cleanupText(calloutContent) + "'>";

			div += "<div class='npc-portrait'>";
			div += UIConstants.getExplorerPortrait(explorer);
			div += "</div>";
			
			if (!hideComparisonIndicator) {
				div += "<div class='item-comparison-badge'><div class='item-comparison-indicator indicator-even'/></div>";
			}
			
			div += "</div>";
			div += "</div>"
			
			return div;
		},
		
		getExplorerCallout: function (explorer, isRecruited, isInCamp, hideButtons, questTextKey, isForced) {
			let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
			let result = "<b>" + explorer.name + "</b>";
			if (isRecruited) {
				result += "<br/>In party: " + (explorer.inParty ? "yes" : "no");
			}
			result += "<br/>Type: " + ExplorerConstants.getExplorerTypeDisplayName(explorerType);
			result += "<br/>Ability: " + Text.t(ExplorerConstants.getAbilityTypeDisplayNameKey(explorer.abilityType))
				+ " (" + Text.t(UIConstants.getExplorerAbilityDescriptionTextVO(explorer, [])) + ")";

			if (questTextKey) {
				result += "<br/>Quest: " + Text.t(questTextKey);
			}

			if (explorer.injuredTimer >= 0) {
				if (explorer.inParty) {
					result += "<br/>Status: " + this.warning("Injured");
				} else {
					result += "<br/>Status: " + this.warning("Injured (recovering)");
				}
			} else if (explorer.hasUrgentDialogue) {
				result += "<br/>Status: Wants to talk";
			} else if (isForced) {
				result += "<br/>Status: Wants to go exploring";
			}

			if (GameConstants.isCheatsEnabled) {
				result += "<br/>" + this.meta("Trust: " + explorer.trust);
			}
			
			if (isRecruited && isInCamp && !hideButtons) {
				var makeButton = function (action, name) {
					 return "<button class='action btn-narrow' action='" + action + "'>" + name + "</button>";
				};

				var options = "<div class='item-bag-options'>";
				options += makeButton("dismiss_explorer_" + explorer.id, "Dismiss");
				if (!explorer.inParty) {
					options += makeButton("select_explorer_" + explorer.id, "Add to party");
				} else {
					options += makeButton("deselect_explorer_" + explorer.id, "Switch out");
				}
				options += "</div>";
				result += options;
			}

			return result;
		},
		
		getExplorerAbilityDescriptionTextVO: function (explorer, explorers) {
			let textParams = {};

			switch (explorer.abilityType) {
				case ExplorerConstants.abilityType.ATTACK:
					textParams.value = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.fight_att);
					break;
				case ExplorerConstants.abilityType.DEFENCE:
					textParams.value = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.fight_def);
					break;
				case ExplorerConstants.abilityType.COST_MOVEMENT:
					let movementCostReduction = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.movement);
					textParams.value = UIConstants.getMultiplierBonusDisplayValue(movementCostReduction);
					break;
				case ExplorerConstants.abilityType.COST_SCAVENGE:
					let scavengeCostReduction = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.scavenge_cost);
					textParams.value = UIConstants.getMultiplierBonusDisplayValue(scavengeCostReduction);
					break;
				case ExplorerConstants.abilityType.COST_SCOUT:
					let scoutCostReduction = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.scout_cost);
					textParams.value = UIConstants.getMultiplierBonusDisplayValue(scoutCostReduction);
					break;
				case ExplorerConstants.abilityType.SCAVENGE_GENERAL:
					let scaBonus = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.scavenge_general);
					textParams.value = UIConstants.getMultiplierBonusDisplayValue(scaBonus);
					break;
				case ExplorerConstants.abilityType.SCAVENGE_INGREDIENTS:
					let ingredientBonus = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.scavenge_ingredients);
					textParams.value = UIConstants.getMultiplierBonusDisplayValue(ingredientBonus);
					break;
				case ExplorerConstants.abilityType.SCAVENGE_SUPPLIES:
					let suppliesBonus = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.scavenge_supplies);
					textParams.value = UIConstants.getMultiplierBonusDisplayValue(suppliesBonus);
					break;
				case ExplorerConstants.abilityType.SCAVENGE_VALUABLES:
					let valuablesBonus = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.scavenge_valuables);
					textParams.value = UIConstants.getMultiplierBonusDisplayValue(valuablesBonus);
					break;
				case ExplorerConstants.abilityType.SCAVENGE_CAPACITY:
					let capacityBonus = ExplorerConstants.getExplorerItemBonus(explorer, explorers, ItemConstants.itemBonusTypes.bag);
					textParams.value = capacityBonus;
					break;
			}

			return { textKey: "ui.characters.explorer_ability_type_" + explorer.abilityType + "_description", textParams: textParams };
		},

		getExplorerPortrait: function (explorerVO) {
			return "<img src='" + explorerVO.icon + "' alt='" + explorerVO.name + "' class='portrait' />";
		},

		getNPCDiv: function (characterType, talkActionID, randomIndex, options) {
			options = options || {};

			let $div = $(this.createNPCDiv());
			this.updateNPCDiv($div, characterType, talkActionID, randomIndex, options);
			return $div;
		},

		createNPCDiv: function () {
			let div = "<div class='npc-container'>";
			let calloutContent = "Visitor";
			
			div += "<div class='npc-type-indicator'><img src='img/eldorado/icon_time-dark.png'/></div>";
			div += "<div class='info-callout-target info-callout-target-small' description='" + this.cleanupText(calloutContent) + "'>";
			div += this.createNPCPortrait();
			div += "</div>";

			let talkLabel = Text.t("ui.actions.start_dialogue_default_label");
			div += "<button class='action btn-compact' action=''>" + talkLabel + "</button>";
			
			div += "</div>"
			
			return div;
		},

		updateNPCDiv: function ($div, characterType, talkActionID, randomIndex, options) {
			let icon = this.getNPCIcon(characterType, randomIndex);
			let action = talkActionID;

			options = options || {};
			options.isTemporary = options.isTemporary || false;

			let showName = options.showName || false;

			let name = showName ? Text.t(this.getNPCDisplayNameKey(characterType)) : "";

			$div.toggleClass("npc-visitor", options.isTemporary);
			$div.attr("data-characterType", characterType);
			$div.find(".npc-portrait").find("img").attr("src", icon);
			$div.find(".npc-name").text(name);
			$div.find("button").attr("action", action);
			
			$div.find(".npc-type-indicator").toggleClass("hidden", !options.isTemporary);
		},

		getNPCPortrait: function (characterType, randomIndex) {
			let $portrait = $(this.createNPCPortrait());
			this.updateNPCPortrait($portrait, characterType, randomIndex);
			return $portrait;
		},

		createNPCPortrait: function () {
			let div = "<div class='npc-portrait'>";
			div += "<img src='' alt='npc-portrait' />";
			div += "<span class='npc-name'></span>";
			div += "</div>";
			return div;
		},

		updateNPCPortrait: function ($div, characterType, randomIndex) {
			let icon = this.getNPCIcon(characterType, randomIndex);
			let name = Text.t(this.getNPCDisplayNameKey(characterType));

			$div.find("img").attr("src", icon);
			$div.find(".npc-name").text(name);
		},

		getNPCDisplayNameKey: function (characterType) {
			return "game.characters." + characterType + "_name";
		},

		getNPCIcon: function (characterType, randomIndex) {
			return characterType ? CharacterConstants.getIcon(characterType, randomIndex) : null;
		},

		getResourceLi: function (name, amount, isLost, simple) {
			var divclasses = "res item-with-count";
			var div = "<div class='" + divclasses + "' data-resourcename='" + name + "'>";
			div += "<div class='info-callout-target info-callout-target-small' description='" + name + "'>";
			div += this.getResourceImg(name);
			if (amount || amount === 0)
				div += "<div class='item-count lvl13-box-1'>" + Math.floor(amount) + "x</div>";
			div += "</div>";
			div += "</div>";
			var liclasses = "item-slot item-slot-small lvl13-box-1 ";
			if (simple) liclasses += "item-slot-simple";
			if (isLost) liclasses += "item-slot-lost";
			var imageDiv = "<div class='item-slot-image'>" + div + "</div>";
			return "<li class='" + liclasses + "'>" + imageDiv + "</li>";
		},

		updateResourceLi: function (li, amount) {
			var $li = this.parseElement(li);
			if (!$li) return;
			var showAmount = Math.floor(amount);
			$li.find(".item-count").text(Text.t("ui.common.item_count_field", showAmount));
			GameGlobals.uiFunctions.toggle($li, showAmount > 0);
		},

		getCurrencyLi: function (amount, simple) {
			var classes = "res item-with-count";
			var div = "<div class='" + classes + "' data-resourcename='currency'>";
			div += "<div class='info-callout-target info-callout-target-small' description='silver'>";
			div += this.getResourceImg("currency");
			div += "<div class='item-count lvl13-box-1'>" + Math.floor(amount) + "x </div>";
			div += "</div>";
			div += "</div>";
			var liclasses = "item-slot item-slot-small lvl13-box-1 ";
			if (simple) liclasses += "item-slot-simple";
			var imageDiv = "<div class='item-slot-image'>" + div + "</div>";
			return "<li class='" + liclasses + "'>" + imageDiv + "</li>";
		},

		updateCurrencyLi: function (li, amount) {
			var $li = this.parseElement(li);
			if (!$li) return;
			var showAmount = Math.floor(amount);
			$li.find(".item-count").text(Text.t("ui.common.item_count_field", showAmount));
			GameGlobals.uiFunctions.toggle($li, showAmount > 0);
		},

		getBlueprintPieceLI: function (upgradeID) {
			let name = Text.t(UpgradeConstants.getDisplayNameTextKey(upgradeID));
			return "<li><div class='info-callout-target' description='Blueprint (" + name + ")'>" + this.getBlueprintPieceIcon(upgradeID) + " blueprint</li>";
		},

		getResourceList: function (resourceVO) {
			var html = "";
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = resourceVO.getResource(name);
				if (Math.round(amount) > 0) {
					var li = this.getResourceLi(name, amount);
					html += li;
				}
			}
			return html;
		},

		getItemBonusDescription: function (item, useLineBreaks) {
			let result = "";
			if (!item) return result;
			let defaultType = ItemConstants.getItemDefaultBonus(item);
			for (var bonusKey in ItemConstants.itemBonusTypes) {
				var bonusType = ItemConstants.itemBonusTypes[bonusKey];
				let baseValue = ItemConstants.getDefaultBonus(item, bonusType);
				if (baseValue <= 0) continue;
				let currentValue = ItemConstants.getCurrentBonus(item, bonusType);
				
				result += this.getItemBonusName(bonusType, true);
				if (currentValue == baseValue) {
					result += this.getItemBonusText(item, bonusType, baseValue);
				} else {
					result += "<span class='strike-through'>";
					result += this.getItemBonusText(item, bonusType, baseValue);
					result += "</span>";
					result += "<span class='warning'>";
					result += this.getItemBonusText(item, bonusType, currentValue);
					result += "</span>";
				}
				result += useLineBreaks ? "<br/>" : ", ";
			}

			result = result.substring(0, result.length - (useLineBreaks ? 5 : 2));

			return result;
		},

		getItemBonusName: function (bonusType, short) {
			switch (bonusType) {
				case ItemConstants.itemBonusTypes.light: return "max vision";
				case ItemConstants.itemBonusTypes.fight_att: return "attack";
				case ItemConstants.itemBonusTypes.fight_def: return "defence";
				case ItemConstants.itemBonusTypes.fight_shield: return "shield";
				case ItemConstants.itemBonusTypes.fight_speed: return "attack speed";
				case ItemConstants.itemBonusTypes.movement: return "movement cost";
				case ItemConstants.itemBonusTypes.scavenge_cost: return "scavenge cost";
				case ItemConstants.itemBonusTypes.scavenge_general: return "scavenge bonus";
				case ItemConstants.itemBonusTypes.scavenge_supplies: return "scavenge bonus";
				case ItemConstants.itemBonusTypes.scavenge_ingredients: return "scavenge bonus";
				case ItemConstants.itemBonusTypes.scavenge_blueprints: return "scavenge bonus";
				case ItemConstants.itemBonusTypes.scavenge_valuables: return "scavenge bonus";
				case ItemConstants.itemBonusTypes.scout_cost: return "scouting cost";
				case ItemConstants.itemBonusTypes.collector_cost: return "trap/bucket cost";
				case ItemConstants.itemBonusTypes.bag: return "bag size";
				case ItemConstants.itemBonusTypes.res_cold: return "warmth";
				case ItemConstants.itemBonusTypes.res_radiation: return short ? "radiation prot" : "radiation protection";
				case ItemConstants.itemBonusTypes.res_poison: return short ? "poison prot" : "poison protection";
				case ItemConstants.itemBonusTypes.res_water: return short ? "water prot" : "water protection";
				case ItemConstants.itemBonusTypes.shade: return short ? "sun prot" : "sunblindness protection";
				case ItemConstants.itemBonusTypes.detect_hazards: return short ? "hazards" : "surveying (hazards)";
				case ItemConstants.itemBonusTypes.detect_supplies: return short ? "supplies" : "surveying (supplies)";
				case ItemConstants.itemBonusTypes.detect_ingredients: return short ? "ingredients" : "surveying (ingredients)";
				case ItemConstants.itemBonusTypes.detect_poi: return short ? "poi" : "surveying (poi)";
				default:
					log.w("no display name defined for item bonus type: " + bonusType);
					return "";
			}
		},

		getItemBonusText: function (item, bonusType, bonusValue) {
			var baseValue = item.getBaseBonus(bonusType);
			
			if (ItemConstants.isStaticValue(baseValue)) {
				return " " + bonusValue;
			} else if (bonusValue === 0) {
				return "+0";
			} else if (ItemConstants.isMultiplier(bonusType) && ItemConstants.isIncreasing(bonusType)) {
				// increasing multiplier: fight speed
				var val = Math.abs(Math.round((1 - bonusValue) * 100));
				return bonusValue == 1 ? "+0%" : (bonusValue < 1 ? "-" + val + "%" : "+" + val + "%");
			} else if (baseValue >= 1) {
				return " +" + bonusValue;
			} else if (baseValue > 0) {
				return " -" + UIConstants.getMultiplierBonusDisplayValue(bonusValue);
			} else if (baseValue > -1) {
				return " +" + UIConstants.getMultiplierBonusDisplayValue(bonusValue);
			} else {
				return " " + bonusValue;
			}
		},

		getPerkDetailText: function (perk, isResting) {
			let bonusText = this.getPerkBonusText(perk);
			let timerText = this.getPerkTimerText(perk, isResting);
			let result = "";
			if (bonusText) result += bonusText;
			if (timerText) {
				if (bonusText && bonusText.length > 0) result += ", ";
				result += timerText;
			}
			return result;
		},
		
		getPerkTimerText: function (perk, isResting) {
			if (perk.removeTimer >= 0) {
				var factor = PerkConstants.getRemoveTimeFactor(perk, isResting);
				var timeleft = perk.removeTimer / factor;
				return "time left: " + this.getTimeToNum(timeleft);
			} else if (perk.startTimer >= 0) {
				return "time to full: " + this.getTimeToNum(perk.startTimer);
			} else {
				return null;
			}
		},

		getPerkBonusText: function (perk) {
			let value = 0;
			if (PerkConstants.isPercentageEffect(perk.type)) {
				if (perk.effect == 1) return null;
				if (perk.effect < 1) {
					value = "-" + UIConstants.getMultiplierBonusDisplayValue(PerkConstants.getCurrentEffect(perk));
				} else {
					value = "+" + UIConstants.getMultiplierBonusDisplayValue(PerkConstants.getCurrentEffect(perk));
				}
			} else {
				if (perk.effect == 0) return null;
				value = "+" + PerkConstants.getCurrentEffect(perk);
			}

			let effect = perk.type;
			switch (perk.type) {
				case PerkConstants.perkTypes.movement:
					effect = "movement cost";
					break;
				case PerkConstants.perkTypes.injury:
				case PerkConstants.perkTypes.health:
					effect = "health";
					break;
				case PerkConstants.perkTypes.luck:
					if (perk.effect > 0) {
						return "Lower probability of negative random events when exploring";
					} else { 
						return "Higher probability of negative random events when exploring";
					}
			}

			return effect + " " + value;
		},

		getCostsSpans: function (action, costs) {
			let result = "";
			let hasCosts = action && costs && Object.keys(costs).length > 0;
			if (hasCosts) {
				for (let key in costs) {
					let name = UIConstants.getCostDisplayName(key).toLowerCase();
					let value = costs[key];
					result += "<span class='action-cost action-cost-" + key + "'>" + name + ": <span class='action-cost-value'>" + UIConstants.getDisplayValue(value) + "</span><br/></span>";
				}
			} else if (this.isActionFreeCostShown(action)) {
				result += "<span class='action-cost p-meta'>free</span><br />";
			}
			return result;
		},
		
		getCostsSpansElements: function (action, costs, elements, $container) {
			elements.costSpans = {};
			elements.costSpanValues = {};
			for (let key in costs) {
				elements.costSpans[key] = $container.children(".action-cost-" + key);
				elements.costSpanValues[key] = elements.costSpans[key].children(".action-cost-value");
			}
		},
		
		isActionFreeCostShown: function (action) {
			let baseId = GameGlobals.playerActionsHelper.getBaseActionID(action);
			switch (baseId) {
				case "recruit_explorer": return true;
				case "wait": return true;
			}
			return false;
		},
		
		canHideProject: function (projectID) {
			if (projectID.indexOf("greenhouse") >= 0) return false;
			if (projectID.indexOf("passage") >= 0) return false;
			if (projectID.indexOf("tradepost_") >= 0) return false;
			return true;
		},
		
		getMultiplierBonusDisplayValue: function (value) {
			return Math.round(Math.abs(1 - value) * 100) + "%";
		},

		sortItemsByType: function (a, b) {
			let getItemSortVal = function (itemVO) {
				let typeVal = UIConstants.getItemSortValueByType(itemVO);
				return typeVal * 1000 - itemVO.getBaseTotalBonus();
			};
			var aVal = getItemSortVal(a);
			var bVal = getItemSortVal(b);
			return aVal - bVal;
		},

		sortItemsByRelevance: function (a, b) {
			let getItemRelevanceVal = function (itemVO) {
				let typeVal = UIConstants.getItemSortValueByType(itemVO);
				let result = typeVal * 1000 + itemVO.getBaseTotalBonus();
				// TODO move this to item data
				if (itemVO.id == "exploration_1") result -= 50;
				return result;
			};
			let aVal = getItemRelevanceVal(a);
			let bVal = getItemRelevanceVal(b);
			return aVal - bVal;
		},

		getItemSortValueByType: function (itemVO) {
			let typeVal = 0;
			switch (itemVO.type) {
				case ItemConstants.itemTypes.uniqueEquipment: typeVal = 0; break;
				case ItemConstants.itemTypes.exploration: typeVal = 1; break;
				
				case ItemConstants.itemTypes.bag: typeVal = 11; break;
				case ItemConstants.itemTypes.light: typeVal = 12; break;
				case ItemConstants.itemTypes.weapon: typeVal = 13; break;
				case ItemConstants.itemTypes.clothing_over: typeVal = 14; break;
				case ItemConstants.itemTypes.clothing_upper: typeVal = 15; break;
				case ItemConstants.itemTypes.clothing_lower: typeVal = 16; break;
				case ItemConstants.itemTypes.clothing_hands: typeVal = 17; break;
				case ItemConstants.itemTypes.clothing_head: typeVal = 18; break;
				case ItemConstants.itemTypes.shoes: typeVal = 19; break;
				
				case ItemConstants.itemTypes.ingredient: typeVal = 21; break;
				case ItemConstants.itemTypes.voucher: typeVal = 22; break;
				case ItemConstants.itemTypes.trade: typeVal = 23; break;
				
				case ItemConstants.itemTypes.artefact: typeVal = 31; break;
				case ItemConstants.itemTypes.note: typeVal = 32; break;
			}

			return typeVal;
		},
		
		sortExplorersByType: function (a, b) {
			let getExplorerSortVal = function (explorerVO) {
				let abilityType = explorerVO.abilityType;
				let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(abilityType);
				let typeVal = 0;
				switch (explorerType) {
					case ExplorerConstants.explorerType.FIGHTER: typeVal = 1; break;
					case ExplorerConstants.explorerType.SCOUT: typeVal = 2; break;
					case ExplorerConstants.explorerType.SCAVENGER: typeVal = 3; break;
				}
				return typeVal * 1000 - explorerVO.abilityLevel;
			};
			let aVal = getExplorerSortVal(a);
			let bVal = getExplorerSortVal(b);
			return aVal - bVal;
		},

		createResourceIndicator: function (name, showName, id, showAmount, showChange, showDetails, showFill) {
			let classes = [ "stat-indicator" ];
			if (showFill) classes.push("stat-indicator-with-fill");

			let displayName = TextConstants.getResourceDisplayName(name);
			
			let div = "<div class='" + classes.join(" ") + "' id='" + id + "'>";

			if (!showName) div = "<div class='info-callout-target info-callout-target-small' description='" + displayName + "'>" + div;
			else if (showChange) div = "<div class='info-callout-target' description=''>" + div;

			div += "<span class='icon'>";
			div += this.getResourceImg(name);
			if (!showName && !showChange) div += "</div>";
			div += "</span>";

			if (showName) div += "<span class='label'>" + displayName + "</span>";

			if (showAmount) div += "<span class='value'></span>";
			div += "<span class='change-indicator'></span>";
			if (showDetails) div += "<span class='change'></span>";
			if (showDetails) div += "<span class='forecast'></span>";
			div += "</div>";

			if (!showName || showChange) div = div + "</div>";

			return div;
		},
		
		completeResourceIndicatorAnimations: function (id) {
			let $valueElement = $(id).children(".value");
			UIAnimations.animateNumberEnd($valueElement);
		},

		updateResourceIndicator: function (id, value, change, storage, showChangeIcon, showChange, showDetails, showWarning, visible, animate, previousTime, currentTime) {
			let $indicator = $(id);
			GameGlobals.uiFunctions.toggle($indicator, visible);
			GameGlobals.uiFunctions.toggle($indicator.parent(), visible);

			if (visible) {
				let $valueElement = $indicator.children(".value");

				let isAnimating = UIAnimations.isActivelyAnimating($valueElement, previousTime, currentTime);
				if (isAnimating) {
					if (GameConstants.isDebugVersion) log.w("skipping resource indicator update because it's still animating a previous one: #" + id);
					return;
				}
				
				animate = animate || UIAnimations.isAnimating($valueElement);

				UIAnimations.animateOrSetNumber($valueElement, animate, value, "", false, (v) => { return UIConstants.roundValue(v, true, false); });
				$indicator.children(".value").toggleClass("warning", showWarning && value < 5);
				$indicator.children(".change").toggleClass("warning", change < 0);
				GameGlobals.uiFunctions.toggle($indicator.children(".change"), showChange);
				GameGlobals.uiFunctions.toggle($indicator.children(".forecast"), showDetails);
				$indicator.children(".forecast").toggleClass("warning", change < 0);

				var isCappedByStorage = change > 0 && value >= storage;

				if (showChange) {
					$indicator.children(".change").text(Math.round(change * 10000) / 10000 + "/s");
				}
				
				if (showDetails) {
					if (change > 0 && (storage - value > 0)) {
						$indicator.children(".forecast").text("(" + this.getTimeToNum((storage - value) / change) + " to cap)");
					} else if (change < 0 && value > 0) {
						$indicator.children(".forecast").text("(" + this.getTimeToNum(value / change) + " to 0)");
					} else if (value >= storage) {
						$indicator.children(".forecast").text("(full)");
					} else {
						$indicator.children(".forecast").text("");
					}
				}
				
				if ($indicator.hasClass("stat-indicator-with-fill")) {
					let sunlit = $("body").hasClass("sunlit");
					let fillColor = ColorConstants.getColor(sunlit, "bg_element_1");
					let fillPercent = Math.round(value / storage * 100);
					$(id).css("background", "linear-gradient(to right, " + fillColor + " " + fillPercent + "%, transparent " + fillPercent + "%)");
				}

				change = Math.round(change * 10000) / 10000;
				$indicator.children(".change-indicator").toggleClass("indicator-increase", change > 0 && !isCappedByStorage);
				$indicator.children(".change-indicator").toggleClass("indicator-decrease", change < 0);
				$indicator.children(".change-indicator").toggleClass("indicator-even", change === 0 || isCappedByStorage);
				GameGlobals.uiFunctions.toggle($indicator.children(".change-indicator"), showChangeIcon);
			}
		},

		updateResourceIndicatorCallout: function (id, name, changeSources) {
			let content = "";
			var source;
			for (let i in changeSources) {
				source = changeSources[i];
				if (source.amount != 0) {
					content += this.getResourceAccumulationSourceText(source) + "<br/>";
				}
			}

			let displayName = TextConstants.getResourceDisplayName(name);

			if (content.length <= 0) {
				content = displayName + " (no change)";
			} else {
				content = displayName + "<br/>" + content;
			}

			this.updateCalloutContent(id,  content);
		},
		
		getResourceAccumulationSourceText: function (source) {
			let divisor = 10000;
			if (source.amount < 0.0001) divisor = 100000;
			return source.source + " (" + source.sourceCount + ")" + ": " + Math.round(source.amount * divisor) / divisor + "/s";
		},

		getAccumulationText: function (value) {
			if (value == 0) return "-";

			if (Math.abs(value) < 0.01) {
				let minutesValue = value * 60;
				return this.roundValue(minutesValue, true) + "/m";
			}

			return this.roundValue(value, true) + "/s";
		},

		updateCalloutContent: function ($targetElement, content, isTargetDirect) {
			$targetElement = UIConstants.parseElement($targetElement);
			let $calloutTarget = isTargetDirect ? $targetElement : $targetElement.parents(".info-callout-target");

			$calloutTarget.attr("description", content);
			$calloutTarget.siblings(".info-callout").children(".info-callout-content").html(content);
		},

		parseElement: function ($elem) {
			if (typeof $elem == 'object') {
				return $elem;
			}
			if (typeof $elem == 'string' && $elem.length > 0) {
				if ($elem[0] == '#' || $elem[0] == '.') {
					return $($elem);
				} else {
					return $("#" + $elem);
				}
			}
			return null;
		},

		getBlueprintPieceIcon: function (upgradeID) {
			let type = UpgradeConstants.getUpgradeType(upgradeID);
			return "<img src='img/items/blueprints/blueprint-" + type + ".png' alt='' />";
		},
		
		getMilestoneUnlocksDescriptionHTML: function (milestone, previousMilestone, isNew, showMultiline, hasDeity, hasInvestigate) {
			if (!previousMilestone) previousMilestone = {};
			let html = "";
			let baseReputation = Math.max(milestone.baseReputation || 0, previousMilestone.baseReputation || 0);
			
			let addValue = function (label, value) {
				html += "<span class='unlocks-list-entry'>";
				html += label;
				if (value || value === 0) {
					html += ": ";
					html += value;
				}
				html += "</span>";
			};
			
			let addGroup = function (title, items, getItemDisplayName) {
				if (!items || items.length == 0) return
				if  (title && title.length > 0) html += title + ": ";
				if (showMultiline) html += "<br/>";
				for (let i = 0; i < items.length; i++) {
					if (i > 0) html += ", ";
					html += getItemDisplayName ? getItemDisplayName(items[i]).toLowerCase() : items[i];
				}
				html += "<br/>";
			};
			
			addValue("Base reputation", baseReputation);
			
			addValue("Max evidence", milestone.maxEvidence);
			addValue("Max rumours", milestone.maxRumours);
			
			if (milestone.maxHope && hasDeity) {
				addValue("Max hope", milestone.maxHope);
			}
			
			if (milestone.maxInsight && hasInvestigate) {
				addValue("Max insight", milestone.maxInsight);
			}
			
			if (isNew) {
				addGroup("", milestone.unlockedFeatures, UIConstants.getUnlockedFeatureDisplayName);
				addGroup("New events", milestone.unlockedEvents);
				
				let unlockedUpgrades = GameGlobals.milestoneEffectsHelper.getUnlockedUpgrades(milestone.index);
				addGroup("Unlocked upgrades", unlockedUpgrades, (upgradeID) => {
					let upgrade = UpgradeConstants.upgradeDefinitions[upgradeID];
					let name = Text.t(UpgradeConstants.getDisplayNameTextKey(upgradeID));
					let isOtherRequirementsMet = GameGlobals.playerActionsHelper.isRequirementsMet(upgradeID, null, [ PlayerActionConstants.DISABLED_REASON_MILESTONE ]);
					let c = isOtherRequirementsMet ? "" : "strike-through";
					return "<span class='" + c + "'>" + name + "</span>";
				});
				
				let unlockedActions = GameGlobals.milestoneEffectsHelper.getUnlockedGeneralActions(milestone.index);
				addGroup("Other", unlockedActions);
			}
			
			return html;
		},

		getTimeToNum: function (seconds, hideSeconds) {
			seconds = Math.ceil(Math.abs(seconds));

			var minutes = seconds / 60;
			var hours = minutes / 60;
			var days = hours / 24;

			if (days > 2) {
				return Math.floor(days) + "days";
			} else if (hours > 2) {
				return Math.floor(hours) + "h";
			} else if (minutes > 2) {
				return Math.floor(minutes) + "min";
			} else if (hideSeconds) {
				return "very soon";
			} else {
				return Math.round(seconds) + "s";
			}
		},

		getTimeSinceText: function (date) {
			if (typeof date === "number") date = new Date(date);

			var seconds = Math.floor((new Date() - date) / 1000);

			var interval = Math.floor(seconds / 31536000);
			if (interval > 1) {
				return interval + " years";
			}
			interval = Math.floor(seconds / 2592000);
			if (interval > 1) {
				return interval + " months";
			}
			interval = Math.floor(seconds / 86400);
			if (interval > 1) {
				return interval + " days";
			}
			interval = Math.floor(seconds / 3600);
			if (interval > 1) {
				return interval + " hours";
			}
			interval = Math.floor(seconds / 60);
			if (interval > 1) {
				return interval + " minutes";
			}
			if (interval === 1) {
				return interval + " minute";
			}
			if (seconds < 10) {
				return "a few seconds";
			}

			return "less than a minute";
		},

		getInGameDate: function (gameTime) {
			var secondSinceGameStart = gameTime;
			var inGameDaysSinceGameStart = Math.floor(secondSinceGameStart / 86400 * 365);
			var inGameWeeksSinceGameStart = inGameDaysSinceGameStart / 40;

			var year = StoryConstants.GAME_START_YEAR;
			var week = StoryConstants.GAME_START_WEEK;
			if (inGameWeeksSinceGameStart < 40 - StoryConstants.GAME_START_WEEK) {
				week += inGameWeeksSinceGameStart;
			} else {
				var weeksSinceFirstNewYear = inGameWeeksSinceGameStart - (40 - StoryConstants.GAME_START_WEEK);
				week = weeksSinceFirstNewYear - (Math.floor(weeksSinceFirstNewYear / 40) * 40) + 1;
				year += 1 + (weeksSinceFirstNewYear) / 40;
			}

			year = Math.floor(year);
			week = Math.floor(week);

			return "Y" + year + "-N" + week;
		},

		getFactorLabel: function (factor) {
			if (factor < 0.5) {
				return "very low";
			}

			if (factor < 1) {
				return "low";
			}

			if (factor == 1) {
				return "average";
			}

			if (factor < 1.5) {
				return "high";
			}

			return "very high";
		},

		getUnlockedFeatureDisplayName: function (featureID) {
			switch (featureID) {
				case UIConstants.UNLOCKABLE_FEATURE_MAP_MODES: return "map modes";
				case UIConstants.UNLOCKABLE_FEATURE_WORKER_AUTO_ASSIGNMENT: return "worker auto-assignment";
			}
			return featureID;
		},

		getCampDisplayName: function (campNode, short) {
			return "camp on level " + campNode.position.level;
		},

		getCostDisplayName: function (name) {
			if (name.indexOf("item_") == 0) {
				let itemID = name.replace("item_", "");
				let item = ItemConstants.getItemDefinitionByID(itemID, true);
				return ItemConstants.getItemDisplayName(item);
			}

			if (name.indexOf("resource_") == 0) {
				let resourceName = name.split("_")[1];
				return Text.t("game.resources." + resourceName + "_name");
			}

			if (name == "stamina") {
				return Text.t("game.stats.stamina_name");
			}

			if (name == "silver") {
				return Text.t("game.resources.currency_name");
			}

			log.w("no cost display name defined for cost [" + name + "]");
			return name;
		},

		roundValue: function (value, showDecimalsWhenSmall, showDecimalsAlways, decimalDivisor) {
			decimalDivisor = decimalDivisor || 100;
			let divisor = 0;
			if (showDecimalsWhenSmall && value <= 10) divisor = decimalDivisor;
			if (showDecimalsAlways) divisor = decimalDivisor;

			let result = value;
			if (value % 1 === 0 || divisor <= 0) {
				result = Math.round(value);
			} else {
				result = Math.round(value * divisor) / divisor;
			}
			
			if (value > 0 && result == 0) {
				return "< 1";
			}
			
			return result;
		},

		highlight: function (text) {
			return "<span class='hl-functionality'>" + text + "</span>";
		},

		warning: function (text, isActive) {
			if (typeof isActive === "undefined") isActive = true;
			if (!isActive) return text;
			return "<span class='warning'>" + text + "</span>";
		},

		meta: function (text) {
			return "<span class='p-meta'>" + text + "</span>";
		},

		getElementName: function ($e) {
			if (!$e) return "[none]";
			if (typeof $e === "string") $e = $($e)
			let id = $e.attr("id");
			if (id) return "#" + id;
			let classes = $e.attr("class");
			if (classes) return "." + classes;
			return "[unknown]";
		},

		isFocusable: function (element) {
			if (!(element instanceof HTMLElement)) {
				return false;
			}
			const knownFocusableElements =
				'a[href],area[href],button:not([disabled]),details,iframe,object,input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[contentEditable="true"],[tabindex]:not([tabindex^="-"])';
			if (element.matches(knownFocusableElements)) {
				return true;
			}

			const isDisabledCustomElement =
				element.localName.includes('-') && element.matches('[disabled], [aria-disabled="true"]');
			if (isDisabledCustomElement) {
				return false;
			}

			return element.shadowRoot?.delegatesFocus ?? false;
		},

		getDisplayValue: function (value) {
			if (!value) return 0;
			return value.toLocaleString();
		},

		getResourceImg: function (name) {
			return "<img src='img/res-" + name + ".png' alt='" + name + "'/>"
		},
		
		getRangeText: function (range, count) {
			var min = range[0];
			var max = range[1];
			
			if (!count && count !== 0) {
				// text without current count
				if (min >= 0 && max >= 0) {
					return min + "-" + max;
				}
				if (min >= 0) {
					return "min " + min;
				}
				if (max >= 0) {
					return "max " + max;
				}
			} else {
				// text with current count
				if (min >= 0 && max >= 0) {
					return count + "/" + min + "-" + max;
				}
				if (min >= 0) {
					return count + "/" + min;
				}
				if (max >= 0) {
					return count + "/" + max;
				}
			}
			
			return "";
		},

		getBagCapacityDisplayValue: function (bagComponent, isSimple) {
			if (bagComponent.bonusCapacity > 0 && !isSimple) {
				return bagComponent.baseCapacity + " +" + bagComponent.bonusCapacity;
			} else {
				return bagComponent.totalCapacity;
			}
		},

		cleanupText: function (text) {
			return text.replace(/'/g, "&#39;")
		},

	};

	return UIConstants;
});
