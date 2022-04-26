define(['ash', 'game/GameGlobals', 'game/vos/PlayerActionVO'], function (Ash, GameGlobals, PlayerActionVO) {

	var PlayerActionComponent = Ash.Class.extend({

		endTimeStampToActionDict: {},
		endTimeStampList: [],
		busyStartTime: -1,

		constructor: function () {
			this.endTimeStampToActionDict = {};
			this.endTimeStampList = [];
		},

		addAction: function (action, duration, param, deductedCosts, isBusyAction) {
			if (!this.isBusy() && isBusyAction) this.busyStartTime = new Date().getTime();
			var endTimeStamp = new Date().getTime() + duration * 1000;
			this.endTimeStampToActionDict[endTimeStamp] = new PlayerActionVO(action, param, deductedCosts, isBusyAction);
			this.endTimeStampList.push(endTimeStamp);
			this.sortTimeStamps();
			return endTimeStamp;
		},

		getLastAction: function (requireBusy) {
			return this.endTimeStampToActionDict[this.getLastTimeStamp(requireBusy)];
		},
		
		getLastActionName: function (requireBusy) {
			var lastAction = this.getLastAction(requireBusy);
			return lastAction ? lastAction.action : null;
		},

		getLastTimeStamp: function (requireBusy) {
			var lastTimeStamp = -1;
			if (requireBusy) {
				for (let i = this.endTimeStampList.length - 1; i >= 0; i--) {
					var action = this.endTimeStampToActionDict[this.endTimeStampList[i]];
					if (action.isBusy) {
						lastTimeStamp = this.endTimeStampList[i];
						break;
					}
				}
			} else {
				lastTimeStamp = this.endTimeStampList[this.endTimeStampList.length - 1];
			}
			return lastTimeStamp;
		},

		applyExtraTime: function (extraTime) {
			var oldTimeStamp;
			var newTimeStamp;
			var action;
			for (let i = 0; i < this.endTimeStampList.length; i++) {
				oldTimeStamp = this.endTimeStampList[i];
				newTimeStamp = oldTimeStamp - extraTime * 1000;
				action = this.endTimeStampToActionDict[oldTimeStamp];
				delete this.endTimeStampToActionDict[oldTimeStamp];
				this.endTimeStampList[i] = newTimeStamp;
				this.endTimeStampToActionDict[newTimeStamp] = action;
			}
		},

		sortTimeStamps: function() {
			this.endTimeStampList.sort(function (a, b) {
				return a - b;
			});
		},

		isBusy: function () {
			if (this.endTimeStampList.length < 1) return false;
			var now = new Date().getTime();
			var lastTimeStamp = this.getLastTimeStamp(true);
			var diff = lastTimeStamp - now;
			return diff > 0;
		},

		getBusyDescription: function () {
			var action = this.getLastAction(true).action;
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			switch (baseActionID) {
				case "use_in_home": return "resting";
				case "use_in_campfire": return "discussing";
				case "use_in_hospital": return "recovering";
				case "use_in_hospital_2": return "augmenting";
				case "use_in_market": return "visiting";
				case "use_in_temple": return "donating";
				case "use_in_shrine": return "meditating";
				case "clear_waste_t": return "clearing waste";
				case "clear_waste_r": return "clearing waste";
				default: return this.action;
			}
		},

		getBusyPercentage: function () {
			if (!this.isBusy()) return 100;
			var lastTimeStamp = this.getLastTimeStamp(true);
			var totalTime = lastTimeStamp - this.busyStartTime;
			var timePassed = new Date().getTime() - this.busyStartTime;
			return timePassed / totalTime * 100;
		},

		getBusyTimeLeft: function () {
			if (!this.isBusy()) return 0;
			var lastTimeStamp = this.getLastTimeStamp(true);
			return (lastTimeStamp - new Date().getTime()) / 1000;
		},

		getSaveKey: function () {
			return "Actions";
		},

		customLoadFromSave: function (componentValues) {
			this.endTimeStampToActionDict = componentValues.endTimeStampToActionDict;
			this.endTimeStampList = componentValues.endTimeStampList;
			this.busyStartTime = componentValues.busyStartTime;
		}
	});

	return PlayerActionComponent;
});
