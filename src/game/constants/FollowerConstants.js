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
			let id = Math.floor(Math.random() * 100000);
			let icon = "img/followers/follower_yellow_f.png";
			return new FollowerVO(id, "Name", "Description", FollowerConstants.abilityType.ATTACK, 1, icon);
		}
		
	};
	
	return FollowerConstants;
	
});
