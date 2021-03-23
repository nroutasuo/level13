define([
	'ash',
	'game/GameGlobals',
], function (Ash, GameGlobals) {
	
	var EndingSystem = Ash.System.extend({
		
		isPopupShown: false,

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
		},

		removeFromEngine: function (engine) {
			this.engine = null;
		},

		update: function () {
			if (this.isPopupShown)
				return;
			
			if (!GameGlobals.gameState.isFinished)
				return;
			
			this.showPopup();
		},
		
		showPopup: function () {
			gtag('event', 'game_complete', { event_category: 'progression' })
			this.gameManager.pauseGame();
			GameGlobals.uiFunctions.showQuestionPopup(
				"The End",
				"Congratulations! You've completed Level 13. Thank you for playing!<br/></br>Do you want to restart?",
				"Restart",
				"Cancel",
				function () {
					GameGlobals.uiFunctions.restart();
				},
				function () {}
			);
			this.isPopupShown = true;
		}
	});

	return EndingSystem;
});
