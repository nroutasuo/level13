// marks the sector as having a workshop and defines the resource associated with the workshop
// a workshop can be clearable (fight enemies to use) or buildable (requires building project to use)
define(['ash'], function (Ash) {
	var WorkshopComponent = Ash.Class.extend({
		
		resource: null,
		isClearable: false,
		isBuildable: false,
		
		constructor: function (resourceName, isClearable, isBuildable) {
			this.resource = resourceName;
			this.isClearable = isClearable;
			this.isBuildable = isBuildable;
		},
		
	});

	return WorkshopComponent;
});
