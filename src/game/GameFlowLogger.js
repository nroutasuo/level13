define(['ash', 'game/GlobalSignals', 'game/constants/GameConstants'], function (Ash, GlobalSignals, GameConstants) {
    
    var GameFlowLogger = Ash.Class.extend({
        
        constructor: function () {
            if (GameConstants.logInfo) {
                GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);
                GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
                GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
                GlobalSignals.add(this, GlobalSignals.actionStartedSignal, this.onActionStarted);
                GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.onPlayerMoved);
            }
        },
        
        log: function (msg) {
            if (GameConstants.logInfo) {
                console.log("flow: " + msg);
            }
        },
        
        onGameShown: function () {
            this.log("game shown");
        },
        
        onPopupOpened: function (id) {
            this.log("popup opened: " + id);
        },
        
        onPopupClosed: function (id) {
            this.log("popup closed: " + id);
        },
        
        onActionStarted: function (action, param) {
            var msg = "action started: " + action;
            if (param && action.indexOf(param) < 0) {
                msg += " " + param;
            }
            this.log(msg);
        },
        
        onPlayerMoved: function (pos) {
            this.log("player moved to " + pos);
        },
        
    });

    return GameFlowLogger;
});
