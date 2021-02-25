// Defines a path constraint used by the WorldBuilder
define(['ash'], function (Ash) {

	var PathConstraintVO = Ash.Class.extend({
	
		startPosition: null,
		maxLength: 0,
		pathType: null,
	
		constructor: function (startPosition, maxLength, pathType) {
			this.startPosition = startPosition;
			this.maxLength = maxLength;
			this.pathType = pathType;
		},
	});

	return PathConstraintVO;
});
