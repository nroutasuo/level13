// Marks the containing sector (camp) entity as having the recruit event currently and contains information related to that event
define(['ash', 'game/vos/FollowerVO'], function (Ash, FollowerVO) {

	var RecruitComponent = Ash.Class.extend({

		follower: null,
		isFoundAsReward: false,
		isDismissed: false,
		isRecruited: false,

		constructor: function (follower, isFoundAsReward) {
			this.follower = follower;
			this.isFoundAsReward = isFoundAsReward;
			this.isDismissed = false;
			this.isRecruited = false;
		},

		getSaveKey: function () {
			return "Recruit";
		},

	});

	return RecruitComponent;
});
