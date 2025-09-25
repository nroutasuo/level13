define(['ash', 'game/constants/WorldConstants', 'game/vos/ResourcesVO', 'game/vos/EnvironmentalHazardsVO', 'game/vos/LocaleVO', 'game/vos/PositionVO'],
function (Ash, WorldConstants, ResourcesVO, EnvironmentalHazardsVO, LocaleVO, PositionVO) {

	let SectorTemplateVO = Ash.Class.extend({

		DEFAULT_TEXTURE_VALUE: 5,
		DEFAULT_STAGE: WorldConstants.CAMP_STAGE_LATE,
	
		constructor: function (sectorVO) {
			if (!sectorVO) return;

			this.position = sectorVO.position;
			this.level = sectorVO.level;

			this.buildingDensity = sectorVO.buildingDensity;
			this.damage = sectorVO.damage;
			this.examineSpots = sectorVO.examineSpots;
			this.hasClearableWorkshop = sectorVO.hasClearableWorkshop;
			this.hasBuildableWorkshop = sectorVO.hasBuildableWorkshop;
			this.hasHeap = sectorVO.hasHeap;
			this.hasSpring = sectorVO.hasSpring;
			this.hasTradeConnectorSpot = sectorVO.hasTradeConnectorSpot;
			this.hasWorkshop = sectorVO.hasWorkshop;
			this.hazards = sectorVO.hazards;
			this.heapResource = sectorVO.heapResource;
			this.isCamp = sectorVO.isCamp;
			this.isInvestigatable = sectorVO.isInvestigatable;
			this.isPassageDown = sectorVO.isPassageDown;
			this.isPassageUp = sectorVO.isPassageUp;
			this.itemsScavengeable = sectorVO.itemsScavengeable;
			this.locales = sectorVO.locales;
			this.movementBlockers = sectorVO.movementBlockers;
			this.numLocaleEnemies = sectorVO.numLocaleEnemies;
			this.passageDownType = sectorVO.passageDownType;
			this.passageUpType = sectorVO.passageUpType;
			this.resourcesCollectable = sectorVO.resourcesCollectable;
			this.scavengeDifficulty = sectorVO.scavengeDifficulty;
			this.sectorType = sectorVO.sectorType;
			this.stage = sectorVO.stage;
			this.stashes = sectorVO.stashes;
			this.sunlit = sectorVO.sunlit;
			this.wear = sectorVO.wear;
			this.workshopResource = sectorVO.workshopResource;
			this.zone = sectorVO.zone;
		},
		
		getCustomSaveObject: function () {
			let copy = {};

			copy.pos = this.position.getCustomSaveObjectWithoutCamp();

			if (this.buildingDensity !== this.DEFAULT_TEXTURE_VALUE) copy.t_bd = this.buildingDensity;
			if (this.damage) copy.damage = this.damage;
			if (this.examineSpots.length > 0) copy.examineSpots = this.examineSpots;
			if (this.hasClearableWorkshop) copy.hasClearableWorkshop = this.hasClearableWorkshop;
			if (this.hasBuildableWorkshop) copy.hasBuildableWorkshop = this.hasBuildableWorkshop;
			if (this.hasHeap) copy.hasHeap = this.hasHeap;
			if (this.hasSpring) copy.hasSpring = this.hasSpring;
			if (this.hasTradeConnectorSpot) copy.hasTradeConnectorSpot = this.hasTradeConnectorSpot;
			if (this.hasWorkshop) copy.hasWorkshop = this.hasWorkshop;
			copy.hazards = this.hazards.getCustomSaveObject();
			if (this.heapResource) copy.heapResource = this.heapResource;
			if (this.isCamp) copy.isCamp = this.isCamp ? 1 : 0;
			if (this.isInvestigatable) copy.isInvestigatable = this.isInvestigatable ? 1 : 0;
			if (this.isPassageDown) copy.isPassageDown = this.isPassageDown ? 1 : 0;
			if (this.isPassageUp) copy.isPassageUp = this.isPassageUp ? 1 : 0;
			if (this.itemsScavengeable.length > 0) copy.itemsScavengeable = this.itemsScavengeable;
			if (this.locales.length > 0) {
				copy.locales = [];
				for (let i = 0; i < this.locales.length; i++) {
					copy.locales.push(this.locales[i].getCustomSaveObject());
				}
			}
			if (Object.keys(this.movementBlockers).length > 0) copy.movementBlockers = this.movementBlockers;
			if (Object.keys(this.numLocaleEnemies).length > 0)copy.numLocaleEnemies = this.numLocaleEnemies;
			if (this.passageDownType) copy.passageDownType = this.passageDownType;
			if (this.passageUpType) copy.passageUpType = this.passageUpType;
			if (this.resourcesCollectable.getTotal() > 0) copy.rc = this.resourcesCollectable.getCustomSaveObject();
			copy.sd = this.scavengeDifficulty;
			copy.t = this.sectorType;
			if (this.stage != this.DEFAULT_STAGE) copy.stage = this.stage;
			if (this.stashes.length > 0) copy.stashes = this.stashes;
			if (this.sunlit) copy.sunlit = this.sunlit;
			if (this.wear) copy.wear = this.wear;
			if (this.workshopResource) copy.workshopResource = this.workshopResource;
			copy.zone = this.zone;

			return copy;
		},

		customLoadFromSave: function (saveObject) {
			this.position = new PositionVO();
			this.position.customLoadFromSave(saveObject.pos);
			this.level = this.position.level;

			this.buildingDensity = saveObject.t_bd || this.DEFAULT_TEXTURE_VALUE;
			this.damage = saveObject.damage || 0;
			this.examineSpots = saveObject.examineSpots || [];
			this.hasBuildableWorkshop = saveObject.hasBuildableWorkshop || false;
			this.hasClearableWorkshop = saveObject.hasClearableWorkshop || false;
			this.hasHeap = saveObject.hasHeap ? true : false;
			this.hasSpring = saveObject.hasSpring || false;
			this.hasTradeConnectorSpot = saveObject.hasTradeConnectorSpot || false;
			this.hasWorkshop = saveObject.hasWorkshop || false;
			this.hazards = new EnvironmentalHazardsVO();
			this.hazards.customLoadFromSave(saveObject.hazards);
			this.heapResource = saveObject.heapResource || null;
			this.isCamp = saveObject.isCamp ? true : false;
			this.isInvestigatable = saveObject.isInvestigatable ? true : false;
			this.isPassageDown = saveObject.isPassageDown ? true : false;
			this.isPassageUp = saveObject.isPassageUp ? true : false;
			this.itemsScavengeable = saveObject.itemsScavengeable || [];
			this.locales = [];
			if (saveObject.locales) {
				for (let i = 0; i < saveObject.locales.length; i++) {
					let localeVO = new LocaleVO();
					localeVO.customLoadFromSave(saveObject.locales[i]);
					this.locales.push(localeVO);
				}
			}
			this.movementBlockers = saveObject.movementBlockers || {};
			this.numLocaleEnemies = saveObject.numLocaleEnemies || {};
			this.passageDownType = saveObject.passageDownType || null;
			this.passageUpType = saveObject.passageUpType || null;
			this.resourcesCollectable = new ResourcesVO();
			this.resourcesCollectable.customLoadFromSave(saveObject.rc);
			this.scavengeDifficulty = saveObject.sd || 0;
			this.sectorType = saveObject.t;
			this.stage = saveObject.stage || this.DEFAULT_STAGE;
			this.stashes = saveObject.stashes || [];
			this.sunlit = saveObject.sunlit ? saveObject.sunlit : 0;
			this.wear = saveObject.wear || 0;
			this.workshopResource = saveObject.workshopResource || null;
			this.zone = saveObject.zone;
		},
		
	});

	return SectorTemplateVO;
});
