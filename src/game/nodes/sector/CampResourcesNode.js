define([
	'ash',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/common/CurrencyComponent',
	'game/components/sector/improvements/SectorImprovementsComponent'
], function(Ash, CampComponent, PositionComponent, ResourcesComponent, ResourceAccumulationComponent, CurrencyComponent, SectorImprovementsComponent) {
	
	let CampResourcesNode = Ash.Node.create({
		camp: CampComponent,
		position: PositionComponent,
		resources: ResourcesComponent,
		resourceAccumulation: ResourceAccumulationComponent,
		currency: CurrencyComponent,
		improvements: SectorImprovementsComponent
	});

	return CampResourcesNode;
});
