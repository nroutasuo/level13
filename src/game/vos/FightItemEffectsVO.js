define(['ash'], function (Ash) {

    var FightItemEffectsVO = Ash.Class.extend({
        
        // TODO consider making the enemy an entity & having both enemy and player have this component 
        
        enemyStunnedSeconds: 0,
        playerStunnedSeconds: 0,
        
        constructor: function () {
            this.enemyStunnedSeconds = 0;
            this.playerStunnedSeconds = 0;
        }
        
    });

    return FightItemEffectsVO;
});
