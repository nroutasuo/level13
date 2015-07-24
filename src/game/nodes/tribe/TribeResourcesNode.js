define([
    'ash',
    'game/components/type/TribeComponent',
    'game/components/common/ResourcesComponent',
    'game/components/common/ResourceAccumulationComponent'
], function(Ash, TribeComponent, ResourcesComponent, ResourceAccumulationComponent) {
    var TribeResourcesNode = Ash.Node.create({
        tribe : TribeComponent,
        resources : ResourcesComponent,
        resourceAccumulation : ResourceAccumulationComponent
    });

    return TribeResourcesNode;
});
