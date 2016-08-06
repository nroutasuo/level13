define(['ash', 'game/constants/ItemConstants', 'game/constants/PerkConstants'], function (Ash, ItemConstants, PerkConstants) {

    var HazardConstants = {
        
        isAffectedByHazard: function (featuresComponent, itemsComponent) {
            if (featuresComponent.hazards.hasHazards() && this.getHazardDisabledReason(featuresComponent, itemsComponent) !== null) {
                return true;
            }
            return false;
        },
        
        getHazardDisabledReason: function (featuresComponent, itemsComponent) {
            if (featuresComponent.hazards.radiation > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_radiation))
                return "area too radioactive";
            if (featuresComponent.hazards.poison > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_poison))
                return "area too polluted";
            if (featuresComponent.hazards.cold > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_cold))
                return "area too cold";
            return null;
        },
        
        getPerksForSector: function (featuresComponent, itemsComponent) {
            var result = [];
            if (featuresComponent.hazards.radiation > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_radiation))
                result.push(PerkConstants.perkIds.hazardRadiation);
            if (featuresComponent.hazards.poison > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_poison))
                result.push(PerkConstants.perkIds.hazardPoison);
            if (featuresComponent.hazards.cold > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_cold))
                result.push(PerkConstants.perkIds.hazardCold);
            return result;
        }

    };

    return HazardConstants;
});