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
        
        getPath: function (pos1, pos2, blockedByBlockers) {
            if (!this.paths) return null;
            var key = this.getPathKey(pos1, pos2, blockedByBlockers);
            return this.paths[key];
        },
        
        addPath: function (pos1, pos2, blockedByBlockers, path) {
            var key = this.getPathKey(pos1, pos2, blockedByBlockers);
            if (!this.paths) this.paths = {};
            this.paths[key] = path;
        },
        
        resetPaths: function () {
            this.paths = {};
        },
        
        getPathKey: function (pos1, pos2, blockedByBlockers) {
            var start = this.getPathStart(pos1, pos2);
            var end = this.getPathEnd(pos1, pos2);
            return start.toString() + "-" + end.toString() + (blockedByBlockers ? "-1" : "-0");
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
