// Singleton with helper methods for level entities
define([
    'ash',
    'game/GameGlobals',
    'game/nodes/sector/SectorNode',
    'game/nodes/PlayerLocationNode',
    'game/components/common/CampComponent',
    'game/components/common/PositionComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorLocalesComponent',
], function (
	Ash,
    GameGlobals,
	SectorNode,
	PlayerLocationNode,
    CampComponent,
    PositionComponent,
	SectorStatusComponent,
	SectorFeaturesComponent,
    SectorLocalesComponent,
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
            var levelVO = GameGlobals.levelHelper.getLevelVO(position.level);
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
            features.levelPopulationGrowthFactor = levelVO.populationGrowthFactor;
            features.isSurfaceLevel = levelVO.level == GameGlobals.gameState.getSurfaceLevel();
            features.isGroundLevel = levelVO.level == GameGlobals.gameState.getGroundLevel();
            features.hasCamp = hasCamp;
            features.hasGrove = hasGrove;
            return features;
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
