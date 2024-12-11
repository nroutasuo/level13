// A component that describes features of a sector, both functional (ability to build stuff)
// and purely aesthetic (description)
define(['ash'], function (Ash) {

	var SectorLocalesComponent = Ash.Class.extend({
		
		locales: [],
		
		constructor: function (locales) {
			this.locales = locales;
		},

		hasLocale: function (localeType) {
			for (let i = 0; i < this.locales.length; i++) {
				let localeVO = this.locales[i];
				if (localeVO.type == localeType) {
						return true;
				}
			}

			return false;
		}
		
	});

	return SectorLocalesComponent;
});
