// A system that updates accumulates resources in collectors
define(['ash', 'game/GlobalSignals',], function (Ash, GlobalSignals) {

    var SlowUpdateSystem = Ash.System.extend({

        updateInterval: 3000,
        lastUpdateTimeStamp: null,

        constructor: function () {},

        addToEngine: function (engine) {
            this.engine = engine;
            this.lastUpdateTimeStamp = new Date().getTime() - this.updateInterval;
        },

        removeFromEngine: function (engine) {
            this.engine = null;
        },

        update: function (time) {
            var timeStamp = new Date().getTime();
            var delta = timeStamp - this.lastUpdateTimeStamp;
            if (delta >= this.updateInterval) {
                this.doSlowUpdate(delta);
            }
        },

        doSlowUpdate: function (time) {
            GlobalSignals.slowUpdateSignal.dispatch(time);
            this.lastUpdateTimeStamp = new Date().getTime();
        },

    });

    return SlowUpdateSystem;
});
