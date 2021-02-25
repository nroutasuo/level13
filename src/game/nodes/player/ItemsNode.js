define([
	'ash', 'game/components/player/ItemsComponent'
], function(Ash, ItemsComponent) {
	
	var ItemsNode = Ash.Node.create({
		items : ItemsComponent
	});

	return ItemsNode;
});
