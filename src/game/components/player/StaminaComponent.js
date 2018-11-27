define(['ash'], function (Ash) {
    var StaminaComponent = Ash.Class.extend({
        constructor: function (initialStamina) {
            this.stamina = initialStamina;
            this.health = 100;
            this.hp = 100;
            this.accumulation = 0;
            this.accSources = [];
        },

        getSaveKey: function () {
            return "Stamina";
        },
    });

    return StaminaComponent;
});
