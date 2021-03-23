define([
	'ash', 'game/components/type/SectorComponent',
	'game/components/common/VisitedComponent',
], function(Ash, SectorComponent, VisitedComponent) {
	var VisitedSectorNode = Ash.Node.create({
		sector : SectorComponent,
		visited : VisitedComponent
	});

	return VisitedSectorNode;
});
