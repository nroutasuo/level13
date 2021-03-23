// Singleton with helper methods for UI elements used throughout the game
define(['ash',
	'game/GameGlobals',
	'game/constants/StoryConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/ItemConstants',
	'game/constants/BagConstants',
	'game/constants/PerkConstants',
	'game/constants/UpgradeConstants',
	'game/constants/PlayerActionConstants',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/PassagesComponent',
	'game/components/common/VisitedComponent',
	'utils/UIAnimations'
], function (Ash, GameGlobals,
	StoryConstants, PositionConstants, SectorConstants, ItemConstants, BagConstants, PerkConstants, UpgradeConstants, PlayerActionConstants,
	PositionComponent, CampComponent, SectorStatusComponent, SectorLocalesComponent,
	PassagesComponent, VisitedComponent, UIAnimations) {

	var UIConstants = {

		FEATURE_MISSING_TITLE: "Missing feature",
		FEATURE_MISSING_COPY: "This feature is not yet implemented. Come back later!",

		MAP_MINIMAP_SIZE: 7,
		SCROLL_INDICATOR_SIZE: 5,

		resourceImages: {
			metal: "img/res-metal.png",
		},

		getItemDiv: function (itemsComponent, item, count, calloutContent, hideComparisonIndicator) {
			var url = item ? item.icon : null;
			var hasCount = count || count === 0;

			var classes = "item";
			if (item && item.equipped) classes += " item-equipped";
			if (hasCount) classes += " item-with-count";
			var div = "<div class='" + classes + (item ? "' data-itemid='" + item.id + "' data-iteminstanceid='" + item.itemID + "'>" : ">");

			if (item && calloutContent) {
				div += "<div class='info-callout-target info-callout-target-small' description='" + this.cleanupText(calloutContent) + "'>";
			}

			if (item) div += "<img src='" + url + "'/>";

			if (hasCount)
				div += "<div class='item-count lvl13-box-1 vision-text'>" + count + "x </div>";

			if (!hideComparisonIndicator && item.equippable) {
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
			let itemDev = this.getItemDiv(itemsComponent, item, count, this.getItemCallout(item, false, showBagOptions, bagOptions, tab));
			var imageDiv = "<div class='item-slot-image'>"+ itemDev + "</div>";
			var liclasses = "item-slot item-slot-small lvl13-box-1 ";
			if (simple) liclasses += "item-slot-simple";
			if (isLost) liclasses += "item-slot-lost";
			return "<li class='" + liclasses + "'>" + imageDiv + "</li>"
		},

		updateItemSlot: function (slot, count) {
			var $slot = typeof (slot) === "string" ? $(slot) : slot;
			if (!$slot) return;
			$slot.find(".item-count").text(count + "x");
			GameGlobals.uiFunctions.toggle($slot, count > 0);
		},

		getItemCallout: function (item, smallCallout, showBagOptions, bagOptions, tab) {
			var detail = " (" + this.getItemBonusDescription(item, true, false) + ")";
			if (detail.length < 5) detail = "";
			var weight = BagConstants.getItemCapacity(item);
			var itemCalloutContent = "<b>" + item.name + "</b><br/>Type: " + item.type + " " + detail;
			if (item.type !== ItemConstants.itemTypes.follower)
				itemCalloutContent += "</br>Weight: " + weight;
			itemCalloutContent += "</br>" + item.description;
			if (smallCallout) itemCalloutContent = item.name + (detail.length > 0 ? " " + detail : "");
			
			var makeButton = function (action, name) {
				if (!tab) {
					 return "<button class='action btn-narrow' action='" + action + "'>" + name + "</button>";
				} else {
					 return "<button class='action tabbutton btn-narrow' data-tab='" + tab + "' action='" + action + "'>" + name + "</button>";
				}
			};

			if (showBagOptions) {
				var options = "<div class='item-bag-options'>";
				if (bagOptions.canEquip) {
					var action = "equip_" + item.id;
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
			for (var i = 0; i < items.length; i++) {
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
			var $li = typeof (li) === "string" ? $(li) : li;
			if (!$li) return;
			var showAmount = Math.floor(amount);
			$li.find(".item-count").text(showAmount + "x");
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
			var $li = typeof (li) === "string" ? $(li) : li;
			if (!$li) return;
			var showAmount = Math.floor(amount);
			$li.find(".item-count").text(showAmount + "x");
			GameGlobals.uiFunctions.toggle($li, showAmount > 0);
		},

		getBlueprintPieceLI: function (upgradeId) {
			var upgradeDefinition = UpgradeConstants.upgradeDefinitions[upgradeId];
			var name = upgradeDefinition.name;
			return "<li><div class='info-callout-target' description='Blueprint (" + name + ")'>" + this.getBlueprintPieceIcon(upgradeId) + " blueprint</li>";
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

		getItemBonusDescription: function (item, showAllBonuses, useLineBreaks) {
			var result = "";
			var defaultType = ItemConstants.getItemDefaultBonus(item);
			var value;
			for (var bonusKey in ItemConstants.itemBonusTypes) {
				var bonusType = ItemConstants.itemBonusTypes[bonusKey];
				if (bonusType === defaultType || showAllBonuses) {
					value = item.getBonus(bonusType);
					if (value <= 0 && showAllBonuses) {
						continue;
					}
					if (value <= 0 && !showAllBonuses) {}
					result += this.getItemBonusName(bonusType, true);
					result += useLineBreaks && !showAllBonuses ? "<br/>" : " ";
					result += this.getItemBonusText(item, bonusType);
				}
				if (showAllBonuses) {
					result += useLineBreaks ? "<br/>" : ", ";
				}
			}

			if (showAllBonuses) {
				result = result.substring(0, result.length - (useLineBreaks ? 5 : 2));
			}

			return result;
		},

		getItemBonusName: function (bonusType, short) {
			switch (bonusType) {
				case ItemConstants.itemBonusTypes.light: return "max vision";
				case ItemConstants.itemBonusTypes.fight_att: return "attack";
				case ItemConstants.itemBonusTypes.fight_def: return "defence";
				case ItemConstants.itemBonusTypes.fight_speed: return "attack speed";
				case ItemConstants.itemBonusTypes.movement: return "movement cost";
				case ItemConstants.itemBonusTypes.bag: return "bag size";
				case ItemConstants.itemBonusTypes.fight_def: return "defence";
				case ItemConstants.itemBonusTypes.res_cold: return "warmth";
				case ItemConstants.itemBonusTypes.res_radiation: return short ? "radiation prot" : "radiation protection";
				case ItemConstants.itemBonusTypes.res_poison: return short ? "poison prot" : "poison protection";
				case ItemConstants.itemBonusTypes.shade: return short ? "sun prot" : "sunblindness protection";
				default:
					return null;
			}
		},

		getItemBonusText: function (item, bonusType) {
			var bonusValue = item.getBonus(bonusType);
			if (bonusValue === 0) {
				return "+0";
			} else if (item.type == ItemConstants.itemTypes.bag) {
				return " " + bonusValue;
			} else if (ItemConstants.isMultiplier(bonusType) && ItemConstants.isIncreasing(bonusType)) {
				// increasing multiplier: fight speed
				var val = Math.abs(Math.round((1 - bonusValue) * 100));
				return bonusValue == 1 ? "+0%" : (bonusValue < 1 ? "-" + val + "%" : "+" + val + "%");
			} else if (bonusValue >= 1) {
				return " +" + bonusValue;
			} else if (bonusValue > 0) {
				return " -" + Math.round((1 - bonusValue) * 100) + "%";
			} else if (bonusValue > -1) {
				return " +" + Math.round((1 - bonusValue) * 100) + "%";
			} else {
				return " " + bonusValue;
			}
		},

		getPerkDetailText: function (perk, isResting) {
			if (perk.effectTimer >= 0) {
				var factor = isResting ? PerkConstants.PERK_RECOVERY_FACTOR_REST : 1;
				var timeleft = perk.effectTimer / factor;
				return this.getPerkBonusText(perk) + ", time left: " + this.getTimeToNum(timeleft);
			} else {
				return this.getPerkBonusText(perk);
			}
		},

		getPerkBonusText: function (perk) {
			var value = 0;
			if (PerkConstants.isPercentageEffect(perk.type)) {
				if (perk.effect < 1) {
					value = "-" + Math.round(100 - perk.effect * 100) + "%";
				} else {
					value = "+" + Math.round((perk.effect - 1) * 100) + "%";
				}
			} else {
				value = "+" + perk.effect;
			}

			var effect = perk.type;
			switch (perk.type) {
				case PerkConstants.perkTypes.movement:
					effect = "movement cost";
					break;
				case PerkConstants.perkTypes.injury:
				case PerkConstants.perkTypes.health:
					effect = "health";
					break;
			}

			return effect + " " + value;
		},

		sortItemsByType: function (a, b) {
			var getItemSortVal = function (itemVO) {
				var typeVal = 0;
				switch (itemVO.type) {
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
					case ItemConstants.itemTypes.uniqueEquipment: typeVal = 0; break;
					case ItemConstants.itemTypes.artefact: typeVal = 31; break;
					case ItemConstants.itemTypes.note: typeVal = 32; break;
					case ItemConstants.itemTypes.follower: typeVal = 0; break;
				}
				return typeVal * 1000 - itemVO.getTotalBonus();
			};
			var aVal = getItemSortVal(a);
			var bVal = getItemSortVal(b);
			return aVal - bVal;
		},

		createResourceIndicator: function (name, showName, id, showAmount, showChange) {
			var div = "<div class='stats-indicator' id='" + id + "'>";

			if (!showName) div = "<div class='info-callout-target info-callout-target-small' description='" + name + "'>" + div;
			else if (showChange) div = "<div class='info-callout-target' description=''>" + div;

			div += "<span class='icon'>";
			div += this.getResourceImg(name);
			if (!showName && !showChange) div += "</div>";
			div += "</span>";

			if (showName) div += "<span class='label'>" + name + "</span>";

			if (showAmount) div += "<span class='value'></span>";
			div += "<span class='change-indicator'></span>";
			div += "<span class='change'></span>";
			div += "<span class='forecast'></span>";
			div += "</div>";

			if (!showName || showChange) div = div + "</div>";

			return div;
		},
		
		completeResourceIndicatorAnimations: function (id) {
			let $valueElement = $(id).children(".value");
			UIAnimations.animateNumberEnd($valueElement);
		},

		updateResourceIndicator: function (id, value, change, storage, showChangeIcon, showChange, showDetails, showWarning, visible, animate) {
			GameGlobals.uiFunctions.toggle(id, visible);
			GameGlobals.uiFunctions.toggle($(id).parent(), visible);
			if (visible) {
				let $valueElement = $(id).children(".value");
				animate = animate || UIAnimations.isAnimating($valueElement);
				UIAnimations.animateOrSetNumber($valueElement, animate, value, "", false, (v) => { return UIConstants.roundValue(v, true, false); });
				$(id).children(".value").toggleClass("warning", showWarning && value < 5);
				$(id).children(".change").toggleClass("warning", change < 0);
				GameGlobals.uiFunctions.toggle($(id).children(".change"), showChange);
				GameGlobals.uiFunctions.toggle($(id).children(".forecast"), showDetails);
				$(id).children(".forecast").toggleClass("warning", change < 0);

				var isCappedByStorage = change > 0 && value >= storage;

				if (showChange) {
					$(id).children(".change").text(Math.round(change * 10000) / 10000 + "/s");
				}
				if (showDetails) {
					if (change > 0 && (storage - value > 0)) {
						$(id).children(".forecast").text("(" + this.getTimeToNum((storage - value) / change) + " to cap)");
					} else if (change < 0 && value > 0) {
						$(id).children(".forecast").text("(" + this.getTimeToNum(value / change) + " to 0)");
					} else if (value >= storage) {
						$(id).children(".forecast").text("(full)");
					} else {
						$(id).children(".forecast").text("");
					}
				}

				change = Math.round(change * 10000) / 10000;
				$(id).children(".change-indicator").toggleClass("indicator-increase", change > 0 && !isCappedByStorage);
				$(id).children(".change-indicator").toggleClass("indicator-decrease", change < 0);
				$(id).children(".change-indicator").toggleClass("indicator-even", change === 0 || isCappedByStorage);
				GameGlobals.uiFunctions.toggle($(id).children(".change-indicator"), showChangeIcon);
			}
		},

		updateResourceIndicatorCallout: function (id, changeSources) {
			var content = "";
			var source;
			for (var i in changeSources) {
				source = changeSources[i];
				if (source.amount != 0) {
					content += source.source + ": " + Math.round(source.amount * 10000) / 10000 + "/s<br/>";
				}
			}

			if (content.length <= 0) {
				content = "(no change)";
			}

			this.updateCalloutContent(id, content);
		},

		updateCalloutContent: function (targetElementId, content, isTargetDirect) {
			if (isTargetDirect)
				$(targetElementId).siblings(".info-callout").children(".info-callout-content").html(content);
			else
				$(targetElementId).parents(".info-callout-target").siblings(".info-callout").children(".info-callout-content").html(content);
		},

		getBlueprintPieceIcon: function (upgradeId) {
			let type = UpgradeConstants.getUpgradeType(upgradeId);
			return "<img src='img/items/blueprints/blueprint-" + type + ".png' />";
		},

		getTimeToNum: function (seconds) {
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
			} else {
				return Math.round(seconds) + "s";
			}
		},

		getTimeSinceText: function (date) {
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

		roundValue: function (value, showDecimalsWhenSmall, showDecimalsAlways, decimalDivisor) {
			decimalDivisor = decimalDivisor || 100;
			let divisor = 0;
			if (showDecimalsWhenSmall && value <= 10) divisor = decimalDivisor;
			if (showDecimalsAlways) divisor = decimalDivisor;

			if (value % 1 === 0 || divisor <= 0) return Math.round(value);
			
			let result = Math.round(value * divisor) / divisor;
			
			if (result == 0) {
				return "< " + (0.5 / divisor);
			}
			
			return result;
		},

		getDisplayValue: function (value) {
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

		cleanupText: function (text) {
			return text.replace(/'/g, "&#39;")
		},

	};

	return UIConstants;
});
