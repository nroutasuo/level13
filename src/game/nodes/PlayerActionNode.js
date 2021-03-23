define([
	'ash',
	'game/components/player/PlayerActionComponent',
], function (Ash, PlayerActionComponent) {
	var PlayerActionNode = Ash.Node.create({
		playerActions : PlayerActionComponent,
	});

	return PlayerActionNode;
});
