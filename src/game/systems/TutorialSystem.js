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
				let triggers = tutorial.triggers;
				for (let i = 0; i < triggers.length; i++) {
					let trigger = triggers[i];
					if (!this.tutorialsByTrigger[trigger]) {
						this.tutorialsByTrigger[trigger] = [];
					}
					this.tutorialsByTrigger[trigger].push(tutorialID);
				}
			}
		},
		
		registerListeners: function () {
			GlobalSignals.add(this, GlobalSignals.sectorScavengedSignal, function () { this.onTutorialTrigger("action_scavenge"); });
			GlobalSignals.add(this, GlobalSignals.sectorScoutedSignal, function () { this.onTutorialTrigger("action_scout"); });
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, function () { this.onTutorialTrigger("action_build"); });
			GlobalSignals.add(this, GlobalSignals.actionCompletedSignal, function () { this.onTutorialTrigger("action_any"); });
			GlobalSignals.add(this, GlobalSignals.playerEnteredCampSignal, function () { this.onTutorialTrigger("action_enter_camp"); });
			GlobalSignals.add(this, GlobalSignals.actionRewardsCollectedSignal, function () { this.onTutorialTrigger("action_collect_rewards"); });
			GlobalSignals.add(this, GlobalSignals.inventoryChangedSignal, function () { this.onTutorialTrigger("change_inventory"); });
			GlobalSignals.add(this, GlobalSignals.playerMovedSignal, function () { this.onTutorialTrigger("change_position"); });
			GlobalSignals.add(this, GlobalSignals.featureUnlockedSignal, function () { this.onTutorialTrigger("feature_unlocked"); });
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
			let startDelay = isNaN(tutorial.delay) ? 0 : tutorial.delay;
			
			setTimeout(() => {
				this.showTutorialLogMessage(tutorialID, tutorial.logMessage);
			}, startDelay);
			
			this.completeTutorial(tutorialID, tutorial.group);
		},
		
		completeTutorial: function (tutorialID, tutorialGroupID) {
			log.i("complete tutorial: " + tutorialID, this);
			let timestamp = new Date().getTime();
			GameGlobals.gameState.completedTutorials[tutorialID] = timestamp;
			if (tutorialGroupID) {
				GameGlobals.gameState.completedTutorialGroups[tutorialGroupID] = timestamp;
			}
		},
		
		isTutorialAvailable: function (tutorialID) {
			let tutorial = TutorialConstants.tutorials[tutorialID];
			if (!tutorial) {
				return false;
			}
			
			if (this.isTutorialCompletedForNow(tutorialID)) {
				return false;
			}
			
			if (this.isTutorialGroupCompletedForNow(tutorialID)) {
				return false;
			}
			
			if (!this.isTutorialConditionsMet(tutorial.conditions)) {
				return false;
			}
			
			return true;
		},
		
		isTutorialCompletedForNow: function (tutorialID) {
			let tutorial = TutorialConstants.tutorials[tutorialID];
			if (!tutorial) {
				return true;
			}
			
			let completionTimestamp = this.getTutorialCompletionTimestamp(tutorialID);
			return this.isCompletedForNow(tutorial.repeats, completionTimestamp);
		},
		
		isTutorialGroupCompletedForNow: function (tutorialID) {
			let tutorial = TutorialConstants.tutorials[tutorialID];
			if (!tutorial) {
				return true;
			}
			
			if (!tutorial.group) {
				return false;
			}
			
			let completionTimestamp = this.getTutorialGroupCompletionTimestamp(tutorial.group);
			return this.isCompletedForNow(tutorial.repeats, completionTimestamp);
		},
		
		isCompletedForNow: function (repeatRule, completionTimestamp) {
			switch (repeatRule) {
				case TutorialConstants.TUTORIAL_REPEATS_TYPE_NEVER:
					return completionTimestamp != null;
				case TutorialConstants.TUTORIAL_REPEATS_TYPE_ALWAYS:
					return false;
				case TutorialConstants.TUTORIAL_REPEATS_TYPE_COOLDOWN:
					let now = new Date().getTime();
					return completionTimestamp != null && now - completionTimestamp < TutorialConstants.TUTORIAL_COOLDOWN_DURATION;
				default:
					log.w("unknown tutorial repeat rule: [" + repeatRule + "]");
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
			return GameGlobals.gameState.completedTutorials[tutorialID] || null;
		},
		
		getTutorialGroupCompletionTimestamp: function (tutorialID) {
			return GameGlobals.gameState.completedTutorialGroups[tutorialID] || null;
		},
		
		showTutorialLogMessage: function (tutorialID, msg) {
			this.logNodes.head.logMessages.addMessage(tutorialID, msg);
		},
		
	});

	return TutorialSystem;
});
