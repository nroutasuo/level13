// A system that updates a Levels's LevelStatusComponent and LevelPassagesComponent based on other game state
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/LevelConstants',
	'game/constants/LocaleConstants',
	'game/nodes/level/LevelNode',
	'game/nodes/sector/SectorNode',
	'game/nodes/PlayerLocationNode',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/level/LevelPassagesComponent',
	'game/components/level/LevelStatusComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/type/LevelComponent'
], function (Ash,
		GameGlobals,
		GlobalSignals,
		LevelConstants,
		LocaleConstants,
		LevelNode,
		SectorNode,
		PlayerLocationNode,
		CampComponent,
		PositionComponent,
		LevelPassagesComponent,
		LevelStatusComponent,
		PassagesComponent,
		SectorControlComponent,
		SectorImprovementsComponent,
		WorkshopComponent,
		SectorFeaturesComponent,
		SectorStatusComponent,
		LevelComponent) {

	let LevelStatusSystem = Ash.System.extend({
		
		context: "LevelStatusSystem",
		
		levelNodes: null,
		sectorNodes: null,
		playerLocationNodes: null,

		featuresToSaveFirstScoutedSectorFor: [ "hasTradeConnectorSpot", "campable" ],

		constructor: function () { },

		addToEngine: function (engine) {
			this.levelNodes = engine.getNodeList(LevelNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			
			GlobalSignals.add(this, GlobalSignals.gameStateReadySignal, this.updateAll);
			GlobalSignals.add(this, GlobalSignals.sectorScoutedSignal, this.onSectorScouted);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.updateAll);
			GlobalSignals.add(this, GlobalSignals.campBuiltSignal, this.updateAllLevels);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged);
			GlobalSignals.add(this, GlobalSignals.workshopClearedSignal, this.updateAllLevels);
		},

		removeFromEngine: function (engine) {
			this.levelNodes = null;
			this.sectorNodes = null;
			this.playerLocationNodes = null;
		},
		
		updateAll: function () {
			this.updateAllPassages();
			this.updateAllLevels();
		},
		
		updateAllLevels: function () {
			for (let node = this.levelNodes.head; node; node = node.next) {
				let level = node.level.position;
				
				if (!node.levelStatus.isLevelTypeRevealed) {
					let countScoutedSectors = GameGlobals.levelHelper.getLevelNumScoutedSectors(level);
					
					let shouldBeRevealed = countScoutedSectors >= 5;
					if (shouldBeRevealed) this.revealLevelType(level);
				}

				node.levelStatus.clearedWorkshops = this.getLevelClearedWorkshops(level);
				node.levelStatus.improvementCounts = this.getLevelImprovementCounts(level);
			}

			this.updateFirstScoutedSectorsForOldSaves();
		},

		updateAllPassages: function () {
			for (let node = this.sectorNodes.head; node; node = node.next) {
				this.updatePassages(node.entity);
			}
		},

		updatePassages: function (entity) {
			let passagesComponent = entity.get(PassagesComponent);
			let passageUp = passagesComponent.passageUp;
			let passageDown = passagesComponent.passageDown;
			if (passageUp == null && passageDown == null) return;

			let positionComponent = entity.get(PositionComponent);
			let improvementsComponent = entity.get(SectorImprovementsComponent);
			let s = positionComponent.sectorId();
			let passageUpBuilt =
				improvementsComponent.getCount(improvementNames.passageUpStairs) > 0 ||
				improvementsComponent.getCount(improvementNames.passageUpHole) > 0 ||
				improvementsComponent.getCount(improvementNames.passageUpElevator) > 0;
			let passageDownBuilt =
				improvementsComponent.getCount(improvementNames.passageDownStairs) > 0 ||
				improvementsComponent.getCount(improvementNames.passageDownHole) > 0 ||
				improvementsComponent.getCount(improvementNames.passageDownElevator) > 0;
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForSector(entity);
			
			this.updateLevelPassagesComponent(levelEntity, s, passageUp, passageUpBuilt, passageDown, passageDownBuilt);
		},

		updateLevelPassagesComponent: function (levelEntity, s, passageUp, passageUpBuilt, passageDown, passageDownBuilt) {
			let levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			if (typeof passageUp == "undefined") passageUp = null;
			if (typeof passageDown == "undefined") passageDown = null;
			levelPassagesComponent.passagesUp[s] = passageUp;
			levelPassagesComponent.passagesUpBuilt[s] = passageUpBuilt;
			levelPassagesComponent.passagesDown[s] = passageDown;
			levelPassagesComponent.passagesDownBuilt[s] = passageDownBuilt;
		},
		
		revealLevelType: function (level) {
			if (GameGlobals.levelHelper.isLevelTypeRevealed(level)) return;
			
			let entity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			let levelStatus = entity.get(LevelStatusComponent);
			levelStatus.isLevelTypeRevealed = true;
			log.i("level type revealed: level " + level, this);
			
			GameGlobals.playerHelper.addLogMessage(this.getLevelTypeRevealedLogMessage(level));
			
			GlobalSignals.levelTypeRevealedSignal.dispatch(level);
		},

		registerScoutedFeatures: function (sector) {
			let position = sector.get(PositionComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(position);
			let levelStatus = levelEntity.get(LevelStatusComponent);
			for (let i in this.featuresToSaveFirstScoutedSectorFor) {
				let feature = this.featuresToSaveFirstScoutedSectorFor[i];
				if (levelStatus.firstScoutedSectorByFeature[feature]) continue;
				if (!GameGlobals.levelHelper.isScoutedSectorWithFeature(sector, feature)) continue;
				levelStatus.firstScoutedSectorByFeature[feature] = position.sectorId();
			}
		},

		updateFirstScoutedSectorsForOldSaves: function () {
			// this is for backwards compatibility with saves for 0.5.2 and earlier 
			// (using time stamps on sectors rather than LevelStatusComponent.firstScoutedSectorByFeature)
			// TODO remove at some point
			let firstScoutedSectorByLevelAndFeature = {};
			for (let node = this.sectorNodes.head; node; node = node.next) {
				let level = node.position.level;
				let sectorStatus = node.entity.get(SectorStatusComponent);
				if (!sectorStatus.scoutedTimestamp) continue;
				for (let i in this.featuresToSaveFirstScoutedSectorFor) {
					let feature = this.featuresToSaveFirstScoutedSectorFor[i];
					if (!GameGlobals.levelHelper.isScoutedSectorWithFeature(node.entity, feature)) continue;
					if (!firstScoutedSectorByLevelAndFeature[level]) firstScoutedSectorByLevelAndFeature[level] = {};
					let scoutedTimestamp = sectorStatus.scoutedTimestamp;
					if (!firstScoutedSectorByLevelAndFeature[level][feature] || scoutedTimestamp < firstScoutedSectorByLevelAndFeature[level][feature].timestamp) {
						firstScoutedSectorByLevelAndFeature[level][feature] = { entity: node.entity, timestamp: scoutedTimestamp };
					}
				}
				sectorStatus.scoutedTimestamp = null;
			}

			for (let level in firstScoutedSectorByLevelAndFeature) {
				let levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
				let levelStatus = levelEntity.get(LevelStatusComponent);
				for (let feature in firstScoutedSectorByLevelAndFeature[level]) {
					levelStatus.firstScoutedSectorByFeature[feature] = firstScoutedSectorByLevelAndFeature[level][feature].entity.get(PositionComponent).sectorId();
				}
			}
		},

		getLevelClearedWorkshops: function (level) {
			let result = {};
			let sectors = GameGlobals.levelHelper.getSectorsByLevel(level);
			for (let i in sectors) {
				let sector = sectors[i];
				let sectorControlComponent = sector.get(SectorControlComponent);
				let workshopComponent = sector.get(WorkshopComponent);
				if (workshopComponent && sectorControlComponent && sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
					let resource = workshopComponent.resource;
					if (!result[resource]) result[resource] = 0;
					result[resource]++;
				}
			}
			return result;
		},

		getLevelImprovementCounts: function (level) {
			let result = {};
			for (let improvementID in improvementNames) {
				let count = 0;
				let sectors = GameGlobals.levelHelper.getSectorsByLevel(level);
				for (let i = 0; i < sectors.length; i++) {
					let sector = sectors[i];
					let improvements = sector.get(SectorImprovementsComponent);
					let campComponent = sector.get(CampComponent);
					count += GameGlobals.playerActionsHelper.getCurrentImprovementCount(improvements, campComponent, improvementID);
				}
				result[improvementID] = count;
			}
			return result;
		},

		onSectorScouted: function (sector) {
			this.updateAllLevels();
			this.registerScoutedFeatures(sector);
		},
		
		onPlayerPositionChanged: function () {
			let level = this.playerLocationNodes.head.position.level;
			if (GameGlobals.levelHelper.isLevelTypeRevealed(level)) return;
			
			let entity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			let levelComponent = entity.get(LevelComponent);
			let sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			
			if (levelComponent.isCampable && sectorFeatures.campable) {
				this.revealLevelType(level);
				return;
			}
			
			let sys = this;
			
			let isRevealedByHazard = function (hazardType) {
				let sectorHazard = sectorFeatures.hazards[hazardType] || 0;
				if (sectorHazard <= 0) return false;
				let previousLevelsMaxHazard = sys.getLevelPreviousLevelsMaxHazard(level, hazardType);
				return sectorHazard > previousLevelsMaxHazard;
			}
			
			if (levelComponent.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION) {
				if (isRevealedByHazard("radiation")) {
					this.revealLevelType(level);
					return;
				}
				
			}

			if (levelComponent.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION) {
				if (isRevealedByHazard("poison")) {
					this.revealLevelType(level);
					return;
				}
			}

			if (levelComponent.notCampableReason == LevelConstants.UNCAMPABLE_LEVEL_TYPE_FLOODED) {
				if (isRevealedByHazard("flooded")) {
					this.revealLevelType(level);
					return;
				}
			}
		},
		
		getLevelPreviousLevelsMaxHazard: function (level, hazardType) {
			let levelOrdinal = GameGlobals.gameState.getLevelOrdinal(level);
			if (levelOrdinal == 1) return 0;
			let result = 0;
			for (let i = 1; i < levelOrdinal; i++) {
				let previousLevel = GameGlobals.gameState.getLevelForOrdinal(i);
				result = Math.max(result, GameGlobals.levelHelper.getLevelMaxHazard(previousLevel, hazardType));
			}
			return result;
		},
		
		getLevelTypeRevealedLogMessage: function (level) {
			let entity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			let levelComponent = entity.get(LevelComponent);
			
			if (level == 13) return null;
			
			if (levelComponent.isCampable) {
				if (level % 2 == 0) {
					return "This level seems safe enough that it should be possible to find a spot for a camp.";
				} else {
					return "There are enough signs of life on this level that it should be possible to find a spot for a camp.";
				}
			} else {
				switch (levelComponent.notCampableReason) {
					case LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION:
						return "This level is too radioactive for a permanent settlement.";
					case LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION:
						return "This level is too polluted for a permanent settlement.";
					default:
						return "This level seems eerily devoid of any signs of recent human activity.";
				}
			}
			
			return null;
		},

	});

	return LevelStatusSystem;
});
