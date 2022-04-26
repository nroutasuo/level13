// Holds timers and cooldowns for events in a camp
define(['ash', 'game/constants/OccurrenceConstants'], function (Ash, OccurrenceConstants) {

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
		
		onEventSkipped: function (event) {
			this.eventEndTimers[event] = null;
		},

		removeTimer: function(event) {
			this.eventStartTimers[event] = null;
			this.eventEndTimers[event] = null;
			this.eventDurations[event] = null;
		},

		isEventScheduled: function (event) {
			return this.eventStartTimers[event] || this.eventStartTimers[event] === 0;
		},

		isTimeToStart: function(event) {
			return this.getEventStartTimeLeft(event) <= 0;
		},

		hasTimeEnded: function(event) {
			let timeLeft = this.getEventTimeLeft(event);
			if (timeLeft == OccurrenceConstants.EVENT_DURATION_INFINITE) return false;
			return timeLeft <= 0;
		},

		getEventTimeLeft: function(event) {
			if (this.eventEndTimers[event] == OccurrenceConstants.EVENT_DURATION_INFINITE) return OccurrenceConstants.EVENT_DURATION_INFINITE;
			return this.eventEndTimers[event] || 0;
		},

		getEventStartTimeLeft: function(event) {
			return this.eventStartTimers[event];
		},

		getEventTimePercentage: function (event, log) {
			var duration = this.eventDurations[event] || 0;
			if (duration < 0) return 0;
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
