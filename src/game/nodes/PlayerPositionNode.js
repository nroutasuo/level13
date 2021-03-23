define([
	'ash', 'game/components/common/PositionComponent', 'game/components/type/PlayerComponent'
], function(Ash, PositionComponent, PlayerComponent) {
	var PlayerPositionNode = Ash.Node.create({
		player : PlayerComponent,
		position : PositionComponent
	});

	return PlayerPositionNode;
});
