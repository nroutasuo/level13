// A system that updates the player's resource storage capacity based on their currently equipped bag
define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/TutorialConstants',
	'game/nodes/LogNode'
], function (Ash, GameGlobals, GlobalSignals, TutorialConstants, LogNode) {
	
	let TutorialSystem = Ash.System.extend({
		
		logNodes: null,
		tutorialsByTrigger: {},
		
		context: "tutorial",
	
		constructor: function () {
			this.initTutorials();
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.logNodes = engine.getNodeList(LogNode);
			this.registerListeners();
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.logNodes = null;
			GlobalSignals.removeAll(this);
		},
		
		initTutorials: function () {
			for (let tutorialID in TutorialConstants.tutorials) {
				let tutorial = TutorialConstants.tutorials[tutorialID];
				tutorial.id = tutorialID;
				let trigger = tutorial.trigger;
				if (!this.tutorialsByTrigger[trigger]) {
					this.tutorialsByTrigger[trigger] = [];
				}
				this.tutorialsByTrigger[trigger].push(tutorialID);
			}
		},
		
		registerListeners: function () {
			GlobalSignals.add(this, GlobalSignals.sectorScavengedSignal, function () { this.onTutorialTrigger("action_scavenge"); });
			GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, function () { this.onTutorialTrigger("change_inventory"); });
		},
		
		onTutorialTrigger: function (tutorialTriggerID) {
			this.triggerTutorials(tutorialTriggerID);
		},
		
		triggerTutorials: function (tutorialTriggerID) {
			let tutorialIDs = this.tutorialsByTrigger[tutorialTriggerID];
			if (!tutorialIDs || tutorialIDs.length == 0) return;
			
			for (let i = 0; i < tutorialIDs.length; i++) {
				this.triggerTutorial(tutorialIDs[i]);
			}
		},
		
		triggerTutorial: function (tutorialID) {
			let tutorial = TutorialConstants.tutorials[tutorialID];
			if (!tutorial) {
				log.w("No such tutorial found: [" + tutorialID + "]", this);
				return;
			}
			
			if (!this.isTutorialAvailable(tutorialID)) {
				return;
			}
			
			this.showTutorial(tutorialID);
		},
		
		showTutorial: function (tutorialID) {
			let tutorial = TutorialConstants.tutorials[tutorialID];
			if (!tutorial) {
				log.w("No such tutorial found: [" + tutorialID + "]", this);
				return;
			}
			
			log.i("show tutorial: " + tutorialID, this);
			
			this.showTutorialLogMessage(tutorialID, tutorial.logMessage);
			this.completeTutorial(tutorialID);
		},
		
		completeTutorial: function (tutorialID) {
			log.i("complete tutorial: " + tutorialID, this);
			GameGlobals.gameState.completedtutorials[tutorialID] = new Date().getTime();
		},
		
		isTutorialAvailable: function (tutorialID) {
			let tutorial = TutorialConstants.tutorials[tutorialID];
			if (!tutorial) {
				return false;
			}
			
			return !this.isTutorialCompletedForNow(tutorialID) && this.isTutorialConditionsMet(tutorial.conditions);
		},
		
		isTutorialCompletedForNow: function (tutorialID) {
			let tutorial = TutorialConstants.tutorials[tutorialID];
			if (!tutorial) {
				return true;
			}
			
			let completionTimestamp = this.getTutorialCompletionTimestamp(tutorialID);
			
			switch (tutorial.repeats) {
				case TutorialConstants.TUTORIAL_REPEATS_TYPE_NEVER:
					return completionTimestamp != null;
				case TutorialConstants.TUTORIAL_REPEATS_TYPE_ALWAYS:
					return false;
				case TutorialConstants.TUTORIAL_REPEATS_TYPE_COOLDOWN:
					let now = new Date().getTime();
					return completionTimestamp != null && now - completionTimestamp < TutorialConstants.TUTORIAL_COOLDOWN_DURATION;
				default:
					log.w("unknown tutorial repeats rule for tutorial ID [" + tutorialID + "]: [" + tutorial.repeats + "]");
					return true;
			}
		},
		
		isTutorialCompletedAtLeastOnce: function (tutorialID) {
			return this.getTutorialCompletionTimestamp(tutorialID) != null;
		},
		
		isTutorialConditionsMet: function (conditions) {
			let reqsCheck = GameGlobals.playerActionsHelper.checkGeneralRequirementaInternal(conditions);
			return reqsCheck.value >= 1;
		},
		
		getTutorialCompletionTimestamp: function (tutorialID) {
			return GameGlobals.gameState.completedtutorials[tutorialID] || null;
		},
		
		showTutorialLogMessage: function (tutorialID, msg) {
			this.logNodes.head.logMessages.addMessage(tutorialID, msg);
		},
		
	});

	return TutorialSystem;
});
