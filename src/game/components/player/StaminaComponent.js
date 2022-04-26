define(['ash'], function (Ash) {
	var StaminaComponent = Ash.Class.extend({
		
		isPendingPenalty: false,
		
		constructor: function (initialStamina) {
			this.stamina = initialStamina;
			this.maxStamina = 100;
			this.accumulation = 0;
			this.accSources = [];
			
			this.health = 100;
			this.healthAccumulation = 0;
			this.healthAccSources = [];
			
			this.hp = this.health;
			this.maxHP = this.health;
			
			this.shield = 0;
			this.maxShield = 0;
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
