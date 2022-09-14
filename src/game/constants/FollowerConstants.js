define(['ash',
	'utils/MathUtils',
	'game/vos/FollowerVO',
	'game/constants/CultureConstants',
	'game/constants/ItemConstants',
	'game/constants/WorldConstants'
], function (Ash,
	MathUtils,
	FollowerVO,
	CultureConstants,
	ItemConstants,
	WorldConstants
) {
	
	var FollowerConstants = {
		
		FIRST_FOLLOWER_CAMP_ORDINAL: 2,
		
		followerType: {
			FIGHTER: "fighter",
			EXPLORER: "explorer",
			SCAVENGER: "scavenger",
		},
		
		abilityType: {
			// fighter
			ATTACK: "attack",
			DEFENCE: "defence",
			// explorer
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
		
		animalType: {
			DOG: "dog",
			MULE: "mule",
			BAT: "bat",
			OLM: "olm"
		},
		
		followerSource: {
			SCOUT: "scout",
			EVENT: "event"
		},
		
		MAX_ABILITY_LEVEL: 100,
		MAX_FOLLOWERS_BASE: 1,
		
		// camp ordinal -> blueprint
		predefinedFollowers: {
			2: { id: 2, localeType: localeTypes.maintenance, abilityType: "attack", name: "Ilma", icon: "img/followers/follower_black_f.png" },
			4: { id: 4, localeType: localeTypes.warehouse, abilityType: "scavenge_capacity", name: "Dog", icon: "img/followers/follower_animal_dog.png" },
			8: { id: 8, localeType: localeTypes.hermit, abilityType: "scavenge_supplies", name: "Zory", icon: "img/followers/follower_blue_m.png" },
			10: { id: 10, localeType: localeTypes.market, abilityType: "cost_scout", name: "Erdene", icon: "img/followers/follower_green_m.png" },
			14: { id: 14, localeType: localeTypes.library, abilityType: "scavenge_ingredients", name: "Arushi", icon: "img/followers/follower_yellow_f.png" },
		},
		
		icons: [
			// fighter
			{ icon: "img/followers/follower_black_f.png", followerType: "fighter", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/follower_black_m.png", followerType: "fighter" },
			{ icon: "img/followers/follower_red_f.png", followerType: "fighter", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/follower_red_m.png", followerType: "fighter" },
			{ icon: "img/followers/follower_white_f.png", followerType: "fighter", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/follower_white_m.png", followerType: "fighter" },
			// explorer
			{ icon: "img/followers/follower_gray_f.png", followerType: "explorer", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/follower_gray_m.png", followerType: "explorer" },
			{ icon: "img/followers/follower_green_f.png", followerType: "explorer", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/follower_green_m.png", followerType: "explorer" },
			// scavenger
			{ icon: "img/followers/follower_blue_m.png", followerType: "scavenger" },
			{ icon: "img/followers/follower_pink_f.png", followerType: "scavenger", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/follower_yellow_f.png", followerType: "scavenger", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/followers/follower_yellow_m.png", followerType: "scavenger" },
		],
		
		getMaxFollowersRecruited: function (innMajorLevels) {
			let result = FollowerConstants.MAX_FOLLOWERS_BASE;
			for (let i = 0; i < innMajorLevels.length; i++) {
				result += Math.max(0, innMajorLevels[i]);
			}
			return result;
		},
		
		getMaxFollowersInParty: function () {
			return Object.keys(FollowerConstants.followerType).length;
		},
		
		getTypicalFighter: function (campOrdinal, step) {
			let source = FollowerConstants.followerSource.EVENT;
			let abilityType = FollowerConstants.abilityType.ATTACK;
			return FollowerConstants.getNewRandomFollower(source, campOrdinal, campOrdinal, abilityType, 0.5);
		},
		
		getNewRandomFollower: function (source, campOrdinal, appearLevel, forcedAbilityType, forcedAbilityLevelRandomFactor) {
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
				let animalKeys = Object.keys(FollowerConstants.animalType);
				let animalType = FollowerConstants.animalType[animalKeys[MathUtils.randomIntBetween(0, animalKeys.length)]];
				name = this.getRandomAnimalName(animalType);
				icon = this.getRandomAnimalIcon(animalType);
			} else {
				let origin = CultureConstants.getRandomOrigin(appearLevel);
				let culturalHeritage = CultureConstants.getRandomCultures(MathUtils.randomIntBetween(0, 3), origin);
				name = CultureConstants.getRandomShortName(gender, origin, culturalHeritage);
				icon = this.getRandomIcon(gender, abilityType);
			}
			
			return new FollowerVO(id, name, abilityType, abilityLevel, icon, gender, source);
		},
		
		getNewPredefinedFollower: function (followerID) {
			let template = null;
			let templateCampOrdinal = 1;
			for (let campOrdinal in this.predefinedFollowers) {
				let t = this.predefinedFollowers[campOrdinal];
				if (t.id == followerID) {
					template = t;
					templateCampOrdinal = campOrdinal;
					break;
				}
			}
			
			if (!template) {
				log.w("couldn't find template for predefined follower id:" + followerID);
				return null;
			}
			
			let abilityLevel = this.getRandomAbilityLevelByCampOrdinal(template.abilityType, templateCampOrdinal);
			
			return new FollowerVO(followerID, template.name, template.abilityType, abilityLevel, template.icon, template.gender, FollowerConstants.followerSource.SCOUT);
		},
		
		getRandomAbilityLevelByCampOrdinal: function (abilityType, campOrdinal, forcedAbilityLevelRandomFactor) {
			let minCampOrdinal = Math.min(campOrdinal, this.getUnlockCampOrdinal(abilityType));
			let maxCampOrdinal = WorldConstants.CAMPS_TOTAL;
			
			let minAbilityLevel = MathUtils.map(campOrdinal - 1, minCampOrdinal - 1, maxCampOrdinal + 1, 1, 100);
			let maxAbilityLevel = MathUtils.map(campOrdinal + 1, minCampOrdinal - 1, maxCampOrdinal + 1, 1, 100);
			let abilityLevel = MathUtils.randomIntBetween(minAbilityLevel, maxAbilityLevel);
			
			if (forcedAbilityLevelRandomFactor) {
				abilityLevel = MathUtils.intBetween(forcedAbilityLevelRandomFactor, minAbilityLevel, maxAbilityLevel);
			}
			
			return abilityLevel;
		},
		
		getRecruitCost: function (follower, isFoundAsReward) {
			if (isFoundAsReward) return {};
			let result = {};
			
			let costFactor = MathUtils.map(follower.abilityLevel, 1, 100, 1.0, 5.0);
			let followerType = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
			let isAnimal = this.isAnimal(follower.abilityType);
			let isHungry = followerType != FollowerConstants.followerType.SCAVENGER && follower.id % 3 == 0;
			let isStranded = followerType != FollowerConstants.followerType.FIGHTER && follower.id % 5 == 1;
			let isInjured = follower.id % 7 == 1
			
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
			
			for (let k in FollowerConstants.abilityType) {
				let abilityType = FollowerConstants.abilityType[k];
				let unlockCampOrdinal = this.getUnlockCampOrdinal(abilityType);
				if (unlockCampOrdinal <= campOrdinal) {
					result.push(abilityType);
				}
			}
			
			return result;
		},
		
		getUnlockCampOrdinal: function (abilityType) {
			let firstFollowerCampOrdinal = FollowerConstants.FIRST_FOLLOWER_CAMP_ORDINAL;
			
			switch (abilityType) {
				// fighter
				case FollowerConstants.abilityType.ATTACK:
				case FollowerConstants.abilityType.DEFENCE:
					return firstFollowerCampOrdinal;
				// explorer
				case FollowerConstants.abilityType.COST_SCOUT:
					return firstFollowerCampOrdinal + 1;
				case FollowerConstants.abilityType.COST_SCAVENGE:
					return firstFollowerCampOrdinal + 2;
				case FollowerConstants.abilityType.DETECT_HAZARDS:
				case FollowerConstants.abilityType.DETECT_SUPPLIES:
				case FollowerConstants.abilityType.DETECT_INGREDIENTS:
					return firstFollowerCampOrdinal + 3;
				case FollowerConstants.abilityType.COST_MOVEMENT:
					return WorldConstants.CAMP_ORDINAL_GROUND + 4;
				// scavenger
				case FollowerConstants.abilityType.SCAVENGE_INGREDIENTS:
					return firstFollowerCampOrdinal + 4;
				case FollowerConstants.abilityType.SCAVENGE_SUPPLIES:
					return WorldConstants.CAMP_ORDINAL_GROUND;
				case FollowerConstants.abilityType.SCAVENGE_CAPACITY:
					return WorldConstants.CAMP_ORDINAL_GROUND + 2;
				case FollowerConstants.abilityType.SCAVENGE_GENERAL:
					return WorldConstants.CAMP_ORDINAL_GROUND + 3;
				default:
				 	log.w("no unlock camp ordinal defined for Follower ability type: " + abilityType);
					return 1;
			}
		},
		
		getRandomAnimalName: function (animalType) {
			switch (animalType) {
				case FollowerConstants.animalType.DOG:
					return "dog";
				case FollowerConstants.animalType.MULE:
					return "blind mule";
				case FollowerConstants.animalType.BAT:
					return "giant bat";
				case FollowerConstants.animalType.OLM:
					return "giant olm";
				default:
					return "monitor lizard";
			}
		},
		
		getRandomAnimalIcon: function (animalType) {
			switch (animalType) {
				case FollowerConstants.animalType.DOG:
					return "img/followers/follower_animal_dog.png"
				default:
					return "img/followers/follower_animal_generic.png"
			}
		},
		
		getRandomIcon: function (gender, abilityType) {
			var validIcons = [];
			let followerType = this.getFollowerTypeForAbilityType(abilityType);
			for (let i = 0; i < this.icons.length; i++) {
				let iconDef = this.icons[i];
				if (this.isValidIcon(iconDef, gender, followerType)) validIcons.push(iconDef);
			}
			return validIcons[Math.floor(Math.random() * validIcons.length)].icon;
		},
		
		isValidIcon: function (iconDef, gender, followerType) {
			if (!iconDef.icon) return false;
			if (iconDef.gender && gender && gender != iconDef.gender) return false;
			if (iconDef.followerType && followerType && followerType != iconDef.followerType) return false;
			return true;
		},
		
		getFollowerTypeForAbilityType: function (abilityType) {
			switch (abilityType) {
				case this.abilityType.ATTACK: return this.followerType.FIGHTER;
				case this.abilityType.DEFENCE: return this.followerType.FIGHTER;
				case this.abilityType.COST_MOVEMENT: return this.followerType.EXPLORER;
				case this.abilityType.COST_SCAVENGE: return this.followerType.EXPLORER;
				case this.abilityType.COST_SCOUT: return this.followerType.EXPLORER;
				case this.abilityType.DETECT_SUPPLIES: return this.followerType.EXPLORER;
				case this.abilityType.DETECT_INGREDIENTS: return this.followerType.EXPLORER;
				case this.abilityType.DETECT_HAZARDS: return this.followerType.EXPLORER;
				case this.abilityType.SCAVENGE_GENERAL: return this.followerType.SCAVENGER;
				case this.abilityType.SCAVENGE_INGREDIENTS: return this.followerType.SCAVENGER;
				case this.abilityType.SCAVENGE_SUPPLIES: return this.followerType.SCAVENGER;
				case this.abilityType.SCAVENGE_CAPACITY: return this.followerType.SCAVENGER;
				default:
					log.w("no followerType defined for abilityType: " + abilityType);
					return this.followerType.EXPLORER;
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
		
		getFollowerTypeDisplayName: function (followerType) {
			switch (followerType) {
				case this.followerType.FIGHTER: return "fighter";
				case this.followerType.EXPLORER: return "explorer";
				case this.followerType.SCAVENGER: return "scavenger";
				default:
					log.w("no display name defined for follower type: " + type);
					return "";
			}
		},
		
		getTotalItemBonus: function (follower) {
			let total = 0;
			for (let bonusKey in ItemConstants.itemBonusTypes) {
				let bonusType = ItemConstants.itemBonusTypes[bonusKey];
				let value = this.getFollowerItemBonus(follower, bonusType);
				if (ItemConstants.isIncreasing(bonusType)) {
					total += value;
				} else {
					total -= value;
				}
			}
			return total;
		},
		
		getFollowerItemBonus: function (follower, itemBonusType) {
			let roundingStep = 1;
			let abilityLevel = 0;
			let minBonus = 0;
			let maxBonus = 0;
			
			switch (itemBonusType) {
				case ItemConstants.itemBonusTypes.fight_att:
					abilityLevel = Math.max(
						FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.ATTACK),
						FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.DEFENCE) * 0.7,
					);
					minBonus = 3;
					maxBonus = 81;
					roundingStep = 3;
					break;
				case ItemConstants.itemBonusTypes.fight_def:
					abilityLevel = Math.max(
						FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.DEFENCE),
						FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.ATTACK) * 0.7,
					);
					minBonus = 3;
					maxBonus = 81;
					roundingStep = 3;
					break;
				case ItemConstants.itemBonusTypes.movement:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.COST_MOVEMENT);
					minBonus = 0.9;
					maxBonus = 0.7;
					roundingStep = 0.1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_cost:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.COST_SCAVENGE);
					minBonus = 0.6;
					maxBonus = 0.3;
					roundingStep = 0.3;
					break;
				case ItemConstants.itemBonusTypes.scout_cost:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.COST_SCOUT);
					minBonus = 0.9;
					maxBonus = 0.6;
					roundingStep = 0.15;
					break;
				case ItemConstants.itemBonusTypes.detect_hazards:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.DETECT_HAZARDS);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.detect_supplies:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.DETECT_SUPPLIES);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.detect_ingredients:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.DETECT_INGREDIENTS);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_general:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.SCAVENGE_GENERAL);
					minBonus = 1.025;
					maxBonus = 1.2;
					roundingStep = 0.025;
					break;
				case ItemConstants.itemBonusTypes.scavenge_ingredients:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.SCAVENGE_INGREDIENTS);
					minBonus = 1.05;
					maxBonus = 1.35;
					roundingStep = 0.05;
					break;
				case ItemConstants.itemBonusTypes.scavenge_supplies:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.SCAVENGE_SUPPLIES);
					minBonus = 1.05;
					maxBonus = 1.35;
					roundingStep = 0.05;
					break;
				case ItemConstants.itemBonusTypes.bag:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.SCAVENGE_CAPACITY);
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
					return 0;
					
				default:
					log.w("no follower item bonus defined for item bonus type: " + itemBonusType);
					break;
			}
			
			if (abilityLevel == 0) return 0;
			
			let rawValue = MathUtils.map(abilityLevel, 1, 100, minBonus, maxBonus);
			
			return MathUtils.roundToMultiple(rawValue, roundingStep);
		},
		
		isAnimal: function (abilityType) {
			return abilityType == FollowerConstants.abilityType.SCAVENGE_CAPACITY;
		},
		
		isComparableAbilityTypes: function (a, b) {
			if (a == b) return true;
			
			let isFighter = function (t) { return t == FollowerConstants.abilityType.ATTACK || t == FollowerConstants.abilityType.DEFENCE; }
			
			if (isFighter(a) && isFighter(b)) return true;
			
			return false;
		},
		
		getPronoun: function (follower) {
			if (this.isAnimal(follower.abilityType)) return "it";
			if (follower.gender == CultureConstants.genders.FEMALE) return "she";
			if (follower.gender == CultureConstants.genders.MALE) return "he";
			return "they";
		},
		
		getAbilityLevel: function (follower, abilityType) {
			if (follower.abilityType == abilityType) {
				return follower.abilityLevel;
			}
			
			return 0;
		}
	};
	
	return FollowerConstants;
	
});
