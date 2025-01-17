define([
	'ash',
	'game/components/type/SectorComponent',
	'game/components/common/PositionComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/PassagesComponent',
], function(Ash, SectorComponent, PositionComponent, SectorStatusComponent, PassagesComponent) {
	let SectorNode = Ash.Node.create({
		sector : SectorComponent,
		position : PositionComponent,
		status: SectorStatusComponent,
		passages: PassagesComponent
	});

	return SectorNode;
});
