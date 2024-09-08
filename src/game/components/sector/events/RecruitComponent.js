// Marks the containing sector (camp) entity as having the recruit event currently and contains information related to that event
define(['ash', 'game/vos/ExplorerVO'], function (Ash, ExplorerVO) {

	var RecruitComponent = Ash.Class.extend({

		explorer: null,
		isFoundAsReward: false,
		isDismissed: false,
		isRecruited: false,

		constructor: function (explorer, isFoundAsReward) {
			this.explorer = explorer;
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
