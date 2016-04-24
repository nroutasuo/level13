define([
    'ash',
    'game/components/type/PlayerComponent',
    'game/components/common/ResourcesComponent',
    'game/components/common/ResourceAccumulationComponent'
], function(Ash, PlayerComponent, ResourcesComponent, ResourceAccumulationComponent) {
    var PlayerResourcesNode = Ash.Node.create({
        player : PlayerComponent,
        resources : ResourcesComponent,
        resourcesAcc: ResourceAccumulationComponent,
    });

    return PlayerResourcesNode;
});
