// subset of WorldVO that is saved after generation and can be used as input to world generation to ensure backwards compability and world consistency across versions
define(['ash', 'worldcreator/LevelTemplateVO', 'game/vos/PositionVO'], function (Ash, LevelTemplateVO, PositionVO) {

	let WorldTemplateVO = Ash.Class.extend({
	
		constructor: function (worldVO) {
			if (!worldVO) return;
			
			this.seed = worldVO.seed;
			this.topLevel = worldVO.topLevel;
			this.bottomLevel = worldVO.bottomLevel;

			this.campPositions = worldVO.campPositions;
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
			copy.topLevel = this.topLevel;
			copy.bottomLevel = this.bottomLevel;
			
			copy.campPositions = this.campPositions;
			copy.passagePositions = this.passagePositions;
			copy.passageTypes = this.passageTypes;

			copy.levels = {};
			
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				copy.levels[l] = this.levels[l].getCustomSaveObject();
			}

			return copy;
		},

		customLoadFromSave: function (saveObject) {
			this.seed = saveObject.seed;
			this.topLevel = saveObject.topLevel;
			this.bottomLevel = saveObject.bottomLevel;
			
			this.campPositions = [];
			for (let i in saveObject.campPositions) {
				let saveObjectCampPosition = saveObject.campPositions[i];
				if (saveObjectCampPosition) {
					this.campPositions[i] = new PositionVO();
					this.campPositions[i].customLoadFromSave(saveObjectCampPosition);
				} else {
					this.campPositions[i] = null;
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
		},
		
	});

	return WorldTemplateVO;
});
