define([
	'ash',
	'game/components/type/TribeComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/CurrencyComponent',
	'game/components/common/ResourceAccumulationComponent'
], function(Ash, TribeComponent, ResourcesComponent, CurrencyComponent, ResourceAccumulationComponent) {
	var TribeResourcesNode = Ash.Node.create({
		tribe : TribeComponent,
		resources : ResourcesComponent,
		currency: CurrencyComponent,
		resourceAccumulation : ResourceAccumulationComponent
	});

	return TribeResourcesNode;
});
