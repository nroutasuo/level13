require([
    'brejep/fillsnfixes',
    'brejep/keypoll',
    'jquery/jquery-1.11.1.min',
    'game/level13',
], function(Fixes, KeyPoll, jQuery, Level13) {
        'use strict';
        
        function Level13App() {
            
                // Game initialisation
                this.initialise = function() {

                        // init keyboard poll
                        KeyPoll.initialise(window);
        
                        var level13 = new Level13();
                        level13.start();
                        
                        var enableCheats = document.URL.indexOf("file:///") >= 0;
                        if (enableCheats) {
                                window.app = level13;
                        }
            };
        }

        // start!
        new Level13App().initialise();
    }
);
