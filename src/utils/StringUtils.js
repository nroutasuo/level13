define(['game/vos/PositionVO'], function (PositionVO) {
	
	var StringUtils = {
		
		getPosition: function (s) {
			var l = parseInt(s.split(".")[0]);
			var sX = parseInt(s.split(".")[1]);
			var sY = parseInt(s.split(".")[2]);
			return new PositionVO(l, sX, sY);
		},
		
		getExceptionDescription: function (ex) {
			var title = (ex.name ? ex.name : "Unknown") + ": " + (ex.message ? ex.message : "No message");
			var stack = (ex.stack ? ex.stack : "Not available");
			var stackParts = stack.split("\n");

			// track to ga
			var shortstack = stackParts[0];
			if (stackParts.length > 0) shortstack += " " + stackParts[1];
			shortstack = shortstack.replace(/\s+/g, ' ');
			shortstack = shortstack.replace(/\(.*:[\/\\]+.*[\/\\]/g, '(');

			return { title: title, shortstack: shortstack, stack: stack };
		},
		
		encodeURI: function (s) {
			return encodeURI(s).replace(/\'/g, "%27");
		}
		
	};

	return StringUtils;
});
