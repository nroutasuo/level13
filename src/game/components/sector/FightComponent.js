// Marker component: this sector currently has a fight happening in it
define(['ash', 'game/vos/FightItemEffectsVO'], function (Ash, FightItemEffectsVO) {
    
    var FightComponent = Ash.Class.extend({
        
        enemy: null,        
        itemEffects: null,
             
        finished: false,
        won: null,
        resultVO: null,
        
        constructor: function (enemy) {
            this.enemy = enemy;
            this.itemEffects = new FightItemEffectsVO();
            this.finished = false;
            this.won = null;
            this.resultVO = null;
        },
    });

    return FightComponent;
});
