// subset of WorldVO that is saved after generation and can be used as input to world generation 
// represents the data about a world that should not change even between versions
define(['ash', 'worldcreator/LevelTemplateVO'], function (Ash, LevelTemplateVO) {

	let WorldTemplateVO = Ash.Class.extend({
	
		constructor: function (worldVO) {
			if (!worldVO) return;
			
			this.seed = worldVO.seed;
			this.topLevel = worldVO.topLevel;
			this.bottomLevel = worldVO.bottomLevel;

			this.campPositions = worldVO.campPositions;
			this.passagePositions = worldVO.passagePositions;
			this.passageTypes = worldVO.passageTypes;

			this.levels = [];
			
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

			copy.levels = [];
			
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				copy.levels[l] = this.levels[l].getCustomSaveObject();
			}

			return copy;
		},

		customLoadFromSave: function (saveObject) {
			this.seed = saveObject.seed;
			this.topLevel = saveObject.topLevel;
			this.bottomLevel = saveObject.bottomLevel;
			
			this.campPositions = saveObject.campPositions;
			this.passagePositions = saveObject.passagePositions;
			this.passageTypes = saveObject.passageTypes;
			
			this.levels = [];
			for (let l = this.topLevel; l >= this.bottomLevel; l--) {
				this.levels[l] = new LevelTemplateVO();
				this.levels[l].customLoadFromSave(saveObject.levels[l]);
			}
		},
		
	});

	return WorldTemplateVO;
});
