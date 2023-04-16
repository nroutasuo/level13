define([
	'ash',
	'game/components/type/PlayerComponent',
	'game/components/common/PositionComponent',
	'game/components/common/MovementComponent',
], function (Ash, PlayerComponent, PositionComponent, MovementComponent) {
	
	let PlayerMovementNode = Ash.Node.create({
		player : PlayerComponent,
		position : PositionComponent,
		movement : MovementComponent,
	});

	return PlayerMovementNode;
});
