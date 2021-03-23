define([
	'ash', 'game/components/common/PositionComponent', 'game/components/common/CampComponent', 'game/components/sector/CurrentNearestCampComponent'
], function(Ash, PositionComponent, CampComponent, CurrentNearestCampComponent) {
	var NearestCampNode = Ash.Node.create({
		nearestCamp : CurrentNearestCampComponent,
		camp: CampComponent,
		position : PositionComponent
	});

	return NearestCampNode;
});
