define([
	'ash',
	'game/components/type/PlayerComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/CurrencyComponent',
	'game/components/common/ResourceAccumulationComponent'
], function(Ash, PlayerComponent, ResourcesComponent, CurrencyComponent, ResourceAccumulationComponent) {
	var PlayerResourcesNode = Ash.Node.create({
		player : PlayerComponent,
		resources : ResourcesComponent,
		currency: CurrencyComponent,
		resourcesAcc: ResourceAccumulationComponent,
	});

	return PlayerResourcesNode;
});
