define(['ash', 'game/GameGlobals'], function (Ash, GameGlobals) {

    var PlayerStatConstants = {

		VISION_BASE: 25,
        VISION_BASE_SUNLIT: 50,
        HEALTH_MINIMUM: 10,
        HEALTH_TO_STAMINA_FACTOR: 10,

        STAMINA_GAINED_FROM_NAP: 25,

        getStaminaWarningLimit: function (staminaComponent) {
            var maxStamina = Math.round(staminaComponent.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
            var staminaCostToMoveOneSector = GameGlobals.playerActionsHelper.getCosts("move_sector_west").stamina;
            var staminaCostToCamp = GameGlobals.playerActionsHelper.getCosts("move_camp_level").stamina;
            return Math.min(maxStamina * 0.25, Math.max(staminaCostToCamp + staminaCostToMoveOneSector * 5, staminaCostToMoveOneSector * 10, 50));
        },

    };

    return PlayerStatConstants;

});
