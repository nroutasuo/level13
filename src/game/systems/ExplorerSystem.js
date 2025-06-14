define([
	'ash',
	'text/Text',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/ExplorerConstants',
	'game/constants/LogConstants',
	'game/nodes/player/PlayerStatsNode',
	'game/components/common/PositionComponent',
], function (Ash, Text, MathUtils, GameGlobals, GlobalSignals, GameConstants, ExplorerConstants, LogConstants, PlayerStatsNode, PositionComponent) {

	let ExplorerSystem = Ash.System.extend({

		context: "ExplorerSystem",

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);

			GlobalSignals.add(this, GlobalSignals.playerEnteredCampSignal, this.onEnterCamp);
			GlobalSignals.add(this, GlobalSignals.gameStateReadySignal, this.onGameStateReady);
			GlobalSignals.add(this, GlobalSignals.dialogueCompletedSignal, this.onDialogueCompleted);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerStatsNodes = null;

			GlobalSignals.removeAll(this);
		},

		update: function (time) {
			this.updateExplorerInjuries(time);
		},

		updateExplorerInjuries: function (time) {
			let explorers = this.playerStatsNodes.head.explorers.getAll();
			if (explorers.length == 0) return;

			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				if (explorerVO.inParty) continue;
				if (explorerVO.injuredTimer >= 0) {
					explorerVO.injuredTimer -= time;
					if (explorerVO.injuredTimer <= 0) {
						this.handleExplorerInjuryHealed(explorerVO);
					}
				}
			}
		},

		handleExplorerInjuryHealed: function (explorerVO) {
			let sector = GameGlobals.playerActionsHelper.getActionCampSector();
			let position = sector.get(PositionComponent).getPosition();
			position.inCamp = true;
			let msg = { textKey: "ui.log.explorer_healed_message", textParams: { name: explorerVO.name } };
			GameGlobals.playerHelper.addLogMessage(LogConstants.getUniqueID(), msg, { visibility: LogConstants.MSG_VISIBILITY_CAMP, position: position });
			GlobalSignals.explorersChangedSignal.dispatch();
		},

		updateExplorersAbility: function () {
			let explorers = this.playerStatsNodes.head.explorers.getAll();
			if (explorers.length == 0) return;

			// only one can level up at a time
			let explorer = MathUtils.randomElement(explorers);
			this.updateExplorerAbility(explorer);

			// TODO make this a manual player triggered action instead of triggering automatically?

			if (explorer.pendingAbilityLevel > explorer.abilityLevel) {
				explorer.abilityLevel = explorer.pendingAbilityLevel;
				explorer.pendingAbilityLevel = -1;

				let msg = Text.t("story.messages.explorer_level_up_message_01", explorer.name);
				GameGlobals.playerHelper.addLogMessage(LogConstants.MDS_ID_EXPLORER_LEVEL_UP, msg, { visibility: LogConstants.MSG_VISIBILITY_CAMP });

				GlobalSignals.explorersChangedSignal.dispatch();
			}
		},

		updateExplorerAbility: function (explorerVO) {
			if (!ExplorerConstants.isValidAbilityTypeForLevelUp(explorerVO.abilityType)) return;

			let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorerVO.abilityType);

			let levelUpChance = 0.01;

			if (explorerVO.trust > 2) levelUpChance *= 2;
			if (explorerVO.trust > 5) levelUpChance *= 2
			if (explorerVO.trust > 7) levelUpChance *= 2;
			if (explorerVO.inParty) levelUpChance *= 2;
			if (explorerType == ExplorerConstants.explorerType.FIGHTER) levelUpChance *= 2;
			if (explorerType == ExplorerConstants.explorerType.FIGHTER && !GameGlobals.playerHelper.hasAdequateFighter()) levelUpChance *= 2;
			if (ExplorerConstants.isUnique(explorerVO)) levelUpChance *= 10;

			if (Math.random() > levelUpChance) return;

			let campOrdinal = GameGlobals.gameState.numCamps;
			let abilityLevel = explorerVO.abilityLevel;
			let abilityType = explorerVO.abilityType;
			let averageAbilityLevel = ExplorerConstants.getAverageAbilityLevelByCampOrdinal(abilityType, campOrdinal);

			if (abilityLevel >= averageAbilityLevel) return;

			let newAbilityLevel = averageAbilityLevel;

			if (!ExplorerConstants.isSignificantAbilityLevelDifference(explorerVO, abilityLevel, newAbilityLevel)) return;

			explorerVO.pendingAbilityLevel = newAbilityLevel;
		},

		updateExplorersTrust: function () {
			let explorers = this.playerStatsNodes.head.explorers.getAll();
			if (explorers.length == 0) return;

			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				this.updateExplorerTrust(explorerVO);
			}
		},

		updateExplorerTrust: function (explorerVO) {
			let trust = this.getExplorerTrust(explorerVO);

			if (trust != explorerVO.trust) {
				log.i("update explorer trust: " + explorerVO.id + " -> " + trust);
				explorerVO.trust = trust;
			}
		},

		getExplorerTrust: function (explorerVO) {
			let maxTrust = 10;

			let getTrustFactor = function (value, maxValue) {
				return MathUtils.map(value || 0, 0, maxValue, 0, maxTrust);
			};

			let fightValue = getTrustFactor(explorerVO.numFights, 100);
			let stepValue = getTrustFactor(explorerVO.numSteps, 3000);
			let excursionValue = getTrustFactor(explorerVO.numExcursions, 100);
			let dialogueValue = getTrustFactor(explorerVO.numDialogues, 100);

			// don't let excursion count alone because it's so easy to spam, but count short excursions for something
			let explorationValue = MathUtils.average([ stepValue, excursionValue ]);

			let result = Math.floor(Math.max(dialogueValue, explorationValue, fightValue));

			if (explorerVO.id == "prospector" && GameGlobals.gameState.numCamps > 8) {
				// hack to not completely reset prospector trust after finding her again
				result = Math.max(result, 3);
			}

			return result;
		},

		onEnterCamp: function () {
			this.updateExplorersTrust();
			this.updateExplorersAbility();
		},

		onGameStateReady: function () {
			this.updateExplorersTrust();
		},

		onDialogueCompleted: function () {
			this.updateExplorersTrust();
		},

	});

	return ExplorerSystem;
});
