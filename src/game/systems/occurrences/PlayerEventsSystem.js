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
		
		onGamestateLoaded: function (hasState) {
			if (!hasState) {
				let intro = "You wake up alone, remembering very little. There barely any light. It takes awhile for you to make out your surroundings.";
				GameGlobals.uiFunctions.showInfoPopup("Darkness", intro, "Continue", null, null, true, false);
			}
		},

	});

	return PlayerEventsSystem;
});
