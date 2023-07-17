define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/UIConstants',
], function (Ash, GameGlobals, GlobalSignals, GameConstants, UIConstants) {
	
	var EndingSystem = Ash.System.extend({
		
		context: "EndingSystem",

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			GlobalSignals.add(this, GlobalSignals.launchedSignal, this.onLaunched);
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
			GlobalSignals.add(this, GlobalSignals.gameEndedSignal, this.onGameFinished);
			GlobalSignals.add(this, GlobalSignals.restartGameSignal, this.onRestart);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},
		
		showLaunch: function () {
			log.i("show launch", this);
			
			let sys = this;
			let duration = UIConstants.LAUNCH_FADEOUT_DURATION;
			let delay = UIConstants.THEME_TRANSITION_DURATION + 500;
			
			$(".game-opacity-controller").stop().animate({
				opacity: 0
			}, duration);
			
			setTimeout(function() {
				GameGlobals.gameState.isLaunchCompleted = true;
				GlobalSignals.launchCompletedSignal.dispatch();
			}, duration);
			
			setTimeout(function () {
				log.i("game finished", this);
				gtag('event', 'game_complete', { event_category: 'progression' });
				GameGlobals.gameState.isFinished = true;
				GlobalSignals.gameEndedSignal.dispatch();
			}, duration + delay);
		},
		
		showStoryPopup: function () {
			log.i("show story popup", this);
			
			let msg = "";
			let sys = this;
			
			msg += "<p>The Colony Ship launches successfully and heads out into space. Into a new darkness, unimaginably vast.";
			msg += "<p>The ship is crowded. We brought as many as we could. Somehow, we will find another home.</p>";
			
			GameGlobals.uiFunctions.showInfoPopup("Launch", msg, "Continue", null,
				function () {
					setTimeout(function () {
						sys.showMetaPopup();
					}, 500);
				}, true, false);
		},
		
		showMetaPopup: function () {
			log.i("show meta popup", this);
			
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
				sys.showStoryPopup();
			}, 1);
		},
		
		onGameStarted: function () {
			if (GameGlobals.gameState.isFinished) {
				this.onGameFinished();
			}
		},

		onRestart: function (resetSave) {
			this.resetShowLaunch();
		},
		
	});

	return EndingSystem;
});
