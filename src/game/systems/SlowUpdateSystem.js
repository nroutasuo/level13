// A system that updates accumulates resources in collectors
define(['ash', 'game/GameGlobals', 'game/GlobalSignals',], function (Ash, GameGlobals, GlobalSignals) {

	var SlowUpdateSystem = Ash.System.extend({

		updateInterval: 3000,
		lastUpdateTimeStamp: null,

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.extraUpdateTime = GameGlobals.gameState.frameExtraUpdateTime;
			this.lastUpdateTimeStamp = new Date().getTime() - this.updateInterval;
		},

		removeFromEngine: function (engine) {
			this.engine = null;
		},

		update: function (time) {
			var timeStamp = new Date().getTime();
			var delta = timeStamp - this.lastUpdateTimeStamp;
			this.extraUpdateTime += (GameGlobals.gameState.frameExtraUpdateTime || 0);
			if (delta >= this.updateInterval) {
				this.doSlowUpdate(delta / 1000 + (this.extraUpdateTime || 0));
				this.extraUpdateTime = 0;
			}
		},

		doSlowUpdate: function (time) {
			GlobalSignals.slowUpdateSignal.dispatch(time);
			this.lastUpdateTimeStamp = new Date().getTime();
		},

	});

	return SlowUpdateSystem;
});
