require.config({

    deps: ["level13-app"],

    waitSeconds: 10,

    baseUrl: 'src',

    paths: {
        brejep: "../lib/brejep",
        ash: "../lib/ash/ash.min",
        jquery: "../lib/jquery/",
        lzstring: "../lib/lzstring",
        utils: "utils",
        game: "game"
    },

    config: {
        'level13-app': {
            'isDebugVersion': false,
            'isCheatsEnabled': false,
            'isDebugOutputEnabled': false,
            'isAutosaveEnabled': true,
        }
    }

});
