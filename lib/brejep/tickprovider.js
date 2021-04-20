define([
    'ash'
], function (Ash) {
    var TickProvider = Ash.Class.extend({
		
        previousTime: 0,
        ticked: new Ash.Signals.Signal(),
        request: null,
        stats: null,
        exceptionCallback: null,
		active: false,

        constructor: function (stats, exceptionCallback) {
            this.stats = stats;
            this.exceptionCallback = exceptionCallback;
        },

        start: function () {
			this.active = true;
            this.request = requestAnimationFrame(this.tick.bind(this));
        },

        stop: function () {
            cancelAnimationFrame(this.request);
            this.request = null;
			this.active = false;
        },

        add: function (listener, context) {
            this.ticked.add(listener, context);
        },

        remove: function (listener, context) {
            this.ticked.remove(listener, context);
        },

        tick: function (timestamp) {
            if (this.stats) {
                this.stats.begin();
            }

            timestamp = timestamp || Date.now();
            var tmp = this.previousTime || timestamp;
            this.previousTime = timestamp;
            var delta = (timestamp - tmp) * 0.001;
            
            try {
                this.ticked.dispatch(delta);
            } catch (ex) {
                if (this.exceptionCallback) {
                    this.exceptionCallback(ex);
                } else {
                    throw ex;
                }
            }
            
			if (this.active) {
				this.request = requestAnimationFrame(this.tick.bind(this));
			}

            if (this.stats) {
                this.stats.end();
            }
        }
    });

    return TickProvider;
});
