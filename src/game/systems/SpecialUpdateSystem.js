// A system that calculates time for and triggers special updates that trigger after the regular update at more specific intervals
define(['ash', 'game/GameGlobals', 'game/GlobalSignals',], function (Ash, GameGlobals, GlobalSignals) {

	let SpecialUpdateSystem = Ash.System.extend({

		slowUpdateInterval: 3000,
		lastSlowUpdateTimestamp: null,

		visualUpdateInterval: 1000,
		lastVisualUpdateTimeStamp: null,

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.extraUpdateTime = GameGlobals.gameState.frameExtraUpdateTime;

			let now = new Date().getTime();
			this.lastSlowUpdateTimestamp = now - this.slowUpdateInterval;
			this.lastVisualUpdateTimestamp = now - this.visualUpdateInterval;
		},

		removeFromEngine: function (engine) {
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.uiStatus.isTransitioning) return;

			let timeStamp = new Date().getTime();

			// slow update: (max) every interval, includes frameExtraUpdateTime 
			let slowUpdateDelta = timeStamp - this.lastSlowUpdateTimestamp;
			this.extraUpdateTime += (GameGlobals.gameState.frameExtraUpdateTime || 0);

			if (slowUpdateDelta >= this.slowUpdateInterval) {
				this.doSlowUpdate(slowUpdateDelta / 1000 + (this.extraUpdateTime || 0));
				this.extraUpdateTime = 0;
			}

			// visual update: (approx) every interval, no frameExtraUpdateTime
			let visualUpdateDelta = timeStamp - this.lastVisualUpdateTimeStamp;
			let numVisualUpdatesAtLast = Math.floor(this.lastVisualUpdateTimeStamp / this.visualUpdateInterval);
			let numVisualUpdatesNow = Math.floor(timeStamp / this.visualUpdateInterval);
			if (numVisualUpdatesNow > numVisualUpdatesAtLast) {
				this.doVisualUpdate(visualUpdateDelta / 1000);
			}
		},

		doSlowUpdate: function (time) {
			let now = new Date().getTime();
			GlobalSignals.slowUpdateSignal.dispatch(time || 0);
			this.lastSlowUpdateTimestamp = now;
		},

		doVisualUpdate: function (time) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			let now = new Date().getTime();
			GlobalSignals.visualUpdateSignal.dispatch(time || 0);
			this.lastVisualUpdateTimeStamp = now;
		},

	});

	return SpecialUpdateSystem;
});
