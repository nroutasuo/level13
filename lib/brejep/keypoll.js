/**
 * A simple Keypoll for game-specific keys
 *
 * @author Brett Jephson
 */
define(function () {
    'use strict';

    var globalTarget;
    var keys = {};

    var onKeyDown = function (event) {
        keys[event.keyCode] = true;
    };

    var onKeyUp = function (event) {
        if (keys[event.keyCode]) {
            keys[event.keyCode] = false;
        }
    };

    // singleton class!
    // TODO better class to support singleton
    var KeyPoll = {
        VERSION: '0.1.0',

        initialise: function (target) {
            globalTarget = target;
            if (globalTarget) {
                globalTarget.addEventListener('keydown', onKeyDown);
                globalTarget.addEventListener('keyup', onKeyUp);
            }
        },

        destroy: function () {
            if (globalTarget) {
                globalTarget.removeEventListener( 'keydown', onKeyDown);
                globalTarget.removeEventListener( 'keyup', onKeyUp);
            }
        },

        up: '38',
        down: '40',
        left: '37',
        right: '39',
        fire: '32',

        isDown: function (testKey) {
            return keys[testKey];
        }
    };

    return KeyPoll;
});
