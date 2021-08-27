define(['ash', 'utils/MathUtils', 'game/vos/FollowerVO', 'game/constants/CultureConstants', 'game/constants/WorldConstants', 'worldcreator/WorldCreatorConstants'],
function (Ash, MathUtils, FollowerVO, CultureConstants, WorldConstants, WorldCreatorConstants) {
	
	var FollowerConstants = {
		
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
			HAZARD_COLD: "hazard_cold",
			HAZARD_POLLUTION: "hazard_pollution",
			HAZARD_RADIATION: "hazard_radiation",
			FIND_COLLECTORS: "find_collectors",
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
		
		getNewFollower: function (source, campOrdinal, appearLevel) {
			campOrdinal = campOrdinal || 1;
			
			let id = 100 + Math.floor(Math.random() * 100000);
			
			let availableAbilityTypes = this.getAvailableAbilityTypes(source, campOrdinal);
			let abilityType = availableAbilityTypes[Math.floor(Math.random() * availableAbilityTypes.length)];
			
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
		
		getPredefinedFollowerByID: function (followerID) {
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
			let firstFollowerCampOrdinal = 2;
			
			result.push(FollowerConstants.abilityType.ATTACK);
			result.push(FollowerConstants.abilityType.DEFENCE);
			
			// initial stepped unlocks after first follower
			if (campOrdinal > firstFollowerCampOrdinal) {
				result.push(FollowerConstants.abilityType.COST_SCOUT);
			}
			if (campOrdinal > firstFollowerCampOrdinal + 1) {
				result.push(FollowerConstants.abilityType.COST_SCAVENGE);
				result.push(FollowerConstants.abilityType.HAZARD_COLD);
			}
			if (campOrdinal > firstFollowerCampOrdinal + 2) {
				result.push(FollowerConstants.abilityType.FIND_COLLECTORS);
			}
			if (campOrdinal > firstFollowerCampOrdinal + 3) {
				result.push(FollowerConstants.abilityType.BRING_METAL);
			}
			
			// hazards
			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_POISON) {
				result.push(FollowerConstants.abilityType.HAZARD_POLLUTION);
			}
			if (campOrdinal >= WorldCreatorConstants.MIN_CAMP_ORDINAL_HAZARD_RADIATION) {
				result.push(FollowerConstants.abilityType.HAZARD_RADIATION);
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
			for (var i = 0; i < this.icons.length; i++) {
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
				case this.abilityType.HAZARD_COLD: return this.followerType.EXPLORER;
				case this.abilityType.HAZARD_POLLUTION: return this.followerType.EXPLORER;
				case this.abilityType.HAZARD_RADIATION: return this.followerType.EXPLORER;
				case this.abilityType.FIND_COLLECTORS: return this.followerType.EXPLORER;
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
				case this.abilityType.ATTACK: return "fight";
				case this.abilityType.DEFENCE: return "fight";
				case this.abilityType.COST_MOVEMENT: return "explorer";
				case this.abilityType.COST_SCAVENGE: return "scavenger";
				case this.abilityType.COST_SCOUT: return "scout";
				case this.abilityType.HAZARD_COLD: return "cold specialist";
				case this.abilityType.HAZARD_POLLUTION: return "pollution specialist";
				case this.abilityType.HAZARD_RADIATION: return "radiation specialist";
				case this.abilityType.FIND_COLLECTORS: return "trapper";
				case this.abilityType.SCAVENGE_GENERAL: return "scavenger";
				case this.abilityType.SCAVENGE_INGREDIENTS: return "crafter";
				case this.abilityType.SCAVENGE_SUPPLIES: return "survivor";
				case this.abilityType.BRING_METAL: return "builder";
				default:
					log.w("no display name defined for abilityType: " + abilityType);
					return abilityType;
			}
		},
		
		getAbilityTypeDescription: function (abilityType) {
			switch (abilityType) {
				case this.abilityType.ATTACK: return "helps in fights";
				case this.abilityType.DEFENCE: return "helps in fights";
				case this.abilityType.COST_MOVEMENT: return "reduces stamina cost of movement";
				case this.abilityType.COST_SCAVENGE: return "reduces stamina cost of scavenging";
				case this.abilityType.COST_SCOUT: return "reduces stamina cost of scouting";
				case this.abilityType.HAZARD_COLD: return "detects and protects against cold";
				case this.abilityType.HAZARD_POLLUTION: return "detects and protects against pollution";
				case this.abilityType.HAZARD_RADIATION: return "detects and protects against radiation";
				case this.abilityType.FIND_COLLECTORS: return "finds spots for traps and buckets";
				case this.abilityType.SCAVENGE_GENERAL: return "finds more everything when scavenging";
				case this.abilityType.SCAVENGE_INGREDIENTS: return "finds more ingredients";
				case this.abilityType.SCAVENGE_SUPPLIES: return "finds more supplies when scavenging";
				case this.abilityType.BRING_METAL: return "carries back some metal to camp";
				default:
					log.w("no display name defined for abilityType: " + abilityType);
					return abilityType;
			}
		},
		
	};
	
	return FollowerConstants;
	
});
