// A system that updates characters appearing in the world
define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals', 
	'game/GlobalSignals', 
	'game/constants/CampConstants', 
	'game/constants/CharacterConstants', 
	'game/constants/PositionConstants', 
	'game/constants/SectorConstants', 
	'game/constants/TradeConstants', 
	'game/constants/WorldConstants', 
	'game/components/common/PositionComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/nodes/NearestCampNode',
	'game/vos/CharacterVO'
], function (
	Ash, 
	MathUtils, 
	GameGlobals, 
	GlobalSignals, 
	CampConstants, 
	CharacterConstants, 
	PositionConstants, 
	SectorConstants, 
	TradeConstants, 
	WorldConstants,
	PositionComponent, 
	SectorFeaturesComponent, 
	SectorLocalesComponent,
	SectorStatusComponent, 
	NearestCampNode,
	CharacterVO
) {
	
	let CharacterSystem = Ash.System.extend({

		context: "CharacterSystem",

		constructor: function () { },

		lastLevelCharacterUpdate: {}, // level -> timestamp
		
		nearestCampNodes: null,

		addToEngine: function (engine) {
			this.engine = engine;

			this.nearestCampNodes = engine.getNodeList(NearestCampNode);

			GlobalSignals.add(this, GlobalSignals.gameStateReadySignal, this.onGameStateReady);
			GlobalSignals.add(this, GlobalSignals.playerLeftCampSignal, this.onPlayerLeftCamp);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged);
			GlobalSignals.add(this, GlobalSignals.playerEnteredLevelSignal, this.onPlayerEnteredLevel);
			GlobalSignals.add(this, GlobalSignals.removeCharacterSignal, this.onRemoveCharacter);
		},

		removeFromEngine: function (engine) {
			this.nearestCampNodes = null;

			GlobalSignals.removeAll(this);

			this.engine = null;
		},

		updateCurrentLevelCharacters: function () {
			if (GameGlobals.gameState.uiStatus.isFastForwarding) return;
			let playerPosition = GameGlobals.playerHelper.getPosition();
			if (!playerPosition) return;

			let level = playerPosition.level;
			let now = new Date().getTime();
			let updateCooldown = 3 * 60 * 1000;
			let lastUpdate = this.lastLevelCharacterUpdate[level] || 0;
			if (now - lastUpdate < updateCooldown) return;

			this.lastLevelCharacterUpdate[level] = now;

			let maxCharacters = this.getMaxCharactersForLevel(level);

			// update / remove existing ones

			let existingCharacters = [];

			let allSectors = GameGlobals.levelHelper.getSectorsByLevel(level);
			for (let i = 0; i < allSectors.length; i++) {
				let sector = allSectors[i];
				let sectorPosition = sector.get(PositionComponent);
				if (sectorPosition.equals(playerPosition)) continue;
				let sectorStatus = sector.get(SectorStatusComponent);

				let indicesToRemove = [];

				for (let j = 0; j < sectorStatus.currentCharacters.length; j++) {
					let character = sectorStatus.currentCharacters[j];
					let timeActive = now - character.creationTimestamp;

					if (existingCharacters.length > maxCharacters * 2) {
						indicesToRemove.push(j);
					} else if (character.numTimesSeen <= 0) {
						existingCharacters.push(character);
					} else if (timeActive < character.minTimeActive) {
						existingCharacters.push(character);
					} else if (Math.random() < 0.5) {
						existingCharacters.push(character);
					} else {					
						indicesToRemove.push(j);
					}
				}

				for (let j = indicesToRemove.length - 1; j >= 0; j--) {
					let indexToRemove = indicesToRemove[j];
					this.removeCharacterByIndex(sector, indexToRemove);
				}
			}	

			// add new ones

			let maxCharactersToAdd = maxCharacters - existingCharacters.length;

			if (maxCharactersToAdd <= 0) return;
			let numCharactersToAdd = MathUtils.randomIntBetween(1, maxCharactersToAdd + 1);
			
			for (let i = 0; i < numCharactersToAdd; i++) {
				let character = this.addCharacter(level, existingCharacters);
				existingCharacters.push(character);
			}
		},

		getMaxCharactersForLevel: function (level) {
			if (level == GameGlobals.worldState.getSurfaceLevel()) return 0;
			if (level == GameGlobals.worldState.getGroundLevel()) return 1;
			if (level == 14) return 0;

			let isCampable = GameGlobals.levelHelper.isLevelCampable(level);
			let campOrdinal = GameGlobals.worldState.getCampOrdinal(level);

			let result = 5;

			if (!isCampable) result -= 2;
			if (level < 14) result -= 1;

			if (isCampable && TradeConstants.getTradePartner(campOrdinal) != null) result += 1;
			if (level > 14) result++;

			return result;
		},

		addCharacter: function (level, existingCharacters) {
			let sector = this.selectSectorForNewCharacter(level);
			if (!sector) return;

			let characterType = this.selectTypeForNewCharacter(sector, existingCharacters);
			let dialogueSource = CharacterConstants.getDialogueSource(characterType);
			if (!dialogueSource) return;
			let dialogueSourceID = dialogueSource.id;

			// TODO set min time active per character type
			let minTimeActive = 1000 * 60 * 5;

			let characterVO = new CharacterVO(characterType, dialogueSourceID, minTimeActive);
			let statusComponent = sector.get(SectorStatusComponent);

			statusComponent.currentCharacters.push(characterVO);

			log.i("- added character [" + characterType + "] at [" + sector.get(PositionComponent).toString() + "]", this);

			return characterVO;
		},

		removeCharacterByIndex: function (sector, index) {
			let sectorStatus = sector.get(SectorStatusComponent);
			let sectorPosition = sector.get(PositionComponent);
			let character = sectorStatus.currentCharacters[index];
			sectorStatus.currentCharacters.splice(index, 1);
			log.i("- removed character [" + character.characterType + "] at [" + sectorPosition.toString() + "]");
		},

		removeCharacterByID: function (characterID) {
			let sector = GameGlobals.playerHelper.getLocation();
			let sectorStatus = sector.get(SectorStatusComponent);
			let index = -1;

			for (let i = 0; i < sectorStatus.currentCharacters.length; i++) {
				let sectorCharacterVO = sectorStatus.currentCharacters[i];
				if (sectorCharacterVO.instanceID == characterID) {
					index = i;
					break;
				}
			}

			if (index >= 0) {
				this.removeCharacterByIndex(sector, index);
			}
		},

		markCurrentLocationCharactersAsSeen: function () {
			let sector = GameGlobals.playerHelper.getLocation();
			let sectorStatus = sector.get(SectorStatusComponent);

			for (let i = 0; i < sectorStatus.currentCharacters.length; i++) {
				let sectorCharacterVO = sectorStatus.currentCharacters[i];
				sectorCharacterVO.numTimesSeen++;
			}
		},

		selectSectorForNewCharacter: function (level) {
			let playerPosition = GameGlobals.playerHelper.getPosition();

			let allSectors = GameGlobals.levelHelper.getSectorsByLevel(level);

			let isValidSector = function (sector) {
				let sectorPosition = sector.get(PositionComponent);
				if (sectorPosition.equals(playerPosition)) return false;

				let sectorFeaturesComponent = sector.get(SectorFeaturesComponent);
				if (sectorFeaturesComponent.hasHazards()) return false;
				if (sectorFeaturesComponent.campable) return false;
				
				let statusComponent = sector.get(SectorStatusComponent);
				if (statusComponent.currentCharacters.length > 0) return false;

				let neighbours = GameGlobals.levelHelper.getSectorNeighboursList(sector);
				for (let i = 0; i < neighbours.length; i++) {
					let neighbour = neighbours[i];
					let neighbourFeaturesComponent = neighbour.get(SectorFeaturesComponent);
					if (neighbourFeaturesComponent.campable) return false;
				}

				return true;
			};

			let validSectors = allSectors.filter(s => isValidSector(s));

			if (validSectors.length == 0) return null;
			
			// add a bit of randomness to the scoring between npcs
			let weightX = Math.random(0, 1);
			let weightY = Math.random(0, 1);
			let weightSpring = Math.random(0, 1);

			let scoreSector = function (sector) {
				let score = 0;

				let sectorPosition = sector.get(PositionComponent);
				let sectorFeaturesComponent = sector.get(SectorFeaturesComponent);
				let sectorLocalesComponent = sector.get(SectorLocalesComponent);
				let neighbours = GameGlobals.levelHelper.getSectorNeighboursList(sector);

				score -= Math.abs(Math.floor(sectorPosition.sectorX / 5)) * weightX;
				score -= Math.abs(Math.floor(sectorPosition.sectorY / 5)) * weightY;

				if (sectorFeaturesComponent.buildingDensity > 2 && sectorFeaturesComponent.buildingDensity < 8) score += 1;
				if (sectorFeaturesComponent.hasFeature(WorldConstants.FEATURE_TRAIN_TRACKS_NEW) || sectorFeaturesComponent.hasFeature(WorldConstants.FEATURE_TRAIN_TRACKS_OLD)) score += 1;
				if (sectorFeaturesComponent.hasSpring) score += 3 * weightSpring;
				if (sectorFeaturesComponent.examineSpots.length > 1) score -= 1;
				if (sectorFeaturesComponent.heapResource) score -= 1;
				if (sectorLocalesComponent.hasLocale(localeTypes.butcher)) score -= 2;
				if (neighbours.count < 2) score -= 1;

				return score;
			};

			validSectors.sort((a, b) => scoreSector(b) - scoreSector(a));

			let index = MathUtils.getWeightedRandom(0, validSectors.length);

			return validSectors[index];
		},

		selectTypeForNewCharacter: function (sector, existingCharacters) {
			let validTypes = [];

			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorPosition = sector.get(PositionComponent);

			let districtVO = GameGlobals.sectorHelper.getDistrictVO(sector);
			let districtType = districtVO.type;

			let level = sectorPosition.level;
			let levelComponent = GameGlobals.levelHelper.getLevelComponentForPosition(level);
			let levelOrdinal = GameGlobals.worldState.getLevelOrdinal(level);
			let isCampable = GameGlobals.levelHelper.isLevelCampable(sectorPosition.level);
			let condition = sectorFeatures.getCondition();
			let isGround = sectorPosition.level == GameGlobals.worldState.getGroundLevel();
			let hasWater = sectorFeatures.hasResource(resourceNames.water);
			let hasFood = sectorFeatures.hasResource(resourceNames.food);
			let hasHazards = sectorFeatures.hasHazards();
			let hasTracks = sectorFeatures.hasFeature(WorldConstants.FEATURE_TRAIN_TRACKS_NEW) || sectorFeatures.hasFeature(WorldConstants.FEATURE_TRAIN_TRACKS_OLD);
			let isSunlit = sectorFeatures.sunlit;

			let existingTypes = existingCharacters.map(characterVO => characterVO.characterType);

			let distanceToCamp = 99;

			if (this.nearestCampNodes.head) {
				let campPosition = this.nearestCampNodes.head.position;
				distanceToCamp = PositionConstants.getDistanceTo(campPosition, sectorPosition);
			}

			let isNearCamp = (d) => isCampable && distanceToCamp <= d;
			let hasExisting = (type) => existingTypes.indexOf(type) >= 0;
			let isSectorType = (type) => sectorFeatures.sectorType == type || districtType == type;
			let isGoodCondition = condition == SectorConstants.SECTOR_CONDITION_MAINTAINED || condition == SectorConstants.SECTOR_CONDITION_RECENT;
			let hasWorker = (type) => this.nearestCampNodes.head && this.nearestCampNodes.head.camp.assignedWorkers[this.getWorkerTypeForCharacterType(type)];
			let hasWorkshop = (type) => GameGlobals.sectorHelper.getWorkshopResource(sector) == this.getResourceNameForCharacterType(type); 

			let possibleTypes = [
				{ type: CharacterConstants.characterTypes.bard, condition: (t) => isCampable && sectorFeatures.buildingDensity < 5 && levelOrdinal > 1 },
				{ type: CharacterConstants.characterTypes.bard, condition: (t) => isCampable && isSectorType(SectorConstants.SECTOR_TYPE_PUBLIC) },
				{ type: CharacterConstants.characterTypes.beggar, condition: (t) => !hasHazards && level > 14 && sectorFeatures.activity > 4 },
				{ type: CharacterConstants.characterTypes.crafter, condition: (t) => sectorFeatures.itemsScavengeable.length > 0, weight: 2 },
				{ type: CharacterConstants.characterTypes.crafter, condition: (t) => sectorFeatures.hasResource(resourceNames.metal) || sectorFeatures.hasResource(resourceNames.rope) },
				{ type: CharacterConstants.characterTypes.crafter, condition: (t) => isSectorType(SectorConstants.SECTOR_TYPE_INDUSTRIAL) },
				{ type: CharacterConstants.characterTypes.cynic, condition: (t) => isCampable && distanceToCamp > 3 && !hasHazards },
				{ type: CharacterConstants.characterTypes.doomsayer, condition: (t) => condition == SectorConstants.SECTOR_CONDITION_RUINED && levelOrdinal > 2 },
				{ type: CharacterConstants.characterTypes.doomsayer, condition: (t) => isCampable && districtType == SectorConstants.SECTOR_TYPE_RESIDENTIAL && levelOrdinal > 2 },
				{ type: CharacterConstants.characterTypes.drifter, condition: (t) => !isSunlit && sectorFeatures.heapResource },
				{ type: CharacterConstants.characterTypes.drifter, condition: (t) => !isSunlit && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE },
				{ type: CharacterConstants.characterTypes.drifter, condition: (t) => !isSunlit && sectorFeatures.activity < 7 },
				{ type: CharacterConstants.characterTypes.drifter, condition: (t) => !isCampable },
				{ type: CharacterConstants.characterTypes.fortuneTeller, condition: (t) => !isSunlit && distanceToCamp > 5 && !hasHazards && levelOrdinal > 2 && !hasExisting(t) && Math.random() < 0.02 },
				{ type: CharacterConstants.characterTypes.guard, condition: (t) => level > 14 && sectorFeatures.damage < 3 && sectorFeatures.wear < 8 },
				{ type: CharacterConstants.characterTypes.guard, condition: (t) => isSectorType(SectorConstants.SECTOR_TYPE_PUBLIC) },
				{ type: CharacterConstants.characterTypes.hunter, condition: (t) => isGround },
				{ type: CharacterConstants.characterTypes.hunter, condition: (t) => hasFood },
				{ type: CharacterConstants.characterTypes.hunter, condition: (t) => isSunlit },
				{ type: CharacterConstants.characterTypes.machineCultist, condition: (t) => isSectorType(SectorConstants.SECTOR_TYPE_MAINTENANCE) },
				{ type: CharacterConstants.characterTypes.machineCultist, condition: (t) => isSectorType(SectorConstants.SECTOR_TYPE_INDUSTRIAL) },
				{ type: CharacterConstants.characterTypes.machineCultist, condition: (t) => sectorFeatures.wear < 5 && sectorFeatures.activity < 5 },
				{ type: CharacterConstants.characterTypes.mercenary, condition: (t) => isCampable && level > 14 },
				{ type: CharacterConstants.characterTypes.mercenary, condition: (t) => sectorFeatures.isOnCriticalPath },
				{ type: CharacterConstants.characterTypes.messenger, condition: (t) => !isGround && hasTracks },
				{ type: CharacterConstants.characterTypes.messenger, condition: (t) => isCampable && sectorFeatures.waymarks.length > 0 },
				{ type: CharacterConstants.characterTypes.messenger, condition: (t) => level > 15 },
				{ type: CharacterConstants.characterTypes.namekeeper, condition: (t) => isCampable && sectorFeatures.activity > 3 && levelOrdinal > 2 },
				{ type: CharacterConstants.characterTypes.natureCultist, condition: (t) => level < 14 && sectorFeatures.hasSpring },
				{ type: CharacterConstants.characterTypes.natureCultist, condition: (t) => isSunlit },
				{ type: CharacterConstants.characterTypes.natureCultist, condition: (t) => level < 14 && sectorFeatures.wear > 5 },
				{ type: CharacterConstants.characterTypes.pilgrim, condition: (t) => !hasHazards && hasTracks, weight: 3 },
				{ type: CharacterConstants.characterTypes.pilgrim, condition: (t) => !hasHazards && sectorFeatures.wealth > 4 },
				{ type: CharacterConstants.characterTypes.scavenger, condition: (t) => sectorFeatures.itemsScavengeable.length > 0 },
				{ type: CharacterConstants.characterTypes.scavenger, condition: (t) => sectorFeatures.resourcesScavengable.getTotal() > 0 },
				{ type: CharacterConstants.characterTypes.scavenger, condition: (t) => isSectorType(SectorConstants.SECTOR_TYPE_RESIDENTIAL) },
				{ type: CharacterConstants.characterTypes.shaman, condition: (t) => level < 14 && condition == SectorConstants.SECTOR_CONDITION_ABANDONED },
				{ type: CharacterConstants.characterTypes.shaman, condition: (t) => isGround },
				{ type: CharacterConstants.characterTypes.slumRefugee, condition: (t) => hasWater },
				{ type: CharacterConstants.characterTypes.slumRefugee, condition: (t) => sectorPosition.level > 3 && isGoodCondition },
				{ type: CharacterConstants.characterTypes.slumRefugee, condition: (t) => isSectorType(SectorConstants.SECTOR_TYPE_RESIDENTIAL) },
				{ type: CharacterConstants.characterTypes.surfaceRefugee, condition: (t) => sectorFeatures.waymarks.length > 0 && sectorPosition.level > 14 },
				{ type: CharacterConstants.characterTypes.surfaceRefugee, condition: (t) => isGoodCondition },
				{ type: CharacterConstants.characterTypes.surfaceRefugee, condition: (t) => isSectorType(SectorConstants.SECTOR_TYPE_COMMERCIAL) },
				{ type: CharacterConstants.characterTypes.trader, condition: (t) => !hasHazards && levelComponent.traderFrequencyFactor >= 1 && isSectorType(SectorConstants.SECTOR_TYPE_COMMERCIAL) },
				{ type: CharacterConstants.characterTypes.trader, condition: (t) => !hasHazards && levelComponent.traderFrequencyFactor >= 1 && sectorFeatures.isOnCriticalPath },
				{ type: CharacterConstants.characterTypes.trafficker, condition: (t) => !isSunlit && distanceToCamp > 5 && sectorFeatures.activity > 2 && sectorFeatures.wealth < 8 },
				{ type: CharacterConstants.characterTypes.workerChemist, condition: (t) => hasWorker(t) && hasWorkshop(t), weight: 10 },
				{ type: CharacterConstants.characterTypes.workerGardener, condition: (t) => hasWorker(t) && hasWorkshop(t), weight: 10 },
				{ type: CharacterConstants.characterTypes.workerRubber, condition: (t) => hasWorker(t) && hasWorkshop(t), weight: 10 },
				{ type: CharacterConstants.characterTypes.workerScavenger, condition: (t) => hasWorker(t) && !hasHazards && isNearCamp(10) },
				{ type: CharacterConstants.characterTypes.workerTrapper, condition: (t) => hasWorker(t) && !hasHazards && isNearCamp(6) && hasFood },
				{ type: CharacterConstants.characterTypes.workerWater, condition: (t) => hasWorker(t) && !hasHazards && isNearCamp(6) && hasWater },
			];

			for (let i = 0; i < possibleTypes.length; i++) {
				let def = possibleTypes[i];
				
				if (!def.condition()) continue;

				let weight = def.weight || 1;
				for (let j = 0; j < weight; j++) {
					validTypes.push(def.type);
				}
			}

			return MathUtils.randomElement(validTypes);
		},

		getWorkerTypeForCharacterType: function (type) {
			switch (type) {
				case CharacterConstants.characterTypes.workerChemist: return CampConstants.workerTypes.chemist.id;
				case CharacterConstants.characterTypes.workerGardener: return CampConstants.workerTypes.gardener.id;
				case CharacterConstants.characterTypes.workerRubber: return CampConstants.workerTypes.rubbermaker.id;
				case CharacterConstants.characterTypes.workerScavenger: return CampConstants.workerTypes.scavenger.id;
				case CharacterConstants.characterTypes.workerTrapper: return CampConstants.workerTypes.trapper.id;
				case CharacterConstants.characterTypes.workerWater: return CampConstants.workerTypes.water.id;
			}
			return null;
		},

		getResourceNameForCharacterType: function (type) {
			switch (type) {
				case CharacterConstants.characterTypes.workerChemist: return resourceNames.fuel;
				case CharacterConstants.characterTypes.workerGardener: return resourceNames.herbs;
				case CharacterConstants.characterTypes.workerRubber: return resourceNames.rubber;
				case CharacterConstants.characterTypes.workerScavenger: return resourceNames.metal;
				case CharacterConstants.characterTypes.workerTrapper: return resourceNames.trapper;
				case CharacterConstants.characterTypes.workerWater: return resourceNames.water;
			}
			return null;
		},

		onGameStateReady: function () {
			this.updateCurrentLevelCharacters();
		},

		onPlayerLeftCamp: function () {
			this.updateCurrentLevelCharacters();
		},

		onPlayerEnteredLevel: function () {
			this.updateCurrentLevelCharacters();
		},

		onPlayerPositionChanged: function () {
			this.markCurrentLocationCharactersAsSeen();
		},

		onRemoveCharacter: function (characterID) {
			this.removeCharacterByID(characterID);
		},
		
	});

	return CharacterSystem;
});
