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
], function (Ash, Text, MathUtils, GameGlobals, GlobalSignals, GameConstants, ExplorerConstants, LogConstants, PlayerStatsNode) {

	let ExplorerSystem = Ash.System.extend({

		context: "ExplorerSystem",

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);

			GlobalSignals.add(this, GlobalSignals.playerEnteredCampSignal, this.onEnterCamp);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerStatsNodes = null;

			GlobalSignals.removeAll(this);
		},

		updateExplorersAbility: function () {
			let explorers = this.playerStatsNodes.head.explorers.getParty();
			if (explorers.length == 0) return;

			// only one can level up at a time
			let explorer = MathUtils.randomElement(explorers);
			this.updateExplorerAbility(explorer);

			// TODO make this a manual player triggered action instead of triggering automatically?

			if (explorer.pendingAbilityLevel > explorer.abilityLevel) {
				explorer.abilityLevel = explorer.pendingAbilityLevel;
				explorer.pendingAbilityLevel = -1;

				let msg = Text.t("story.messages.explorer_level_up_message_01", explorer.name);
				GameGlobals.playerHelper.addLogMessage(LogConstants.MDS_ID_EXPLORER_LEVEL_UP, msg, { visibility: LogConstants.MSG_VISIBILITY_GLOBAL });

				GlobalSignals.explorersChangedSignal.dispatch();
			}
		},

		updateExplorerAbility: function (explorerVO) {
			if (!explorerVO.trust) return;
			if (!ExplorerConstants.isValidAbilityTypeForLevelUp(explorerVO.abilityType)) return;

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
			let explorers = this.playerStatsNodes.head.explorers.getParty();
			if (explorers.length == 0) return;

			for (let i = 0; i < explorers.length; i++) {
				let explorerVO = explorers[i];
				this.updateExplorerTrust(explorerVO);
			}
		},

		updateExplorerTrust: function (explorerVO) {
			let isFighter = ExplorerConstants.isFighter(explorerVO);

			let fightThresholds = isFighter ? [ 0, 1, 10, 50 ] : [ 0, 0, 0, 0 ]
			let stepThresholds = [ 0, 30, 100, 500 ];
			let excursionTresholds = [ 0, 2, 10, 50 ];

			for (let i = 1; i <= 3; i++) {
				if (explorerVO.numFights < fightThresholds[i]) break;
				if (explorerVO.numSteps < stepThresholds[i]) break;
				if (explorerVO.numExcursions < excursionTresholds[i]) break;
				explorerVO.trust = i;
			}
		},

		onEnterCamp: function () {
			this.updateExplorersTrust();
			this.updateExplorersAbility();
		},

	});

	return ExplorerSystem;
});
