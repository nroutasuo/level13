define([
	'ash', 
	'game/components/type/SectorComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/SectorCollectorsComponent'
],
function(Ash, SectorComponent, SectorImprovementsComponent, SectorCollectorsComponent) {
	
	var SectorCollectorsNode = Ash.Node.create({
		sector : SectorComponent,
		collectors : SectorCollectorsComponent,
		improvements : SectorImprovementsComponent
	});

	return SectorCollectorsNode;
});
