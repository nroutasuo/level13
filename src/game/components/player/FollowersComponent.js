define(['ash', 'game/vos/FollowerVO', 'game/constants/FollowerConstants'],
function (Ash, FollowerVO, FollowerConstants) {
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
			for (let i = 0; i < followers.length; i++) {
				if (followers[i].inParty) {
					followersInParty.push(followers[i]);
				}
			}
			return followersInParty;
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
