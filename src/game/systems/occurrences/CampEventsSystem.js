// Triggers in-occurrences (camp events)
define([
    'ash',
    'game/constants/OccurrenceConstants',
    'game/constants/TextConstants',
    'game/nodes/player/PlayerResourcesNode',
    'game/nodes/sector/CampNode',
    'game/components/common/PositionComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/sector/events/TraderComponent',
    'game/components/sector/events/RaidComponent',
    'game/components/sector/events/CampEventTimersComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (
	Ash,
	OccurrenceConstants, TextConstants,
	PlayerResourcesNode, CampNode,
	PositionComponent, LogMessagesComponent,
	TraderComponent, RaidComponent, CampEventTimersComponent,
	SectorImprovementsComponent) {
    
    var CampEventsSystem = Ash.System.extend({	
	    
		occurrenceFunctions: null,
		gameState: null,
		saveSystem: null,
		
		playerNodes: null,
		campNodes: null,
	
        constructor: function (occurrenceFunctions, gameState, saveSystem) {
			this.occurrenceFunctions = occurrenceFunctions;
			this.gameState = gameState;
			this.saveSystem = saveSystem;
        },

        addToEngine: function (engine) {
			var sys = this;
			this.playerNodes = engine.getNodeList( PlayerResourcesNode );
			this.campNodes = engine.getNodeList( CampNode );
			this.campNodes.nodeAdded.add(function(node) {
				sys.resetTimers(node);
			});
			this.resetAllTimers();
        },

        removeFromEngine: function (engine) {
			this.playerNodes = null;
			this.campNodes = null;
        },

        update: function (time) {
            for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				var campTimers = campNode.entity.get(CampEventTimersComponent);		
				for(var key in OccurrenceConstants.campOccurrenceTypes) {
					var event = OccurrenceConstants.campOccurrenceTypes[key];
					if (this.isCampValidForEvent(campNode, event)) {
					if (this.hasCampEvent(campNode, event)) {
						if (campTimers.hasTimeEnded(event)) {
						this.endEvent(campNode, event);
						}
					} else {
						if (campTimers.isTimeToStart(event)) {
						this.startEvent(campNode, event);
						}
					}
					}
				}
			}
		},
	
		// Re-schedule events where the next time has passed while offline
		resetAllTimers: function() {	    
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				this.resetTimers(campNode);
			}
		},
		
		resetTimers: function(campNode) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			for(var key in OccurrenceConstants.campOccurrenceTypes) {
				var event = OccurrenceConstants.campOccurrenceTypes[key];
				var scheduledEventStart = campTimers.getEventStartTimeLeft(event);
				if (scheduledEventStart <= 0) {
					this.endEvent(campNode, event);
				}
			}
		},
		
		isCampValidForEvent: function(campNode, event) {
			var improvements = campNode.entity.get(SectorImprovementsComponent);
			switch(event) {
			case OccurrenceConstants.campOccurrenceTypes.trader:
				return improvements.getCount(improvementNames.market) > 0;
			
			default:
				return true;
			}
		},
		
		hasCampEvent: function(campNode, event) {
			switch(event) {
			case OccurrenceConstants.campOccurrenceTypes.trader:
				return campNode.entity.has(TraderComponent);
			
			case OccurrenceConstants.campOccurrenceTypes.raid:
				return campNode.entity.has(RaidComponent);
			
			default:
				return false;
			}
		},
		
		endEvent: function(campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			var timeToNext = OccurrenceConstants.scheduleNext(event);
			campTimers.onEventEnded(event, timeToNext);
			if (window.app) console.log("End " + event + " at " + campNode.camp.campName + "(" + campNode.position.level + ")" + ". Next in " + timeToNext + "s.");
			
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
				this.occurrenceFunctions.onEndRaid(campNode.entity);
				var raidComponent = campNode.entity.get(RaidComponent);
				var lostResources = raidComponent.resourcesLost;
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
				break;
			}
			
			var playerInCamp = this.isPlayerInCamp(campNode);
			if (playerInCamp && logMsg) {
			this.addLogMessage(logMsg, replacements, values);
			} else if (!playerInCamp && awayLogMsg) {
			this.addLogMessage(awayLogMsg, replacements, values, campNode);
			}
			
			this.saveSystem.save();
		},
		
		startEvent: function(campNode, event) {
			var campTimers = campNode.entity.get(CampEventTimersComponent);
			var duration = OccurrenceConstants.getDuration(event);
			campTimers.onEventStarted(event, duration);
			console.log("Start " + event + " at " + campNode.camp.campName + " (" + duration + "s)");
			
			var logMsg;
			switch (event) {
			case OccurrenceConstants.campOccurrenceTypes.trader:
				campNode.entity.add(new TraderComponent());
				logMsg = "A trader arrives.";
				break;
			
			case OccurrenceConstants.campOccurrenceTypes.raid:
				campNode.entity.add(new RaidComponent());
				logMsg = "A raid!";
				break;
			}
			
			if (this.isPlayerInCamp(campNode) && logMsg) {
			this.addLogMessage(logMsg);
			}
		},
		
		isPlayerInCamp: function(campNode) {
			var playerPosition = this.playerNodes.head.entity.get(PositionComponent);
			var campPosition = campNode.entity.get(PositionComponent);
			return playerPosition.level == campPosition.level && playerPosition.sector == campPosition.sector && playerPosition.inCamp;
		},
		
		addLogMessage: function(msg, replacements, values, forCamp) {	    
			var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
			if (!forCamp) {
			logComponent.addMessage(msg, replacements, values);
			} else {
			var campPos = forCamp.entity.get(PositionComponent);
			logComponent.addMessage(msg, replacements, values, campPos.level, campPos.sector, true);
			}
		}
        
    });

    return CampEventsSystem;
});
