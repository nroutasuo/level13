define(['ash',], function (Ash) {

	let GlobalSignals = {
		
		PRIORITY_DEFAULT: 0,
		PRIORITY_HIGH: 1,
		
		exceptionCallback: null,

		// ui events
		pageSetUpSignal:new Ash.Signals.Signal(),
		gameShownSignal: new Ash.Signals.Signal(),
		tabClosedSignal: new Ash.Signals.Signal(),
		tabChangedSignal: new Ash.Signals.Signal(),
		tabOpenedSignal: new Ash.Signals.Signal(),
		actionButtonClickedSignal: new Ash.Signals.Signal(),
		calloutsGeneratedSignal: new Ash.Signals.Signal(),
		popupOpenedSignal: new Ash.Signals.Signal(),
		popupShownSignal: new Ash.Signals.Signal(),
		popupClosingSignal: new Ash.Signals.Signal(),
		popupClosedSignal: new Ash.Signals.Signal(),
		elementToggledSignal: new Ash.Signals.Signal(),
		elementCreatedSignal: new Ash.Signals.Signal(),
		buttonStateChangedSignal: new Ash.Signals.Signal(),
		windowResizedSignal: new Ash.Signals.Signal(),
		popupResizedSignal: new Ash.Signals.Signal(),
		layoutChangedSignal: new Ash.Signals.Signal(),
		updateButtonsSignal: new Ash.Signals.Signal(),
		clearBubblesSignal: new Ash.Signals.Signal(),
		markLogMessagesSeenSignal: new Ash.Signals.Signal(),
		projectHiddenSignal: new Ash.Signals.Signal(),
		themeToggledSignal: new Ash.Signals.Signal(),
		transitionStartedSignal: new Ash.Signals.Signal(),
		transitionCompletedSignal: new Ash.Signals.Signal(),
		triggerSoundSignal: new Ash.Signals.Signal(),
		
		// player move
		playerMoveStartedSignal: new Ash.Signals.Signal(),
		playerPositionChangedSignal: new Ash.Signals.Signal(),
		playerMoveCompletedSignal: new Ash.Signals.Signal(),
		playerLocationChangedSignal: new Ash.Signals.Signal(),
		playerEnteredLevelSignal: new Ash.Signals.Signal(),

		// player actions
		actionStartingSignal: new Ash.Signals.Signal(),
		actionStartedSignal: new Ash.Signals.Signal(),
		actionCompletedSignal: new Ash.Signals.Signal(),
		examineSpotExaminedSignal: new Ash.Signals.Signal(),
		playerEnteredCampSignal: new Ash.Signals.Signal(),
		playerLeftCampSignal: new Ash.Signals.Signal(),
		sectorScoutedSignal: new Ash.Signals.Signal(),
		sectorVisitedSignal: new Ash.Signals.Signal(),
		sectorRevealedSignal: new Ash.Signals.Signal(),
		localeScoutedSignal: new Ash.Signals.Signal(),
		collectorCollectedSignal: new Ash.Signals.Signal(),
		improvementBuiltSignal: new Ash.Signals.Signal(),
		itemUsedSignal: new Ash.Signals.Signal(),
		campBuiltSignal: new Ash.Signals.Signal(),
		movementBlockerClearedSignal: new Ash.Signals.Signal(),
		blueprintsChangedSignal: new Ash.Signals.Signal(),
		upgradeUnlockedSignal: new Ash.Signals.Signal(),
		milestoneUnlockedSignal: new Ash.Signals.Signal(),
		actionRewardsCollectedSignal: new Ash.Signals.Signal(),
		inventoryChangedSignal: new Ash.Signals.Signal(),
		equipmentChangedSignal: new Ash.Signals.Signal(),
		explorersChangedSignal: new Ash.Signals.Signal(),
		storageCapacityChangedSignal: new Ash.Signals.Signal(),
		fightEndedSignal: new Ash.Signals.Signal(),
		workersAssignedSignal: new Ash.Signals.Signal(),
		featureUsedSignal: new Ash.Signals.Signal(),
		featureUnlockedSignal: new Ash.Signals.Signal(),
		storyFlagChangedSignal: new Ash.Signals.Signal(),
		campRenamedSignal: new Ash.Signals.Signal(),
		caravanSentSignal: new Ash.Signals.Signal(),
		caravanReturnedSignal: new Ash.Signals.Signal(),
		mapPieceUsedSignal: new Ash.Signals.Signal(),
		workshopClearedSignal: new Ash.Signals.Signal(),
		launchedSignal: new Ash.Signals.Signal(),
		launchCompletedSignal: new Ash.Signals.Signal(),

		// story and dialogue
		dialogueCompletedSignal: new Ash.Signals.Signal(),
		triggerDialogueSignal: new Ash.Signals.Signal(),
		removeCharacterSignal: new Ash.Signals.Signal(),

		// stats changes
		visionChangedSignal: new Ash.Signals.Signal(),
		healthChangedSignal: new Ash.Signals.Signal(),
		populationChangedSignal: new Ash.Signals.Signal(),
		perksChangedSignal: new Ash.Signals.Signal(),
		tribeStatsChangedSignal: new Ash.Signals.Signal(),
		
		// other
		fightUpdateSignal: new Ash.Signals.Signal(),
		campEventStartedSignal: new Ash.Signals.Signal(),
		campEventEndedSignal: new Ash.Signals.Signal(),
		levelTypeRevealedSignal: new Ash.Signals.Signal(),

		// game meta events
		gameStateLoadedSignal: new Ash.Signals.Signal(),
		gameStateReadySignal: new Ash.Signals.Signal(),
		gameStartedSignal: new Ash.Signals.Signal(),
		gameStateRefreshSignal: new Ash.Signals.Signal(),
		saveGameSignal: new Ash.Signals.Signal(),
		restartGameSignal: new Ash.Signals.Signal(),
		gameResetSignal: new Ash.Signals.Signal(),
		gameEndedSignal: new Ash.Signals.Signal(),
		triggerCheatSignal: new Ash.Signals.Signal(),

		// system events
		slowUpdateSignal: new Ash.Signals.Signal(),
		visualUpdateSignal: new Ash.Signals.Signal(),
		triggerSignal: new Ash.Signals.Signal(),
		settingsChangedSignal: new Ash.Signals.Signal(),
		changelogLoadedSignal: new Ash.Signals.Signal(),

		add: function (system, signal, listener, priority) {
			priority = priority || GlobalSignals.PRIORITY_DEFAULT;

			if (!system.signalBindings)
				system.signalBindings = [];

			let binding = signal.add(function () {
				try {
					listener.apply(system, arguments);
				} catch (ex) {
					if (GlobalSignals.exceptionCallback) {
						GlobalSignals.exceptionCallback(ex);
					} else {
						throw ex;
					}
				}
			}, null, priority);
			system.signalBindings.push(binding);
		},

		removeAll: function (system) {
			if (!system.signalBindings) return;
			for (let i = 0; i < system.signalBindings.length; i++)
				system.signalBindings[i].detach();
			system.signalBindings = [];
		},

		registerTrigger: function (signal, triggerID) {
			signal.add(function (p1) { GlobalSignals.triggerSignal.dispatch(triggerID, p1); });
		},

	};

	return GlobalSignals;
});
