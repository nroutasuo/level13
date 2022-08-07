define(['ash', 'game/vos/FollowerVO', 'game/constants/FollowerConstants', 'game/constants/ItemConstants'],
function (Ash, FollowerVO, FollowerConstants, ItemConstants) {
	var FollowersComponent = Ash.Class.extend({

		followers: [],

		constructor: function () {
			this.followers = [];
		},
		
		getAll: function () {
			return this.followers;
		},
		
		getParty: function () {
			let followersInParty = [];
			for (let i = 0; i < this.followers.length; i++) {
				if (this.followers[i].inParty) {
					followersInParty.push(this.followers[i]);
				}
			}
			return followersInParty;
		},
		
		getFollowerByID: function (followerID) {
			for (let i = 0; i < this.followers.length; i++) {
				if (this.followers[i].id == followerID) {
					return this.followers[i];
				}
			}
			return null;
		},
		
		getFollowerInPartyByType: function (followerType) {
			var followers = this.getFollowersByType(followerType, true);
			return followers.length > 0 ? followers[0] : null;
		},
		
		getFollowersByType: function (followerType, onlyParty) {
			var result = [];
			for (let i = 0; i < this.followers.length; i++) {
				if (!onlyParty || this.followers[i].inParty) {
					let type = FollowerConstants.getFollowerTypeForAbilityType(this.followers[i].abilityType);
					if (type == followerType) {
						result.push(this.followers[i]);
					}
				}
			}
			return result;
		},
		
		addFollower: function (follower) {
			this.followers.push(follower);
		},
		
		setFollowerInParty: function (follower, inParty) {
			follower.inParty = inParty;
		},
		
		removeFollower: function (follower) {
			var index = this.followers.indexOf(follower);
			if (index < 0) {
				log.w("couldn't find follower to remove: " + follower.id);
				return;
			}
  			this.followers.splice(index, 1);
		},
		
		getCurrentBonus: function (itemBonusType) {
			var isMultiplier = ItemConstants.isMultiplier(itemBonusType);
			var bonus = isMultiplier ? 1 : 0;
			for (let i = 0; i < this.followers.length; i++) {
				var follower = this.followers[i];
				if (follower.inParty) {
					let followerBonus = FollowerConstants.getFollowerItemBonus(follower, itemBonusType);
					if (isMultiplier) {
						if (followerBonus != 0) {
							bonus *= followerBonus;
						}
					} else {
						bonus += followerBonus;
					}
				}
			}
			return bonus;
		},
		
		getFollowerComparison: function (follower) {
			if (follower == null) return 0;
			let type = FollowerConstants.getFollowerTypeForAbilityType(follower.abilityType);
			let selectedFollower = this.getFollowerInPartyByType(type);
			if (selectedFollower == null) return 1;
			if (!FollowerConstants.isComparableAbilityTypes(selectedFollower.abilityType, follower.abilityType)) return 0;
			
			return FollowerConstants.getTotalItemBonus(follower) - FollowerConstants.getTotalItemBonus(selectedFollower);
		},

		getSaveKey: function () {
			return "Followers";
		},

		getCustomSaveObject: function () {
			var copy = {};
			copy.followers = this.followers;
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			this.followers = componentValues.followers;
		}
	});

	return FollowersComponent;
});
