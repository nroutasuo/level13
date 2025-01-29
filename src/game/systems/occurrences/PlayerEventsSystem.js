// Triggers story related popups
// Triggers in-occurrences (camp events)
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'text/Text'
], function (
	Ash, GameGlobals, GlobalSignals, GameConstants, Text) {

	let PlayerEventsSystem = Ash.System.extend({

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			
			GlobalSignals.add(this, GlobalSignals.gameStateLoadedSignal, this.onGamestateLoaded);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
		},
		
		slowUpdate: function () {
			if (GameGlobals.gameState.isPaused) return;
		},
		
		showIntroPopup: function () {
			// TODO make this part of the story (just need to make sure to trigger at the right time relative to loading)
			let intro = "You wake up alone in the darkness, far below sunlight. You are injured and you remember very little. Is this how your journey ends?";
			GameGlobals.uiFunctions.showInfoPopup("Darkness", intro, "Continue", null, null, true, false);
		},
		
		onGamestateLoaded: function (hasState) {
			if (!hasState) {
				let sys = this;
				setTimeout(function () {
					sys.showIntroPopup();
				}, 1);
			}
		},

	});

	return PlayerEventsSystem;
});
