define([
    'ash', 'game/components/common/PositionComponent', 'game/components/sector/CurrentNearestCampComponent'
], function(Ash, PositionComponent, CurrentNearestCampComponent) {
    var NearestCampNode = Ash.Node.create({
        nearestCamp : CurrentNearestCampComponent,
        position : PositionComponent
    });

    return NearestCampNode;
});
