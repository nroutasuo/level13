define([
	'ash',
    'text/Text',
	'game/GameGlobals',
	'game/GlobalSignals',
], function (Ash, Text, GameGlobals, GlobalSignals) {
	
    let UIOutTextSystem = Ash.System.extend({


		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			GlobalSignals.add(this, GlobalSignals.pageSetUpSignal, this.onPageSetup);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
		},

		setTexts: function () {
			$.each($(".text-key"), function () {
				let key = $(this).data("text-key");
				if (!key) {
					log.w("html element with class .text-key has no text key defined");
					return;
				}
				$(this).text(Text.t(key));
			});
		},

		onPageSetup: function () {
			this.setTexts();
		},

	});

	return UIOutTextSystem;
});
