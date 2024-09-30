define(['ash',
	'utils/MathUtils',
	'game/vos/ExplorerVO',
	'game/vos/LocaleVO',
	'game/constants/CultureConstants',
	'game/constants/ItemConstants',
	'game/constants/WorldConstants'
], function (Ash,
	MathUtils,
	ExplorerVO,
	LocaleVO,
	CultureConstants,
	ItemConstants,
	WorldConstants
) {
	
	let ExplorerConstants = {
		
		FIRST_EXPLORER_CAMP_ORDINAL: 2,
		
		explorerType: {
			FIGHTER: "fighter",
			SCOUT: "scout",
			SCAVENGER: "scavenger",
		},
		
		abilityType: {
			// fighter
			ATTACK: "attack",
			DEFENCE: "defence",
			// scout
			COST_MOVEMENT: "cost_movement",
			COST_SCAVENGE: "cost_scavenge",
			COST_SCOUT: "cost_scout",
			DETECT_SUPPLIES: "detect_supplies",
			DETECT_INGREDIENTS: "detect_ingredients",
			DETECT_HAZARDS: "detect_hazards",
			// scavenger
			SCAVENGE_GENERAL: "scavenge_general",
			SCAVENGE_INGREDIENTS: "scavenge_ingredients",
			SCAVENGE_SUPPLIES: "scavenge_supplies",
			SCAVENGE_CAPACITY: "scavenge_capacity",
		},
		
		// in order of rarity
		animalType: {
			DOG: "dog",
			MULE: "mule",
			BAT: "bat",
			RAVEN: "raven",
			OLM: "olm",
		},
		
		explorerSource: {
			SCOUT: "scout",
			EVENT: "event"
		},
		
		MAX_ABILITY_LEVEL: 100,
		MAX_EXPLORERS_BASE: 1,
		
		// camp ordinal -> blueprint
		predefinedExplorers: {
			2: { id: 2, localeType: localeTypes.maintenance, abilityType: "attack", name: "Ilma", icon: "img/followers/explorer_black_f.png" },
			4: { id: 4, localeType: localeTypes.warehouse, abilityType: "scavenge_capacity", name: "Dog", icon: "img/followers/explorer_animal_dog.png" },
			8: { id: 8, localeType: localeTypes.hermit, abilityType: "scavenge_supplies", name: "Zory", icon: "img/followers/explorer_blue_m.png" },
			10: { id: 10, localeType: localeTypes.market, abilityType: "cost_scout", name: "Erdene", icon: "img/followers/explorer_green_m.png" },
			14: { id: 14, localeType: localeTypes.library, abilityType: "scavenge_ingredients", name: "Arushi", icon: "img/followers/explorer_yellow_f.png" },
		},
		
		icons: [
			// fighter
			{ icon: "img/followers/explorer_black_f.png", explorerType: "fighter", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/explorer_black_m.png", explorerType: "fighter" },
			{ icon: "img/followers/explorer_red_f.png", explorerType: "fighter", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/explorer_red_m.png", explorerType: "fighter" },
			{ icon: "img/followers/explorer_white_f.png", explorerType: "fighter", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/explorer_white_m.png", explorerType: "fighter" },
			// scout
			{ icon: "img/followers/explorer_gray_f.png", explorerType: "scout", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/explorer_gray_m.png", explorerType: "scout" },
			{ icon: "img/followers/explorer_green_f.png", explorerType: "scout", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/explorer_green_m.png", explorerType: "scout" },
			// scavenger
			{ icon: "img/followers/explorer_blue_m.png", explorerType: "scavenger" },
			{ icon: "img/followers/explorer_pink_f.png", explorerType: "scavenger", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/explorer_yellow_f.png", explorerType: "scavenger", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/explorer_yellow_m.png", explorerType: "scavenger" },
		],
		
		getMaxExplorersRecruited: function (innMajorLevels) {
			let result = ExplorerConstants.MAX_EXPLORERS_BASE;
			for (let i = 0; i < innMajorLevels.length; i++) {
				result += Math.max(0, innMajorLevels[i]);
			}
			return result;
		},
		
		getMaxExplorersInParty: function () {
			return Object.keys(ExplorerConstants.explorerType).length;
		},
		
		getTypicalFighter: function (campOrdinal, step) {
			let source = ExplorerConstants.explorerSource.EVENT;
			let abilityType = ExplorerConstants.abilityType.ATTACK;
			return ExplorerConstants.getNewRandomExplorer(source, campOrdinal, campOrdinal, abilityType, 0.5);
		},
		
		getNewRandomExplorer: function (source, campOrdinal, appearLevel, forcedAbilityType, forcedAbilityLevelRandomFactor) {
			campOrdinal = campOrdinal || 1;
			
			let id = 100 + Math.floor(Math.random() * 100000);
			
			let abilityType = forcedAbilityType;
			if (!abilityType) {
				let availableAbilityTypes = this.getAvailableAbilityTypes(source, campOrdinal);
				abilityType = availableAbilityTypes[Math.floor(Math.random() * availableAbilityTypes.length)];
			}
			
			let abilityLevel = this.getRandomAbilityLevelByCampOrdinal(abilityType, campOrdinal, forcedAbilityLevelRandomFactor);
			
			let name = "";
			let icon = "";
			
			let isAnimal = this.isAnimal(abilityType);
			
			let gender = CultureConstants.getRandomGender();
			if (isAnimal) {
				let animalKeys = this.getAvailableAnimalTypes(source, campOrdinal);
				let animalType = ExplorerConstants.animalType[animalKeys[MathUtils.getWeightedRandom(0, animalKeys.length)]];
				name = this.getRandomAnimalName(animalType);
				icon = this.getRandomAnimalIcon(animalType);
			} else {
				let origin = CultureConstants.getRandomOrigin(appearLevel);
				let culturalHeritage = CultureConstants.getRandomCultures(MathUtils.randomIntBetween(0, 3), origin);
				name = CultureConstants.getRandomShortName(gender, origin, culturalHeritage);
				icon = this.getRandomIcon(gender, abilityType);
			}
			
			return new ExplorerVO(id, name, abilityType, abilityLevel, icon, gender, source);
		},
		
		getNewPredefinedExplorer: function (explorerID) {
			let template = null;
			let templateCampOrdinal = 1;
			for (let campOrdinal in this.predefinedExplorers) {
				let t = this.predefinedExplorers[campOrdinal];
				if (t.id == explorerID) {
					template = t;
					templateCampOrdinal = campOrdinal;
					break;
				}
			}
			
			if (!template) {
				log.w("couldn't find template for predefined explorer id:" + explorerID);
				return null;
			}
			
			let abilityLevel = this.getRandomAbilityLevelByCampOrdinal(template.abilityType, templateCampOrdinal);
			
			return new ExplorerVO(explorerID, template.name, template.abilityType, abilityLevel, template.icon, template.gender, ExplorerConstants.explorerSource.SCOUT);
		},
		
		getRandomAbilityLevelByCampOrdinal: function (abilityType, campOrdinal, forcedAbilityLevelRandomFactor) {
			campOrdinal = parseInt(campOrdinal);
			let minCampOrdinal = Math.min(campOrdinal, this.getUnlockCampOrdinal(abilityType));
			let maxCampOrdinal = WorldConstants.CAMPS_TOTAL;
			
			let variation = campOrdinal >= 3 ? 1 : 0.5;
			let minAbilityLevel = MathUtils.map(campOrdinal - variation, minCampOrdinal - 1, maxCampOrdinal + 1, 1, 100);
			let maxAbilityLevel = MathUtils.map(campOrdinal + variation, minCampOrdinal - 1, maxCampOrdinal + 1, 1, 100);
			let abilityLevel = MathUtils.randomIntBetween(minAbilityLevel, maxAbilityLevel);
			
			if (forcedAbilityLevelRandomFactor) {
				abilityLevel = MathUtils.intBetween(forcedAbilityLevelRandomFactor, minAbilityLevel, maxAbilityLevel);
			}
			
			return abilityLevel;
		},
		
		getRecruitCost: function (explorer, isFoundAsReward) {
			if (isFoundAsReward) return {};
			let result = {};
			
			let costFactor = MathUtils.map(explorer.abilityLevel, 1, 100, 1.0, 5.0);
			let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
			let isAnimal = this.isAnimal(explorer.abilityType);
			let isHungry = explorerType != ExplorerConstants.explorerType.SCAVENGER && explorer.id % 3 == 0;
			let isStranded = explorerType != ExplorerConstants.explorerType.FIGHTER && explorer.id % 5 == 1;
			let isInjured = explorer.id % 7 == 1
			
			if (isAnimal || isHungry) {
				result.resource_food = MathUtils.roundToMultiple(100 * costFactor, 5);
				result.resource_water = MathUtils.roundToMultiple(50 * costFactor, 5);
			} else if (isInjured) {
				result.resource_medicine = MathUtils.roundToMultiple(3 * costFactor, 1);
			} else if (isStranded) {
				result.resource_fuel = MathUtils.roundToMultiple(20 * costFactor, 5);
			} else {
				result.silver = Math.round(1 * costFactor);
			}
			
			return result;
		},
		
		getAvailableAbilityTypes: function (source, campOrdinal) {
			let result = [];
			
			for (let k in ExplorerConstants.abilityType) {
				let abilityType = ExplorerConstants.abilityType[k];
				let unlockCampOrdinal = this.getUnlockCampOrdinal(abilityType);
				if (unlockCampOrdinal <= campOrdinal) {
					result.push(abilityType);
				}
			}
			
			return result;
		},
		
		getAvailableAnimalTypes: function (source, campOrdinal) {
			let result = Object.keys(ExplorerConstants.animalType);
			if (campOrdinal < 8) {
				result.splice(result.indexOf(this.animalType.RAVEN), 1);
			}
			if (campOrdinal > 8) {
				result.splice(result.indexOf(this.animalType.OLM), 1);
			}
			if (campOrdinal > 13) {
				result.splice(result.indexOf(this.animalType.BAT), 1);
			}
			return result;
		},
		
		getUnlockCampOrdinal: function (abilityType) {
			let firstExplorerCampOrdinal = ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL;
			
			switch (abilityType) {
				// fighter
				case ExplorerConstants.abilityType.ATTACK:
				case ExplorerConstants.abilityType.DEFENCE:
					return firstExplorerCampOrdinal;
				// scout
				case ExplorerConstants.abilityType.COST_SCOUT:
					return firstExplorerCampOrdinal + 1;
				case ExplorerConstants.abilityType.COST_SCAVENGE:
					return firstExplorerCampOrdinal + 2;
				case ExplorerConstants.abilityType.DETECT_HAZARDS:
				case ExplorerConstants.abilityType.DETECT_SUPPLIES:
				case ExplorerConstants.abilityType.DETECT_INGREDIENTS:
					return firstExplorerCampOrdinal + 3;
				case ExplorerConstants.abilityType.COST_MOVEMENT:
					return WorldConstants.CAMP_ORDINAL_GROUND + 4;
				// scavenger
				case ExplorerConstants.abilityType.SCAVENGE_INGREDIENTS:
					return firstExplorerCampOrdinal + 4;
				case ExplorerConstants.abilityType.SCAVENGE_SUPPLIES:
					return WorldConstants.CAMP_ORDINAL_GROUND;
				case ExplorerConstants.abilityType.SCAVENGE_CAPACITY:
					return WorldConstants.CAMP_ORDINAL_GROUND + 2;
				case ExplorerConstants.abilityType.SCAVENGE_GENERAL:
					return WorldConstants.CAMP_ORDINAL_GROUND + 3;
				default:
				 	log.w("no unlock camp ordinal defined for Explorer ability type: " + abilityType);
					return 1;
			}
		},
		
		getRandomAnimalName: function (animalType) {
			switch (animalType) {
				case ExplorerConstants.animalType.DOG:
					return "dog";
				case ExplorerConstants.animalType.MULE:
					return "mule";
				case ExplorerConstants.animalType.BAT:
					return "giant bat";
				case ExplorerConstants.animalType.OLM:
					return "giant olm";
				case ExplorerConstants.animalType.RAVEN:
					return "raven";
				default:
					return "monitor lizard";
			}
		},
		
		getRandomAnimalIcon: function (animalType) {
			switch (animalType) {
				case ExplorerConstants.animalType.DOG:
					return "img/explorers/explorer_animal_dog.png";
				case ExplorerConstants.animalType.RAVEN:
					return "img/explorers/explorer_animal_bird.png";
				case ExplorerConstants.animalType.BAT:
					return "img/explorers/explorer_animal_bat.png";
				default:
					return "img/explorers/explorer_animal_generic.png";
			}
		},
		
		getRandomIcon: function (gender, abilityType) {
			var validIcons = [];
			let explorerType = this.getExplorerTypeForAbilityType(abilityType);
			for (let i = 0; i < this.icons.length; i++) {
				let iconDef = this.icons[i];
				if (this.isValidIcon(iconDef, gender, explorerType)) validIcons.push(iconDef);
			}
			return validIcons[Math.floor(Math.random() * validIcons.length)].icon;
		},
		
		isValidIcon: function (iconDef, gender, explorerType) {
			if (!iconDef.icon) return false;
			if (iconDef.gender && gender && gender != iconDef.gender) return false;
			if (iconDef.explorerType && explorerType && explorerType != iconDef.explorerType) return false;
			return true;
		},
		
		getExplorerTypeForAbilityType: function (abilityType) {
			switch (abilityType) {
				case this.abilityType.ATTACK: return this.explorerType.FIGHTER;
				case this.abilityType.DEFENCE: return this.explorerType.FIGHTER;
				case this.abilityType.COST_MOVEMENT: return this.explorerType.SCOUT;
				case this.abilityType.COST_SCAVENGE: return this.explorerType.SCOUT;
				case this.abilityType.COST_SCOUT: return this.explorerType.SCOUT;
				case this.abilityType.DETECT_SUPPLIES: return this.explorerType.SCOUT;
				case this.abilityType.DETECT_INGREDIENTS: return this.explorerType.SCOUT;
				case this.abilityType.DETECT_HAZARDS: return this.explorerType.SCOUT;
				case this.abilityType.SCAVENGE_GENERAL: return this.explorerType.SCAVENGER;
				case this.abilityType.SCAVENGE_INGREDIENTS: return this.explorerType.SCAVENGER;
				case this.abilityType.SCAVENGE_SUPPLIES: return this.explorerType.SCAVENGER;
				case this.abilityType.SCAVENGE_CAPACITY: return this.explorerType.SCAVENGER;
				default:
					log.w("no explorerType defined for abilityType: " + abilityType);
					return this.explorerType.SCOUT;
			}
		},
		
		getAbilityTypeDisplayName: function (abilityType) {
			switch (abilityType) {
				case this.abilityType.ATTACK: return "attack";
				case this.abilityType.DEFENCE: return "defence";
				case this.abilityType.COST_MOVEMENT: return "trekking";
				case this.abilityType.COST_SCAVENGE: return "scouring";
				case this.abilityType.COST_SCOUT: return "scouting";
				case this.abilityType.DETECT_HAZARDS: return "surveying (hazards)";
				case this.abilityType.DETECT_SUPPLIES: return "surveying (supplies)";
				case this.abilityType.DETECT_INGREDIENTS: return "surveying (ingredients)";
				case this.abilityType.SCAVENGE_GENERAL: return "scavenging (general)";
				case this.abilityType.SCAVENGE_INGREDIENTS: return "scavenging (ingredients)";
				case this.abilityType.SCAVENGE_SUPPLIES: return "scavenging (supplies)";
				case this.abilityType.SCAVENGE_CAPACITY: return "pack animal";
				default:
					log.w("no display name defined for abilityType: " + abilityType);
					return abilityType;
			}
		},
		
		getExplorerTypeDisplayName: function (explorerType) {
			switch (explorerType) {
				case this.explorerType.FIGHTER: return "fighter";
				case this.explorerType.SCOUT: return "scout";
				case this.explorerType.SCAVENGER: return "scavenger";
				default:
					log.w("no display name defined for explorer type: " + type);
					return "";
			}
		},
		
		getTotalItemBonus: function (explorer) {
			let total = 0;
			for (let bonusKey in ItemConstants.itemBonusTypes) {
				let bonusType = ItemConstants.itemBonusTypes[bonusKey];
				let value = this.getExplorerItemBonus(explorer, bonusType);
				if (ItemConstants.isIncreasing(bonusType)) {
					total += value;
				} else {
					total -= value;
				}
			}
			return total;
		},
		
		getExplorerItemBonus: function (explorer, itemBonusType) {
			let roundingStep = 1;
			let abilityLevel = 0;
			let minBonus = 0;
			let maxBonus = 0;
			
			switch (itemBonusType) {
				case ItemConstants.itemBonusTypes.fight_att:
					abilityLevel = Math.max(
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.ATTACK),
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DEFENCE) * 0.7,
					);
					minBonus = 3;
					maxBonus = 81;
					roundingStep = 3;
					break;
				case ItemConstants.itemBonusTypes.fight_def:
					abilityLevel = Math.max(
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DEFENCE),
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.ATTACK) * 0.7,
					);
					minBonus = 3;
					maxBonus = 81;
					roundingStep = 3;
					break;
				case ItemConstants.itemBonusTypes.movement:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.COST_MOVEMENT);
					minBonus = 0.9;
					maxBonus = 0.7;
					roundingStep = 0.1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_cost:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.COST_SCAVENGE);
					minBonus = 0.6;
					maxBonus = 0.3;
					roundingStep = 0.3;
					break;
				case ItemConstants.itemBonusTypes.scout_cost:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.COST_SCOUT);
					minBonus = 0.9;
					maxBonus = 0.6;
					roundingStep = 0.15;
					break;
				case ItemConstants.itemBonusTypes.detect_hazards:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DETECT_HAZARDS);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.detect_supplies:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DETECT_SUPPLIES);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.detect_ingredients:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DETECT_INGREDIENTS);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_general:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_GENERAL);
					minBonus = 1.025;
					maxBonus = 1.2;
					roundingStep = 0.025;
					break;
				case ItemConstants.itemBonusTypes.scavenge_ingredients:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_INGREDIENTS);
					minBonus = 1.05;
					maxBonus = 1.35;
					roundingStep = 0.05;
					break;
				case ItemConstants.itemBonusTypes.scavenge_supplies:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_SUPPLIES);
					minBonus = 1.05;
					maxBonus = 1.35;
					roundingStep = 0.05;
					break;
				case ItemConstants.itemBonusTypes.bag:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_CAPACITY);
					minBonus = 5;
					maxBonus = 20;
					roundingStep = 5;
					break;
				
				case ItemConstants.itemBonusTypes.fight_speed:
				case ItemConstants.itemBonusTypes.fight_shield:
				case ItemConstants.itemBonusTypes.light:
				case ItemConstants.itemBonusTypes.shade:
				case ItemConstants.itemBonusTypes.res_cold:
				case ItemConstants.itemBonusTypes.res_radiation:
				case ItemConstants.itemBonusTypes.res_poison:
				case ItemConstants.itemBonusTypes.res_water:
					return 0;
					
				default:
					log.w("no explorer item bonus defined for item bonus type: " + itemBonusType);
					break;
			}
			
			if (abilityLevel == 0) return 0;
			
			let rawValue = MathUtils.map(abilityLevel, 1, 100, minBonus, maxBonus);
			
			return MathUtils.roundToMultiple(rawValue, roundingStep);
		},
		
		isAnimal: function (abilityType) {
			return abilityType == ExplorerConstants.abilityType.SCAVENGE_CAPACITY;
		},
		
		isComparableAbilityTypes: function (a, b) {
			if (a == b) return true;
			
			let isFighter = function (t) { return t == ExplorerConstants.abilityType.ATTACK || t == ExplorerConstants.abilityType.DEFENCE; }
			
			if (isFighter(a) && isFighter(b)) return true;
			
			return false;
		},
		
		getPronoun: function (explorer) {
			if (this.isAnimal(explorer.abilityType)) return "it";
			if (explorer.gender == CultureConstants.genders.FEMALE) return "she";
			if (explorer.gender == CultureConstants.genders.MALE) return "he";
			return "they";
		},
		
		getAbilityLevel: function (explorer, abilityType) {
			if (explorer.abilityType == abilityType) {
				return explorer.abilityLevel;
			}
			
			return 0;
		}
	};
	
	return ExplorerConstants;
	
});
