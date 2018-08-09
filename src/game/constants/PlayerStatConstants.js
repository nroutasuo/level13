define(['ash'], function (Ash) {
    
    var PlayerStatConstants = {
    
		VISION_BASE: 25,
        VISION_BASE_SUNLIT: 50,
        HEALTH_MINIMUM: 10,
        HEALTH_TO_STAMINA_FACTOR: 10,
        
        STAMINA_GAINED_FROM_NAP: 25,
        
        getStaminaWarningLimit: function (playerActionsHelper, staminaComponent) {
            var maxStamina = Math.round(staminaComponent.health * PlayerStatConstants.HEALTH_TO_STAMINA_FACTOR);
            var staminaCostToMoveOneSector = playerActionsHelper.getCosts("move_sector_west", 1, 1).stamina;
            var staminaCostToCamp = playerActionsHelper.getCosts("move_camp_level", 1).stamina;
            return Math.max(staminaCostToCamp + staminaCostToMoveOneSector * 5, staminaCostToMoveOneSector * 10, 50);
        },
    
    };
    
    return PlayerStatConstants;
    
});
