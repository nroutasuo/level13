define([
	'ash', 'game/components/common/PositionComponent', 'game/components/common/CampComponent', 'game/components/sector/LastVisitedCampComponent'
], function (Ash, PositionComponent, CampComponent, LastVisitedCampComponent) {
	var NearestCampNode = Ash.Node.create({
		lastVisited : LastVisitedCampComponent,
		camp: CampComponent,
		position : PositionComponent
	});

	return NearestCampNode;
});
