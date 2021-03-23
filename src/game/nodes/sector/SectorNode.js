define([
	'ash',
	'game/components/type/SectorComponent',
	'game/components/common/PositionComponent'
], function(Ash, SectorComponent, PositionComponent) {
	var SectorNode = Ash.Node.create({
		sector : SectorComponent,
		position : PositionComponent,
	});

	return SectorNode;
});
