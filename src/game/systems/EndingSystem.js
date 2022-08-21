define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
], function (Ash, GameGlobals, GlobalSignals, GameConstants) {
	
	var EndingSystem = Ash.System.extend({

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			GlobalSignals.add(this, GlobalSignals.launcedSignal, this.onLaunched);
			GlobalSignals.add(this, GlobalSignals.gameEndedSignal, this.onGameFinished);
			GlobalSignals.add(this, GlobalSignals.restartGameSignal, this.onRestart);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},
		
		showLaunch: function () {
			let sys = this;
			let duration = 3000;
			
			$(".game-opacity-controller").animate({
				opacity: 0,
				scale: 0.5
			}, duration);
			
			setTimeout(function () {
				log.i("game finished");
				gtag('event', 'game_complete', { event_category: 'progression' });
				GameGlobals.gameState.isFinished = true;
				GlobalSignals.gameEndedSignal.dispatch();
			}, duration);
		},
		
		showPopup: function () {
			log.i("show ending popup");
			
			let msg = "";
			
			msg += "Congratulations! You've completed Level 13.";
			msg += "<br/>"
			msg += "<span class='p-meta'>Thank you for playing all the way to the end. If you'd like to share your thoughts or feedback, you can use any of these channels:</span>";
			msg += "<p>" + GameConstants.getFeedbackLinksHTML() + "</p>";
			
			GameGlobals.uiFunctions.showQuestionPopup("The End", msg, "Restart", "Close",
				function () {
					GameGlobals.uiFunctions.restart();
				},
				function () {
					GameGlobals.uiFunctions.hideGame(false);
				}
			);
		},
		
		resetShowLaunch: function () {
			let duration = 200;
			$(".game-opacity-controller").stop().animate({
				opacity: 1,
				scale: 1
			}, duration);
		},
		
		onLaunched: function () {
			var sys = this;
			setTimeout(function () {
				sys.showLaunch();
			}, 1);
		},
		
		onGameFinished: function () {
			var sys = this;
			setTimeout(function () {
				sys.showPopup();
			}, 1);
		},

		onRestart: function (resetSave) {
			this.resetShowLaunch();
		},
		
	});

	return EndingSystem;
});
