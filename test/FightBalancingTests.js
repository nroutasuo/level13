define(function (require) { 

    var EnemyCreator = require("worldcreator/EnemyCreator");
    var EnemyConstants = require("game/constants/EnemyConstants");
    var enemyCreator = new EnemyCreator();

    QUnit.module("example/model/FightBalancing"); 

    QUnit.test("getPlayerStrength.test", function (assert) {
        assert.equal(enemyCreator.getPlayerStrength(1, 1), 20);
    });

    QUnit.test.skip("creates enemies", function (assert) {
        enemyCreator.createEnemies();
        assert.equal(Object.keys(EnemyConstants.enemyDefinitions).length, 12);
    });
});
