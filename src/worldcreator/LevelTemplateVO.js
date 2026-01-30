define(['ash', 'worldcreator/SectorTemplateVO', 'game/vos/PositionVO'],
function (Ash, SectorTemplateVO, PositionVO) {

	let LevelTemplateVO = Ash.Class.extend({
	
		constructor: function (levelVO) {
			if (!levelVO) return;

			this.level = levelVO.level;
			this.version = levelVO.version;
			this.levelOrdinal = levelVO.levelOrdinal;
			this.campOrdinal = levelVO.campOrdinal;

			this.additionalCampPositions = levelVO.additionalCampPositions;
			this.campPosition = levelVO.campPosition;
			this.gangs = levelVO.gangs;
			this.habitability = levelVO.habitability;
			this.isCampable = levelVO.isCampable;
			this.isHard = levelVO.isHard;
			this.levelStyle = levelVO.levelStyle;
			this.luxuryResources = levelVO.luxuryResources;
			this.maxX = levelVO.maxX;
			this.maxY = levelVO.maxY;
			this.minX = levelVO.minX;
			this.minY = levelVO.minY;
			this.notCampableReason = levelVO.notCampableReason;
			this.numInvestigateSectors = levelVO.numInvestigateSectors;
			this.numSectors = levelVO.numSectors;
			this.numSectorsByStage = levelVO.numSectorsByStage;
			this.passageDownPosition = levelVO.passageDownPosition;
			this.passageDownType = levelVO.passageDownType;
			this.passagePositions = levelVO.passagePositions;
			this.passageUpPosition = levelVO.passageUpPosition;
			this.passageUpType = levelVO.passageUpType;
			this.predefinedExplorers = levelVO.predefinedExplorers;
			this.workshopPositions = levelVO.workshopPositions;
			this.workshopResource = levelVO.workshopResource;
			
			this.sectors = [];

			for (let s = 0; s < levelVO.sectors.length; s++) {
				this.sectors.push(new SectorTemplateVO(levelVO.sectors[s]));
			}
		},
		
		getCustomSaveObject: function () {
			let copy = {};

			copy.level = this.level;
			copy.version = this.version;
			copy.levelOrdinal = this.levelOrdinal;
			copy.campOrdinal = this.campOrdinal;

			copy.additionalCampPositions = this.additionalCampPositions;
			if (this.campPosition) copy.campPosition = this.campPosition.getCustomSaveObject();
			copy.gangs = this.gangs;
			copy.habitability = this.habitability;
			copy.isCampable = this.isCampable;
			copy.isHard = this.isHard;
			copy.levelStyle = this.levelStyle;
			copy.luxuryResources = this.luxuryResources;
			copy.maxX = this.maxX;
			copy.maxY = this.maxY;
			copy.minX = this.minX;
			copy.minY = this.minY;
			copy.notCampableReason = this.notCampableReason;
			copy.numInvestigateSectors = this.numInvestigateSectors;
			copy.numSectors = this.numSectors;
			copy.numSectorsByStage = this.numSectorsByStage;
			if (this.passageDownPosition) copy.passageDownPosition = this.passageDownPosition.getCustomSaveObjectWithoutCamp();
			copy.passageDownType = this.passageDownType;
			if (this.passageUpPosition) copy.passageUpPosition = this.passageUpPosition.getCustomSaveObjectWithoutCamp();
			copy.passageUpType = this.passageUpType;
			if (this.predefinedExplorers.length > 0) copy.predefinedExplorers = this.predefinedExplorers;
			if (this.workshopResource) copy.workshopResource = this.workshopResource;
			if (this.workshopPositions) copy.workshopPositions = this.workshopPositions;

			copy.sectors = [];

			for (let s = 0; s < this.sectors.length; s++) {
				copy.sectors.push(this.sectors[s].getCustomSaveObject());
			}

			return copy;
		},

		customLoadFromSave: function (saveObject) {
			if (!saveObject) return;
			
			this.level = saveObject.level;
			this.version = saveObject.version;
			this.levelOrdinal = saveObject.levelOrdinal;
			this.campOrdinal = saveObject.campOrdinal;

			this.additionalCampPositions = saveObject.additionalCampPositions;
			this.campPosition = saveObject.campPosition ? new PositionVO() : null;
			if (saveObject.campPosition) this.campPosition.customLoadFromSave(saveObject.campPosition);
			this.gangs = saveObject.gangs;
			this.habitability = saveObject.habitability;
			this.isCampable = saveObject.isCampable;
			this.isHard = saveObject.isHard;
			this.levelStyle = saveObject.levelStyle;
			this.luxuryResources = saveObject.luxuryResources;
			this.maxX = saveObject.maxX;
			this.maxY = saveObject.maxY;
			this.minX = saveObject.minX;
			this.minY = saveObject.minY;
			this.notCampableReason = saveObject.notCampableReason;
			this.numInvestigateSectors = saveObject.numInvestigateSectors;
			this.numSectors = saveObject.numSectors;
			this.numSectorsByStage = saveObject.numSectorsByStage;

			this.passageDownPosition = null;
			if (saveObject.passageDownPosition) {
				this.passageDownPosition = new PositionVO();
				this.passageDownPosition.customLoadFromSave(saveObject.passageDownPosition);
			}
			this.passageDownType = saveObject.passageDownType;

			this.passageUpPosition = null;
			if (saveObject.passageUpPosition) {
				this.passageUpPosition = new PositionVO();
				this.passageUpPosition.customLoadFromSave(saveObject.passageUpPosition);
			}
			this.passageUpType = saveObject.passageUpType;

			this.predefinedExplorers = saveObject.predefinedExplorers || [];
			this.workshopResource = saveObject.workshopResource || null;
			this.workshopPositions = saveObject.workshopPositions || null;
			
			this.sectors = [];

			for (let s = 0; s < saveObject.sectors.length; s++) {
				this.sectors[s] = new SectorTemplateVO();
				this.sectors[s].customLoadFromSave(saveObject.sectors[s]);
			}

			this.passagePositions = [];
			if (this.passageUpPosition) this.passagePositions.push(this.passageUpPosition);
			if (this.passageDownPosition) this.passagePositions.push(this.passageDownPosition);
		},		
		
	});

	return LevelTemplateVO;
});
