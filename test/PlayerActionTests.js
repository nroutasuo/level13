define([
	'game/GameGlobals',
	'game/constants/PlayerActionConstants',
	'game/PlayerActionFunctions',
], function (GameGlobals, PlayerActionConstants, PlayerActionFunctions) {

    QUnit.module("PlayerActions"); 

    // set up fake game state

    let testEngine = {
        getNodeList: function () {},
    };
    let sector = {};

    // test data

    let allActions = Object.keys(PlayerActionConstants.requirements);
    let actionParams = {
        "bridge_gap": "13-1-1",
    };

    // tests

    let playerActionFunctions = new PlayerActionFunctions(testEngine);

    for (let i = 0; i < allActions.length; i++) {
        let action = allActions[i];
        QUnit.test.skip("canPerformAction " + action, (assert) => {
            playerActionFunctions.performAction(action, actionParams[action]);
            assert.expect(0);
        });
    }

    QUnit.test.skip("can't dismantle stable if caravan active", (assert) => {
        let reqs = GameGlobals.playerActionsHelper.checkActionRequirementsInternal("dismantle_in_stable");
        assert.equal(reqs.value, 0, "dismantle not allowed");
        assert.equal(reqs.reqsResult, "There is an active caravan.");
    });
});
