define(['ash',
	'core/ConsoleLogger',
	'game/GlobalSignals',
	'game/GameGlobals',
	'game/constants/GameConstants'
], function (Ash, ConsoleLogger, GlobalSignals, GameGlobals, GameConstants) {
	
	var GameFlowLogger = Ash.Class.extend({
		
		isEnabled: true,
		
		constructor: function () {
			if (ConsoleLogger.logInfo) {
				GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);
				GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
				GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
				GlobalSignals.add(this, GlobalSignals.actionStartedSignal, this.onActionStarted);
				GlobalSignals.add(this, GlobalSignals.actionButtonClickedSignal, this.onActionButtonClicked);
				GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.onPlayerMoved);
			}
		},
		
		log: function (msg) {
			if (!this.isEnabled) return;
			log.i("flow: " + msg);
		},
		
		setEnabled: function (value) {
			this.isEnabled = value;
		},
		
		onGameShown: function () {
			this.log("game shown");
		},
		
		onPopupOpened: function (id) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.isAutoPlaying) return;
			this.log("popup opened: " + id);
		},
		
		onPopupClosed: function (id) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (GameGlobals.gameState.isAutoPlaying) return;
			this.log("popup closed: " + id);
		},
		
		onActionStarted: function (action, param) {
			var msg = "action started: " + action;
			if (param && action.indexOf(param) < 0) {
				msg += " " + param;
			}
			this.log(msg);
		},
		
		onActionButtonClicked: function (action) {
			var msg = "action button clicked: " + action;
			this.log(msg);
		},
		
		onPlayerMoved: function (pos) {
			if (GameGlobals.gameState.isAutoPlaying) return;
			this.log("player moved to " + pos);
		},
		
	});

	return GameFlowLogger;
});
