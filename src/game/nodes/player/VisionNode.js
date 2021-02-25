define([
	'ash', 'game/components/player/VisionComponent', 'game/components/player/ItemsComponent', 'game/components/player/PerksComponent'
], function(Ash, VisionComponent, ItemsComponent, PerksComponent) {
	var VisionNode = Ash.Node.create({
		vision : VisionComponent,
		items : ItemsComponent,
		perks: PerksComponent
	});

	return VisionNode;
});
