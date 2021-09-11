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
			HAZARD_PREDICTION: "hazard_prediction",
			// scavenger
			SCAVENGE_GENERAL: "scavenge_general",
			SCAVENGE_INGREDIENTS: "scavenge_ingredients",
			SCAVENGE_SUPPLIES: "scavenge_supplies",
			BRING_METAL: "bring_metal",
		},
		
		followerSource: {
			SCOUT: "scout",
			EVENT: "event"
		},
		
		MAX_ABILITY_LEVEL: 100,
		
		// camp ordinal -> blueprint
		predefinedFollowers: {
			2: { id: 2, localeType: localeTypes.maintenance, abilityType: "attack", name: "Ilma", icon: "img/followers/follower_black_f.png" },
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
			let result = 0;
			for (let i = 0; i < innMajorLevels.length; i++) {
				result += Math.max(0, innMajorLevels[i]);
			}
			return result;
		},
		
		getMaxFollowersInParty: function () {
			return 3;
		},
		
		getNewRandomFollower: function (source, campOrdinal, appearLevel, forcedAbilityType) {
			campOrdinal = campOrdinal || 1;
			
			let id = 100 + Math.floor(Math.random() * 100000);
			
			let availableAbilityTypes = this.getAvailableAbilityTypes(source, campOrdinal);
			let abilityType = FollowerConstants.abilityType.HAZARD_PREDICTION;// forcedAbilityType || availableAbilityTypes[Math.floor(Math.random() * availableAbilityTypes.length)];
			
			let minAbilityLevel = MathUtils.map(campOrdinal - 1, 0, WorldConstants.CAMPS_TOTAL + 1, 1, 100);
			let maxAbilityLevel = MathUtils.map(campOrdinal + 1, 0, WorldConstants.CAMPS_TOTAL + 1, 1, 100);
			let abilityLevel = MathUtils.randomIntBetween(minAbilityLevel, maxAbilityLevel);
			
			let gender = CultureConstants.getRandomGender();
			let origin = CultureConstants.getRandomOrigin(appearLevel);
			let culturalHeritage = CultureConstants.getRandomCultures(MathUtils.randomIntBetween(0, 3), origin);
			let name = CultureConstants.getRandomShortName(gender, origin, culturalHeritage);
			
			let icon = this.getRandomIcon(gender, abilityType);
			
			return new FollowerVO(id, name, abilityType, abilityLevel, icon);
		},
		
		getNewPredefinedFollower: function (followerID) {
			let template = null;
			for (let campOrdinal in this.predefinedFollowers) {
				let t = this.predefinedFollowers[campOrdinal];
				if (t.id == followerID) {
					template = t;
					break;
				}
			}
			
			if (!template) {
				log.w("couldn't find template for predefined follower id:" + followerID);
				return null;
			}
			
			return new FollowerVO(followerID, template.name, template.abilityType, 1, template.icon);
		},
		
		getRecruitCost: function (follower, isFoundAsReward) {
			// TODO FOLLOWERS define varying costs (food, water, medicine, silver)
			if (isFoundAsReward) return {};
			let result = {};
			result.resource_food = 50;
			result.resource_water = 50;
			return result;
		},
		
		getAvailableAbilityTypes: function (source, campOrdinal) {
			let result = [];
			let firstFollowerCampOrdinal = FollowerConstants.FIRST_FOLLOWER_CAMP_ORDINAL;
			
			result.push(FollowerConstants.abilityType.ATTACK);
			result.push(FollowerConstants.abilityType.DEFENCE);
			
			// initial stepped unlocks after first follower
			if (campOrdinal > firstFollowerCampOrdinal) {
				result.push(FollowerConstants.abilityType.COST_SCOUT);
			}
			if (campOrdinal > firstFollowerCampOrdinal + 1) {
				result.push(FollowerConstants.abilityType.COST_SCAVENGE);
			}
			if (campOrdinal > firstFollowerCampOrdinal + 2) {
				result.push(FollowerConstants.abilityType.HAZARD_PREDICTION);
			}
			if (campOrdinal > firstFollowerCampOrdinal + 3) {
				result.push(FollowerConstants.abilityType.BRING_METAL);
			}
			
			// midgame
			if (campOrdinal > WorldConstants.CAMP_ORDINAL_GROUND) {
				result.push(FollowerConstants.abilityType.SCAVENGE_INGREDIENTS);
				result.push(FollowerConstants.abilityType.SCAVENGE_SUPPLIES);
			}
			
			// lategame
			if (campOrdinal >= WorldConstants.CAMPS_TOTAL - 5) {
				result.push(FollowerConstants.abilityType.COST_MOVEMENT);
				result.push(FollowerConstants.abilityType.SCAVENGE_GENERAL);
			}
			
			return result;
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
				case this.abilityType.HAZARD_PREDICTION: return this.followerType.EXPLORER;
				case this.abilityType.SCAVENGE_GENERAL: return this.followerType.SCAVENGER;
				case this.abilityType.SCAVENGE_INGREDIENTS: return this.followerType.SCAVENGER;
				case this.abilityType.SCAVENGE_SUPPLIES: return this.followerType.SCAVENGER;
				case this.abilityType.BRING_METAL: return this.followerType.SCAVENGER;
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
				case this.abilityType.HAZARD_PREDICTION: return "surveying";
				case this.abilityType.SCAVENGE_GENERAL: return "general scavenging";
				case this.abilityType.SCAVENGE_INGREDIENTS: return "ingredient scavenging";
				case this.abilityType.SCAVENGE_SUPPLIES: return "supplies scavenging";
				case this.abilityType.BRING_METAL: return "builder";
				default:
					log.w("no display name defined for abilityType: " + abilityType);
					return abilityType;
			}
		},
		
		getFollowerTypeDisplayName: function (abilityType) {
			let type = this.getFollowerTypeForAbilityType(abilityType);
			switch (type) {
				case this.followerType.FIGHTER: return "fighter";
				case this.followerType.EXPLORER: return "explorer";
				case this.followerType.SCAVENGER: return "scavenger";
				default:
					log.w("no display name defined for follower type: " + type);
			}
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
						FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.DEFENCE) / 2,
					);
					minBonus = 3;
					maxBonus = 100;
					roundingStep = 3;
					break;
				case ItemConstants.itemBonusTypes.fight_def:
					abilityLevel = Math.max(
						FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.DEFENCE),
						FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.ATTACK) / 2,
					);
					minBonus = 3;
					maxBonus = 100;
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
				case ItemConstants.itemBonusTypes.hazard_prediction:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.HAZARD_PREDICTION);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_general:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.SCAVENGE_GENERAL);
					minBonus = 1.05;
					maxBonus = 1.25;
					roundingStep = 0.05;
					break;
				case ItemConstants.itemBonusTypes.scavenge_ingredients:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.SCAVENGE_INGREDIENTS);
					minBonus = 1.1;
					maxBonus = 1.5;
					roundingStep = 0.1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_supplies:
					abilityLevel = FollowerConstants.getAbilityLevel(follower, FollowerConstants.abilityType.SCAVENGE_SUPPLIES);
					minBonus = 1.1;
					maxBonus = 1.5;
					roundingStep = 0.1;
					break;
				default:
					log.w("no follower item bonus defined for item bonus type: " + itemBonusType);
					break;
			}
			
			if (abilityLevel == 0) return 0;
			
			let rawValue = MathUtils.map(abilityLevel, 1, 100, minBonus, maxBonus);
			
			return MathUtils.roundToMultiple(rawValue, roundingStep);
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
