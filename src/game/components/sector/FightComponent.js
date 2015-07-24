// Marker component: this sector currently has a fight happening in it
define(['ash'], function (Ash) {
    
    var FightComponent = Ash.Class.extend({
        
        enemy: null,
        rewards: {},
        penalties: {},
        injuries: [],
        
        constructor: function (enemy) {
            this.enemy = enemy;
            
            this.finished = false;
            this.won = null;
        },
    });

    return FightComponent;
});
