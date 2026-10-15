(function () {
	require.config({
		baseUrl: '../src',

		paths: {
			ash: "../lib/ash/ash.min",
			json: "../lib/requirejs/json",
			game: "game",
			strings: "../strings",
			test: "../test"
		},

		urlArgs: "bust=" + (new Date()).getTime(),
	});

	require([ "test/DialogueDataTests" ], function () {
		QUnit.start();
	});
}());
