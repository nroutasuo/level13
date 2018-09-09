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
        
        getPath: function (pos1, pos2) {
            var start = this.getPathStart(pos1, pos2);
            var end = this.getPathEnd(pos1, pos2);
            if (!this.paths) return null;
            if (!this.paths[start.toString()]) return null;
            return this.paths[start.toString()][end.toString()];
        },
        
        addPath: function (pos1, pos2, path) {
            var start = this.getPathStart(pos1, pos2);
            var end = this.getPathEnd(pos1, pos2);
            if (!this.paths) this.paths = {};
            if (!this.paths[start.toString()]) this.paths[start.toString()] = {};
            this.paths[start.toString()][end.toString()] = path;
        },
        
        getPathStart: function (pos1, pos2) {
            if (pos2.toInt() < pos1.toInt()) {
                return pos2;
            } else {
                return pos1;
            }
        },
        
        getPathEnd: function (pos1, pos2) {
            if (pos2.toInt() < pos1.toInt()) {
                return pos1;
            } else {
                return pos2;
            }
        },
		
    });

    return WorldVO;
});
