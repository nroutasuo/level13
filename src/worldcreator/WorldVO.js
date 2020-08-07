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
            this.districts = [];
            
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
        
        getFeaturesByPos: function (pos) {
            var result = [];
            for (var i = 0; i < this.features.length; i++) {
                if (this.features[i].containsPosition(pos)) {
                    result.push(this.features[i]);
                }
            }
            return result;
        },
        
        getFeaturesByType: function (type) {
            var result = [];
            for (var i = 0; i < this.features.length; i++) {
                if (this.features[i].type == type) {
                    result.push(this.features[i]);
                }
            }
            return result;
        },
        
        getPath: function (pos1, pos2, blockedByBlockers, stage) {
            if (!this.paths) return null;
            var key = this.getPathKey(pos1, pos2, blockedByBlockers, stage);
            return this.paths[key];
        },
        
        addPath: function (pos1, pos2, blockedByBlockers, stage, path) {
            var key = this.getPathKey(pos1, pos2, blockedByBlockers, stage);
            if (!this.paths) this.paths = {};
            this.paths[key] = path;
        },
        
        resetPaths: function () {
            this.paths = {};
        },
        
        getPathKey: function (pos1, pos2, blockedByBlockers, stage) {
            var start = this.getPathStart(pos1, pos2);
            var end = this.getPathEnd(pos1, pos2);
            return start.toString() + "-" + end.toString() + (blockedByBlockers ? "-1" : "-0") + (stage ? stage : "-");
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
