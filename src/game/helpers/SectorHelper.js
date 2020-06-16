// Singleton with helper methods for level entities
define([
    'ash',
    'game/GameGlobals',
    'game/constants/ItemConstants',
    'game/constants/PerkConstants',
    'game/nodes/sector/SectorNode',
    'game/nodes/PlayerLocationNode',
    'game/components/common/CampComponent',
    'game/components/common/PositionComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/type/LevelComponent',
], function (
	Ash,
    GameGlobals,
    ItemConstants,
    PerkConstants,
	SectorNode,
	PlayerLocationNode,
    CampComponent,
    PositionComponent,
	SectorStatusComponent,
	SectorFeaturesComponent,
    SectorLocalesComponent,
    LevelComponent
) {
    var SectorHelper = Ash.Class.extend({
        
		engine: null,
		sectorNodes: null,
		playerLocationNodes: null,
		
		constructor: function (engine) {
			this.engine = engine;
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
		},
        
        getTextFeatures: function (sector) {
            var position = sector.get(PositionComponent).getPosition();
            var featuresComponent = sector.get(SectorFeaturesComponent);
            var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(position.level);
            var levelEntity = GameGlobals.levelHelper.getLevelEntityForSector(sector);
            var levelComponent = levelEntity.get(LevelComponent);
            var hasCamp = sector.has(CampComponent);
            var hasGrove = false;
            
            var sectorLocalesComponent = sector.get(SectorLocalesComponent);
            var locales = sectorLocalesComponent.locales;
            for (var i = 0; i < locales.length; i++) {
                if (locales[i].type == localeTypes.grove) {
                    hasGrove = true;
                }
            }
            
            var features = Object.assign({}, featuresComponent);
            features.level = position.level;
            features.levelOrdinal = levelOrdinal;
            features.condition = featuresComponent.getCondition();
            features.populationFactor = levelComponent.populationFactor;
            features.isSurfaceLevel = position.level == GameGlobals.gameState.getSurfaceLevel();
            features.isGroundLevel = position.level == GameGlobals.gameState.getGroundLevel();
            features.hasCamp = hasCamp;
            features.hasGrove = hasGrove;
            return features;
        },
        
        getEffectiveHazardValue: function (sectorFeatures, sectorStatus, hazard) {
            var hazards = this.getEffectiveHazards(sectorFeatures, sectorStatus);
            return hazards[hazard] || 0;
        },
        
        getEffectiveHazards: function (sectorFeatures, sectorStatus) {
            var result = sectorFeatures.hazards.clone();
            result.radiation = Math.max(0, result.radiation - sectorStatus.getHazardReduction("radiation"));
            result.poison = Math.max(0, result.poison - sectorStatus.getHazardReduction("poison"));
            result.cold = Math.max(0, result.cold - sectorStatus.getHazardReduction("cold"));
            return result;
        },
        
        hasHazards: function (sectorFeatures, sectorStatus) {
            var hazards = this.getEffectiveHazards(sectorFeatures, sectorStatus);
            return hazards.hasHazards();
        },
            
        isAffectedByHazard: function (featuresComponent, statusComponent, itemsComponent) {
            var hazards = this.getEffectiveHazards(featuresComponent, statusComponent);
            if (hazards.hasHazards() && this.getHazardDisabledReason(featuresComponent, statusComponent, itemsComponent) !== null) {
                return true;
            }
            return false;
        },
        
        getHazardDisabledReason: function (featuresComponent, statusComponent, itemsComponent) {
            var hazards = this.getEffectiveHazards(featuresComponent, statusComponent);
            if (hazards.radiation > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_radiation))
                return "area too radioactive";
            if (hazards.poison > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_poison))
                return "area too polluted";
            if (hazards.cold > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_cold))
                return "area too cold";
            return null;
        },
        
        getPerksForSector: function (featuresComponent, statusComponent, itemsComponent) {
            var hazards = this.getEffectiveHazards(featuresComponent, statusComponent);
            var result = [];
            if (hazards.radiation > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_radiation))
                result.push(PerkConstants.perkIds.hazardRadiation);
            if (hazards.poison > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_poison))
                result.push(PerkConstants.perkIds.hazardPoison);
            if (hazards.cold > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_cold))
                result.push(PerkConstants.perkIds.hazardCold);
            return result;
        },
		
		getLocationDiscoveredResources: function (sector) {
            var resources = [];
            sector = sector ? sector : this.playerLocationNodes.head.entity;
            var sectorStatus = sector.get(SectorStatusComponent);
            var sectorFeatures = sector.get(SectorFeaturesComponent);
            var missingResources = [];
            
			for (var i = 0; i < sectorStatus.discoveredResources.length; i++) {
                var res = sectorStatus.discoveredResources[i];
                if (sectorFeatures.resourcesScavengable[res] > 0) {
                    resources.push(res);
                } else {
                    log.w("Resource in discovered resources not found on sector.");
                    missingResources.push(res);
                }
			}
            
            for (var j = 0; j < missingResources.length; j++) {
                sectorStatus.discoveredResources.splice(sectorStatus.discoveredResources.indexOf(missingResources[j]), 1);
            }
            
            resources.sort(function (a, b) {
                if (a === b) return 0;
                if (a === resourceNames.metal) return -1;
                if (b === resourceNames.metal) return 1;
                if (a === resourceNames.water) return -1;
                if (b === resourceNames.water) return 1;
                if (a === resourceNames.food) return -1;
                if (b === resourceNames.food) return 1;
                if (a === resourceNames.fuel) return -1;
                if (b === resourceNames.fuel) return 1;
                return 0;
            });
            
            return resources;
		},
		
    });
    
    return SectorHelper;
});
