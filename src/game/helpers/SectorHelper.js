// Singleton with helper methods for level entities
define([
    'ash',
    'game/nodes/sector/SectorNode',
    'game/nodes/PlayerLocationNode',
    'game/components/common/PositionComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorControlComponent'
], function (
	Ash,
	SectorNode,
	PlayerLocationNode,
	PositionComponent,
	SectorStatusComponent,
	SectorLocalesComponent,
	SectorFeaturesComponent,
	SectorControlComponent
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
		
		getLocationDiscoveredResources: function () {
            var resources = [];
            var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
            var sectorFeatures = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			for (var i = 0; i < sectorStatus.discoveredResources.length; i++) {
                var res = sectorStatus.discoveredResources[i];
                if (sectorFeatures.resources[res] > 0) {
                    resources.push(res);
                } else {
                    console.log("WARN: Resource in discovered resources not found on sector.");
                }
			}
            return resources;
		},
		
    });
    
    return SectorHelper;
});