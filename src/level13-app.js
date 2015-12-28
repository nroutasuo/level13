require([
    'jquery/jquery-1.11.1.min',
    'game/level13',
    'game/constants/GameConstants',
], function (jQuery, Level13, GameConstants) {
    'use strict';
        
    function Level13App() {
        
        this.initialise = function () {
            var isLocal = document.URL.indexOf("file:///") >= 0;
            GameConstants.isCheatsEnabled = isLocal;
            GameConstants.isDebugOutputEnabled = isLocal;
                        
            GameConstants.STARTTimeStart = new Date().getTime();
            GameConstants.STARTTimeNow = function () {
                return new Date().getTime() - this.STARTTimeStart;
            }
                        
            var level13 = new Level13();
            level13.start();
                        
            if (GameConstants.isCheatsEnabled) {
                window.app = level13;
            }
        };
        
    }

    new Level13App().initialise();
}
);
