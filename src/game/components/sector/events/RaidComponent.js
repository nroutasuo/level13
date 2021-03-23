// Marks the containing sector (camp) entity as having the raid event currently and contains information related to that event
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
	
	var RaidComponent = Ash.Class.extend({
		
		victory: false,
		
		constructor: function () {
			this.resourcesLost = new ResourcesVO();
		},
	});

	return RaidComponent;
});
