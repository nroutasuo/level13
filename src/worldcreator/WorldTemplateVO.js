// subset of WorldVO that is saved after generation and can be used as input to world generation to ensure backwards compability and world consistency across versions
define(['ash', 'worldcreator/LevelTemplateVO', 'game/vos/PositionVO', 'worldcreator/WorldFeatureVO'], function (Ash, LevelTemplateVO, PositionVO, WorldFeatureVO) {

	let WorldTemplateVO = Ash.Class.extend({
	
		constructor: function (worldVO) {
			if (!worldVO) return;
			
			this.seed = worldVO.seed;
			this.version = worldVO.version;
			this.topLevel = worldVO.topLevel;
			this.bottomLevel = worldVO.bottomLevel;

			this.campPositions = worldVO.campPositions;
			this.features = worldVO.features;
			this.levelCenterPositions = worldVO.levelCenterPositions;
			this.passagePositions = worldVO.passagePositions;
			this.passageTypes = worldVO.passageTypes;

			this.levels = {};
			
			for (let l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
				this.levels[l] = new LevelTemplateVO(worldVO.levels[l]);
			}
		},
		
		getCustomSaveObject: function () {
			let copy = {};

			copy.seed = this.seed;
			copy.version = this.version;
			copy.topLevel = this.topLevel;
			copy.bottomLevel = this.bottomLevel;
			
			copy.campPositions = this.campPositions;
			copy.levelCenterPositions = this.levelCenterPositions;
			copy.passagePositions = this.passagePositions;
			copy.passageTypes = this.passageTypes;

			copy.levels = {};
			
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				copy.levels[l] = this.levels[l].getCustomSaveObject();
			}

			copy.features = [];
			for (let i = 0; i < this.features.length; i++) {
				copy.features[i] = this.features[i].getCustomSaveObject();
			}

			return copy;
		},

		customLoadFromSave: function (saveObject) {
			this.seed = saveObject.seed;
			this.version = saveObject.version;
			this.topLevel = saveObject.topLevel;
			this.bottomLevel = saveObject.bottomLevel;
			
			this.campPositions = [];
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				let saveObjectCampPosition = saveObject.campPositions[l];
				if (saveObjectCampPosition) {
					this.campPositions[l] = new PositionVO();
					this.campPositions[l].customLoadFromSave(saveObjectCampPosition);
				} else {
					this.campPositions[l] = null;
				}
			}
			
			this.levelCenterPositions = {};
			for (let l in saveObject.levelCenterPositions) {
				let saveObjectPosition = saveObject.levelCenterPositions[l];
				if (saveObjectPosition) {
					this.levelCenterPositions[l] = new PositionVO();
					this.levelCenterPositions[l].customLoadFromSave(saveObjectPosition);
				}
			}

			this.passagePositions = {};
			for (let i in saveObject.passagePositions) {
				let saveObjectPassagePositions = saveObject.passagePositions[i];
				if (!saveObjectPassagePositions) continue;
				let passagePositions = {};

				if (saveObjectPassagePositions.up) {
					passagePositions.up = new PositionVO();
					passagePositions.up.customLoadFromSave(saveObjectPassagePositions.up);
				} else {
					passagePositions.up = null;
				}

				if (saveObjectPassagePositions.down) {
					passagePositions.down = new PositionVO();
					passagePositions.down.customLoadFromSave(saveObjectPassagePositions.down);
				} else {
					passagePositions.down = null;
				}

				this.passagePositions[i] = passagePositions;
			}

			this.passageTypes = saveObject.passageTypes;
			
			this.levels = {};
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				let levelData = saveObject.levels[l];
				this.levels[l] = new LevelTemplateVO();
				this.levels[l].customLoadFromSave(levelData);
			}

			this.features = [];
			for (let i = 0; i < saveObject.features.length; i++) {
				this.features[i] = new WorldFeatureVO();
				this.features[i].customLoadFromSave(saveObject.features[i]);
			}
		},
		
	});

	return WorldTemplateVO;
});
