define(['ash', 'game/GameGlobals', 'game/constants/UpgradeConstants', 'game/constants/WorldConstants', 'game/nodes/tribe/TribeUpgradesNode'],
function (Ash, GameGlobals, UpgradeConstants, WorldConstants, TribeUpgradesNode) {
	
	var EndingHelper = Ash.Class.extend({
		
		endProjectUpgrades: [],

		constructor: function (engine) {},
		
		hasUnlockedEndProject: function () {
			return false;
		},
		
		isReadyForLaunch: function () {
			if (GameGlobals.gameState.numCamps < WorldConstants.CAMPS_TOTAL) return false;
			return GameGlobals.playerActionsHelper.checkAvailability("launch");
		},
		
		isFinished: function () {
			return GameGlobals.gameState.isFinished;
		},
		
	});

	return EndingHelper;
});
