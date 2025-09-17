define(['ash', 'worldcreator/SectorTemplateVO'],
function (Ash, SectorTemplateVO) {

	let LevelTemplateVO = Ash.Class.extend({
	
		constructor: function (levelVO) {
			if (!levelVO) return;

			this.level = levelVO.level;
			this.levelOrdinal = levelVO.levelOrdinal;
			this.campOrdinal = levelVO.campOrdinal;

			this.additionalCampPositions = levelVO.additionalCampPositions;
			this.campPosition = levelVO.campPosition;
			this.gangs = levelVO.gangs;
			this.habitability = levelVO.habitability;
			this.isCampable = levelVO.isCampable;
			this.isHard = levelVO.isHard;
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
			this.raidDangerFactor = levelVO.raidDangerFactor;
			this.seaPadding = levelVO.seaPadding;
			this.stageCenterPositions = levelVO.stageCenterPositions;
			
			this.sectors = [];

			for (let s = 0; s < levelVO.sectors.length; s++) {
				this.sectors.push(new SectorTemplateVO(levelVO.sectors[s]));
			}
		},
		
		getCustomSaveObject: function () {
			let copy = {};

			copy.level = this.level;
			copy.levelOrdinal = this.levelOrdinal;
			copy.campOrdinal = this.campOrdinal;

			copy.additionalCampPositions = this.additionalCampPositions;
			copy.campPosition = this.campPosition;
			copy.gangs = this.gangs;
			copy.habitability = this.habitability;
			copy.isCampable = this.isCampable;
			copy.isHard = this.isHard;
			copy.luxuryResources = this.luxuryResources;
			copy.maxX = this.maxX;
			copy.maxY = this.maxY;
			copy.minX = this.minX;
			copy.minY = this.minY;
			copy.notCampableReason = this.notCampableReason;
			copy.numInvestigateSectors = this.numInvestigateSectors;
			copy.numSectors = this.numSectors;
			copy.numSectorsByStage = this.numSectorsByStage;
			copy.passageDownPosition = this.passageDownPosition;
			copy.passageDownType = this.passageDownType;
			copy.passagePositions = this.passagePositions;
			copy.passageUpPosition = this.passageUpPosition;
			copy.passageUpType = this.passageUpType;
			copy.raidDangerFactor = this.raidDangerFactor;
			copy.seaPadding = this.seaPadding;
			copy.stageCenterPositions = this.stageCenterPositions;

			copy.sectors = [];

			for (let s = 0; s < this.sectors.length; s++) {
				copy.sectors.push(this.sectors[s].getCustomSaveObject());
			}

			return copy;
		},

		customLoadFromSave: function (saveObject) {
			this.level = saveObject.level;
			this.levelOrdinal = saveObject.levelOrdinal;
			this.campOrdinal = saveObject.campOrdinal;

			this.additionalCampPositions = saveObject.additionalCampPositions;
			this.campPosition = saveObject.campPosition;
			this.gangs = saveObject.gangs;
			this.habitability = saveObject.habitability;
			this.isCampable = saveObject.isCampable;
			this.isHard = saveObject.isHard;
			this.luxuryResources = saveObject.luxuryResources;
			this.maxX = saveObject.maxX;
			this.maxY = saveObject.maxY;
			this.minX = saveObject.minX;
			this.minY = saveObject.minY;
			this.notCampableReason = saveObject.notCampableReason;
			this.numInvestigateSectors = saveObject.numInvestigateSectors;
			this.numSectors = saveObject.numSectors;
			this.numSectorsByStage = saveObject.numSectorsByStage;
			this.passageDownPosition = saveObject.passageDownPosition;
			this.passageDownType = saveObject.passageDownType;
			this.passagePositions = saveObject.passagePositions;
			this.passageUpPosition = saveObject.passageUpPosition;
			this.passageUpType = saveObject.passageUpType;
			this.raidDangerFactor = saveObject.raidDangerFactor;
			this.seaPadding = saveObject.seaPadding;
			this.stageCenterPositions = saveObject.stageCenterPositions;
			
			this.sectors = [];

			for (let s = 0; s < saveObject.sectors.length; s++) {
				this.sectors[s] = new SectorTemplateVO();
				this.sectors[s].customLoadFromSave(saveObject.sectors[s]);
			}
		},		
		
	});

	return LevelTemplateVO;
});
