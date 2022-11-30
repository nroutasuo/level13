// Triggers in-occurrences (camp events)
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/FollowerConstants',
	'game/constants/ItemConstants',
	'game/constants/LogConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/TradeConstants',
	'game/constants/TribeConstants',
	'game/constants/TextConstants',
	'game/constants/UIConstants',
	'game/constants/WorldConstants',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/sector/CampNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/player/ItemsComponent',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/vos/RaidVO',
	'text/Text'
], function (
	Ash, GameGlobals, GlobalSignals, GameConstants, CampConstants, FollowerConstants, ItemConstants, LogConstants, OccurrenceConstants, TradeConstants, TribeConstants, TextConstants, UIConstants, WorldConstants,
	PlayerResourcesNode, CampNode, TribeUpgradesNode,
	CampComponent, PositionComponent, LogMessagesComponent, ItemsComponent,
	RecruitComponent, TraderComponent, RaidComponent, CampEventTimersComponent,
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
			
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				var campTimers = campNode.entity.get(CampEventTimersComponent);
				this.updateEventTimers(time, campNode, campTimers);
				this.updatePendingEvents(campNode, campTimers);
				this.updateEvents(campNode, campTimers);
			}
		},
		
		slowUpdate: function () {
			if (GameGlobals.gameState.isPaused) return;
			this.updateBlockingEvents();
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
				if (!this.isScheduled(campNode, OccurrenceConstants.campOccurrenceTypes.recruit)) {
					campTimers.scheduleNext(OccurrenceConstants.campOccurrenceTypes.recruit, 0);
				}
			}
		},
			
		updateEvents: function (campNode, campTimers) {
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
			}
			return false;
		},

		isCampValidForEvent: function (campNode, event) {
			if (GameGlobals.gameState.isAutoPlaying) return false;
			
			let milestoneIndex = GameGlobals.milestoneEffectsHelper.getMilestoneIndexForOccurrence(event);
			if (GameGlobals.gameState.numUnlockedMilestones < milestoneIndex) return;
			
			var population = campNode.camp.population;
			var improvements = campNode.entity.get(SectorImprovementsComponent);
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					return improvements.getCount(GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event)) > 0;
					
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					if (campNode.camp.pendingRecruits.length > 0) return true;
					return improvements.getCount(GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event)) > 0;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					if (population < 1) return false;
					return this.getRaidDanger(campNode.entity) > 0;

				default:
					return true;
			}
		},
		
		getCampScoreForEvent: function (campNode, event) {
			if (!this.isCampValidForEvent(campNode, event))
				return 0;
			
			let improvements = campNode.entity.get(SectorImprovementsComponent);
			let improvementType = GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event);
			
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					return improvements.getCount(improvementType) + improvements.getLevel(improvementType);

				case OccurrenceConstants.campOccurrenceTypes.raid:
					return this.getRaidDanger(campNode.entity);

				default:
					return true;
			}
		},

		hasCampEvent: function (campNode, event) {
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					return campNode.entity.has(TraderComponent);
					
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					return campNode.entity.has(RecruitComponent);

				case OccurrenceConstants.campOccurrenceTypes.raid:
					return campNode.entity.has(RaidComponent);

				default:
					return false;
			}
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
			log.i("Ending " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ")");
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			campTimers.onEventEnded(event);
			this.scheduleEvent(campNode, event);

			if (!this.hasCampEvent(campNode, event)) return;

			var logMsg;
			var awayLogMsg;
			var replacements = [];
			var values = [];
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					campNode.entity.remove(TraderComponent);
					logMsg = "Trader leaves.";
					break;
					
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					let recruitComponent = campNode.entity.get(RecruitComponent);
					let wasRecruited = recruitComponent.isRecruited;
					campNode.entity.remove(RecruitComponent);
					if (!wasRecruited) {
						logMsg = "Visitor leaves.";
					}
					break;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					this.endRaid(campNode.entity);
					var raidComponent = campNode.entity.get(RaidComponent);
					var lostResources = raidComponent.resourcesLost;
					var raidVO = new RaidVO(raidComponent);
					if (raidComponent.victory) {
						logMsg = "Raid over. We drove the attackers away.";
						awayLogMsg = "There has been a raid, but the camp was defended.";
					} else {
						awayLogMsg = "There has been a raid.";
						logMsg = "Raid over.";
						if (lostResources.getTotal() > 0) {
							var lostResTxt = TextConstants.getLogResourceText(lostResources);
							logMsg += " We lost " + lostResTxt.msg + ".";
							awayLogMsg += " We lost " + lostResTxt.msg + ".";
							replacements = replacements.concat(lostResTxt.replacements);
							values = values.concat(lostResTxt.values);
						} else {
							logMsg += " There was nothing left to steal.";
							awayLogMsg += " There was nothing left to steal.";
						}
						
						if (raidComponent.defendersLost > 0) {
							logMsg += " " + raidComponent.defendersLost + " defenders were killed.";
							awayLogMsg += " " + raidComponent.defendersLost + " defenders were killed.";
						}
					}
					
					if (raidComponent.damagedBuilding != null) {
						logMsg += " A building was damaged.";
						awayLogMsg += "A building was damaged.";
					}
					
					campNode.entity.remove(RaidComponent);
					campNode.camp.lastRaid = raidVO;
					break;
			}

			var playerInCamp = this.isPlayerInCamp(null);
			if (playerInCamp && logMsg) {
				this.addLogMessage(logMsg, replacements, values, campNode);
			} else if (!playerInCamp && awayLogMsg) {
				this.addLogMessage(awayLogMsg, replacements, values, campNode);
			}
			
			GlobalSignals.campEventEndedSignal.dispatch();
			GlobalSignals.saveGameSignal.dispatch();
		},

		startEvent: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			var duration = OccurrenceConstants.getDuration(event);
			var campPos = campNode.entity.get(PositionComponent);
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(campPos.level);

			var logMsg;
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					var numCamps = GameGlobals.gameState.numCamps;
					var itemsComponent = this.playerNodes.head.entity.get(ItemsComponent);
					var isHardLevel = false;
					var neededIngredients = GameGlobals.itemsHelper.getNeededIngredients(numCamps, WorldConstants.CAMP_STEP_END, isHardLevel, itemsComponent, false);
					var neededIngredient = neededIngredients.length > 0 ? neededIngredients[0] : null;
					var caravan = GameGlobals.campHelper.getRandomIncomingCaravan(numCamps, GameGlobals.gameState.level, GameGlobals.gameState.unlockedFeatures.resources, neededIngredient);
					campNode.entity.add(new TraderComponent(caravan));
					logMsg = Text.capitalize(Text.addArticle(caravan.name)) + " arrives. ";
					break;
					
				case OccurrenceConstants.campOccurrenceTypes.recruit:
					let hasPendingFollower = campNode.camp.pendingRecruits.length > 0;
					let follower = hasPendingFollower ?
						campNode.camp.pendingRecruits.shift() :
						FollowerConstants.getNewRandomFollower(FollowerConstants.followerSource.EVENT, GameGlobals.gameState.numCamps, campPos.level);
					let isFoundAsReward = hasPendingFollower && follower.source != FollowerConstants.followerSource.EVENT;
					campNode.entity.add(new RecruitComponent(follower, isFoundAsReward));
					logMsg = hasPendingFollower ? "Follower met when exploring is waiting at the inn." : "A visitor arrives at the Inn. ";
					GameGlobals.gameState.unlockedFeatures.followers = true;
					if (hasPendingFollower) {
						duration = OccurrenceConstants.EVENT_DURATION_INFINITE;
					}
					break;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					campNode.entity.add(new RaidComponent());
					logMsg = "A raid! The camp is under attack.";
					break;
			}
			
			campTimers.onEventStarted(event, duration);
			if (this.isNew(event))
				GameGlobals.gameState.unlockedFeatures.events.push(event);
			log.i("Start " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ") (" + duration + "s)");
			
			GlobalSignals.campEventStartedSignal.dispatch();

			if (this.isPlayerInCamp(campNode) && logMsg) {
				this.addLogMessage(logMsg, null, null, campNode);
			}
		},
		
		skipEvent: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			campTimers.onEventSkipped(event);
			log.i("Skip " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ") (skip probability: " + this.getEventSkipProbability(campNode, event) + ")");
			this.scheduleEvent(campNode, event);
			GlobalSignals.saveGameSignal.dispatch();
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
					let campOrdinal = GameGlobals.campHelper.getCurrentCampOrdinal();
					let campStep = GameGlobals.campHelper.getCurrentCampStep();
					let abilityType = FollowerConstants.abilityType.ATTACK;
					let follower = FollowerConstants.getNewRandomFollower(FollowerConstants.followerSource.EVENT, GameGlobals.gameState.numCamps, campNode.position.level, abilityType);
					campNode.camp.pendingRecruits.push(follower);
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
				
				let storageAmount = storageResources.getResource(name);
				let maxLostAmount = Math.min(storageAmount, storageMax / 2, 3000);
				
				let randomFactor = 0.75 + Math.random() * 0.25;
				let campShareFactor = Math.max(globalAmountFactor, campProductionFactor);
				
				let lostAmountRaw = maxLostAmount * campShareFactor * randomFactor;
				let rounding = lostAmountRaw > 1000 ? 100 : lostAmountRaw > 100 ? 10 : 5;
				let lostAmount = Math.floor(lostAmountRaw / rounding) * rounding;
				
				if (lostAmount >= 5) {
					storageResources.setResource(name, storageAmount - lostAmount);
					raidComponent.resourcesLost.addResource(name, lostAmount);
				}
			}
		},
		
		addRaidKilledDefenders: function (sectorEntity, probability) {
			let raidComponent = sectorEntity.get(RaidComponent);
			let campComponent = sectorEntity.get(CampComponent);
			let numSoldiers = campComponent.assignedWorkers.soldier;
			if (numSoldiers > 0 && Math.random() < probability) {
				let maxKilled = Math.ceil(numSoldiers / 3);
				let numKilled = Math.ceil(Math.random() * maxKilled);
				campComponent.assignedWorkers.soldier -= numKilled;
				campComponent.population -= numKilled;
				GlobalSignals.workersAssignedSignal.dispatch(sectorEntity);
				raidComponent.defendersLost = numKilled;
			}
		},
		
		addRaidDamagedBuildings: function (sectorEntity, probability, allowedTypes) {
			if (Math.random() > probability) return;
			
			// TODO add more building types here (and implement their effects)
			let allAllowedTypes = [
				improvementNames.fortification,
				improvementNames.darkfarm,
				improvementNames.apothecary,
				improvementNames.smithy,
				improvementNames.cementmill,
				improvementNames.robotFactory,
			];
			allowedTypes = allowedTypes || allAllowedTypes;
			
			let typeIndex = Math.floor(Math.random() * allowedTypes.length);
			let selectedType = allowedTypes[typeIndex];
			
			let improvements = sectorEntity.get(SectorImprovementsComponent);
			let vo = improvements.getVO(selectedType);
			
			vo.numDamaged = vo.numDamaged || 0;
			if (vo.numDamaged >= vo.count) return;
			
			vo.numDamaged++;
			
			let raidComponent = sectorEntity.get(RaidComponent);
			raidComponent.damagedBuilding = selectedType;
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
					
					let getFollowerFightTotal = function (follower) {
						if (!follower) return 0;
						return FollowerConstants.getFollowerItemBonus(follower, ItemConstants.itemBonusTypes.fight_att)
							+ FollowerConstants.getFollowerItemBonus(follower, ItemConstants.itemBonusTypes.fight_def);
					}
					
					let currentBestFighter = GameGlobals.playerHelper.getBestAvailableFollower(FollowerConstants.followerType.FIGHTER);
					let typicalFighter = FollowerConstants.getTypicalFighter(campOrdinal, campStep);
					let currentBestTotal = getFollowerFightTotal(currentBestFighter);
					let typicalTotal = getFollowerFightTotal(typicalFighter);
					return currentBestTotal < 0.75 * typicalTotal;
						
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
			let upgradeLevel = this.getEventUpgradeLevel(event);
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

		getEventUpgradeLevel: function (event) {
			var upgradeLevel = 1;
			var eventUpgrades = GameGlobals.upgradeEffectsHelper.getImprovingUpgradeIdsForOccurrence(event);
			var eventUpgrade;
			for (let i in eventUpgrades) {
				eventUpgrade = eventUpgrades[i];
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(eventUpgrade)) upgradeLevel++;
			}
			return upgradeLevel;
		},
		
		getEventSkipProbability: function (campNode, event) {
			let skipProbability = 0;
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.raid:
					var danger = this.getRaidDanger(campNode.entity);
					if (danger < CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD / 2) {
						skipProbability = 1 - danger * 15;
					}
					break;
			}
			return skipProbability;
		},
		
		getRaidDanger: function (campSector) {
			return GameGlobals.campHelper.getCampRaidDanger(campSector);
		},
		
		addLogMessage: function (msg, replacements, values, camp) {
			var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
			var campPos = camp.entity.get(PositionComponent);
			var playerPosition = this.playerNodes.head.entity.get(PositionComponent);
			logComponent.addMessage(LogConstants.MSG_ID_CAMP_EVENT, msg, replacements, values, null, null, !playerPosition.inCamp, campPos.level);
		}

	});

	return CampEventsSystem;
});
