define([
    'ash', 'game/components/type/SectorComponent',
    'game/components/common/ResourcesComponent',    
    'game/components/common/ResourceAccumulationComponent'
], function(Ash, SectorComponent, ResourcesComponent, ResourceAccumulationComponent) {
    var SectorResourcesNode = Ash.Node.create({
        sector : SectorComponent,
        resources : ResourcesComponent,        
        resourceAccumulation : ResourceAccumulationComponent
    });

    return SectorResourcesNode;
});
