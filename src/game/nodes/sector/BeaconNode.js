define([
	'ash',
	'game/components/type/SectorComponent',
	'game/components/common/PositionComponent',
	'game/components/sector/improvements/BeaconComponent',
], function(Ash, SectorComponent, PositionComponent, BeaconComponent) {
	
	var BeaconNode = Ash.Node.create({
		sector : SectorComponent,
		position : PositionComponent,
		beacon: BeaconComponent,
	});

	return BeaconNode;
});
