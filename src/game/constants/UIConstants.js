// Singleton with helper methods for UI elements used throughout the game
define(['ash',
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
    'game/components/sector/improvements/WorkshopComponent',
], function (Ash,
	StoryConstants, PositionConstants, SectorConstants, ItemConstants, BagConstants, PerkConstants, UpgradeConstants, PlayerActionConstants,
	PositionComponent, CampComponent, SectorStatusComponent, SectorLocalesComponent,
	PassagesComponent, VisitedComponent, WorkshopComponent) {
    
    var UIConstants = {
		
		FEATURE_MISSING_TITLE: "Missing feature",
		FEATURE_MISSING_COPY: "This feature is not yet implemented. Come back later!",
		
		MAP_MINIMAP_SIZE: 5,
		
		resourceImages: {
			metal: "img/res-metal.png",
		},
        
		getItemDiv: function (item, count, smallCallout, hideCallout) {
			var url = item ? item.icon : null;
			var hasCount = count && count > 0;
			
			var classes = "item";
			if (item && item.equipped) classes += " item-equipped";
			if (hasCount) classes += " item-with-count";
			var div = "<div class='" + classes + (item ? "' data-itemid='" + item.id + "' data-iteminstanceid='" + item.itemID + "'>" : ">");
			
			if (item && !hideCallout) {
				var detail = this.getItemBonusName(item) ? " (" + this.getItemBonusName(item) + " " + this.getItemBonusText(item) + ")" : "";
                var weight = BagConstants.getItemCapacity(item);
				
				var itemCalloutContent = "<b>" + item.name + "</b><br/>Type: " + item.type + " " + detail + "</br>Weight: " + weight + "</br>" + item.description;
				if (smallCallout) itemCalloutContent = item.name + (detail.length > 0 ? " " + detail : "");
				
				div += "<div class='info-callout-target info-callout-target-small' description='" + this.cleanupText(itemCalloutContent) + "'>";
			}
			
			if (item) div += "<img src='" + url + "'/>";
			
			if (hasCount)
				div += "<div class='item-count lvl13-box-3'>" + count + "x </div>";
			
			if (!hideCallout) div += "</div>";
			
			div += "</div>"
			
			return div;
		},
		
		getItemSlot: function (item, count, isLost) {
			var imageDiv = "<div class='item-slot-image'>" + this.getItemDiv(item, count, false, false) + "</div>";
			return "<li class='item-slot item-slot-small lvl13-box-1 " + (isLost ? "item-slot-lost" : "") + "'>" + imageDiv + "</li>"
		},
		
		getItemList: function (items) {
			var html = "";
			var itemsCounted = {};
			var itemsById = {};
			for (var i = 0; i < items.length; i++) {
				if (typeof itemsCounted[items[i].id]  === 'undefined') {
					itemsCounted[items[i].id] = 1;
					itemsById[items[i].id] = items[i];
				} else {
					itemsCounted[items[i].id]++;
				}
			}
			
			for (var key in itemsById) {
				var item = itemsById[key];
				var amount = itemsCounted[key];
				html += "<li>" + this.getItemDiv(item, amount, true, false) + "</li>";
			}
			return html;
		},
		
		getResourceLi: function (name, amount, isLost) {
			var classes = "res item-with-count";
			var div = "<div class='" + classes + "' data-resourcename='" + name + "'>";
			div += "<div class='info-callout-target info-callout-target-small' description='" + name + "'>";
			div += this.getResourceImg(name);
			div += "<div class='item-count lvl13-box-3'>" + Math.ceil(amount) + "x </div>";
			div += "</div>";
			div += "</div>"
			var imageDiv = "<div class='item-slot-image'>" + div + "</div>";
			return "<li class='item-slot item-slot-small lvl13-box-1 " + (isLost ? "item-slot-lost" : "") + "'>" + imageDiv + "</li>";
		},
		
		getBlueprintPieceLI: function (blueprintVO) {
			var upgradeDefinition = UpgradeConstants.upgradeDefinitions[blueprintVO.upgradeId];
			var name = upgradeDefinition.name;
			return "<li><div class='info-callout-target info-callout-target-small' description='A piece of forgotten technology (" + name + ")'>" + this.getBlueprintPieceIcon(blueprintVO) + " blueprint</li>";
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
		
		getSectorTD: function (playerPosition, sector, levelHelper) {
			var content = "";
            var sectorStatus = SectorConstants.getSectorStatus(sector, levelHelper);
			var classes = "vis-out-sector";
			if (sector && sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE) {
				var sectorPos = sector.get(PositionComponent);
				var statusComponent = sector.get(SectorStatusComponent);
				var localesComponent = sector.get(SectorLocalesComponent);
				var sectorPassages = sector.get(PassagesComponent);
				var isScouted = statusComponent.scouted;
				if (sectorPos.sectorId() === playerPosition.sectorId()) {
					classes += " vis-out-sector-current";
				}
				
				if (sector.has(VisitedComponent)) {
					classes += " vis-out-sector-visited";
				}
				
				content = "?";
				var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
				if (isScouted) content = " ";
				if (sector.has(CampComponent)) content = "c";
				if (sector.has(WorkshopComponent)) content = "w";
				if (sectorPassages.passageUp && isScouted) content = "U";
				if (sectorPassages.passageDown && isScouted) content = "D";
				if (unScoutedLocales > 0 && isScouted) content = "L";
			} else {
				classes += " vis-out-sector-null";
			}
			
			content = "<div class='" + classes + "'>" + content.trim() + "<div>";
			
			if (sector && sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE) {
				for (var i in PositionConstants.getLevelDirections()) {
					var direction = PositionConstants.getLevelDirections()[i];
					var blocker = sectorPassages.getBlocker(direction);
					var blockerType = blocker ? blocker.type : "null";
					content += "<div class='vis-out-blocker vis-out-blocker-" + PositionConstants.getDirectionName(direction) + " vis-out-blocker-" + blockerType + "'/>";
				}
			}
			
			return "<td class='vis-out-sector-container'>" + content + "</td>";
		},
		
		getItemBonusName: function (item) {
			switch (item.type) {
				case ItemConstants.itemTypes.light: return "max vision"; break;
				case ItemConstants.itemTypes.shades: return "max vision"; break;
				case ItemConstants.itemTypes.weapon: return "attack"; break;
				case ItemConstants.itemTypes.clothing: return "defence"; break;
				case ItemConstants.itemTypes.follower: return "follower strength"; break;
				case ItemConstants.itemTypes.shoes: return "movement cost"; break;
				case ItemConstants.itemTypes.bag: return "bag size"; break;
			}
		},
		
		getItemBonusText: function (item) {
			if (item.bonus === 0)
				return "";
			else if (item.bonus > 1)
				return item.type === ItemConstants.itemTypes.bag ? " " + item.bonus : " +" + item.bonus;
			else if (item.bonus > 0)
				return " -" + Math.round((1-item.bonus)*100) + "%";
			else if (item.bonus > -1)
				return " +" + Math.round((1-item.bonus)*100) + "%";
			else
				return " " + item.bonus; 
		},
		
		getPerkBonusText: function (perk) {
			var value = 0;
			if (perk.effect < 1) {
				value = "-" + Math.round((1 - perk.effect) * 100) + "%";
			} else {
				value = Math.round((perk.effect - 1) * 100) + "%";
			}
			
			var effect = perk.type;
			switch (perk.type) {
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
					case ItemConstants.itemTypes.bag: typeVal = 1; break;
					case ItemConstants.itemTypes.light: typeVal = 2; break;
					case ItemConstants.itemTypes.shades: typeVal = 3; break;
					case ItemConstants.itemTypes.weapon: typeVal = 4; break;
					case ItemConstants.itemTypes.clothing: typeVal = 5; break;
					case ItemConstants.itemTypes.shoes: typeVal = 6; break;
					case ItemConstants.itemTypes.exploration: typeVal = 7; break;
					case ItemConstants.itemTypes.ingredient: typeVal = 8; break;
					case ItemConstants.itemTypes.uniqueEquipment: typeVal = 0; break;
					case ItemConstants.itemTypes.artefact: typeVal = 9; break;
					case ItemConstants.itemTypes.note: typeVal = 10; break;
					case ItemConstants.itemTypes.follower: typeVal = 0; break;
				}
				return typeVal * 1000 - itemVO.bonus;
			};
			var aVal = getItemSortVal(a);
			var bVal = getItemSortVal(b);
			return aVal - bVal;
		},
		
		createResourceIndicator: function (name, showName, id, showAmount, showChange) {
			var div = "<div class='stats-indicator' id='" + id + "'>";
			
			if (!showName) div = "<div class='info-callout-target info-callout-target-small' description='" + name + "'>" + div;
			else if(showChange) div = "<div class='info-callout-target' description=''>" + div;
			
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
		
		updateResourceIndicator: function (name, id, value, change, storage, showStorage, showChange, showDetails, showWarning, visible) {
			$(id).toggle(visible);
			var roundedValue = value >= 10 ? Math.ceil(value) : Math.ceil(value * 10) / 10;
			if (visible) {
				$(id).children(".value").text(showStorage ? roundedValue + " / " + storage : roundedValue);
				$(id).children(".value").toggleClass("warning", showWarning && roundedValue < 5);
				$(id).children(".change").toggleClass("warning", change < 0);
				$(id).children(".change").toggle(showChange);
				$(id).children(".forecast").toggle(showDetails);
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
			}
		},
		
		updateResourceIndicatorCallout: function (id, changeSources) {
			var content = "";
			var source;
			for (var i in changeSources) {
				source = changeSources[i];
				if (source.amount != 0) {
					content += source.source + ": " + Math.round(source.amount * 10000)/10000 + "/s<br/>";
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
		
		getBlueprintPieceIcon: function (blueprintVO) {
            var costs = PlayerActionConstants.costs[blueprintVO.upgradeId];
			var type = "rumours";
			if (costs.favour > 0) type = "favour";
			else if (costs.evidence > 0) type = "evidence";
			return "<img src='img/items/blueprints/blueprint-" + type + ".png' />";
		},
		
		getTimeToNum: function (seconds) {
			seconds = Math.ceil(Math.abs(seconds));
			
			var minutes = seconds / 60;
			var hours = minutes / 60;
			var days = hours / 24;
			
			if (days > 2) {
				return Math.floor(days) + "days";
			}
			else if (hours > 2) {
				return Math.floor(hours) + "h";
			}
			else if (minutes > 2) {
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
		
		getInGameDate: function (gamePlayedSeconds) {
			var secondSinceGameStart = gamePlayedSeconds;
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
		
		getResourceImg: function (name) {
			return "<img src='img/res-" + name + ".png' alt='" + name + "'/>"
		},
		
		cleanupText: function (text) {
			return text.replace(/'/g, "&#39;")
		},
	
    };
    
    return UIConstants;
});