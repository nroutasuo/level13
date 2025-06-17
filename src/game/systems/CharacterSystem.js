// A system that updates characters appearing in the world
define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals', 
	'game/GlobalSignals', 
	'game/constants/CharacterConstants', 
	'game/constants/PositionConstants', 
	'game/constants/SectorConstants', 
	'game/constants/TradeConstants', 
	'game/components/common/PositionComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/nodes/NearestCampNode',
	'game/vos/CharacterVO'
], function (
	Ash, 
	MathUtils, 
	GameGlobals, 
	GlobalSignals, 
	CharacterConstants, 
	PositionConstants, 
	SectorConstants, 
	TradeConstants, 
	PositionComponent, 
	SectorFeaturesComponent, 
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
			if (level == GameGlobals.gameState.getSurfaceLevel()) return 0;
			if (level == GameGlobals.gameState.getGroundLevel()) return 1;
			if (level == 14) return 0;

			let isCampable = GameGlobals.levelHelper.isLevelCampable(level);
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);

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
				let neighbours = GameGlobals.levelHelper.getSectorNeighboursList(sector);

				score -= Math.abs(Math.floor(sectorPosition.sectorX / 5)) * weightX;
				score -= Math.abs(Math.floor(sectorPosition.sectorY / 5)) * weightY;

				if (sectorFeaturesComponent.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE) score -= 1;
				if (sectorFeaturesComponent.buildingDensity > 2 && sectorFeaturesComponent.buildingDensity < 8) score += 1;
				if (sectorFeaturesComponent.damage < 6) score += 1;
				if (sectorFeaturesComponent.sunlit) score -= 1;
				if (sectorFeaturesComponent.hasSpring) score += 3 * weightSpring;
				if (sectorFeaturesComponent.examineSpots.length > 1) score -= 1;
				if (sectorFeaturesComponent.heapResource) score -= 1;
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

			let level = sectorPosition.level;
			let levelOrdinal = GameGlobals.gameState.getLevelOrdinal(level);
			let isCampable = GameGlobals.levelHelper.isLevelCampable(sectorPosition.level);
			let condition = sectorFeatures.getCondition();
			let isEarlyZone = sectorFeatures.isEarlyZone();
			let isGround = sectorPosition.level == GameGlobals.gameState.getGroundLevel();
			let hasHazards = sectorFeatures.hasHazards();

			let existingTypes = existingCharacters.map(characterVO => characterVO.characterType);

			let distanceToCamp = 99;

			if (this.nearestCampNodes.head) {
				let campPosition = this.nearestCampNodes.head.position;
				distanceToCamp = PositionConstants.getDistanceTo(campPosition, sectorPosition);
			}

			if (isCampable && distanceToCamp < 5) {
				validTypes.push(CharacterConstants.characterTypes.workerScavenger);
				validTypes.push(CharacterConstants.characterTypes.workerTrapper);
				validTypes.push(CharacterConstants.characterTypes.workerWater);
			}

			if (isCampable && sectorFeatures.buildingDensity < 5 && levelOrdinal > 1) {
				validTypes.push(CharacterConstants.characterTypes.bard);
			}

			if (isCampable && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_PUBLIC) {
				validTypes.push(CharacterConstants.characterTypes.bard);
			}

			if (level > 14) {
				validTypes.push(CharacterConstants.characterTypes.beggar);
			}

			if (sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
				validTypes.push(CharacterConstants.characterTypes.crafter);
			}

			if (sectorFeatures.resourcesScavengable.metal > 0) {
				validTypes.push(CharacterConstants.characterTypes.crafter);
			}
			
			if (condition == SectorConstants.SECTOR_CONDITION_RUINED && levelOrdinal > 2) {
				validTypes.push(CharacterConstants.characterTypes.doomsayer);
			}

			if (isCampable && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_RESIDENTIAL && levelOrdinal > 2) {
				validTypes.push(CharacterConstants.characterTypes.doomsayer);
			}

			if (sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE) {
				validTypes.push(CharacterConstants.characterTypes.drifter);
			}

			if (sectorFeatures.heapResource) {
				validTypes.push(CharacterConstants.characterTypes.drifter);
			}

			if (distanceToCamp > 5 && !hasHazards && levelOrdinal > 2 && Math.random() < 0.01) {
				if (existingTypes.indexOf(CharacterConstants.characterTypes.fortuneTeller) < 0) {
					validTypes.push(CharacterConstants.characterTypes.fortuneTeller);
				}
			}
			
			if (level > 14 && sectorFeatures.damage < 3 && sectorFeatures.wear < 7) {
				validTypes.push(CharacterConstants.characterTypes.guard);
			}
			
			if (sectorFeatures.sunlit) {
				validTypes.push(CharacterConstants.characterTypes.hunter);
			}

			if (isGround) {
				validTypes.push(CharacterConstants.characterTypes.hunter);
				validTypes.push(CharacterConstants.characterTypes.shaman);
			}
			
			if (sectorFeatures.resourcesCollectable.food > 0) {
				validTypes.push(CharacterConstants.characterTypes.hunter);
			}

			if (sectorFeatures.isOnCriticalPath()) {
				validTypes.push(CharacterConstants.characterTypes.mercenary);
			}

			if (isCampable && level > 14) {
				validTypes.push(CharacterConstants.characterTypes.mercenary);
			}

			if (!isGround && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE) {
				validTypes.push(CharacterConstants.characterTypes.messenger);
			}

			if (isCampable && sectorFeatures.waymarks.length > 0) {
				validTypes.push(CharacterConstants.characterTypes.messenger);
			}

			if (level > 15) {
				validTypes.push(CharacterConstants.characterTypes.messenger);
			}

			if (sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_RESIDENTIAL) {
				validTypes.push(CharacterConstants.characterTypes.scavenger);
			}
			
			if (sectorFeatures.itemsScavengeable.length > 0) {
				validTypes.push(CharacterConstants.characterTypes.scavenger);
			}

			if (condition == SectorConstants.SECTOR_CONDITION_ABANDONED) {
				validTypes.push(CharacterConstants.characterTypes.shaman);
			}
			
			if (level < 13) {
				validTypes.push(CharacterConstants.characterTypes.shaman);
			}

			if (sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_SLUM) {
				validTypes.push(CharacterConstants.characterTypes.slumRefugee);
			}
			
			if (sectorFeatures.resourcesCollectable.water > 0) {
				validTypes.push(CharacterConstants.characterTypes.slumRefugee);
			}

			if (sectorPosition.level > 3 && condition == SectorConstants.SECTOR_CONDITION_MAINTAINED || condition == SectorConstants.SECTOR_CONDITION_RECENT) {
				validTypes.push(CharacterConstants.characterTypes.surfaceRefugee);
			}
			
			if (sectorFeatures.waymarks.length > 0 && sectorPosition.level > 14) {
				validTypes.push(CharacterConstants.characterTypes.surfaceRefugee);
			}
			
			if (isCampable && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_COMMERCIAL && isEarlyZone) {
				validTypes.push(CharacterConstants.characterTypes.trader);
			}
			
			if (isCampable && sectorFeatures.isOnCriticalPath()) {
				validTypes.push(CharacterConstants.characterTypes.trader);
			}

			return MathUtils.randomElement(validTypes);
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
