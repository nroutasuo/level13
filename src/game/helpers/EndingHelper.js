define(['ash', 'game/GameGlobals', 'game/constants/UpgradeConstants', 'game/constants/WorldConstants', 'game/constants/PlayerActionConstants'],
function (Ash, GameGlobals, UpgradeConstants, WorldConstants, PlayerActionConstants) {
	
	var EndingHelper = Ash.Class.extend({
		
		endProjectUpgrades: [],

		constructor: function (engine) {},
		
		isReadyForLaunch: function () {
			if (GameGlobals.gameState.isLaunched) return false;
			if (GameGlobals.gameState.numCamps < WorldConstants.CAMPS_TOTAL) return false;
			
			let reqsCheck = GameGlobals.playerActionsHelper.checkRequirements("launch", false);
			
			return reqsCheck.value >= 1 || reqsCheck.baseReason == PlayerActionConstants.DISABLED_REASON_BUSY;
		},
		
		isFinished: function () {
			return GameGlobals.gameState.isFinished;
		},
		
	});

	return EndingHelper;
});
