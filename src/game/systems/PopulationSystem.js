define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/LogConstants',
	'game/constants/CampConstants',
	'game/nodes/sector/CampNode',
	'game/nodes/player/PlayerStatsNode',
	'game/components/type/LevelComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/common/PositionComponent',
	'game/components/common/LogMessagesComponent',
], function (Ash, MathUtils, GameGlobals, GlobalSignals, GameConstants, LogConstants, CampConstants, CampNode, PlayerStatsNode, LevelComponent, SectorImprovementsComponent, PositionComponent, LogMessagesComponent) {
	var PopulationSystem = Ash.System.extend({
	
		campNodes: null,
		playerNodes: null,
		
		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.campNodes = engine.getNodeList(CampNode);
			this.playerNodes = engine.getNodeList(PlayerStatsNode);
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.campNodes = null;
			this.playerNodes = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			this.updateCampsPopulation(time);
		},
		
		slowUpdate: function () {
			if (GameGlobals.gameState.isPaused) return;
			this.updateCampsPopulationChange();
		},
		
		updateCampsPopulation: function (time) {
			for (var node = this.campNodes.head; node; node = node.next) {
				this.updateCampPopulation(node, time);
			}
		},
		
		updateCampsPopulationChange: function () {
			for (var node = this.campNodes.head; node; node = node.next) {
				this.updateCampPopulationChange(node);
			}
		},
		
		updateCampPopulation: function (node, time) {
			var camp = node.camp;
			camp.population = camp.population || 0;
			
			let improvements = node.entity.get(SectorImprovementsComponent);
			let maxPopulation = CampConstants.getHousingCap(improvements);
			
			let oldPopulation = camp.population;
			let change = 0;
			let changePerSec = camp.populationChangePerSecRaw || 0;
			
			if (time > 0) {
				change = time * changePerSec * GameConstants.gameSpeedCamp;
				let newPopulation = oldPopulation + change;
				
				newPopulation = Math.max(newPopulation, 0);
				newPopulation = Math.min(newPopulation, maxPopulation);
				change = newPopulation - oldPopulation;
				
				changePerSec = change / time / GameConstants.gameSpeedCamp;
			}
			
			camp.populationChangePerSec = changePerSec;
			
			if (camp.pendingPopulation > 0) {
				change += camp.pendingPopulation;
				camp.pendingPopulation = 0;
			}
			camp.addPopulation(change);

			if (Math.floor(camp.population) !== Math.floor(oldPopulation)) {
				this.handlePopulationChanged(node, camp.population > oldPopulation);
			}
		},
		
		updateCampPopulationChange: function (node) {
			var camp = node.camp;
			camp.populationChangePerSecRaw = this.getPopulationChangePerSec(node);
		},
		
		getPopulationChangePerSec: function (node) {
			var camp = node.camp;
			var population = camp.population || 0;
			var reputation = node.reputation.value || 0;
			var levelComponent = GameGlobals.levelHelper.getLevelEntityForSector(node.entity).get(LevelComponent);
			var reqRepCurPop = CampConstants.getRequiredReputation(Math.floor(population));
			var reqRepNextPop = CampConstants.getRequiredReputation(Math.floor(population) + 1);
			
			var changePerSec = 0;
			if (reputation >= reqRepCurPop && reputation < reqRepNextPop) {
				changePerSec = 0;
			} else if (reputation >= reqRepNextPop) {
				var repDiffValue = (reputation - reqRepNextPop) / 100 / 50;
				var popValue = 1 / Math.floor(population+1) / 100;
				changePerSec = repDiffValue + popValue;
			} else {
				changePerSec = MathUtils.clamp((reputation - reqRepCurPop)/60/60, -1/60/5, -1/60/30);
			}

			if (changePerSec > 0) {
				changePerSec *= levelComponent.populationFactor;
			}

			var improvements = node.entity.get(SectorImprovementsComponent);
			var housingCap = CampConstants.getHousingCap(improvements);
			if (population >= housingCap) {
				changePerSec = Math.min(changePerSec, 0);
			}
			
			return changePerSec;
		},
		
		handlePopulationChanged: function (node, isIncrease) {
			var campPosition = node.entity.get(PositionComponent);
			if (isIncrease) {
				node.camp.population = Math.floor(node.camp.population);
				node.camp.rumourpoolchecked = false;
			} else {
				this.reassignWorkers(node);
			}
			GlobalSignals.populationChangedSignal.dispatch(node.entity);
			this.logChangePopulation(campPosition, isIncrease);
		},
		
		reassignWorkers: function (node) {
			var improvements = node.entity.get(SectorImprovementsComponent);
			var reservedWorkers = {};
			var foodConsumption = GameGlobals.campHelper.getFoodConsumptionPerSecond(node.camp.population);
			var foodProduction = GameGlobals.campHelper.getFoodProductionPerSecond(1, improvements);
			var waterConsumption = GameGlobals.campHelper.getWaterConsumptionPerSecond(node.camp.population);
			var waterProduction = GameGlobals.campHelper.getWaterProductionPerSecond(1, improvements);
			reservedWorkers[CampConstants.workerTypes.scavenger.id] = 1;
			reservedWorkers[CampConstants.workerTypes.trapper.id] = Math.ceil(foodConsumption / foodProduction);
			reservedWorkers[CampConstants.workerTypes.water.id] = Math.ceil(waterConsumption / waterProduction);
			var prioritizedWorkers = [];
			for (var key in node.camp.assignedWorkers) {
				prioritizedWorkers.push({ name: key, min: reservedWorkers[key] || 0});
			}
			for (var key in reservedWorkers) {
				prioritizedWorkers.push({ name: key, min: 0});
			}
			while (node.camp.getAssignedPopulation() > node.camp.population) {
				for (let i = 0; i < prioritizedWorkers.length; i++) {
					var workerCheck = prioritizedWorkers[i];
					var count = node.camp.assignedWorkers[workerCheck.name];
					if (count > workerCheck.min) {
						node.camp.assignedWorkers[workerCheck.name]--;
						log.i("Unassigned a worker: " + workerCheck.name);
						break;
					}
				}
			}
			GlobalSignals.workersAssignedSignal.dispatch(node.entity);
		},
		
		logChangePopulation: function (campPosition, isIncrease) {
			var playerPosition = this.playerNodes.head.entity.get(PositionComponent);
			if (playerPosition.level === campPosition.level && playerPosition.sectorId() === campPosition.sectorId()) {
				var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
				if (isIncrease) {
					logComponent.addMessage(LogConstants.MSG_ID_POPULATION_NATURAL, "A stranger showed up.");
				} else {
					logComponent.addMessage(LogConstants.MSG_ID_POPULATION_NATURAL, "An inhabitant packed their belongings and left.");
				}
			}
		},
		
		onGameStarted: function () {
			this.updateCampsPopulationChange();
			this.updateCampsPopulation(0);
		}
	});

	return PopulationSystem;
});
