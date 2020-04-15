define(['ash'], function (Ash) {

    var WorldVO = Ash.Class.extend({
	
        constructor: function (seed, topLevel, bottomLevel) {
			this.seed = seed;
			this.topLevel = topLevel;
			this.bottomLevel = bottomLevel;
            
            this.features = [];
            this.stages = [];
            this.campPositions = [];
            this.passagePositions = [];
            this.disctricts = [];
            
			this.levels = [];
        },
		
		addLevel: function (l) {
			this.levels[l.level] = l;
		},
		
		getLevel: function (l) {
			return this.levels[l];
		},
        
        getStages: function (level) {
            var result = [];
            for (var i = 0; i < this.stages.length; i++) {
                var stage = this.stages[i];
                if (stage.spansLevel(level)) {
                    result.push(stage);
                }
            }
            return result;
        },
        
        getFeatures: function (pos) {
            var result = [];
            for (var i = 0; i < this.features.length; i++) {
                if (this.features[i].containsPosition(pos)) {
                    result.push(this.features[i]);
                }
            }
            return result;
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
