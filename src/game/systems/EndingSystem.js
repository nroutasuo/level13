define([
    'ash',
], function (Ash) {
    
var EndingSystem = Ash.System.extend({
    
        gameState: null,
        gameManager: null,
        uiFunctions: null,
        
        isPopupShown: false,

        constructor: function (gameState, gameManager, uiFunctions) {
            this.gameState = gameState;
            this.gameManager = gameManager;
            this.uiFunctions = uiFunctions;
        },

        addToEngine: function (engine) {
            this.engine = engine;
        },

        removeFromEngine: function (engine) {
            this.engine = null;
        },

        update: function (time) {
            if (this.isPopupShown)
                return;
            
            if (!this.gameState.isFinished)
                return;
            
            this.showPopup();
        },
        
        showPopup: function () {
            var uiFunctions = this.uiFunctions;
            this.gameManager.pauseGame();
            this.uiFunctions.showQuestionPopup(
                "The End", 
                "Congratulations! You've completed Level 13. Thank you for playing!<br/></br>Do you want to restart?",
                "Restart",
                function () {
                    uiFunctions.restart();
                },
                function () {}
            );
            this.isPopupShown = true;
        }
    });

    return EndingSystem;
});
