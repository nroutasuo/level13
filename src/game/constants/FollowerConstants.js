define(['ash', 'game/vos/FollowerVO'],
function (Ash, FollowerVO) {
	
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
		
		getNewFollower: function () {
			let id = 100 + Math.floor(Math.random() * 100000);
			let icon = "img/followers/follower_yellow_f.png";
			return new FollowerVO(id, "Name", "Description", FollowerConstants.abilityType.ATTACK, 1, icon);
		},
		
		getPredefinedFollowerByID: function (followerID) {
			debugger
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
		
	};
	
	return FollowerConstants;
	
});
