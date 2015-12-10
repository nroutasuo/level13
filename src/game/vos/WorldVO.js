define(['ash'], function (Ash) {

    var WorldVO = Ash.Class.extend({
	
		seed: -1,
		levels: [],
	
        constructor: function (seed, topLevel, bottomLevel) {
			this.seed = seed;
			this.topLevel = topLevel;
			this.bottomLevel = bottomLevel;
			this.levels = [];
        },
		
		addLevel: function (l) {
			this.levels[l.level] = l;
		},
		
		getLevel: function (l) {
			return this.levels[l];
		},
		
    });

    return WorldVO;
});
