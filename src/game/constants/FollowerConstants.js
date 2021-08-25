define(['ash', 'utils/MathUtils', 'game/vos/FollowerVO', 'game/constants/WorldConstants', 'worldcreator/WorldCreatorConstants'],
function (Ash, MathUtils, FollowerVO, WorldConstants, WorldCreatorConstants) {
	
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
			2: { id: 2, localeType: localeTypes.maintenance, abilityType: "attack" },
			8: { id: 8, localeType: localeTypes.hermit, abilityType: "scavenge_supplies" },
			10: { id: 10, localeType: localeTypes.market, abilityType: "cost_scout" },
			14: { id: 14, localeType: localeTypes.library, abilityType: "scavenge_ingredients" },
		},
		
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
		
		getNewFollower: function (source, campOrdinal) {
			campOrdinal = campOrdinal || 1;
			
			let id = 100 + Math.floor(Math.random() * 100000);
			
			let availableAbilityTypes = this.getAvailableAbilityTypes(source, campOrdinal);
			let abilityType = availableAbilityTypes[Math.floor(Math.random() * availableAbilityTypes.length)];
			
			let minAbilityLevel = MathUtils.map(campOrdinal - 1, 0, WorldConstants.CAMPS_TOTAL + 1, 1, 100);
			let maxAbilityLevel = MathUtils.map(campOrdinal + 1, 0, WorldConstants.CAMPS_TOTAL + 1, 1, 100);
			let abilityLevel = MathUtils.randomIntBetween(minAbilityLevel, maxAbilityLevel);
			
			let name = "Name";
			let description = "Description";
			let icon = "img/followers/follower_yellow_f.png";
			
			return new FollowerVO(id, name, description, abilityType, abilityLevel, icon);
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
			
			let icon = "img/followers/follower_red_m.png";
			return new FollowerVO(followerID, "Name", "Description predefined", template.abilityType, 1, icon);
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
		}
		
	};
	
	return FollowerConstants;
	
});
