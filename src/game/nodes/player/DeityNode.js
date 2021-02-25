define([
	'ash', 'game/components/player/DeityComponent'
], function(Ash, DeityComponent) {
	
	var DeityNode = Ash.Node.create({
		deity : DeityComponent
	});

	return DeityNode;
});
