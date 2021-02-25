// Triggers in-occurrences (camp events)
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/LogConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/TradeConstants',
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
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/vos/RaidVO',
	'text/Text'
], function (
	Ash, GameGlobals, GlobalSignals, GameConstants, LogConstants, OccurrenceConstants, TradeConstants, TextConstants, UIConstants, WorldConstants,
	PlayerResourcesNode, CampNode, TribeUpgradesNode,
	CampComponent, PositionComponent, LogMessagesComponent, ItemsComponent,
	TraderComponent, RaidComponent, CampEventTimersComponent,
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
				
				// update timers
				var dt = time;
				for (var key in OccurrenceConstants.campOccurrenceTypes) {
					var event = OccurrenceConstants.campOccurrenceTypes[key];
					if (campTimers.eventEndTimers[event])
						campTimers.eventEndTimers[event] -= dt;
					if (campTimers.eventStartTimers[event])
						campTimers.eventStartTimers[event] -= dt;
				}
				
				// check event changes
				for (var key in OccurrenceConstants.campOccurrenceTypes) {
					var event = OccurrenceConstants.campOccurrenceTypes[key];
					let isValid = this.isCampValidForEvent(campNode, event);
					let hasEvent = this.hasCampEvent(campNode, event);
					
					if (hasEvent) {
						if (this.isEventEnded(campNode, event)) {
							this.endEvent(campNode, event);
						}
					} else if (isValid) {
						if (!this.isScheduled(campNode, event)) {
							this.scheduleEvent(campNode, event);
						} else {
							if (campTimers.isTimeToStart(event)) {
								this.startEvent(campNode, event);
							}
						}
					} else {
						this.removeTimer(campNode, event);
					}
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
			}
			return false;
		},

		isCampValidForEvent: function (campNode, event) {
			if (campNode.camp.population < 1) return false;
			var improvements = campNode.entity.get(SectorImprovementsComponent);
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					return improvements.getCount(GameGlobals.upgradeEffectsHelper.getImprovementForOccurrence(event)) > 0;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					var soldiers = campNode.camp.assignedWorkers.soldier;
					var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
					return OccurrenceConstants.getRaidDanger(improvements, soldiers, soldierLevel) > 0;

				default:
					return true;
			}
		},

		hasCampEvent: function (campNode, event) {
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					return campNode.entity.has(TraderComponent);

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
		
		scheduleEvent: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			var timeToNext = this.getTimeToNext(campNode, event);
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
							logMsg += " We lost " + lostResTxt.msg;
							awayLogMsg += " We lost " + lostResTxt.msg;
							replacements = replacements.concat(lostResTxt.replacements);
							values = values.concat(lostResTxt.values);
						} else {
							logMsg += " There was nothing left to steal.";
							awayLogMsg += " There was nothing left to steal.";
						}
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

			GlobalSignals.saveGameSignal.dispatch();
		},

		startEvent: function (campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			var duration = OccurrenceConstants.getDuration(event);
			var campPos = campNode.entity.get(PositionComponent);
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(campPos.level);
			campTimers.onEventStarted(event, duration);
			if (this.isNew(event))
				GameGlobals.gameState.unlockedFeatures.events.push(event);
			log.i("Start " + event + " at " + campNode.camp.campName + " (" + campNode.position.level + ") (" + duration + "s)");

			var logMsg;
			switch (event) {
				case OccurrenceConstants.campOccurrenceTypes.trader:
					var numCamps = GameGlobals.gameState.numCamps;
					var itemsComponent = this.playerNodes.head.entity.get(ItemsComponent);
					var isHardLevel = false;
					var neededIngredient = GameGlobals.itemsHelper.getNeededIngredient(numCamps, WorldConstants.CAMP_STEP_END, isHardLevel, itemsComponent, false);
					var caravan = TradeConstants.getRandomIncomingCaravan(numCamps, GameGlobals.gameState.level, GameGlobals.gameState.unlockedFeatures.resources, neededIngredient);
					campNode.entity.add(new TraderComponent(caravan));
					logMsg = Text.capitalize(Text.addArticle(caravan.name)) + " arrives. ";
					break;

				case OccurrenceConstants.campOccurrenceTypes.raid:
					campNode.entity.add(new RaidComponent());
					logMsg = "A raid! The camp is under attack.";
					break;
			}

			if (this.isPlayerInCamp(campNode) && logMsg) {
				this.addLogMessage(logMsg, null, null, campNode);
			}
		},

		endRaid: function (sectorEntity) {
			// determine raid result
			var improvements = sectorEntity.get(SectorImprovementsComponent);
			var raidComponent = sectorEntity.get(RaidComponent);
			var soldiers = sectorEntity.get(CampComponent).assignedWorkers.soldier;
			var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
			var danger =OccurrenceConstants.getRaidDanger(improvements, soldiers, soldierLevel);
			var raidRoll = Math.random();
			raidComponent.victory = raidRoll > danger;
			log.i("end raid: danger: " + danger + ", raidRoll: " + UIConstants.roundValue(raidRoll) + " -> victory: " + raidComponent.victory);

			// raiders won, deduct resources
			if (!raidComponent.victory) {
				var campResources = GameGlobals.resourcesHelper.getCurrentCampStorage(sectorEntity).resources;
				var amountFactor = 1 / GameGlobals.resourcesHelper.getNumCampsInTradeNetwork(sectorEntity);

				// select resources (names)
				// TODO choose resources lost smarter (not always the one you have the most)
				var selectedResources = [];
				var maxSelectedResources = 1 + Math.floor(Math.random() * 3);
				var largestSelectedAmount = 0;
				
				for (var key in resourceNames) {
					var name = resourceNames[key];
					var campAmount = campResources.getResource(name);
					if (selectedResources.length < maxSelectedResources) {
						selectedResources.push(name);
						largestSelectedAmount = Math.max(largestSelectedAmount, campAmount);
					} else if (campAmount > largestSelectedAmount) {
						selectedResources.pop();
						selectedResources.push(name);
						largestSelectedAmount = Math.max(largestSelectedAmount, campAmount);
					}
				}

				// select amounts
				for (var i in selectedResources) {
					var name = selectedResources[i];
					var campAmount = campResources.getResource(name);
					var lostAmount = Math.floor(campAmount * amountFactor * (0.25 + 0.25 * Math.random()));
					if (lostAmount >= 5) {
						campResources.setResource(name, campAmount - lostAmount);
						raidComponent.resourcesLost.addResource(name, lostAmount);
					}
				}
			}
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
					if (campTimers.eventEndTimers[event]) {
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

		getTimeToNext: function (campNode, event) {
			let isNew = this.isNew(event);
			let numCamps = GameGlobals.gameState.numCamps;
			let upgradeLevel = this.getEventUpgradeLevel(event);
			return OccurrenceConstants.getTimeToNext(event, isNew, upgradeLevel, campNode.camp.population, numCamps);
		},

		getEventUpgradeLevel: function (event) {
			var upgradeLevel = 1;
			var eventUpgrades = GameGlobals.upgradeEffectsHelper.getImprovingUpgradeIdsForOccurrence(event);
			var eventUpgrade;
			for (var i in eventUpgrades) {
				eventUpgrade = eventUpgrades[i];
				if (this.tribeUpgradesNodes.head.upgrades.hasUpgrade(eventUpgrade)) upgradeLevel++;
			}
			return upgradeLevel;
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
