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
	'game/components/sector/events/DiseaseComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/common/PositionComponent',
], function (Ash, MathUtils, GameGlobals, GlobalSignals, GameConstants, LogConstants, CampConstants, CampNode, PlayerStatsNode, LevelComponent, DiseaseComponent, SectorImprovementsComponent, PositionComponent) {
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
			if (GameGlobals.gameState.isLaunched) return;
			this.updateCampsPopulation(time);
		},
		
		slowUpdate: function () {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isLaunched) return;
			this.updateCampsPopulationChange();
			this.unassignInvalidWorkers();
		},
		
		updateCampsPopulation: function (time) {
			for (var node = this.campNodes.head; node; node = node.next) {
				this.updateCampPopulation(node, time);
				this.updateCampPopulationDecreaseCooldown(node, time);
				this.updateCampDisease(node, time);
				this.updateCampDisabledPopulation(node, time);

				if (node.camp.getAssignedPopulation() > 0 && node.camp.getFreePopulation() < 0) {
					this.reassignWorkers(node);
				}
			}
		},
		
		updateCampsPopulationChange: function () {
			for (var node = this.campNodes.head; node; node = node.next) {
				this.updateCampPopulationChange(node);
			}
		},

		updateCampsDemographics: function () {
			for (var node = this.campNodes.head; node; node = node.next) {
				this.updateCampDemographics(node);
			}
		},
		
		updateCampPopulation: function (node, time) {
			let camp = node.camp;
			camp.population = camp.population || 0;
			
			let improvements = node.entity.get(SectorImprovementsComponent);
			let maxPopulation = CampConstants.getHousingCap(improvements);
			
			let oldPopulation = camp.population;
			let change = 0;
			let changePerSec = camp.populationChangePerSecRaw || 0;

			// population can exceed max (due to refugees etc) but it cannot naturally past it
			if (oldPopulation >= maxPopulation) {
				changePerSec = Math.min(changePerSec, 0);
			}
			
			if (changePerSec !== 0 && time > 0) {
				change = time * changePerSec * GameConstants.gameSpeedCamp;
				let newPopulation = oldPopulation + change;
				
				newPopulation = Math.max(newPopulation, 0);
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
				if (camp.population >= CampConstants.POPULATION_FOR_UNLOCK_MILESTONES) {
					GameGlobals.playerActionFunctions.unlockFeature("milestones");
				}
			}
		},
		
		updateCampPopulationDecreaseCooldown: function (node, time) {
			let camp = node.camp;
			if (camp.populationDecreaseCooldown && camp.populationDecreaseCooldown > 0) {
				camp.populationDecreaseCooldown -= time * GameConstants.gameSpeedCamp;
				if (camp.populationDecreaseCooldown <= 0) {
					this.updateCampPopulationChange(node);
				}
			}
		},

		updateCampDisease: function (node, time) {
			if (!node.entity.has(DiseaseComponent)) {
				node.camp.removeAllDisabledPopulationByReason(CampConstants.DISABLED_POPULATION_REASON_DISEASE);
				return;
			}

			let camp = node.camp;
			let campPosition = node.entity.get(PositionComponent);
			let pos = campPosition.getPosition();
			pos.inCamp = true;
			let diseaseComponent = node.entity.get(DiseaseComponent);

			if (diseaseComponent.nextUpdateTimer == null) {
				diseaseComponent.nextUpdateTimer = CampConstants.getNextDiseaseUpdateTimer();
			}

			diseaseComponent.nextUpdateTimer -= time;

			if (diseaseComponent.nextUpdateTimer <= 0) {
				let pop = camp.getDisabledPopulationBySource(CampConstants.DISABLED_POPULATION_REASON_DISEASE);
				let updateIndex = diseaseComponent.numUpdatesCompleted;
				let maxUpdateIndex = diseaseComponent.numUpdatesTotal - 1;
				let numDiseased = pop.num;
				let numTotal = camp.population;
				let updateType = this.getNextDisaseUpdateType(updateIndex, maxUpdateIndex, numDiseased, numTotal);

				log.i("disease update (" + (updateIndex + 1) + "/" + (maxUpdateIndex + 1) + "): " + updateType);

				switch (updateType) {
					case CampConstants.DISEASE_UPDATE_TYPE_SPREAD:
						let maxInfections = Math.floor(numTotal * 0.2);
						let minInfections = Math.min(maxInfections, Math.ceil(pop.num / 2));
						let numNewDiseased = MathUtils.randomIntBetween(minInfections, maxInfections + 1);
						pop.num += numNewDiseased;
						GameGlobals.playerHelper.addLogMessageWithPosition(LogConstants.getUniqueID(), "The disease spreads.", pos);
						break;

					case CampConstants.DISEASE_UPDATE_TYPE_WANE:
						let numCured = MathUtils.randomIntBetween(1, pop.num);
						if (numCured > 0) {
						pop.num -= numCured;
						GameGlobals.playerHelper.addLogMessageWithPosition(LogConstants.getUniqueID(), numCured + " people recovered from the disease.", pos);
						}
						break;

					case CampConstants.DISEASE_UPDATE_TYPE_KILL:
						let numKilled = MathUtils.randomIntBetween(1, Math.ceil(pop.num / 4));
						camp.population -= numKilled;
						pop.num -= numKilled;
						GameGlobals.playerHelper.addLogMessageWithPosition(LogConstants.getUniqueID(), numKilled + " people killed by the disease.", pos);
						break;

					case CampConstants.DISEASE_UPDATE_TYPE_END:
						let numLastCured = pop.num;
						pop.num = 0;
						if (numLastCured > 0) {
						GameGlobals.playerHelper.addLogMessageWithPosition(LogConstants.getUniqueID(), numLastCured + " people recovered from the disease.", pos);
						}
						break;
				}

				diseaseComponent.numUpdatesCompleted++;

				if (updateType != CampConstants.DISEASE_UPDATE_TYPE_END) {
					diseaseComponent.nextUpdateTimer = CampConstants.getNextDiseaseUpdateTimer();
				}
			}
		},

		updateCampDisabledPopulation: function (node, time) {
			let camp = node.camp;

			let restoredPopulationIndex = null;
			
			for (let i = 0; i < camp.disabledPopulation.length; i++) {
				let pop = camp.disabledPopulation[i];
				if (pop.initialTimer <= 0) continue;
				pop.timer -= time;
				if (pop.timer <= 0 && restoredPopulationIndex == null) {
					restoredPopulationIndex = i;
				}
			}

			if (restoredPopulationIndex != null) {
				let restoredPopulation = camp.disabledPopulation[restoredPopulationIndex];
				camp.disabledPopulation.splice(restoredPopulationIndex, 1);
				GlobalSignals.populationChangedSignal.dispatch(node.entity);
				this.logRestoredPopulation(node, restoredPopulation.num);
			}
		},
		
		updateCampPopulationChange: function (node) {
			let camp = node.camp;
			let population = camp.population || 0;
			let reputation = node.reputation.value || 0;
			
			let levelComponent = GameGlobals.levelHelper.getLevelEntityForSector(node.entity).get(LevelComponent);
			let reqRepCurPop = CampConstants.getRequiredReputation(Math.floor(population));
			let reqRepNextPop = CampConstants.getRequiredReputation(Math.floor(population) + 1);
			
			let changePerSec = 0;
			let changePerSecWithoutCooldown = 0;
			let populationDecreaseCooldown = camp.populationDecreaseCooldown;
			
			if (reputation >= reqRepCurPop && reputation < reqRepNextPop) {
				// no change
				changePerSec = 0;
				changePerSecWithoutCooldown = 0;
				populationDecreaseCooldown = null;
			} else if (reputation >= reqRepNextPop) {
				// growing
				let repDiffValue = (reputation - reqRepNextPop) / 100 / 50;
				let popValue = 1 / Math.floor(population+1) / 100;
				changePerSec = repDiffValue + popValue;
				changePerSecWithoutCooldown = changePerSec;
				populationDecreaseCooldown = null;
			} else {
				// decreasing
				let repMissing = reputation - reqRepCurPop;
				changePerSecWithoutCooldown = -MathUtils.clamp((repMissing + 1)/(repMissing + 60), 0.01, 0.5);
				
				if (populationDecreaseCooldown == null) {
					// - cooldown not set
					changePerSec = 0;
					populationDecreaseCooldown = CampConstants.POPULATION_DECREASE_COOLDOWN;
				} else if (populationDecreaseCooldown > 0) {
					// - cooldown ongoing
					changePerSec = 0;
				} else {
					// - cooldown over
					changePerSec = changePerSecWithoutCooldown;
				}
			}

			if (changePerSec > 0) {
				changePerSec *= levelComponent.habitability;
			}

			let improvements = node.entity.get(SectorImprovementsComponent);
			let housingCap = CampConstants.getHousingCap(improvements);
			
			if (population >= housingCap) {
				changePerSec = Math.min(changePerSec, 0);
				changePerSecWithoutCooldown = Math.min(changePerSec, 0);
			}
			
			camp.populationDecreaseCooldown = populationDecreaseCooldown;
			camp.populationChangePerSecRaw = changePerSec;
			camp.populationChangePerSecWithoutCooldown = changePerSecWithoutCooldown;
		},

		updateCampDemographics: function (node) {
			let population = Math.floor(node.camp.population) || 0;
			let populationByOrigin = node.camp.populationByOrigin || {};

			let totalByOrigin = 0;
			let origins = [];

			let isPopulationByOriginValid = function () {
				totalByOrigin = 0;
				for (let origin in populationByOrigin) {
					let num = populationByOrigin[origin];
					if (num < 0) populationByOrigin[origin] = 0;
					if (num <= 0) continue;
					totalByOrigin += num;
					origins.push(origin);
				}
				return totalByOrigin == population;
			}

			while (!isPopulationByOriginValid()) {
				if (totalByOrigin < population) {
					let origin = GameGlobals.campHelper.getRandomOrigin(node.entity);
					if (!populationByOrigin[origin]) populationByOrigin[origin] = 0;
					populationByOrigin[origin] = populationByOrigin[origin] + 1;
					log.i("added population by origin: " + origin + " at camp " + node.position.level);
				}

				if (totalByOrigin > population) {
					let origin = MathUtils.randomElement(origins);
					populationByOrigin[origin] = populationByOrigin[origin] - 1;
					log.i("removed population by origin: " + origin + " at camp " + node.position.level);
				}
			}

			node.camp.populationByOrigin = populationByOrigin;
		},
		
		handlePopulationChanged: function (node, isIncrease) {
			let campPosition = node.entity.get(PositionComponent);
			
			node.camp.populationDecreaseCooldown = null;
			
			if (isIncrease) {
				node.camp.population = Math.floor(node.camp.population);
				node.camp.rumourpoolchecked = false;
			} else {
				node.camp.handlePopulationDecreased(1);
				this.reassignWorkers(node);
			}
			
			GlobalSignals.populationChangedSignal.dispatch(node.entity);
			this.logChangePopulation(campPosition, isIncrease, node.camp.population);
			
			this.updateCampPopulationChange(node);
			this.updateCampDemographics(node);
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

			while (node.camp.getFreePopulation() < 0) {
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
		
		unassignInvalidWorkers: function () {
			for (let node = this.campNodes.head; node; node = node.next) {
				let changed = false;
				let currentAssignment = node.camp.getCurrentWorkerAssignment();
				let newAssignment = {};
				for (let key in CampConstants.workerTypes) {
					let numAssigned = currentAssignment[key];
					let numMax = GameGlobals.campHelper.getMaxWorkers(node.entity, key);
					if (numMax >= 0 && numMax < numAssigned) {
						log.i("Unassigning invalid workers: " + key);
						newAssignment[key] = numMax;
						changed = true;
					} else {
						newAssignment[key] = numAssigned;
					}
				}
				
				if (changed) {
					GameGlobals.playerActionFunctions.assignWorkers(node.entity, newAssignment);
				}
			}
		},

		getNextDisaseUpdateType: function (updateIndex, maxUpdateIndex, numDiseased, numTotal) {
			if (updateIndex == 0) return CampConstants.DISEASE_UPDATE_TYPE_SPREAD;
			if (updateIndex >= maxUpdateIndex) return CampConstants.DISEASE_UPDATE_TYPE_END;
			if (updateIndex == maxUpdateIndex - 1 && numDiseased > 2) return CampConstants.DISEASE_UPDATE_TYPE_WANE;

			let possibleTypes = [];

			let percentDiseased = numDiseased / numTotal;

			if (percentDiseased < 0.5) {
				possibleTypes.push(CampConstants.DISEASE_UPDATE_TYPE_SPREAD);
				possibleTypes.push(CampConstants.DISEASE_UPDATE_TYPE_SPREAD);
			}
			
			if (numDiseased > 1) {
				possibleTypes.push(CampConstants.DISEASE_UPDATE_TYPE_KILL);
			}

			if (numDiseased > 1) {
				possibleTypes.push(CampConstants.DISEASE_UPDATE_TYPE_WANE);
			}

			return MathUtils.randomElement(possibleTypes);
		},
		
		logChangePopulation: function (campPosition, isIncrease, population) {
			let pos = campPosition.getPosition();
			pos.inCamp = true;
			let level = pos.level;
			let message = null;

			let levelComponent = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent);
			
			if (isIncrease) {
				if (population == 1) {
					message = "ui.camp.population_increase_first_message"
				} else if (levelComponent.habitability < 1) {
					message = "ui.camp.population_increase_outpost_message";
				} else if (level > 15) {
					message = "ui.camp.population_increase_refugee_message";
				} else {
					message = "ui.camp.population_increase_default_message";
				}
			} else {
				message = "An inhabitant packs their belongings and leaves.";
			}

			if (message) {
				GameGlobals.playerHelper.addLogMessageWithPosition(LogConstants.MSG_ID_POPULATION_NATURAL, message, pos);
			}
		},

		logRestoredPopulation: function (node, restoredPopulation) {
			let pos = node.position.getPosition();
			pos.inCamp = true;
			GameGlobals.playerHelper.addLogMessageWithPosition(LogConstants.getUniqueID(), restoredPopulation + " workers ready to work again", pos);
		},
		
		onGameStarted: function () {
			this.updateCampsPopulationChange();
			this.updateCampsPopulation(0);
			this.updateCampsDemographics();
		}
	});

	return PopulationSystem;
});
