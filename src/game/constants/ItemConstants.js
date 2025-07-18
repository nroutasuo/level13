define(['ash', 'json!game/data/ItemData.json', 'text/Text', 'utils/MathUtils', 'game/constants/PlayerActionConstants', 'game/vos/ItemVO'],
function (Ash, ItemData, Text, MathUtils, PlayerActionConstants, ItemVO) {

	let ItemConstants = {
		
		PLAYER_DEFAULT_STORAGE: 10,

		DEFAULT_EQUIPMENT_ITEM_LEVEL: 50,
		
		MAX_RANDOM_EQUIPMENT_STASH_RARITY: 6,
			
		STASH_TYPE_ITEM: "item",
		STASH_TYPE_SILVER: "silver",
		
		itemTypes: {
			// Equippable / slots:
			light: "light",
			weapon: "weapon",
			clothing_over: "clothing_over",
			clothing_upper: "clothing_upper",
			clothing_lower: "clothing_lower",
			clothing_hands: "clothing_hands",
			clothing_head: "clothing_head",
			shoes: "shoes",
			bag: "bag",
			// Special effects / one-use:
			ingredient: "ingredient",
			voucher: "voucher",
			exploration: "exploration",
			uniqueEquipment: "uniqueEquipment",
			// Just inventory - no effects:
			artefact: "artefact",
			trade: "trade",
			note: "note",
		},
		
		itemCategories: {
			equipment: "equipment",
			consumable: "consumable",
			ingredient: "ingredient",
			other: "other",
		},
		
		itemTypesEquipment: {
			bag: "bag",
			light: "light",
			weapon: "weapon",
			clothing_over: "clothing_over",
			clothing_upper: "clothing_upper",
			clothing_lower: "clothing_lower",
			clothing_hands: "clothing_hands",
			clothing_head: "clothing_head",
			shoes: "shoes",
		},
		
		itemBonusTypes: {
			// items
			light: "light",
			fight_att: "att",
			fight_def: "def",
			fight_speed: "spd",
			fight_shield: "shield",
			movement: "movement",
			bag: "bag",
			res_cold: "warmth",
			res_radiation: "res_rad",
			res_poison: "res_poison",
			res_water: "res_water",
			shade: "shade",
			// only explorers
			detect_hazards: "detect_hazards",
			detect_ingredients: "detect_ingredients",
			detect_poi: "detect_poi",
			detect_supplies: "detect_supplies",
			scavenge_blueprints: "scavenge_blueprints",
			scavenge_general: "scavenge_general",
			scavenge_ingredients: "scavenge_ingredients",
			scavenge_supplies: "scavenge_supplies",
			scavenge_valuables: "scavenge_valuables",
			collector_cost: "collector_cost",
			scavenge_cost: "scavenge_cost",
			scout_cost: "scout_cost",
		},
		
		bookTypes: {
			history: "history",
			fiction: "fiction",
			science: "science",
			engineering: "engineering",
		},

		itemSource: {
			trade: "trade",
			exploration: "exploration",
			crafting: "crafting",
		},

		itemQuality: {
			low: "low",
			medium: "medium",
			high: "high",
		},

		itemTags: {
			book: "book", // books, found in residential areas and libraries, not in flooded sectors
			clothing: "clothing", // clothing items, found in resdiential and industrial sectors, stores, factories etc
			community: "community", // items related to news or propaganda or gossip, found in places where people lived and worked relatively recently
			equipment: "equipment", // equipment related to surviving in the City, found in industrial areas and areas inhabited since the Fall
			history: "history", // from before the Government, found in public sectors, museums, libraries 
			industrial: "industrial", // related to industry, found in industrial sectors and factories
			keepsake: "keepsake", // something with sentimental value, found in residential sectors and locales
			medical: "medical", // related to healthcare, found in labs and hospitals
			maintenance: "maintenance", // related to the maintenance and infrastructure of the City, foundin maintenance areas
			nature: "nature", // nature related, found on the ground, on sunlit sectors, greenhouses etc
			new: "new", // manufactured after the Fall, found in places inhabited since
			old: "old", // manufactured before the Fall, found in warehouses and depots and homes
			perishable: "perishable", // food and other items, found in residential and commercial areas
			science: "science", // related to science and technology, found in industrial sectors and factories
			valuable: "valuable", // items that are valuable regardless of era, found in residential and commercial areas
			weapon: "weapon", // both manufactured and improvised weapons, found in slums and gang territories
		},
		
		itemBonusTypeIcons: {},
		
		itemDefinitions: {},
		
		// caches
		itemByID: {},
		equipmentComparisonCache: {},
		
		init: function () {
			let defineItemBonusIcon = function (bonusType, icon) {
				ItemConstants.itemBonusTypeIcons[bonusType] = { sunlit: "img/eldorado/" + icon + ".png", dark: "img/eldorado/" + icon + "-dark.png" };
			};
			
			defineItemBonusIcon(ItemConstants.itemBonusTypes.light, "icon_stat_light");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.fight_att, "icon_stat_fight_attack");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.fight_def, "icon_stat_fight_defence");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.fight_speed, "icon_stat_fight_speed");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.fight_shield, "icon_stat_fight_shield");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.scavenge_cost, "icon_stat_cost_scavenge");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.scout_cost, "icon_stat_cost_scout");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.res_cold, "icon_stat_resistance_cold");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.res_radiation, "icon_stat_resistance_radiation");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.res_poison, "icon_stat_resistance_poison");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.res_water, "icon_stat_resistance_water");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.shade, "icon_stat_shade");
			defineItemBonusIcon(ItemConstants.itemBonusTypes.movement, "icon_stat_movement_cost");
		},

		loadData: function (data) {
			for (let itemID in data) {
				let item = data[itemID];
				let bonuses = item.bonuses;
				let type = item.type;
				if (!this.itemDefinitions[type]) this.itemDefinitions[type] = [];
				let isRepairable = item.isRepairable;
				if (isRepairable === undefined) {
					isRepairable = item.isCraftable && item.isEquippable;
				}
				let level = item.level || this.getDefaultItemLevel(type);
				let tags = this.getItemDefaultTags(item.type).concat(item.tags || []);

				let itemVO = new ItemVO(itemID, type, level, item.campOrdinalRequired, item.campOrdinalMaximum, item.isEquippable, item.isCraftable, isRepairable, item.isUseable, bonuses, item.icon, item.isSpecialEquipment);
				itemVO.scavengeRarity = item.rarityScavenge || -1;
				itemVO.investigateRarity = item.rarityInvestigate || -1;
				itemVO.localeRarity = item.rarityLocale || -1;
				itemVO.tradeRarity = item.rarityTrade || -1;
				itemVO.tags = tags;
				itemVO.configData = item.configData || {};
				itemVO.tradePrice = item.tradePrice;
				itemVO.isStoryItem = item.isStoryItem || false;
				itemVO.weight = item.weight || null;
				this.itemDefinitions[type].push(itemVO);
				this.itemByID[itemID] = itemVO;
			}
		},

		getItemDefaultTags: function (itemType) {
			switch (itemType) {
				case ItemConstants.itemTypes.weapon:
					return [ ItemConstants.itemTags.weapon ];
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
					return [ ItemConstants.itemTags.clothing ];
				case ItemConstants.itemTypes.light:
					return [ ItemConstants.itemTags.equipment, ItemConstants.itemTags.new ];
				case ItemConstants.itemTypes.bag:
					return [ ItemConstants.itemTags.equipment ];
				case ItemConstants.itemTypes.shoes:
					return [ ItemConstants.itemTags.clothing ];
				case ItemConstants.itemTypes.exploration:
					return [ ItemConstants.itemTags.equipment, ItemConstants.itemTags.new ];
				case ItemConstants.itemTypes.artefact:
					return [ ItemConstants.itemTags.keepsake, ItemConstants.itemTags.old ];
				case ItemConstants.itemTypes.trade:
					return [ ItemConstants.itemTags.keepsake, ItemConstants.itemTags.valuable, ItemConstants.itemTags.old ];
				case ItemConstants.itemTypes.uniqueEquipment:
					return [ ItemConstants.itemTags.equipment, ItemConstants.itemTags.new  ];
				case ItemConstants.itemTypes.note:
					return [ ItemConstants.itemTags.community ];
				default: return [];
			}
		},
		
		getItemTypeDisplayName: function (type, short) {
			return Text.t(this.getItemTypeDisplayNameKey(type, short));
		},

		getItemTypeDisplayNameKey: function (type, short) {
			return "game.item.type_" + type + "_name" + (short ? "_short" : "");
		},

		getQualityDisplayName: function (quality) {
			return quality;
		},
		
		getItemCategory: function (item) {
			if (!item) return ItemConstants.itemCategories.other;
			switch (item.type) {
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
				case ItemConstants.itemTypes.light:
				case ItemConstants.itemTypes.bag:
				case ItemConstants.itemTypes.shoes:
					return ItemConstants.itemCategories.equipment;
				case ItemConstants.itemTypes.ingredient:
					return ItemConstants.itemCategories.ingredient;
				case ItemConstants.itemTypes.voucher:
				case ItemConstants.itemTypes.exploration:
				case ItemConstants.itemTypes.note:
					return ItemConstants.itemCategories.consumable;
			}
			return ItemConstants.itemCategories.other;
		},

		getLongItemID: function (item) {
			if (!item) return null;
			return item.id + ":" + this.getItemQuality(item);
		},

		getItemIDFromLongID: function (longID) {
			return longID.split(":")[0];
		},

		getItemIDFromSaved: function (savedItemID) {
			// converts old item ids to new ones for backwards compatibility
			let result = savedItemID;
			result = result.replaceAll("cache_favour", "cache_hope");
			return result;
		},

		getItemQualityFromLongID: function (longID) {
			return longID.split(":")[1];
		},

		// ITEM BONUSES
		// base bonus: bonus without any modifiers, bonus in balancing / item definition
		// default bonus: bonus without broken status but with quality, bonus in this item instance by default
		// current bonus: bonus including all modifiers (quality and broken status)

		getBaseTotalBonus: function (itemVO) {
			return itemVO.getBaseTotalBonus();
		},

		getBaseBonus: function (itemVO, bonusType) {
			if (!itemVO) return 0;
			return itemVO.getBaseBonus(bonusType);
		},

		getDefaultTotalBonus: function (itemVO) {
			let result = 0;
			if (itemVO.bonus) {
				for (let key in itemVO.bonus.bonuses) {
					result += this.getDefaultBonus(itemVO, key);
				}
			}
			return result;
		},

		getDefaultBonus: function (itemVO, itemBonusType) {
			let baseBonus = this.getBaseBonus(itemVO, itemBonusType);
			if (!baseBonus) return 0;
			let quality = ItemConstants.getItemQuality(itemVO);
			let modifier = ItemConstants.getItemBonusModifierFromQuality(itemBonusType, quality);
			let isMultiplier = this.isMultiplier(itemBonusType);
			return isMultiplier ? Math.round(baseBonus * modifier * 100) / 100 : Math.round(baseBonus * modifier);
		},

		getCurrentTotalBonus: function (itemVO) {
			let result = 0;
			if (itemVO.bonus) {
				for (let key in itemVO.bonus.bonuses) {
					result += this.getCurrentBonus(itemVO, key);
				}
			}
			return result;
		},

		getCurrentBonus: function (itemVO, bonusType) {
			let defaultBonus = this.getDefaultBonus(itemVO, bonusType);
			if (!defaultBonus) return 0;
			if (itemVO.broken && ItemConstants.isBonusTypeAffectedByBrokenStatus(bonusType)) {
				let modifier = this.getBrokenBonusModifier(itemVO, bonusType);
				return Math.round(defaultBonus * modifier * 100) / 100;
			} else {
				return defaultBonus;
			}
		},
		
		getBrokenBonusModifier: function (itemVO, bonusType) {
			let baseValue = this.getBaseBonus(itemVO, bonusType);
			if (baseValue == 0) return 0;
			switch (bonusType) {
				case ItemConstants.itemBonusTypes.movement:
					// if the item increases movement (cost) keep it the same
					if (baseValue > 1) {
						return 1;
					}
					// if it decreases movement (cost), reduce the reduction
					let reduction = (1 - baseValue);
					let newReduction = reduction / 2;
					let newValue = 1 - newReduction;
					return newValue / baseValue;
				default:
					return 0.5;
			}
		},

		getUseItemActionDisplaName: function (item) {
			let actionVerb = ItemConstants.getUseItemVerb(item);
			return actionVerb + " " + ItemConstants.getItemDisplayName(item, true);
		},

		getUseItemActionDisplayNameByBaseID: function (items) {
			if (items.length == 1) {
				return this.getUseItemActionDisplaName(items[0]);
			}

			let uniqueBaseIDs = [];
			let uniqueIDs = [];
			let defaultItem = items[0];

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let baseItemID = this.getBaseItemID(item.id);
				if (uniqueBaseIDs.indexOf(baseItemID) < 0) uniqueBaseIDs.push(baseItemID);
				if (uniqueIDs.indexOf(item.id) < 0) uniqueIDs.push(item.id);
			}

			if (uniqueIDs.length == 1) {
				return this.getUseItemActionDisplaName(items[0]);
			}

			let actionVerb = ItemConstants.getUseItemVerb(defaultItem);

			if (uniqueBaseIDs.length > 1) {
				log.w("trying to get use action display name for a group of items that don't share base id")
				return actionVerb + " item";
			}

			return actionVerb + " " + ItemConstants.getBaseItemDisplayName(defaultItem);
		},
		
		getUseItemVerb: function (item) {
			if (item.id.startsWith("cache_metal")) return "Disassemble";
			if (item.id.startsWith("cache_evidence")) return "Read";
			if (item.id.startsWith("cache_rumours")) return "Read";
			if (item.id.startsWith("cache_insight")) return "Read";
			if (item.id.startsWith("cache_hope")) return "Donate";
			if (item.id.startsWith("cache_robots")) return "Repair";
			if (item.id.startsWith("robot")) return "Repair";
			if (item.id.startsWith("document")) return "Read";
			return "Use";
		},
			
		getItemDisplayName: function (item, short) {
			if (!item) return "";
			return Text.t(ItemConstants.getItemDisplayNameKey(item, short));
		},
			
		getItemDisplayNameFromID: function (itemID, short) {
			return Text.t(ItemConstants.getItemDisplayNameKeyFromID(itemID, short));
		},

		getItemDisplayNameKey: function (item, short) {
			if (!item) return "";
			if (item.type == ItemConstants.itemTypes.note) return "game.items.documents_name";
			return this.getItemDisplayNameKeyFromID(item.id, short);
		},

		getItemDisplayNameKeyFromID: function (itemID, short) {
			let defaultKey = "game.items." + itemID + "_name";
			let shortKey = "game.items." + itemID + "_name_short";
			if (short && Text.hasKey(shortKey)) {
				shortKey;
			}
			return defaultKey;
		},
		
		getItemDescription: function (item) {
			if (!item) return "";
			let result = Text.t(this.getItemDescriptionKey(item));
			if (item.id.indexOf("consumable_weapon") >= 0) {
				result += Text.t("ui.common.sentence_separator");
				result += Text.t("ui.inventory.fight_consumable_only_one_per_fight_hint");
			}
			return result;
		},

		getItemDescriptionKey: function (item) {
			if (!item) return "";
			let defaultKey = "game.items." + item.id + "_description";
			if (Text.hasKey(defaultKey)) return defaultKey;
			let baseItemID = ItemConstants.getBaseItemID(item.id);
			let baseItemKey = "game.items." + baseItemID + "_description";
			if (Text.hasKey(baseItemKey)) return baseItemKey;
			return "game_items." + item.type + "_description";
		},

		getBaseItemDisplayName: function (item) {
			return Text.t(ItemConstants.getBaseItemDisplayNameKey(item));
		},

		getBaseItemDisplayNameKey: function (item) {
			let baseItemID = ItemConstants.getBaseItemID(item.id);
			let baseItemKey =  "game.items." + baseItemID + "_name";
			if (Text.hasKey(baseItemKey)) return baseItemKey;
			return this.getItemDisplayNameKey(item);
		},
		
		getItemBonusIcons: function (itemBonusType) {
			return this.itemBonusTypeIcons[itemBonusType] || null;
		},
		
		getBaseItemID: function (itemID) {
			if (itemID.startsWith("document_")) return "document";

			let id = itemID.replaceAll("_exodus", "").replaceAll("_official", "");
			let parts = id.split("_");

			if (parts.length > 1) {
				let postfix = parts[parts.length - 1];
				if (/^\d+$/.test(postfix)) {
					return parts.slice(0, -1).join("_");
				}
			}
			return itemID;
		},
		
		isMultiplier: function (itemBonusType) {
			switch (itemBonusType) {
				case this.itemBonusTypes.fight_speed:
				case this.itemBonusTypes.movement:
				case this.itemBonusTypes.scavenge_cost:
				case this.itemBonusTypes.scavenge_general:
				case this.itemBonusTypes.scavenge_supplies:
				case this.itemBonusTypes.scavenge_ingredients:
				case this.itemBonusTypes.scavenge_blueprints:
				case this.itemBonusTypes.scavenge_valuables:
				case this.itemBonusTypes.scout_cost:
				case this.itemBonusTypes.collector_cost:
					return true;
			}
			return false;
		},
		
		isStaticValue: function (itemBonusType) {
			switch (itemBonusType) {
				case ItemConstants.itemTypes.bag:
					return true;
			}
			return false;
		},
		
		isIncreasing: function (itemBonusType) {
			switch (itemBonusType) {
				case this.itemBonusTypes.movement:
				case this.itemBonusTypes.scavenge_cost:
				case this.itemBonusTypes.scout_cost:
				case this.itemBonusTypes.collector_cost:
					return false;
			}
			return true;
		},

		isBonusTypeAffectedByQuality: function (itemBonusType) {
			if (itemBonusType == ItemConstants.itemBonusTypes.light) return false;
			if (itemBonusType == ItemConstants.itemBonusTypes.fight_speed) return false;
			if (itemBonusType == ItemConstants.itemBonusTypes.movement) return false;
			if (itemBonusType == ItemConstants.itemBonusTypes.bag) return false;
			if (itemBonusType == ItemConstants.itemBonusTypes.detect_hazards) return false;
			if (itemBonusType == ItemConstants.itemBonusTypes.detect_supplies) return false;
			if (itemBonusType == ItemConstants.itemBonusTypes.detect_ingredients) return false;
			return true;
		},
		
		isBonusTypeAffectedByBrokenStatus: function (itemBonusType) {
			if (itemBonusType == ItemConstants.itemBonusTypes.fight_speed) return false;
			return true;
		},

		getItemQuality: function (itemVO) {
			if (!this.hasItemTypeQualityLevels(itemVO.type)) {
				return ItemConstants.itemQuality.medium;
			}
			let level = itemVO.level || 1;
			if (level >= 70) return ItemConstants.itemQuality.high;
			if (level <= 30) return ItemConstants.itemQuality.low;
			return ItemConstants.itemQuality.medium;
		},

		getItemBonusModifierFromQuality: function (itemBonusType, itemQuality) {
			if (!this.isBonusTypeAffectedByQuality(itemBonusType)) return 1;
			if (itemQuality == ItemConstants.itemQuality.high) return 1.15;
			if (itemQuality == ItemConstants.itemQuality.low) return 0.85;
			return 1;
		},
		
		getNewItemInstanceByID: function (id, level, skipWarning) {
			if (!id) return null;
			let definition = this.getItemDefinitionByID(id, skipWarning);
			return this.getNewItemInstanceByDefinition(definition, level);
		},

		getNewItemInstanceByLongID: function (longID, skipWarning) {
			if (!longID) return null;
			let id = this.getItemIDFromLongID(longID);
			let definition = this.getItemDefinitionByID(id, skipWarning);
			let quality = this.getItemQualityFromLongID(longID);
			let level = this.getItemLevelFromQuality(quality);
			return this.getNewItemInstanceByDefinition(definition, level);
		},

		getNewItemInstanceByDefinition: function (definition, level) {
			if (!definition) return null;
			let instance = definition.clone();
			instance.level = level || this.getDefaultItemLevel(definition.type);
			return instance;
		},
		
		getItemDefinitionByID: function (id, skipWarning) {
			if (this.itemByID[id]) {
				return this.itemByID[id];
			}
			if (!skipWarning) log.w("no such item definition " + id);
			return null;
		},

		getRandomItemDefinitionByPartialItemID: function (id, filter, skipWarning) {
			let possibleItems = [];
			
			for (let type in this.itemDefinitions ) {
				for (let i in this.itemDefinitions[type]) {
					let item = this.itemDefinitions[type][i];
					if (filter && !filter(item)) continue;
					if (item.id.indexOf(id) >= 0) {
						possibleItems.push(item);
					}
				}
			}

			if (possibleItems.length == 0) {
				if (!skipWarning) log.w("no such item definition " + id);
				return null;
			}

			return MathUtils.randomElement(possibleItems);
		},

		getDefaultItemLevel: function (itemType) {
			switch (itemType) {
				case ItemConstants.itemTypes.light:
				case ItemConstants.itemTypes.bag:
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.shoes:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_head:
				case ItemConstants.itemTypes.clothing_hands:
					return ItemConstants.DEFAULT_EQUIPMENT_ITEM_LEVEL;
				default:
					return 1;
			}
		},

		getItemLevelFromQuality: function (quality) {
			if (quality == ItemConstants.itemQuality.high) return 85;
			if (quality == ItemConstants.itemQuality.low) return 15;
			return 50;
		},

		getRandomItemLevel: function (itemSource, itemDefinition) {
			// crafting: always default
			if (itemSource == ItemConstants.itemSource.crafting) {
				return this.getDefaultItemLevel(itemDefinition.type);
			}

			// trade: varies a bit
			if (itemSource == ItemConstants.itemSource.trade) {
				return Math.ceil(15 + Math.random() * 70);
			}

			// exploration: varies a lot
			return Math.ceil(Math.random() * 100);
		},

		getItemType: function (id) {
			var item = this.getItemDefinitionByID(id);
			if (!item) return null;
			return item.type;
		},

		getItemDefaultBonus: function (item) {
			if (!item) return null;
			return this.getItemTypeDefaultBonus(item.type);
		},
		
		getItemTypeDefaultBonus: function (itemType) {
			switch (itemType) {
				case ItemConstants.itemTypes.light:
					return ItemConstants.itemBonusTypes.light;
				case ItemConstants.itemTypes.weapon:
					return ItemConstants.itemBonusTypes.fight_att;
				case ItemConstants.itemTypes.shoes:
					return ItemConstants.itemBonusTypes.movement;
				case ItemConstants.itemTypes.bag:
					return ItemConstants.itemBonusTypes.bag;
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_head:
				case ItemConstants.itemTypes.clothing_hands:
					return ItemConstants.itemBonusTypes.fight_def;
				default:
					return null;
			}
		},

		hasItemTypeQualityLevels: function (itemType) {
			switch (itemType) {
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
					return true;
				default:
					return false;
			}
		},

		canBeUpgraded: function (itemVO) {
			if (!ItemConstants.hasItemTypeQualityLevels(itemVO.type)) return false;
			let quality = ItemConstants.getItemQuality(itemVO);
			if (quality == ItemConstants.itemQuality.high) return false;

			return true;
		},
		
		// returns 1 if given new item is better than the old item, 0 if the same or depends on bonus type, -1 if worse
		getEquipmentComparison: function (itemOld, itemNew) {
			if (!itemNew && !itemOld) return 0;
			if (!itemNew) return -1;
			if (!itemOld) return 1;
			if (itemNew.id === itemOld.id && itemNew.broken && itemOld.broken) return 0;
			
			let getItemCacheId = function (itemVO) { return itemVO.id + (itemVO.broken ? "b" : "") + itemVO.level; }
			let cacheId = getItemCacheId(itemOld) + "--" + getItemCacheId(itemNew);
			
			if (this.equipmentComparisonCache[cacheId]) {
				return this.equipmentComparisonCache[cacheId];
			}
			
			let result = 0;
			for (var bonusKey in ItemConstants.itemBonusTypes) {
				var bonusType = ItemConstants.itemBonusTypes[bonusKey];
				var currentBonus = ItemConstants.getItemBonusComparisonValue(itemOld, bonusType);
				var newBonus = ItemConstants.getItemBonusComparisonValue(itemNew, bonusType);
				
				// TODO take speed inco account, but only together with damage
				if (bonusType == ItemConstants.itemBonusTypes.fight_speed) {
					continue;
				}
				if (currentBonus == newBonus) {
					continue;
				}
				if (newBonus < currentBonus) {
					if (result > 0) return 0;
					result = -1;
				} else if (newBonus > currentBonus) {
					if (result < 0) return 0;
					result = 1;
				}
			}
			
			if (result == 0 && itemOld.broken && !itemNew.broken) result = 1;
			if (result == 0 && !itemOld.broken && itemNew.broken) result = -1;
			
			this.equipmentComparisonCache[cacheId] = result;
			
			return result;
		},
		
		getItemBonusComparisonValue: function (item, bonusType) {
			if (!item) return 0;
			if (!bonusType) {
				let result = 0;
				for (let bonusKey in ItemConstants.itemBonusTypes) {
					bonusType = ItemConstants.itemBonusTypes[bonusKey];
					result += this.getItemBonusComparisonValue(item, bonusType)
				}
				return result;
			}
			let result = ItemConstants.getCurrentBonus(item, bonusType);
			if (!ItemConstants.isIncreasing(bonusType)) {
				result = 1 - result;
			}
			if (bonusType == ItemConstants.itemBonusTypes.fight_att) {
				result = result * ItemConstants.getCurrentBonus(item, ItemConstants.itemBonusTypes.fight_speed);
			}
			return result;
		},
		
		getIngredientsToCraftMany: function (items) {
			let result = [];
			var getResultEntry = function (id) {
				for (let i = 0; i < result.length; i++) {
					if (result[i].id == id) return result[i];
				}
				var newEntry = { id: id, amount: 0 };
				result.push(newEntry);
				return newEntry;
			};
			for (let i = 0; i < items.length; i++) {
				var item = items[i];
				if (!item.craftable) continue;
				var itemIngredients = this.getIngredientsToCraft(item.id);
				if (!itemIngredients || itemIngredients.length < 1) continue;
				for (let j = 0; j < itemIngredients.length; j++) {
					var itemEntry = itemIngredients[j];
					var resultEntry = getResultEntry(itemEntry.id);
					resultEntry.amount = resultEntry.amount + itemEntry.amount;
				}
			}
			
			result.sort(function (a, b) {
				return b.amount - a.amount;
			});
			
			return result;
		},
		
		getIngredientsToCraft: function (itemID) {
			var craftAction = "craft_" + itemID;
			var costs = PlayerActionConstants.costs[craftAction];
			let result = [];
			if (!costs) return result;
			for (var key in costs) {
				if (key.startsWith("item_res_")) {
					result.push({ id: key.replace("item_", ""), amount: costs[key] });
				}
			}
			return result;
		},
		
		getResourcesToCraft: function (itemID) {
			var craftAction = "craft_" + itemID;
			var costs = PlayerActionConstants.costs[craftAction];
			let result = [];
			if (!costs) return result;
			for (var key in costs) {
				if (key.startsWith("resource_")) {
					result.push({ id: key.replace("resource_", ""), amount: costs[key] });
				}
			}
			return result;
		},
		
		getBag: function (campOrdinal) {
			let result = null;
			for (let i in this.itemDefinitions.bag) {
				let bag = this.itemDefinitions.bag[i];
				let requiredCampOrdinal = bag.requiredCampOrdinal;
				if (requiredCampOrdinal <= campOrdinal) {
					if (result == null || requiredCampOrdinal > result.requiredCampOrdinal) {
						result = bag;
					}
				}
			}
			return result;
		},
		
		getBagBonus: function (campOrdinal) {
			// takes only account bag and no explorer bonuses
			let bag = this.getBag(campOrdinal);
			if (!bag) {
				return ItemConstants.PLAYER_DEFAULT_STORAGE;
			}
			return bag.bonus.bonuses.bag || ItemConstants.PLAYER_DEFAULT_STORAGE;
		},
		
		getRandomShoes: function (campOrdinal) {
			if (campOrdinal < this.itemDefinitions.shoes[1].requiredCampOrdinal) {
				return this.itemDefinitions.shoes[0];
			}
			if (campOrdinal < this.itemDefinitions.shoes[2].requiredCampOrdinal) {
				return this.itemDefinitions.shoes[Math.floor(2 * Math.random())];
			}
			return this.itemDefinitions.shoes[Math.floor(3 * Math.random())];
		},
		
		getAvailableMetalCaches: function (campOrdinal) {
			return this.getAvailableCaches("cache_metal", campOrdinal);
		},
		
		getAvailableInsightCaches: function (campOrdinal) {
			return this.getAvailableCaches("cache_insight", campOrdinal);
		},
		
		getAvailableCaches: function (cacheType, campOrdinal) {
			let result = [];
			for (let type in this.itemDefinitions ) {
				for (let i in this.itemDefinitions[type]) {
					let item = this.itemDefinitions[type][i];
					if (item.id.indexOf(cacheType) == 0) {
						if (item.requiredCampOrdinal && item.requiredCampOrdinal > campOrdinal) continue;
						if (item.maximumCampOrdinal && item.maximumCampOrdinal < campOrdinal) continue;
						result.push(item.id);
					}
				}
			}
			return result;
		},
		
		getInsightForCache: function (itemConfig) {
			if (!itemConfig) return 0;
			if (itemConfig.configData && (itemConfig.configData.insightValue || itemConfig.configData.insightValue == 0)) {
				return itemConfig.configData.insightValue;
			}
			
			let level = itemConfig.level || 1;
			return Math.pow(level, 2);
		},
		
		getIngredient: function (i) {
			let index = i || (this.itemDefinitions.ingredient.length) * Math.random();
			index = index % this.itemDefinitions.ingredient.length;
			return this.itemDefinitions.ingredient[parseInt(index)];
		},
		
		isQuicklyObsoletable: function (category) {
			let t = ItemConstants.itemTypes[category] || category;
			switch (t) {
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
					return true;
				default:
					return false;
			}
		},
		
		isObsoletable: function (category) {
			let t = ItemConstants.itemTypes[category] || category;
			switch (t) {
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
				case ItemConstants.itemTypes.light:
				case ItemConstants.itemTypes.bag:
					return true;
				default:
					return false;
			}
		},

		isUnselectable: function (item) {
			let baseItemId = ItemConstants.getBaseItemID(item.id);
			if (item.type == ItemConstants.itemTypes.uniqueEquipment) return false;
			if (item.isStoryItem) return false;
			if (baseItemId == "cache_insight") return false;
			if (baseItemId == "robot_1") return false;
			return true;
		},
	};
	
	ItemConstants.init();
	ItemConstants.loadData(ItemData);
	
	return ItemConstants;

});
