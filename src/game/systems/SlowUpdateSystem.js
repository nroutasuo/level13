// A system that updates accumulates resources in collectors
define(['ash', 'game/GlobalSignals',], function (Ash, GlobalSignals) {

    var SlowUpdateSystem = Ash.System.extend({

        updateInterval: 3000,
        lastUpdateTimeStamp: null,
        extraUpdateTime: 0,

        constructor: function () {},

        addToEngine: function (engine) {
            this.engine = engine;
            this.extraUpdateTime = this.engine.extraUpdateTime;
            this.lastUpdateTimeStamp = new Date().getTime() - this.updateInterval;
        },

        removeFromEngine: function (engine) {
            this.engine = null;
        },

        update: function (time) {
            var timeStamp = new Date().getTime();
            var delta = timeStamp - this.lastUpdateTimeStamp;
            this.extraUpdateTime += (this.engine.extraUpdateTime || 0);
            if (delta >= this.updateInterval) {
                this.doSlowUpdate(delta / 1000, this.extraUpdateTime || 0);
                this.extraUpdateTime = 0;
            }
        },

        doSlowUpdate: function (time, extraUpdateTime) {
            GlobalSignals.slowUpdateSignal.dispatch(time, extraUpdateTime);
            this.lastUpdateTimeStamp = new Date().getTime();
        },

    });

    return SlowUpdateSystem;
});
