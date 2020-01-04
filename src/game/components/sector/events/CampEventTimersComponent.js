// Holds timers and cooldowns for events in a camp
define(['ash'], function (Ash) {

    var CampEventTimersComponent = Ash.Class.extend({

        // event -> in-game seconds left
        eventEndTimers: {},
        eventStartTimers: {},
        eventDurations: {},

        constructor: function () {
            this.eventEndTimers = {};
            this.eventStartTimers = {};
            this.eventDurations = {};
        },
        
        scheduleNext: function (event, timeToNext) {
            this.eventStartTimers[event] = timeToNext;
        },

        onEventEnded: function(event) {
            this.eventEndTimers[event] = null;
        },

        onEventStarted: function(event, durationSec) {
            this.eventEndTimers[event] = durationSec;
            this.eventDurations[event] = durationSec;
        },

        removeTimer: function(event) {
            this.eventStartTimers[event] = null;
            this.eventEndTimers[event] = null;
            this.eventDurations[event] = null;
        },

        isEventScheduled: function (event) {
            return this.eventStartTimers[event];
        },

        isTimeToStart: function(event) {
            return this.getEventStartTimeLeft(event) <= 0;
        },

        hasTimeEnded: function(event) {
            return this.getEventTimeLeft(event) <= 0;
        },

        getEventTimeLeft: function(event) {
            return this.eventEndTimers[event] || 0;
        },

        getEventStartTimeLeft: function(event) {
            return this.eventStartTimers[event];
        },

        getEventTimePercentage: function (event, log) {
            var duration = this.eventDurations[event] || 0;
            var timeLeft = this.eventEndTimers[event] || 0;
            if (!duration || !timeLeft)
                return 0;
            return (1 - timeLeft / duration) * 100
        },

        getSaveKey: function () {
            return "CampEventTimers";
        },

    });

    return CampEventTimersComponent;
});
