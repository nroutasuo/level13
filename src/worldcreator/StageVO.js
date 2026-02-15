define(['ash'], function (Ash) {

	let StageVO = Ash.Class.extend({
		
		constructor: function (campOrdinal, stage, levels, numSectors) {
			this.campOrdinal = campOrdinal;
			this.stage = stage;
			this.levels = levels;
			this.numSectors = numSectors;
		},
		
		spansLevel: function (level) {
			return this.levels.indexOf(level) >= 0;
		}
		
	});
	
	return StageVO;
});
