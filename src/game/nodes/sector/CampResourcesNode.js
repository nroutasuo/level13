define([
	'ash',
	'game/components/common/CampComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/common/CurrencyComponent',
	'game/components/sector/improvements/SectorImprovementsComponent'
], function(Ash, CampComponent, ResourcesComponent, ResourceAccumulationComponent, CurrencyComponent, SectorImprovementsComponent ) {
	var CampResourcesNode = Ash.Node.create({
		camp: CampComponent,
		resources: ResourcesComponent,
		resourceAccumulation: ResourceAccumulationComponent,
		currency: CurrencyComponent,
		improvements: SectorImprovementsComponent
	});

	return CampResourcesNode;
});
