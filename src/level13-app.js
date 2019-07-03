define([
    'module',
    'jquery/jquery-1.11.1.min',
    'core/ConsoleLogger',
    'game/level13',
    'game/constants/GameConstants',
], function (module, jQuery, ConsoleLogger, Level13, GameConstants) {
    'use strict';

    function Level13App() {

        this.initialise = function (config) {

            GameConstants.isDebugVersion = config.isDebugVersion;
            GameConstants.isCheatsEnabled = config.isCheatsEnabled;
            GameConstants.isAutosaveEnabled = config.isAutosaveEnabled;
            ConsoleLogger.logInfo = config.isDebugOutputEnabled;

            GameConstants.STARTTimeStart = new Date().getTime();
            GameConstants.STARTTimeNow = function () {
                return new Date().getTime() - this.STARTTimeStart;
            }

            var level13 = new Level13(config.plugins);

            if (GameConstants.isCheatsEnabled) {
                window.app = level13;
            }
        };

    }

    new Level13App().initialise(module.config());
});
