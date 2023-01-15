define([
	'ash',
	'game/constants/PlayerActionConstants', 'game/constants/ItemConstants', 'game/constants/UpgradeConstants', 'game/constants/BagConstants', 'game/constants/WorldConstants',
	'game/vos/TradingPartnerVO', 'game/vos/IncomingCaravanVO', 'game/vos/ResourcesVO', 'game/vos/ResultVO'],
function (Ash, PlayerActionConstants, ItemConstants, UpgradeConstants, BagConstants, WorldConstants, TradingPartnerVO, IncomingCaravanVO, ResourcesVO, ResultVO) {
	
	var TradeConstants = {
		
		MIN_OUTGOING_CARAVAN_RES: 50,
		
		GOOD_TYPE_NAME_CURRENCY: "currency",
		GOOD_TYPE_NAME_INGREDIENTS: "ingredients",
		
		VALUE_INGREDIENTS: 0.1,
		VALUE_MARKUP_INCOMING_CARAVANS: 0.15,
		VALUE_MARKUP_OUTGOING_CARAVANS_INGREDIENTS: 0.5,
		VALUE_DISCOUNT_CAMP_ITEMS: 0.25,
		
		MAX_ITEMS_TO_TRADE_PER_CARAVAN: 10,
		
		TRADING_PARTNERS: [
			new TradingPartnerVO(3, "Bone Crossing", [resourceNames.rope], [resourceNames.metal], false, true, [ "weapon" ], [ "weapon", "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head", "exploration" ]),
			new TradingPartnerVO(4, "Slugger Town", [resourceNames.food], [resourceNames.metal], false, true, [], ["exploration", "shoes" ]),
			new TradingPartnerVO(6, "Old Waterworks", [resourceNames.fuel], [], true, false, [], [ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head" ]),
			new TradingPartnerVO(7, "Mill Road Academy", [resourceNames.water, resourceNames.food], [resourceNames.metal], true, false, [], [ "weapon", "artefact" ]),
			new TradingPartnerVO(10, "Pinewood", [resourceNames.medicine, resourceNames.herbs, resourceNames.rubber], [], true, false, [], [ "artefact", "exploration" ]),
			new TradingPartnerVO(12, "Highgate", [resourceNames.tools], [resourceNames.metal], true, false, [], [ "clothing_over", "clothing_upper", "clothing_lower", "clothing_hands", "clothing_head" ]),
			new TradingPartnerVO(14, "Factory 32", [resourceNames.concrete], [resourceNames.metal], true, false, [], [ "exploration" ]),
		],
		
		getTradePartner: function (campOrdinal) {
			for (let i = 0; i < this.TRADING_PARTNERS.length; i++) {
				if (this.TRADING_PARTNERS[i].campOrdinal === campOrdinal)
					return this.TRADING_PARTNERS[i];
			}
			return null;
		},
		
		getRandomTradePartner: function (campOrdinal) {
			var options = this.getValidTradePartners(campOrdinal);
			return options[Math.floor(Math.random() * options.length)];
		},
		
		getValidTradePartners: function (campOrdinal) {
			let result = [];
			for (let i = 0; i < this.TRADING_PARTNERS.length; i++) {
				let tradePartnerCampOrdinal = this.TRADING_PARTNERS[i].campOrdinal;
				if (campOrdinal <= WorldConstants.CAMP_ORDINAL_GROUND && tradePartnerCampOrdinal > WorldConstants.CAMP_ORDINAL_GROUND)
					continue;
				if (campOrdinal > WorldConstants.CAMP_ORDINAL_GROUND && tradePartnerCampOrdinal <= WorldConstants.CAMP_ORDINAL_GROUND)
					continue;
				if (tradePartnerCampOrdinal > campOrdinal + 1)
					continue;
				if (tradePartnerCampOrdinal < campOrdinal - 5)
					continue;
				
				result.push(this.TRADING_PARTNERS[i]);
			}
			return result;
		},
		
		makeResultVO: function (outgoingCaravan) {
			let result = new ResultVO("send_camp");
			var amountTraded = TradeConstants.getAmountTraded(outgoingCaravan.buyGood, outgoingCaravan.sellGood, outgoingCaravan.sellAmount);
			if (amountTraded > outgoingCaravan.capacity) {
				amountTraded = outgoingCaravan.capacity;
			}
			if (isResource(outgoingCaravan.buyGood)) {
				result.gainedResources.setResource(outgoingCaravan.buyGood, amountTraded);
			} else if (outgoingCaravan.buyGood === TradeConstants.GOOD_TYPE_NAME_CURRENCY) {
				result.gainedCurrency = amountTraded;
			} else if (outgoingCaravan.buyGood === TradeConstants.GOOD_TYPE_NAME_INGREDIENTS) {
				var numIngredients = Math.min(amountTraded, Math.floor(Math.random() * 3) + 1);
				var amountLeft = amountTraded;
				for (let i = 0; i < numIngredients; i++) {
					var ingredient = ItemConstants.getIngredient();
					var max = amountLeft;
					var min = Math.min(amountLeft, 1);
					var amount = Math.floor(Math.random() * max) + min;
					for (let j = 0; j < amount; j++) {
						result.gainedItems.push(ingredient.clone());
					}
					amountLeft -= amount;
				}
			} else {
				log.w("Unknown buy good: " + outgoingCaravan.buyGood);
			}
			result.selectedItems = result.gainedItems;
			result.selectedResources = result.gainedResources;
			return result;
		},
		
		getAmountTraded: function (buyGood, sellGood, sellAmount) {
			var amountGet = 0;
			var valueSell = TradeConstants.getResourceValue(sellGood) * sellAmount;
			if (isResource(buyGood)) {
				amountGet = valueSell / TradeConstants.getResourceValue(buyGood);
			} else if (buyGood === TradeConstants.GOOD_TYPE_NAME_CURRENCY) {
				amountGet = valueSell;
			} else if (buyGood === TradeConstants.GOOD_TYPE_NAME_INGREDIENTS) {
				amountGet = valueSell / TradeConstants.VALUE_INGREDIENTS * (1 - TradeConstants.VALUE_MARKUP_OUTGOING_CARAVANS_INGREDIENTS);
			} else {
				log.w("Unknown buy good: " + buyGood);
			}
			amountGet = Math.floor(amountGet+0.001);
			return amountGet;
		},
		
		getRequiredCapacity: function (good, amount) {
			if (isResource(good)) {
				return BagConstants.getResourceCapacity(good) * amount;
			} else if (good === TradeConstants.GOOD_TYPE_NAME_CURRENCY) {
				return BagConstants.CAPACITY_CURRENCY * amount;
			} else if (good === TradeConstants.GOOD_TYPE_NAME_INGREDIENTS) {
				return BagConstants.CAPACITY_ITEM_INGREDIENT * amount;
			} else {
				log.w("Unknown good: " + good);
				return 0;
			}
		},
		
		getResourceValue: function (name, isTrader) {
			var value = 0;
			switch (name) {
				case resourceNames.water: value = 0.01; break;
				case resourceNames.food: value = 0.01; break;
				case resourceNames.metal: value = 0.01; break;
				
				case resourceNames.rope: value = 0.015; break;
				case resourceNames.fuel: value = 0.02; break;

				case resourceNames.medicine: value = 0.05; break;
				case resourceNames.tools: value = 0.05; break;
				case resourceNames.concrete: value = 0.05; break;
				
				case resourceNames.rubber: value = 0.05; break;
				case resourceNames.herbs: value = 0.05; break;
				
				case resourceNames.robots: value = 0.1; break;
			}
			if (isTrader)
				value = value + value * TradeConstants.VALUE_MARKUP_INCOMING_CARAVANS;
				
			value = Math.round(value * 1000) / 1000;
				
			return value;
		},
		
		getItemValue: function (item, isTrader, isUsed) {
			if (item.broken) return 0;
			let value = this.getItemBaseValue(item, isTrader);
		
			if (value > 0) {
				value = Math.max(value, TradeConstants.VALUE_INGREDIENTS);
			}
			
			if (isTrader)
				value = value + value * TradeConstants.VALUE_MARKUP_INCOMING_CARAVANS;
			else if (isUsed)
				value = value - value * TradeConstants.VALUE_DISCOUNT_CAMP_ITEMS;
			
			if (value > 1)
				value = Math.round(value * 10) / 10;
			else
				value = Math.round(value * 100) / 100;
				
			return value;
		},
		
		getItemBaseValue: function (item, isTrader) {
			if (item.tradePrice) return item.tradePrice;
			switch (item.type) {
				case ItemConstants.itemTypes.light:
				case ItemConstants.itemTypes.weapon:
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
				case ItemConstants.itemTypes.shoes:
				case ItemConstants.itemTypes.bag:
				case ItemConstants.itemTypes.exploration:
					let valueBonuses = this.getItemValueByBonuses(item);
					let valueRarity = this.getItemValueByRarity(item);
					if (item.craftable) {
						let valueIngredients = this.getItemValueByCraftingIngredients(item);
						if (isTrader) {
							return this.getMaxValue(valueBonuses, valueRarity, valueIngredients);
						} else {
							return this.getMinValue(valueBonuses, valueRarity, valueIngredients);
						}
					} else {
						if (isTrader) {
							return this.getMaxValue(valueBonuses, valueRarity);
						} else {
							return this.getMinValue(valueBonuses, valueRarity);
						}
					}
					
				case ItemConstants.itemTypes.ingredient:
					return TradeConstants.VALUE_INGREDIENTS;
					
				case ItemConstants.itemTypes.artefact:
					return this.getItemValueByRarity(item) || 0;
					
				case ItemConstants.itemTypes.trade:
					return this.getItemValueByRarity(item) || 0;
					
				case ItemConstants.itemTypes.voucher:
				case ItemConstants.itemTypes.uniqueEquipment:
				case ItemConstants.itemTypes.note:
					return 0;
			}
			
			return 0;
		},
		
		getItemValueByBonuses: function (item) {
			switch (item.type) {
				case ItemConstants.itemTypes.light:
					var lightBonus = item.getBaseTotalBonus(ItemConstants.itemBonusTypes.light);
					if (lightBonus <= 25)
						return 0.1;
					else
						return (lightBonus - 10) / 30;
					
				case ItemConstants.itemTypes.weapon:
					var attackBonus = item.getBaseTotalBonus(ItemConstants.itemBonusTypes.fight_att);
					if (attackBonus <= 3)
						return 0.1;
					else
						return attackBonus / 5;
					
				case ItemConstants.itemTypes.clothing_over:
				case ItemConstants.itemTypes.clothing_upper:
				case ItemConstants.itemTypes.clothing_lower:
				case ItemConstants.itemTypes.clothing_hands:
				case ItemConstants.itemTypes.clothing_head:
					return Math.max(0.1, (item.getBaseTotalBonus() / 12));
					
				case ItemConstants.itemTypes.shoes:
					var shoeBonus = 1 - item.getBaseBonus(ItemConstants.itemBonusTypes.movement);
					var otherBonus = item.getBaseTotalBonus() - shoeBonus;
					return Math.pow(((shoeBonus) * 5), 2) + otherBonus / 10;
					
				case ItemConstants.itemTypes.bag:
					return Math.pow(((item.getBaseTotalBonus() - 25) / 15), 1.75);
			}
			
			return null;
		},
		
		getItemValueByCraftingIngredients: function (item) {
			let craftAction = "craft_" + item.id;
			let costs = PlayerActionConstants.costs[craftAction];
			let result = costs ? 0.025 * Object.keys(costs).length : 0;
			
			let ingredients = ItemConstants.getIngredientsToCraft(item.id);
			for (let i = 0; i < ingredients.length; i++) {
				let def = ingredients[i];
				let ingredient = ItemConstants.getItemByID(def.id);
				result += def.amount * this.getItemValue(ingredient);
			}
			
			let resources = ItemConstants.getResourcesToCraft(item.id);
			for (let i = 0; i < resources.length; i++) {
				let def = resources[i];
				result += def.amount * this.getResourceValue(def.id);
			}
			
			return result;
		},
		
		getItemValueByRarity: function (item) {
			let rarity = -1;
			if (item.tradeRarity > 0) {
				rarity = item.tradeRarity;
			} else if (item.scavengeRarity > 0) {
				rarity = item.scavengeRarity;
			} else if (item.localeRarity > 0) {
				rarity = item.localeRarity;
			} else if (item.investigateRarity > 0) {
				rarity = item.investigateRarity;
			}
			
			if (rarity > 0) {
				return Math.ceil(rarity / 1.5);
			} else {
				return null;
			}
		},
		
		getBlueprintValue: function (upgradeID) {
			return UpgradeConstants.getBlueprintCampOrdinal(upgradeID) + 2;
		},
		
		getCaravanCapacity: function (stableLevel) {
			return 500 * stableLevel;
		},
		
		getMaxValue: function (...args) {
			let result = 0;
			for (let i = 0; i < args.length; i++) {
				let val = args[i];
				if (val !== null && val !== -1) {
					result = Math.max(result, val);
				}
			}
			return result;
		},
		
		getMinValue: function (...args) {
			let result = -1;
			for (let i = 0; i < args.length; i++) {
				let val = args[i];
				if (val !== null && val !== -1) {
					if (result < 0) {
						result = val;
					} else {
						result = Math.min(result, val);
					}
				}
			}
			return result;
		},
	
	};
	
	return TradeConstants;
	
});
