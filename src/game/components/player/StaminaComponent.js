define(['ash'], function (Ash) {
    var StaminaComponent = Ash.Class.extend({
        constructor: function (initialStamina) {
            this.stamina = initialStamina;
            this.health = 100;
            this.maxHP = this.health;
            this.hp = this.maxHP;
            this.accumulation = 0;
            this.accSources = [];
        },
        
        resetHP: function () {
            this.hp = this.maxHP;
        },

        getSaveKey: function () {
            return "Stamina";
        },
    });

    return StaminaComponent;
});
