require.config({

	deps: ["level13-app"],

	waitSeconds: 30,

	baseUrl: 'src',

	paths: {
		brejep: "../lib/brejep",
		ash: "../lib/ash/ash.min",
		jquery: "../lib/jquery",
		lzstring: "../lib/lzstring",
        json: "../lib/requirejs/json",
		utils: "utils",
		game: "game",
	},

	config: {
		'level13-app': {
			'version': "0.7.1",
			'isDebugVersion': false,
			'isCheatsEnabled': false,
			'isDebugOutputEnabled': false,
			'isAutosaveEnabled': true,
			'isTrackingEnabled': true,
		}
	},
	
	urlArgs: "v=0.7.1",

});
