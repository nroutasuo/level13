// Holds timers and cooldowns for events in a camp
define(['ash'], function (Ash) {

    var CampEventTimersComponent = Ash.Class.extend({

        eventEndTimestamps: {},
        eventStartTimestamps: {},

        constructor: function () {
            this.eventEndTimestamps = {};
            this.eventStartTimestamps = {};
        },

        isEventScheduled: function (event) {
            return this.eventStartTimestamps[event];
        },

        onEventEnded: function(event, timeToNext) {
            if (timeToNext) {
                var startTimestamp = new Date().getTime() + timeToNext * 1000;
                this.eventStartTimestamps[event] = startTimestamp;
            }
        },

        onEventStarted: function(event, durationSec) {
            var endTimeStamp = new Date().getTime() + durationSec * 1000;
            this.eventEndTimestamps[event] = endTimeStamp;
        },

        removeTimer: function(event) {
            this.eventStartTimestamps[event] = null;
            this.eventEndTimestamps[event] = null;
        },

        hasTimeEnded: function(event) {
            return this.getEventTimeLeft(event) <= 0;
        },

        getEventTimeLeft: function(event) {
            var timestamp = this.eventEndTimestamps[event];
            return this.getTimeLeft(timestamp) / 1000;
        },

        isTimeToStart: function(event) {
            return this.getEventStartTimeLeft(event) <= 0;
        },

        getEventStartTimeLeft: function(event) {
            var timestamp = this.eventStartTimestamps[event];
            return this.getTimeLeft(timestamp) / 1000;
        },

        getEventTimePercentage: function (event) {
            var startTime = this.eventStartTimestamps[event];
            var endTime = this.eventEndTimestamps[event];
            if (!startTime || !endTime || this.getEventStartTimeLeft(event) > 0)
                return 0;
            var now = new Date().getTime();
            return (1 - (endTime - now) / (endTime - startTime)) * 100;
        },

        getTimeLeft: function(timestamp) {
            if (timestamp) {
                var now = new Date().getTime();
                var diff = timestamp - now;
                return diff;
            } else {
                return 0;
            }
        },

        getSaveKey: function () {
            return "CampEventTimers";
        },

    });

    return CampEventTimersComponent;
});
