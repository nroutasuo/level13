require.config({

    deps: ["level13-app"],
    
    waitSeconds: 10,
    
    baseUrl: 'src',

    paths: {
        brejep: "../lib/brejep",
        webtoolkit: "../lib/webtoolkit",
        ash: "../lib/ash/ash.min",
        jquery: "../lib/jquery/",
        utils: "utils",
        game: "game"
    },
    
    config: {
        'level13-app': {
            'isCheatsEnabled': false,
            'isDebugOutputEnabled': false,
        }
    }
    
});
