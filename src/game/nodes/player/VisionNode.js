define([
    'ash', 'game/components/player/VisionComponent', 'game/components/player/ItemsComponent',
], function(Ash, VisionComponent, ItemsComponent) {
    var VisionNode = Ash.Node.create({
        vision : VisionComponent,
        items : ItemsComponent
    });

    return VisionNode;
});
