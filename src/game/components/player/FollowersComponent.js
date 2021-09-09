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
		
		addFollower: function (follower, addToParty) {
			this.followers.push(follower);
			follower.inParty = true;
		},
		
		removeFollower: function (follower) {
			var index = this.followers.indexOf(follower);
			if (index < 0) {
				log.w("couldn't find follower to remove: " + follower.id);
				return;
			}
  			this.followers.splice(index, 1);
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
