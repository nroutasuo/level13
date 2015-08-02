define([
    'ash', 'game/components/common/PositionComponent', 'game/components/sector/LastVisitedCampComponent'
], function (Ash, PositionComponent, LastVisitedCampComponent) {
    var NearestCampNode = Ash.Node.create({
        lastVisited : LastVisitedCampComponent,
        position : PositionComponent
    });

    return NearestCampNode;
});
