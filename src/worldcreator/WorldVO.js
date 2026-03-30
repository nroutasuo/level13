// result of world generation, used to create level and sector entities
define(['ash', 'worldcreator/WorldCreatorConstants'], function (Ash, WorldCreatorConstants) {

	let WorldVO = Ash.Class.extend({
	
		constructor: function (seed, version) {
			this.seed = seed;
			this.version = version; // version originally generated in
			this.topLevel = 1;
			this.bottomLevel = 0;
			
			this.campPositions = {}; // level -> position
			this.examineSpotsPerLevel = {}; // level -> list of ids
			this.features = []; // list of WorldFeatureVO
			this.levelCenterPositions = {}; // level -> PositionVO
			this.passagePositions = {}; // level -> { up: PositionVO, down: PositionVO }
			this.passageTypes = {}; // level -> { up: string, down: string }
			this.requiredPositions = {}; // level -> list of positions (can be empty)
			this.stages = []; // list of StageVO
			
			this.levels = {}; // level -> levelVO

			this.resetCaches();
		},

		// called at the end of a world creation step
		resetPaths: function () {
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				let levelVO = this.levels[l];
				if (levelVO) levelVO.resetPaths();
			}
		},

		// called at the end of a world creation call
		resetInternalData: function () {
			this.featuresByPosition = [];
			
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				let levelVO = this.levels[l];
				if (levelVO) levelVO.resetInternalData();
			}
		},

		// called after entities have been generated
		resetCaches: function () {
			this.featuresByPosition = [];

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
		
		getFeaturesByLevel: function (level) {
			let result = [];
			for (let i = 0; i < this.features.length; i++) {
				if (this.features[i].spansLevel(level)) {
					result.push(this.features[i]);
				}
			}
			return result;
		},
		
		getFeatureTypesByPos: function (pos) {
			if (this.featuresByPosition[pos.level] && this.featuresByPosition[pos.level][pos.sectorX] && this.featuresByPosition[pos.level][pos.sectorX][pos.sectorY]) {
				return this.featuresByPosition[pos.level][pos.sectorX][pos.sectorY];
			}

			let result = [];

			for (let i = 0; i < this.features.length; i++) {
				let featureVO = this.features[i];
				if (featureVO.containsPosition(pos)) {
					result.push(featureVO.type);
				} else if (featureVO.bordersPosition(pos)) {
					let edgeFeature = WorldCreatorConstants.getEdgeFeature(featureVO.type);
					if (edgeFeature) {
						result.push(edgeFeature);
					}
				}
			}

			if (!this.featuresByPosition[pos.level]) this.featuresByPosition[pos.level] = [];
			if (!this.featuresByPosition[pos.level][pos.sectorX]) this.featuresByPosition[pos.level][pos.sectorX] = [];
			this.featuresByPosition[pos.level][pos.sectorX][pos.sectorY] = result;

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

		getFeature: function (level, sectorX, sectorY) {
			let pos = { level: level, sectorX: sectorX, sectorY: sectorY };

			for (let i = 0; i < this.features.length; i++) {
				let feature = this.features[i];
				if (feature.containsPosition(pos)) {
					return feature;
				}
			}
			
			return false;
		}
		
	});

	return WorldVO;
});
