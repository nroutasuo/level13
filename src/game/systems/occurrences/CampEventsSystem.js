// Triggers in-occurrences (camp events)
define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/CharacterConstants',
	'game/constants/ExplorerConstants',
	'game/constants/ItemConstants',
	'game/constants/LogConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/StoryConstants',
	'game/constants/TextConstants',
	'game/constants/UIConstants',
	'game/constants/WorldConstants',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/player/ItemsComponent',
	'game/components/sector/events/DisasterComponent',
	'game/components/sector/events/DiseaseComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/events/RefugeesComponent',
	'game/components/sector/events/VisitorComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/vos/RaidVO',
	'text/Text'
], function (
	Ash, MathUtils, GameGlobals, GlobalSignals, GameConstants, CampConstants, CharacterConstants, ExplorerConstants, ItemConstants, LogConstants, OccurrenceConstants, StoryConstants, TextConstants, UIConstants, WorldConstants,
	PlayerResourcesNode, CampNode, TribeUpgradesNode,
	CampComponent, PositionComponent, ItemsComponent,
	DisasterComponent, DiseaseComponent, RaidComponent, TraderComponent, RecruitComponent, RefugeesComponent, VisitorComponent,  CampEventTimersComponent,
	SectorImprovementsComponent, RaidVO, Text) {

	var CampEventsSystem = Ash.System.extend({

		playerNodes: null,
		campNodes: null,
		tribeUpgradesNodes: null,

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			this.campNodes = engine.getNodeList(CampNode);
			
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onGameStarted);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.playerNodes = null;
			this.tribeUpgradesNodes = null;
			this.campNodes = null;
			this.engine = null;
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isLaunched) return;
			let isInCamp = GameGlobals.playerHelper.isInCamp();
			
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let campTimers = campNode.entity.get(CampEventTimersComponent);
				this.updateEventTimers(time, campNode, campTimers);
				this.updatePendingEvents(campNode, campTimers);

				if (isInCamp) this.updateEvents(campNode, campTimers);
			}
		},
		
		slowUpdate: function () {
			if (GameGlobals.gameState.isPaused) return;
			let isInCamp = GameGlobals.playerHelper.isInCamp();

			this.updateBlockingEvents();
			
			for (let campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let campTimers = campNode.entity.get(CampEventTimersComponent);
				if (!isInCamp) this.updateEvents(campNode, campTimers);
			}
		},
		
		updateBlockingEvents: function () {
			for (let key in OccurrenceConstants.campOccurrenceTypes) {
				let event = OccurrenceConstants.campOccurrenceTypes[key];
				if (this.isEventBlockingProgress(event)) {
					this.fastTrackEvent(event);
				}
			}
		},
		
		updateEventTimers: function (time, campNode, campTimers) {
			var dt = time;
			for (let key in OccurrenceConstants.campOccurrenceTypes) {
				let event = OccurrenceConstants.campOccurrenceTypes[key];
				let eventEndDt = dt;
				let eventStartDt = this.getTimeToNextDelta(campNode, event, dt);
				if (campTimers.eventEndTimers[event] && campTimers.eventEndTimers[event] != OccurrenceConstants.EVENT_DURATION_INFINITE)
					campTimers.eventEndTimers[event] -= eventEndDt;
				if (campTimers.eventStartTimers[event])
					campTimers.eventStartTimers[event] -= eventStartDt;
			}
		},
		
		updatePendingEvents: function (campNode, campTimers) {
			if (campNode.camp.pendingRecruits.length > 0) {
				let eventType = OccurrenceConstants.campOccurrenceTypes.recruit;
				if (!this.isScheduled(campNode, eventType)) {
					campTimers.scheduleNext(eventType, 0);
				} else {
					let fastTrackTimeToNext = this.getFastTrackTimeToNext(campNode, eventType);
					let currentTimeToNext = campTimers.getEventStartTimeLeft(eventType);
					if (fastTrackTimeToNext < currentTimeToNext) {
						this.fastTrackEvent(eventType);
					}
				}
			}
		},
			
		updateEvents: function (campNode, campTimers) {
			// end, schedule, start events
			for (var key in OccurrenceConstants.campOccurrenceTypes) {
				let event = OccurrenceConstants.campOccurrenceTypes[key];
				let isValid = this.isCampValidForEvent(campNode, event);
				let hasEvent = this.hasCampEvent(campNode, event);
				
				if (hasEvent) {
					if (this.isEventEnded(campNode, event)) {
						this.endEvent(campNode, event);
					}
				} else if (isValid) {
					if (!this.isScheduled(campNode, event)) {
						this.scheduleEvent(campNode, event);
					} else if (campTimers.isTimeToStart(event)) {
						var skipProbability = this.getEventSkipProbability(campNode, event);
						if (Math.random() < skipProbability) {
							this.skipEvent(campNode, event);
						} else {
							this.startEvent(campNode, event);
						}
					}
				} else {
					this.removeTimer(campNode, event);
				}
			}
		},

		isEventEnded: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			if (campTimers.hasTimeEnded(event)) return true;

			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					var tradeComponent = campNode.entity.get(TraderComponent)
					if (tradeComponent.isDismissed) return true;
					break;

				case OccurrenceConstants.campOccurrenceTypes.recruit:
					var recruitComponent = campNode.entity.get(RecruitComponent)
					if (recruitComponent.isDismissed) return true;
					if (recruitComponent.isRecruited) return true;
					break;
					
				case OccurrenceConstants.campOccurrenceTypes.refugees:
					let refugeesComponent = campNode.entity.get(RefugeesComponent);
					if (refugeesComponent.isDismissed) return true;
					if (refugeesComponent.isAccepted) return true;
					break;

				case OccurrenceConstants.campOccurrenceTypes.disease:
					let pop = campNode.camp.getDisabledPopulationBySource(CampConstants.DISABLED_POPULATION_REASON_DISEASE);
					if (!pop || pop.num <= 0) return true;
					break;
			}
			return false;
		},

		isCampValidForEvent: function (campNode, event) {
			if (GameGlobals.storyHelper.isReadyForLaunch()) false;
			if (GameGlobals.gameState.isLaunched) return false;
			if (this.hasCampEvent(campNode, event)) return false;

			
			let milestoneIndex = GameGlobals.milestoneEffectsHelper.getMilestoneIndexForOccurrence(event);
			if (GameGlobals.gameState.numUnlockedMilestones < milestoneIndex) return;
			
			let population = campNode.camp.population;
			let numCamps = GameGlobals.gameState.numCamps;
			let improvements = campNode.entity.get(SectorImprovementsComponent);

			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.accident:
					return population > 5;

				case OccurrenceConstants.campOccurrenceTypes.disaster:
					return population > 12 || numCamps > 1;

				case OccurrenceConstants.campOccurrenceTypes.disease:
					return population > 10;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					return population > 1 && this.getRaidDanger(campNode.entity) > 0;

				case OccurrenceConstants.campOccurrenceTypes.recruit:
					if (campNode.camp.pendingRecruits.length > 0) return true;
					return improvements.getCount(GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event)) > 0;

				case OccurrenceConstants.campOccurrenceTypes.refugees:
					return campNode.reputation.value > CampConstants.getRequiredReputation(12);

				case OccurrenceConstants.campOccurrenceTypes.trader:
					return improvements.getCount(GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event)) > 0;

				case OccurrenceConstants.campOccurrenceTypes.visitor:
					return improvements.getCount(GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event)) > 0;

				default:
					return true;
			}
		},
		
		getCampScoreForEvent: function (campNode, event) {
			if (!this.isCampValidForEvent(campNode, event)) {
				return 0;
			}
			
			let improvements = campNode.entity.get(SectorImprovementsComponent);
			let improvementType = GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event);
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(campNode.position.level);
			
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.accident:
					return campNode.camp.population;

				case OccurrenceConstants.campOccurrenceTypes.disaster:
					return 1;

				case OccurrenceConstants.campOccurrenceTypes.disease:
					let storage = GameGlobals.resourcesHelper.getCurrentCampStorage(campNode.entity);
					let hasHerbs = storage.resources.getResource(resourceNames.herbs) > 0;
					let hasMedicine = storage.resources.getResource(resourceNames.medicine) > 0;
					return OccurrenceConstants.getDiseaseOutbreakChance(campNode.camp.population, hasHerbs, hasMedicine);

				case OccurrenceConstants.campOccurrenceTypes.raid:
					return this.getRaidDanger(campNode.entity);

				case OccurrenceConstants.campOccurrenceTypes.recruit:
					return improvements.getCount(improvementType) + improvements.getLevel(improvementType) + campNode.camp.pendingRecruits.length * 100;

				case OccurrenceConstants.campOccurrenceTypes.refugees:
					let currentFreeHousing = GameGlobals.campHelper.getCampFreeHousing(campNode.entity);
					return campNode.reputation.value + currentFreeHousing;

				case OccurrenceConstants.campOccurrenceTypes.trader:
					return improvements.getCount(improvementType) + improvements.getLevel(improvementType);

				case OccurrenceConstants.campOccurrenceTypes.visitor:
					let score = improvements.getCount(improvementType) + improvements.getLevel(improvementType);
					let isForceExpedition =  GameGlobals.gameState.getStoryFlag(StoryConstants.flags.EXPEDITION_PENDING_VISITORS);
					if (isForceExpedition && campOrdinal >= CampConstants.MIN_CAMP_ORDINAL_FOR_EXPEDITION_VISITORS) {
						score += campOrdinal * 5;
					}
					return score;

				default: return 1;
			}
		},

		hasCampEvent: function (campNode, event) {
			return GameGlobals.campHelper.hasEvent(campNode.entity, event);
		},

		isScheduled: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			return campTimers.isEventScheduled(event);
		},
		
		isNew: function (event) {
			if (!GameGlobals.gameState.unlockedFeatures.events)
				GameGlobals.gameState.unlockedFeatures.events = [];
			return GameGlobals.gameState.unlockedFeatures.events.indexOf(event) < 0;
		},

		removeTimer: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			return campTimers.removeTimer(event);
		},
		
		scheduleEvent: function (campNode, event, forcedTimeToNext) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			var timeToNext = forcedTimeToNext || this.getTimeToNext(campNode, event);
			campTimers.scheduleNext(event, timeToNext);
			log.i("Scheduled " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ")" + " in " + timeToNext + "s.");
		},

		endEvent: function (campNode, event) {			
			let duration = OccurrenceConstants.getDuration(event);

			if (duration > 0 && !this.hasCampEvent(campNode, event)) return;

			log.i("Ending " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ")");
			let campTimers = campNode.entity.get(CampEventTimersComponent);
			campTimers.onEventEnded(event);
			this.scheduleEvent(campNode, event);

			let logMsg;
			let logMsgParams = {};
			let visibility = LogConstants.MSG_VISIBILITY_DEFAULT;

			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.accident:
					let num = 1;
					let workerType = this.getInjuredWorkerType(campNode);
					GameGlobals.campHelper.addDisabledPopulation(campNode.entity, num, workerType, CampConstants.DISABLED_POPULATION_REASON_ACCIDENT, 60 * 10);
					logMsgParams.workerType = workerType;
					logMsg = "ui.tribe.event_ended_accident_message";
					break;

				case OccurrenceConstants.campOccurrenceTypes.disaster:
					// TODO make damaged buildings disaster type dependent
					let disasterComponent = campNode.entity.get(DisasterComponent);
					let disasterType = disasterComponent.disasterType;
					let damagedBuilding = this.addDamagedBuilding(campNode.entity, 1);

					campNode.entity.remove(DisasterComponent);
					logMsgParams.disasterType = disasterType;
					logMsg = "ui.tribe.event_ended_disaster_message";
					break;

				case OccurrenceConstants.campOccurrenceTypes.disease:
					let diseaseComponent = campNode.entity.get(DiseaseComponent);
					campNode.entity.remove(DiseaseComponent);
					campNode.camp.removeAllDisabledPopulationByReason(CampConstants.DISABLED_POPULATION_REASON_DISEASE);
					logMsg = "ui.tribe.event_ended_disease_message";
					break;

				case OccurrenceConstants.campOccurrenceTypes.trader:
					let traderComponent = campNode.entity.get(TraderComponent);
					let isDismissed = traderComponent && traderComponent.isDismissed;
					campNode.entity.remove(TraderComponent);
					logMsg = "ui.tribe.event_ended_trader_message";
					break;
					
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					let recruitComponent = campNode.entity.get(RecruitComponent);
					let wasRecruited = recruitComponent.isRecruited;
					let name = recruitComponent.explorer.name;
					campNode.entity.remove(RecruitComponent);
					if (!wasRecruited) {
						logMsgParams.name = name;
						logMsg = "ui.tribe.event_ended_recruit_message";
					}
					break;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					this.endRaid(campNode.entity);
					let raidComponent = campNode.entity.get(RaidComponent);
					let lostResources = raidComponent.resourcesLost;
					let raidVO = new RaidVO(raidComponent);

					if (raidComponent.victory) {
						logMsg = "Raid over. We drove the attackers away.";
					} else {
						logMsg = "Raid over.";
						if (lostResources.getTotal() > 0) {
							logMsg += " We lost some resources.";
						} else {
							logMsg += " There was nothing left to steal.";
						}
						
						if (raidComponent.defendersLost > 0) {
							logMsg += " " + raidComponent.defendersLost + " defenders were killed.";
						}

						GameGlobals.gameState.increaseGameStatSimple("numRaidsLost");

						visibility = LogConstants.MSG_VISIBILITY_PRIORITY;
					}
					
					if (raidComponent.damagedBuilding != null) {
						logMsg += " A building was damaged.";
					}

					let raidEntry = { level: campNode.position.level, timeStamp: raidVO.timeStamp };
					GameGlobals.gameState.increaseGameStatHighScore("mostResourcesLostInRaid", raidEntry, lostResources.getTotal());
					
					campNode.entity.remove(RaidComponent);
					campNode.camp.lastRaid = raidVO;
					break;

				case OccurrenceConstants.campOccurrenceTypes.refugees:
					let refugeesComponent = campNode.entity.get(RefugeesComponent);
					let numRefugees = refugeesComponent.num;
					logMsgParams.num = numRefugees;
					campNode.entity.remove(RefugeesComponent);

					if (refugeesComponent.isAccepted) {
						logMsg = "ui.tribe.event_refugees_accepted_message";
					} else {
						logMsg = "ui.tribe.event_refugees_dismissed_message";
					}
					break;

				case OccurrenceConstants.campOccurrenceTypes.visitor:
					let visitorComponent = campNode.entity.get(VisitorComponent);
					campNode.entity.remove(VisitorComponent);
					logMsgParams.name = UIConstants.getNPCDisplayNameKey(visitorComponent.visitorType);
					logMsg = "ui.tribe.event_ended_visitor_message";
					break;
			}

			if (logMsg) {
				this.addLogMessage({ textKey: logMsg, textParams: logMsgParams }, campNode, visibility);
			}
			
			GlobalSignals.campEventEndedSignal.dispatch(campNode.entity);
			GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, false);
		},

		startEvent: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			var duration = OccurrenceConstants.getDuration(event);
			var campPos = campNode.entity.get(PositionComponent);
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(campPos.level);

			var logMsg = null;
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.disaster:
					let disasterType = MathUtils.randomElement(GameGlobals.campHelper.getValidDisasterTypes(campNode.entity));
					campNode.entity.add(new DisasterComponent(disasterType));
					logMsg = "A " + disasterType + "!";
					break;

				case OccurrenceConstants.campOccurrenceTypes.disease:
					let num = MathUtils.randomIntBetween(1, Math.min(5, campNode.camp.population / 2) + 1);
					let numUpdates = MathUtils.randomIntBetween(2, 8);
					GameGlobals.campHelper.addDisabledPopulation(campNode.entity, num, null, CampConstants.DISABLED_POPULATION_REASON_DISEASE, -1);
					campNode.entity.add(new DiseaseComponent("disease", numUpdates));
					logMsg = "Disease outbreak!";
					break;

				case OccurrenceConstants.campOccurrenceTypes.trader:
					var numCamps = GameGlobals.gameState.numCamps;
					var itemsComponent = this.playerNodes.head.entity.get(ItemsComponent);
					var isHardLevel = false;
					var neededIngredients = GameGlobals.itemsHelper.getNeededIngredients(numCamps, WorldConstants.CAMP_STEP_END, isHardLevel, itemsComponent, false);
					var neededIngredient = neededIngredients.length > 0 ? neededIngredients[0] : null;
					let traderLevel = GameGlobals.campHelper.getEventUpgradeLevel(OccurrenceConstants.campOccurrenceTypes.trader);
					var caravan = GameGlobals.campHelper.getRandomIncomingCaravan(numCamps, GameGlobals.gameState.level, traderLevel, GameGlobals.gameState.getUnlockedResources(), neededIngredient);
					campNode.entity.add(new TraderComponent(caravan));
					logMsg = Text.capitalize(Text.addArticle(caravan.name)) + " arrives. ";
					break;
					
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					let hasPendingExplorer = campNode.camp.pendingRecruits.length > 0;
					let explorer = hasPendingExplorer ? campNode.camp.pendingRecruits.shift() : this.getRandomExplorer(campNode, 0.2);
					let isFoundAsReward = hasPendingExplorer && explorer.source != ExplorerConstants.explorerSource.EVENT;
					campNode.entity.add(new RecruitComponent(explorer, isFoundAsReward));
					logMsg = hasPendingExplorer ? "Explorer met when exploring is waiting at the inn." : "A visitor arrives at the Inn. ";
					GameGlobals.playerActionFunctions.unlockFeature("explorers");
					if (hasPendingExplorer) {
						duration = OccurrenceConstants.EVENT_DURATION_INFINITE;
					}
					break;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					campNode.entity.add(new RaidComponent());
					logMsg = "A raid! The camp is under attack.";
					break;

				case OccurrenceConstants.campOccurrenceTypes.refugees:
					let maxRefugees = MathUtils.clamp(campNode.camp.population / 6, 3, 16);
					let refugeesNum = MathUtils.randomIntBetween(2, maxRefugees + 1);
					let isStoryRefugees = GameGlobals.gameState.getStoryFlag(StoryConstants.flags.APOCALYPSE_PENDING_REFUGEES);
					let dialogueSource = isStoryRefugees ? "refugees_earthquake" : "refugees_default";
					campNode.entity.add(new RefugeesComponent(refugeesNum, dialogueSource));
					logMsg = "A group of refugees from the City arrives at the camp.";
					break;

				case OccurrenceConstants.campOccurrenceTypes.visitor:
					let visitorType = MathUtils.randomElement(GameGlobals.campHelper.getValidVisitorTypes(campNode.entity));
					let isExpedition = GameGlobals.campHelper.isValidCampForExpeditionVisitors(campOrdinal);
					let visitorDialogueSource = isExpedition ? "visitor_expedition" : CharacterConstants.getDialogueSourceID(visitorType);
					campNode.entity.add(new VisitorComponent(visitorType, visitorDialogueSource));
					logMsg = "A visitor arrives.";
					break;
			}
			
			campTimers.onEventStarted(event, duration);
			
			if (this.isNew(event)) GameGlobals.gameState.unlockedFeatures.events.push(event);

			log.i("Start " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ") (" + duration + "s)");
			
			GameGlobals.gameState.increaseGameStatKeyed("numCampEventsByType", event);
			GlobalSignals.campEventStartedSignal.dispatch(event);

			if (logMsg) this.addLogMessage(logMsg, campNode);

			if (duration == 0) {
				this.endEvent(campNode, event);
			}
		},
		
		skipEvent: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			campTimers.onEventSkipped(event);
			log.i("Skip " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ") (skip probability: " + this.getEventSkipProbability(campNode, event) + ")");
			this.scheduleEvent(campNode, event);
			GlobalSignals.saveGameSignal.dispatch(GameConstants.SAVE_SLOT_DEFAULT, false);
		},

		fastTrackEvent: function (event) {
			let campNode = this.getBestCampForEvent(event);
			if (!campNode) return;
			
			let campTimers = campNode.entity.get(CampEventTimersComponent);
			let fastTrackTimeToNext = this.getFastTrackTimeToNext(campNode, event);
			let currentTimeToNext = campTimers.getEventStartTimeLeft(event);
			
			if (currentTimeToNext && currentTimeToNext < fastTrackTimeToNext) {
				return;
			}
			
			log.i("Fast-tracking camp event " + event + " at " + campNode.camp.campName);
			
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					if (campNode.camp.pendingRecruits.length == 0) {
						let explorer = this.getRandomExplorer(campNode, 1);
						campNode.camp.pendingRecruits.push(explorer);
					}
					break;
			}
			
			this.scheduleEvent(campNode, event, fastTrackTimeToNext);
		},

		endRaid: function (sectorEntity) {
			// determine raid result
			var raidComponent = sectorEntity.get(RaidComponent);
			var danger = this.getRaidDanger(sectorEntity);
			var raidRoll = Math.random();
			raidComponent.victory = raidRoll > danger;
			log.i("end raid: danger: " + danger + ", raidRoll: " + UIConstants.roundValue(raidRoll) + " -> victory: " + raidComponent.victory);

			// raiders won, deduct resources etc
			if (raidComponent.victory) {
				this.addRaidDamagedBuildings(sectorEntity, 0.25, [ improvementNames.fortification ]);
			} else {
				this.addRaidResourcesLost(sectorEntity);
				this.addRaidKilledDefenders(sectorEntity, 0.5);
				this.addRaidDamagedBuildings(sectorEntity, 0.5, null);
			}
		},
		
		addRaidResourcesLost: function (sectorEntity) {
			let raidComponent = sectorEntity.get(RaidComponent);
			let storageMax = GameGlobals.resourcesHelper.getCurrentCampStorage(sectorEntity).storageCapacity;
			let storageResources = GameGlobals.resourcesHelper.getCurrentCampStorage(sectorEntity).resources;
			let storageProduction = GameGlobals.resourcesHelper.getCurrentStorageAccumulation(false).resourceChange;
			let campResources = GameGlobals.resourcesHelper.getCampStorage(sectorEntity).resources;
			let campProduction = GameGlobals.resourcesHelper.getCampStorageAccumulation(sectorEntity).resourceChange;

			// select resources (names)
			let resourceCandidates = [];
			for (var key in resourceNames) {
				let name = resourceNames[key];
				let storageAmount = storageResources.getResource(name);
				if (storageAmount > 0) {
					let campProductionAmount = campProduction.getResource(name)
					let campProductionFactor = campProductionAmount > 0 ? campProductionAmount / storageProduction.getResource(name) : 0;
					let score = 0;
					score += storageAmount / storageMax * 10;
					score += campProductionFactor * 100;
					if (name == resourceNames.metal) score -= 10;
					if (name == resourceNames.rope) score -= 1;
					if (name == resourceNames.concrete) score -= 1;
					resourceCandidates.push({ name: name, score: score, campProductionFactor: campProductionFactor });
				}
			}
			resourceCandidates = resourceCandidates.sort(function (a, b) { return b.score - a.score });
			let maxSelectedResources = Math.min(resourceCandidates.length, 1 + Math.floor(Math.random() * 3));
			if (maxSelectedResources <= 0) return;
			let selectedResources = resourceCandidates.slice(0, maxSelectedResources);

			// select amounts
			let globalAmountFactor = 1 / (GameGlobals.resourcesHelper.getNumCampsInTradeNetwork(sectorEntity) || 1);
			for (let i in selectedResources) {
				let name = selectedResources[i].name;
				let campProductionFactor = Math.min(0.5, selectedResources[i].campProductionFactor);
				
				let storageAmount = storageResources.getResource(name) || 0;
				if (!storageAmount) continue;
				let maxLostAmount = Math.min(storageAmount, storageMax / 2, 3000);
				
				let randomFactor = 0.75 + Math.random() * 0.25;
				let campShareFactor = Math.max(globalAmountFactor, campProductionFactor);
				
				let lostAmountRaw = maxLostAmount * campShareFactor * randomFactor;
				let rounding = lostAmountRaw > 1000 ? 100 : lostAmountRaw > 100 ? 10 : 5;
				let lostAmount = Math.floor(lostAmountRaw / rounding) * rounding;
				
				if (lostAmount >= 5) {
					let amount = storageAmount - lostAmount;
					storageResources.setResource(name, amount, "raid-res-lost");
					raidComponent.resourcesLost.addResource(name, lostAmount, "add-raid-res-lost");
				}
			}
		},
		
		addRaidKilledDefenders: function (sectorEntity, probability) {
			let raidComponent = sectorEntity.get(RaidComponent);
			let campComponent = sectorEntity.get(CampComponent);
			let numSoldiers = campComponent.assignedWorkers.soldier || 0;
			if (numSoldiers > 0 && Math.random() < probability) {
				let maxKilled = Math.ceil(numSoldiers / 3);
				let numKilled = Math.ceil(Math.random() * maxKilled);
				campComponent.assignedWorkers.soldier -= numKilled;
				campComponent.population -= numKilled;
				campComponent.handlePopulationDecreased(numKilled);
				GlobalSignals.workersAssignedSignal.dispatch(sectorEntity);
				raidComponent.defendersLost = numKilled;
			}
		},
		
		addRaidDamagedBuildings: function (sectorEntity, probability, allowedTypes) {
			let damagedBuilding = this.addDamagedBuilding(sectorEntity, probability, allowedTypes);
			
			if (damagedBuilding) {
				let raidComponent = sectorEntity.get(RaidComponent);
				raidComponent.damagedBuilding = damagedBuilding;
			}
		},

		addDamagedBuilding: function (sectorEntity, probability, allowedTypes) {
			if (Math.random() > probability) return null;

			let improvements = sectorEntity.get(SectorImprovementsComponent);
			
			// TODO add more building types here (and implement their effects)
			let allAllowedTypes = [
				improvementNames.hospital,
				improvementNames.market,
				improvementNames.library,
				improvementNames.fortification,
				improvementNames.darkfarm,
				improvementNames.aqueduct,
				improvementNames.apothecary,
				improvementNames.smithy,
				improvementNames.cementmill,
				improvementNames.robotFactory,
			];
			allowedTypes = allowedTypes || allAllowedTypes;

			let possibleTypes = [];
			for (let i = 0; i < allowedTypes.length; i++) {
				let type = allowedTypes[i];
				if (improvements.getCount(type) > 0) {
					possibleTypes.push(type);
				}
			}
			
			let selectedType = MathUtils.randomElement(possibleTypes);
			
			let vo = improvements.getVO(selectedType);
			
			vo.numDamaged = vo.numDamaged || 0;
			if (vo.numDamaged >= vo.count) return null;
			
			vo.numDamaged++;

			return selectedType;
		},

		getInjuredWorkerType: function (campNode) {
			let assignedWorkers = campNode.camp.assignedWorkers;
			let possibleTypes = [];
			for (let key in assignedWorkers) {
				for (let i = 0; i < assignedWorkers[key]; i++) {
					possibleTypes.push(key);
				}
			}
			return MathUtils.randomElement(possibleTypes);
		},

		getRandomExplorer: function (campNode, forceFighterProbability) {
			let campPos = campNode.entity.get(PositionComponent);
			let campOrdinal = GameGlobals.campHelper.getCurrentCampOrdinal();
			let abilityType = null;

			// sometimes we want to prefer fighters to keep fight balancing reasonable
			if (forceFighterProbability >= 1 || Math.random() < forceFighterProbability) {
				abilityType = ExplorerConstants.abilityType.ATTACK;
			}

			let options = { forcedAbilityType : abilityType }
			return GameGlobals.explorerHelper.getNewRandomExplorer(ExplorerConstants.explorerSource.EVENT, campOrdinal, campPos.level, options)
		},
		
		onGameStarted: function () {
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				var campTimers = campNode.entity.get(CampEventTimersComponent);
				for (var key in OccurrenceConstants.campOccurrenceTypes) {
					var event = OccurrenceConstants.campOccurrenceTypes[key];
					if (campTimers.eventStartTimers[event]) {
						campTimers.eventStartTimers[event] = Math.max(campTimers.eventStartTimers[event], 15);
						log.i("camp " + campNode.position.level + ": next " + event + " in " + Math.round(campTimers.eventStartTimers[event]) + "s");
					}
					var minEndTime = Math.min(OccurrenceConstants.getDuration(event), 15);
					if (campTimers.eventEndTimers[event] && campTimers.eventEndTimers[event] != OccurrenceConstants.EVENT_DURATION_INFINITE) {
						campTimers.eventEndTimers[event] = Math.max(campTimers.eventEndTimers[event], minEndTime);
						log.i("camp " + campNode.position.level + ": " + event + " ends in " + Math.round(campTimers.eventEndTimers[event]) + "s");
					}
				}
			}
		},
		
		isPlayerInCamp: function (campNode) {
			var playerPosition = this.playerNodes.head.entity.get(PositionComponent);
			if (!campNode) return playerPosition.inCamp;
			var campPosition = campNode.entity.get(PositionComponent);
			return playerPosition.level == campPosition.level && playerPosition.sectorId() == campPosition.sectorId() && playerPosition.inCamp;
		},

		isEventBlockingProgress: function (event) {
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					let campOrdinal = GameGlobals.campHelper.getCurrentCampOrdinal();
					let campStep = GameGlobals.campHelper.getCurrentCampStep();
					
					let getExplorerFightTotal = function (explorer) {
						if (!explorer) return 0;
						return ExplorerConstants.getExplorerItemBonus(explorer, ItemConstants.itemBonusTypes.fight_att)
							+ ExplorerConstants.getExplorerItemBonus(explorer, ItemConstants.itemBonusTypes.fight_def);
					}
					
					let currentBestFighter = GameGlobals.playerHelper.getBestAvailableExplorer(ExplorerConstants.explorerType.FIGHTER);
					let typicalFighter = ExplorerConstants.getTypicalFighter(campOrdinal, campStep);
					let currentBestTotal = getExplorerFightTotal(currentBestFighter);
					let typicalTotal = getExplorerFightTotal(typicalFighter);
					return currentBestTotal < 0.75 * typicalTotal;
				
				case OccurrenceConstants.campOccurrenceTypes.disease:
					return GameGlobals.gameState.getStoryFlag(StoryConstants.flags.GREENHOUSE_PENDING_DISEASE);
				
				case OccurrenceConstants.campOccurrenceTypes.visitor:
					let numCamps = GameGlobals.gameState.numCamps;
					let hasFlag = GameGlobals.gameState.getStoryFlag(StoryConstants.flags.EXPEDITION_PENDING_VISITORS);
					return numCamps >= CampConstants.MIN_CAMP_ORDINAL_FOR_EXPEDITION_VISITORS && hasFlag;
						
				default: return false;
			}
		},

		getBestCampForEvent: function (event) {
			let result = null;
			let resultScore = 0;
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				let score = this.getCampScoreForEvent(campNode, event);
				if (score > resultScore) {
					result = campNode;
					resultScore = score;
				}
			}
			return result;
		},

		getTimeToNext: function (campNode, event) {
			let isNew = this.isNew(event);
			let numCamps = GameGlobals.gameState.numCamps;
			let upgradeLevel = GameGlobals.campHelper.getEventUpgradeLevel(event);
			let reputationComponent = campNode.reputation;
			return OccurrenceConstants.getTimeToNext(event, isNew, upgradeLevel, reputationComponent.value, numCamps);
		},
		
		getFastTrackTimeToNext: function (campNode, event) {
			return 300;
		},

		getTimeToNextDelta: function (campNode, event, dt) {
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					let playerPosition = this.playerNodes.head.entity.get(PositionComponent);
					let isCurrentCamp = playerPosition.inCamp && campNode.position.equals(playerPosition);
					return isCurrentCamp ? dt * 2 : dt;
			}
			return dt;
		},
		
		getEventSkipProbability: function (campNode, event) {
			let skipProbability = 0;

			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.raid:
					let danger = this.getRaidDanger(campNode.entity);
					if (danger < CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD / 2) {
						skipProbability = 1 - danger * 15;
					}
					break;
				
				case OccurrenceConstants.campOccurrenceTypes.disease:
					let storage = GameGlobals.resourcesHelper.getCurrentCampStorage(campNode.entity);
					let hasHerbs = storage.resources.getResource(resourceNames.herbs) > 0;
					let hasMedicine = storage.resources.getResource(resourceNames.medicine) > 0;
					let isPendingDisease = GameGlobals.gameState.getStoryFlag(StoryConstants.flags.GREENHOUSE_PENDING_DISEASE);
					let value = 1 - OccurrenceConstants.getDiseaseOutbreakChance(campNode.camp.population, hasHerbs, hasMedicine);
					if (isPendingDisease) value = value / 2;
					return value;
			}


			return skipProbability;
		},
		
		getRaidDanger: function (campSector) {
			return GameGlobals.campHelper.getCampRaidDanger(campSector);
		},
		
		addLogMessage: function (msg, camp, visibility) {
			let campPos = camp.entity.get(PositionComponent).getPositionInCamp();

			let options = {
				position: campPos,
				visibility: visibility
			};

			GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_CAMP_EVENT, msg, options);
		}

	});

	return CampEventsSystem;
});
