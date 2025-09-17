// result of world generation, used to create level and sector entities
define(['ash'], function (Ash) {

	let WorldVO = Ash.Class.extend({
	
		constructor: function (seed, topLevel, bottomLevel) {
			this.seed = seed;
			this.topLevel = topLevel;
			this.bottomLevel = bottomLevel;
			
			this.campPositions = {}; // level -> position
			this.districts = []; // level -> list of DistrictVO
			this.examineSpotsPerLevel = {}; // level -> list of ids
			this.features = []; // list of WorldFeatureVO
			this.passagePositions = []; // level -> { up: PositionVO, down: PositionVO }
			this.passageTypes = []; // level -> { up: string, down: string }
			this.stages = []; // list of StageVO
			
			this.levels = []; // level -> levelVO

			this.resetCaches();
		},

		resetPaths: function () {
			this.pathsAny = {};
			this.pathsLatest = {};

			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				let levelVO = this.levels[l];
				if (levelVO) levelVO.resetPaths();
			}
		},

		resetCaches: function () {
			this.pathsAny = {};
			this.pathsLatest = {};

			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				let levelVO = this.levels[l];
				if (levelVO) levelVO.resetCaches();
			}
		},
		
		getLevel: function (l) {
			return this.levels[l];
		},
		
		getStages: function (level) {
			let result = [];
			for (let i = 0; i < this.stages.length; i++) {
				var stage = this.stages[i];
				if (stage.spansLevel(level)) {
					result.push(stage);
				}
			}
			return result;
		},
		
		getFeaturesByPos: function (pos) {
			let result = [];
			for (let i = 0; i < this.features.length; i++) {
				if (this.features[i].containsPosition(pos)) {
					result.push(this.features[i]);
				}
			}
			return result;
		},
		
		getFeaturesByType: function (type) {
			let result = [];
			for (let i = 0; i < this.features.length; i++) {
				if (this.features[i].type == type) {
					result.push(this.features[i]);
				}
			}
			return result;
		},
		
		getPath: function (pos1, pos2, blockedByBlockers, stage, anyPath) {
			let map = anyPath ? this.pathsAny : this.pathsLatest;
			if (!map) return null;
			var key = this.getPathKey(pos1, pos2, blockedByBlockers, stage);
			return map[key];
		},
		
		addPath: function (pos1, pos2, blockedByBlockers, stage, path) {
			var key = this.getPathKey(pos1, pos2, blockedByBlockers, stage);
			if (!this.pathsAny) this.pathsAny = {};
			if (!this.pathsLatest) this.pathsLatest = {};
			this.pathsAny[key] = path;
			this.pathsLatest[key] = path;
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

		getPassageUp: function (level, sectorX, sectorY) {
			var sectorVO = this.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageUpType) return sectorVO.passageUpType;
			return null;
		},

		getPassageDown: function (level, sectorX, sectorY) {
			var sectorVO = this.getLevel(level).getSector(sectorX, sectorY);
			if (sectorVO.passageDownType) return sectorVO.passageDownType;
			return null;
		},
		
	});

	return WorldVO;
});
