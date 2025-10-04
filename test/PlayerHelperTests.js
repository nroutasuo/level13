define([
    'game/helpers/PlayerHelper'
], function (PlayerHelper) {

    var engine = { getNodeList: function () {} };
    var playerHelper = new PlayerHelper(engine);

    QUnit.module("example/model/PlayerHelper"); 

    QUnit.test("canTakeAllRewards", function (assert) {
        assert.equal(playerHelper.canTakeAllRewards(null), true, "input null");
    });
});
