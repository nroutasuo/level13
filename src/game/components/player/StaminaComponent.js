define(['ash'], function (Ash) {
	var StaminaComponent = Ash.Class.extend({
		
		isPendingPenalty: false,
		
		constructor: function (initialStamina) {
			this.stamina = initialStamina;
			this.maxStamina = 100;
			this.health = 100;
			this.maxHP = this.health;
			this.hp = this.maxHP;
			this.maxShield = 0;
			this.shield = 0;
			this.accumulation = 0;
			this.accSources = [];
		},
		
		resetHP: function () {
			this.hp = this.maxHP;
		},
		
		resetShield: function () {
			this.shield = this.maxShield;
		},

		getSaveKey: function () {
			return "Stamina";
		},
	});

	return StaminaComponent;
});
