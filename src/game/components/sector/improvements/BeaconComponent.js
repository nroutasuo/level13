// marks the sector as having a becon
define(['ash'], function (Ash) {
	
	var BeaconComponent = Ash.Class.extend({
		
		constructor: function () {},

		getSaveKey: function () {
			return "Beacon";
		},
		
	});

	return BeaconComponent;
});
