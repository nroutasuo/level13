define(['ash', 'worldcreator/SectorTemplateVO', 'game/vos/PositionVO', 'worldcreator/DistrictVO'],
function (Ash, SectorTemplateVO, PositionVO, DistrictVO) {

	let LevelTemplateVO = Ash.Class.extend({
	
		constructor: function (levelVO) {
			if (!levelVO) return;

			this.level = levelVO.level;
			this.version = levelVO.version;
			this.levelOrdinal = levelVO.levelOrdinal;
			this.campOrdinal = levelVO.campOrdinal;

			this.additionalCampPositions = levelVO.additionalCampPositions;
			this.campPosition = levelVO.campPosition;
			this.diseaseFrequecyFactor = levelVO.diseaseFrequecyFactor;
			this.districts = levelVO.districts.map(d => d.clone());
			this.features = levelVO.features;
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
			this.numSectors = levelVO.numSectors;
			this.numSectorsByStage = levelVO.numSectorsByStage;
			this.passageDownPosition = levelVO.passageDownPosition;
			this.passageDownType = levelVO.passageDownType;
			this.passagePositions = levelVO.passagePositions;
			this.passageUpPosition = levelVO.passageUpPosition;
			this.passageUpType = levelVO.passageUpType;
			this.predefinedExplorers = levelVO.predefinedExplorers;
			this.raidDangerFactor  = levelVO.raidDangerFactor;
			this.seed = levelVO.seed;
			this.traderFrequencyFactor  = levelVO.traderFrequencyFactor;
			this.workerAcademicFactor = levelVO.workerAcademicFactor;
			this.workerArtisanFactor = levelVO.workerArtisanFactor;
			this.workerFoodFactor = levelVO.workerFoodFactor;
			this.workerMetalFactor = levelVO.workerMetalFactor;
			this.workerWaterFactor = levelVO.workerWaterFactor;
			this.workerHopeFactor = levelVO.workerHopeFactor;
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
			copy.districts = this.districts.map(d => d.getCustomSaveObject());
			copy.features = this.features;
			copy.gangs = this.gangs;
			copy.habitability = this.habitability;
			copy.isCampable = this.isCampable;
			copy.isHard = this.isHard;
			copy.diseaseFrequecyFactor  = this.diseaseFrequecyFactor  || 1;
			copy.levelStyle = this.levelStyle;
			copy.luxuryResources = this.luxuryResources;
			copy.maxX = this.maxX;
			copy.maxY = this.maxY;
			copy.minX = this.minX;
			copy.minY = this.minY;
			copy.notCampableReason = this.notCampableReason;
			copy.numSectors = this.numSectors;
			copy.numSectorsByStage = this.numSectorsByStage;
			if (this.passageDownPosition) copy.passageDownPosition = this.passageDownPosition.getCustomSaveObjectWithoutCamp();
			copy.passageDownType = this.passageDownType;
			if (this.passageUpPosition) copy.passageUpPosition = this.passageUpPosition.getCustomSaveObjectWithoutCamp();
			copy.passageUpType = this.passageUpType;
			if (this.predefinedExplorers.length > 0) copy.predefinedExplorers = this.predefinedExplorers;
			copy.raidDangerFactor = this.raidDangerFactor;
			copy.seed = this.seed;
			copy.traderFrequencyFactor  = this.traderFrequencyFactor;
			if (this.workshopResource) copy.workshopResource = this.workshopResource;
			if (this.workshopPositions) copy.workshopPositions = this.workshopPositions;
			copy.workerMetalFactor = this.workerMetalFactor;
			copy.workerFoodFactor = this.workerFoodFactor;
			copy.workerWaterFactor = this.workerWaterFactor;
			copy.workerArtisanFactor = this.workerArtisanFactor;
			copy.workerAcademicFactor = this.workerAcademicFactor;
			copy.workerHopeFactor = this.workerHopeFactor;

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
			this.features = saveObject.features || [];
			this.districts = saveObject.districts ? saveObject.districts.map(districtData => {
				let vo = new DistrictVO();
				vo.customLoadFromSave(districtData);
				return vo;}
			) : [];
			this.diseaseFrequecyFactor = saveObject.diseaseFrequecyFactor || 1;
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
			this.raidDangerFactor = saveObject.raidDangerFactor;
			this.seed = saveObject.seed;
			this.traderFrequencyFactor = saveObject.traderFrequencyFactor;

			this.workerMetalFactor = saveObject.workerMetalFactor || 1;
			this.workerFoodFactor = saveObject.workerFoodFactor || 1;
			this.workerWaterFactor = saveObject.workerWaterFactor || 1;
			this.workerArtisanFactor = saveObject.workerArtisanFactor || 1;
			this.workerAcademicFactor = saveObject.workerAcademicFactor || 1;
			this.workerHopeFactor = saveObject.workerHopeFactor || 1;

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
