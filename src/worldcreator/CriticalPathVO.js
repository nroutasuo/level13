define(['ash'], function (Ash) {

	var CriticalPathVO = Ash.Class.extend({
		
		constructor: function (type, startPos, endPos) {
			this.type = type;
			this.startPos = startPos;
			this.endPos = endPos;
			
			this.length = 0;
		},
		
	});

	return CriticalPathVO;
});
