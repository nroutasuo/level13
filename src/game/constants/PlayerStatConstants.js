define(['ash', 'game/GameGlobals', 'game/constants/PerkConstants'], function (Ash, GameGlobals, PerkConstants) {

	var PlayerStatConstants = {

		VISION_BASE: 25,
		VISION_BASE_SUNLIT: 50,
		HEALTH_MINIMUM: 10,
		HEALTH_TO_STAMINA_FACTOR: 10,
		
		MAX_SCOUT_LOCALE_STAMINA_COST: 500,
		STAMINA_GAINED_FROM_NAP: 100,
		STAMINA_GAINED_FROM_GROVE: 200,
		STAMINA_GAINED_FROM_POTION_1: 500,

		getStaminaWarningLimit: function (staminaComponent) {
			var maxStamina = staminaComponent.maxStamina;
			var staminaCostToMoveOneSector = GameGlobals.playerActionsHelper.getCosts("move_sector_west").stamina;
			var staminaCostToCamp = GameGlobals.playerActionsHelper.getCosts("move_camp_level").stamina;
			return Math.min(maxStamina * 0.25, Math.max(staminaCostToCamp + staminaCostToMoveOneSector * 5, staminaCostToMoveOneSector * 10, 50));
		},
		
		getMaxHealth: function (perksComponent) {
			let injuryEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.injury);
			let healthEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.health);
			healthEffects = healthEffects === 0 ? 1 : healthEffects;
			return Math.max(PlayerStatConstants.HEALTH_MINIMUM, Math.round(200 * healthEffects * injuryEffects) / 2);
		},
		
		getMaxStamina: function (perksComponent) {
			let staminaEffects = perksComponent.getTotalEffect(PerkConstants.perkTypes.stamina);
			staminaEffects = staminaEffects === 0 ? 1 : staminaEffects;
			let maxHealth = this.getMaxHealth(perksComponent);
			return maxHealth * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR * staminaEffects;
		},

	};

	return PlayerStatConstants;

});
