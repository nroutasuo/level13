define([
	'ash',
	'game/components/type/SectorComponent',
	'game/components/common/PositionComponent',
	'game/components/common/CurrentPlayerLocationComponent'
], function (Ash, SectorComponent, PositionComponent, CurrentPlayerLocationComponent) {
	var PlayerLocationNode = Ash.Node.create({
		currentLocation : CurrentPlayerLocationComponent,
		sector : SectorComponent,
		position : PositionComponent
	});

	return PlayerLocationNode;
});
