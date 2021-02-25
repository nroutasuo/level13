define([
	'ash',
	'game/components/type/LevelComponent',
	'game/components/common/PositionComponent',
	'game/components/common/CurrentPlayerLocationComponent'
], function (Ash, LevelComponent, PositionComponent, CurrentPlayerLocationComponent) {
	var PlayerLevelNode = Ash.Node.create({
		currentLocation : CurrentPlayerLocationComponent,
		level : LevelComponent,
		position : PositionComponent
	});

	return PlayerLevelNode;
});
