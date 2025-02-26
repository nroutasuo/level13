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
			let updateCooldown = 5 * 60 * 1000;
			let lastUpdate = this.lastLevelCharacterUpdate[level] || 0;
			if (now - lastUpdate < updateCooldown) return;

			// update / remove existing ones

			let numExistingCharacters = 0;

			let allSectors = GameGlobals.levelHelper.getSectorsByLevel(level);
			for (let i = 0; i < allSectors.length; i++) {
				let sector = allSectors[i];
				let sectorPosition = sector.get(PositionComponent);
				if (sectorPosition.equals(playerPosition)) continue;
				let sectorStatus = sector.get(SectorStatusComponent);

				let indicesToRemove = [];

				for (let j = 0; j < sectorStatus.currentCharacters.length; j++) {
					let character = sectorStatus.currentCharacters[j];

					numExistingCharacters++;

					if (character.numTimesSeen <= 0) continue;

					let timeActive = character.creationTimestamp - now;

					if (timeActive < character.minTimeActive) continue; 
					
					if (Math.random() > 0.5) {
						indicesToRemove.push(j);
					}
				}

				for (let j = indicesToRemove.length - 1; j >= 0; j--) {
					let indexToRemove = indicesToRemove[j];
					this.removeCharacterByIndex(sector, indexToRemove);
				}
			}	

			// add new ones

			let maxCharacters = this.getMaxCharactersForLevel(level);
			let maxCharactersToAdd = maxCharacters - numExistingCharacters;

			if (maxCharactersToAdd <= 0) return;
			let numCharactersToAdd = MathUtils.randomIntBetween(1, maxCharactersToAdd + 1);
			
			for (let i = 0; i < numCharactersToAdd; i++) {
				this.addCharacter(level);
			}
		},

		getMaxCharactersForLevel: function (level) {
			if (level == GameGlobals.gameState.getSurfaceLevel()) return 1;
			if (level == GameGlobals.gameState.getGroundLevel()) return 1;
			if (level == 14) return 0;

			let isCampable = GameGlobals.levelHelper.isLevelCampable(level);
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);

			let result = 3;

			if (!isCampable) result -= 1;
			if (level < 14) result -= 1;

			if (isCampable && TradeConstants.getTradePartner(campOrdinal) != null) result += 1;

			return result;
		},

		addCharacter: function (level) {
			let sector = this.selectSectorForNewCharacter(level);
			if (!sector) return;

			let characterType = this.selectTypeForNewCharacter(sector);
			let dialogueSource = CharacterConstants.getDialogueSource(characterType);
			if (!dialogueSource) return;
			let dialogueSourceID = dialogueSource.id;

			// TODO set min time active per character type
			let minTimeActive = 1000 * 60 * 5;

			let characterVO = new CharacterVO(characterType, dialogueSourceID, minTimeActive);
			let statusComponent = sector.get(SectorStatusComponent);

			statusComponent.currentCharacters.push(characterVO);

			log.i("- added character [" + characterType + "] at [" + sector.get(PositionComponent).toString() + "]", this);
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

				score -= Math.abs(Math.floor(sectorPosition.sectorX / 5)) * weightX;
				score -= Math.abs(Math.floor(sectorPosition.sectorY / 5)) * weightY;

				if (sectorFeaturesComponent.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE) score -= 1;
				if (sectorFeaturesComponent.buildingDensity > 2 && sectorFeaturesComponent.buildingDensity < 8) score += 1;
				if (sectorFeaturesComponent.damage < 6) score += 1;
				if (sectorFeaturesComponent.sunlit) score -= 1;
				if (sectorFeaturesComponent.hasSpring) score += 3 * weightSpring;
				if (sectorFeaturesComponent.examineSpots.length > 1) score -= 1;
				if (sectorFeaturesComponent.heapResource) score -= 1;

				return score;
			};

			validSectors.sort((a, b) => scoreSector(b) - scoreSector(a));

			let index = MathUtils.getWeightedRandom(0, validSectors.length);

			return validSectors[index];
		},

		selectTypeForNewCharacter: function (sector) {
			let validTypes = [];

			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorPosition = sector.get(PositionComponent);

			let level = sectorPosition.level;
			let isCampable = GameGlobals.levelHelper.isLevelCampable(sectorPosition.level);
			let condition = sectorFeatures.getCondition();

			if (isCampable && sectorFeatures.buildingDensity < 5) {
				validTypes.push(CharacterConstants.characterTypes.bard);
			}

			if (isCampable && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_PUBLIC) {
				validTypes.push(CharacterConstants.characterTypes.bard);
			}

			if (sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
				validTypes.push(CharacterConstants.characterTypes.crafter);
			}

			if (sectorFeatures.resourcesScavengable.metal > 0) {
				validTypes.push(CharacterConstants.characterTypes.crafter);
			}
			
			if (condition == SectorConstants.SECTOR_CONDITION_RUINED) {
				validTypes.push(CharacterConstants.characterTypes.doomsayer);
			}

			if (isCampable && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_RESIDENTIAL) {
				validTypes.push(CharacterConstants.characterTypes.doomsayer);
			}

			if (sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE) {
				validTypes.push(CharacterConstants.characterTypes.drifter);
			}

			if (sectorFeatures.heapResource) {
				validTypes.push(CharacterConstants.characterTypes.drifter);
			}
			
			if (sectorFeatures.sunlit) {
				validTypes.push(CharacterConstants.characterTypes.hunter);
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

			if (sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_MAINTENANCE) {
				validTypes.push(CharacterConstants.characterTypes.messenger);
			}

			if (isCampable && sectorFeatures.waymarks.length > 0) {
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

			if (condition == SectorConstants.SECTOR_CONDITION_MAINTAINED || condition == SectorConstants.SECTOR_CONDITION_RECENT) {
				validTypes.push(CharacterConstants.characterTypes.surfaceRefugee);
			}
			
			if (sectorFeatures.waymarks.length > 0 && sectorPosition.level > 14) {
				validTypes.push(CharacterConstants.characterTypes.surfaceRefugee);
			}
			
			if (isCampable && sectorFeatures.sectorType == SectorConstants.SECTOR_TYPE_COMMERCIAL) {
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

		onRemoveCharacter: function (characterID) {
			this.removeCharacterByID(characterID);
		},
		
	});

	return CharacterSystem;
});
