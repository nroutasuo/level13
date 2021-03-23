// A component that describes features of a sector, both functional (ability to build stuff)
// and purely aesthetic (description)
define(['ash'], function (Ash) {

	var SectorLocalesComponent = Ash.Class.extend({
		
		locales: [],
		
		constructor: function (locales) {
			this.locales = locales;
		},
		
	});

	return SectorLocalesComponent;
});
