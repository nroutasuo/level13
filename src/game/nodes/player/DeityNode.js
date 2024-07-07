define([
	'ash', 'game/components/player/HopeComponent'
], function(Ash, HopeComponent) {
	
	var DeityNode = Ash.Node.create({
		deity : HopeComponent
	});

	return DeityNode;
});
