define([
	'ash',
	'game/components/type/PlayerComponent',
	'game/components/player/BagComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/CurrencyComponent',
	'game/components/common/ResourceAccumulationComponent'
], function(Ash, PlayerComponent, BagComponent, ResourcesComponent, CurrencyComponent, ResourceAccumulationComponent) {
	var PlayerResourcesNode = Ash.Node.create({
		bag: BagComponent,
		player : PlayerComponent,
		resources : ResourcesComponent,
		currency: CurrencyComponent,
		resourcesAcc: ResourceAccumulationComponent,
	});

	return PlayerResourcesNode;
});
