// Marker component: this sector has a fight initialized (can still be fled)
define(['ash'], function (Ash) {

    var FightEncounterComponent = Ash.Class.extend({
        
        enemy: null,
        context: null,
        
        constructor: function (enemy, context) {
            this.enemy = enemy;
            this.context = context;
        },
    });

    return FightEncounterComponent;
});
