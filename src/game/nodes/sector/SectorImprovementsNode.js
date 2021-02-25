define([
	'ash', 'game/components/type/SectorComponent', 'game/components/sector/improvements/SectorImprovementsComponent'
], function(Ash, SectorComponent, SectorImprovementsComponent) {
	var SectorImprovementsNode = Ash.Node.create({
		sector : SectorComponent,
		improvements : SectorImprovementsComponent
	});

	return SectorImprovementsNode;
});
