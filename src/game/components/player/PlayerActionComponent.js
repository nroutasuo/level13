define(['ash', 'game/constants/PlayerActionConstants', 'game/vos/PlayerActionVO'], function (Ash, PlayerActionConstants, PlayerActionVO) {

	let PlayerActionComponent = Ash.Class.extend({

		endTimeStampToActionDict: {},
		endTimeStampList: [],
		busyStartTime: -1,

		constructor: function () {
			this.endTimeStampToActionDict = {};
			this.endTimeStampList = [];
			this.busyStartTime = -1;
		},

		addAction: function (action, duration, level, param, deductedCosts, isBusyAction) {
			let startTime = new Date().getTime();
			if (!this.isBusy() && isBusyAction) {
				this.busyStartTime = startTime;
			}
			let endTimeStamp = new Date().getTime() + duration * 1000;
			this.endTimeStampToActionDict[endTimeStamp] = new PlayerActionVO(action, level, param, deductedCosts, startTime, isBusyAction);
			this.endTimeStampList.push(endTimeStamp);
			this.sortTimeStamps();
			return endTimeStamp;
		},

		getLastAction: function (requireBusy) {
			return this.endTimeStampToActionDict[this.getLastTimeStamp(requireBusy)];
		},
		
		getAllActions: function (requireBusy) {
			let result = [];
			for (let i = this.endTimeStampList.length - 1; i >= 0; i--) {
				let action = this.endTimeStampToActionDict[this.endTimeStampList[i]];
				if (!requireBusy || action.isBusy) {
					result.push(action);
				}
			}
			return result;
		},
		
		getLastActionName: function (requireBusy) {
			let lastAction = this.getLastAction(requireBusy);
			return lastAction ? lastAction.action : null;
		},

		getLastTimeStamp: function (requireBusy) {
			var lastTimeStamp = -1;
			if (requireBusy) {
				for (let i = this.endTimeStampList.length - 1; i >= 0; i--) {
					let action = this.endTimeStampToActionDict[this.endTimeStampList[i]];
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
		
		getActionTimestamp: function (action, level) {
			let result = -1;
			for (let i = this.endTimeStampList.length - 1; i >= 0; i--) {
				let timestampAction = this.endTimeStampToActionDict[this.endTimeStampList[i]];
				if (timestampAction.action == action && timestampAction.level == level) {
					result = this.endTimeStampList[i];
					break;
				}
			}
			return result;
		},
		
		getAction: function (action, level) {
			let result = null;
			for (let i = this.endTimeStampList.length - 1; i >= 0; i--) {
				let timestampAction = this.endTimeStampToActionDict[this.endTimeStampList[i]];
				if (timestampAction.action == action && timestampAction.level == level) {
					return timestampAction;
				}
			}
			return result;
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

		getBusyAction: function () {
			let action = this.getLastAction(true);
			return action ? action.action : null;
		},

		getBusyDescription: function () {
			let action = this.getBusyAction();
			if (action.indexOf("build_") >= 0) return "building";
			
			let baseActionID = PlayerActionConstants.getBaseActionID(action);
			return PlayerActionConstants.getActionBusyDescription(baseActionID);
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
		
		getActionCompletionPercentage: function (action, level) {
			let actionVO = this.getAction(action, level);
			if (!actionVO) return 1;
			let timestamp = this.getActionTimestamp(action, level);
			if (!timestamp) return 1;
			
			let totalTime = timestamp - actionVO.startTime;
			let timePassed = new Date().getTime() - actionVO.startTime;
			return timePassed / totalTime * 100;
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
