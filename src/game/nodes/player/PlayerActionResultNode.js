define([
	'ash',
	'game/components/player/PlayerActionResultComponent',
	'game/components/player/ItemsComponent',
	'game/components/common/ResourcesComponent',
], function (Ash, PlayerActionResultComponent, ItemsComponent, ResourcesComponent) {
	
	var PlayerActionResultNode = Ash.Node.create({
		result : PlayerActionResultComponent,
		items : ItemsComponent,
		resources: ResourcesComponent,
	});

	return PlayerActionResultNode;
});
