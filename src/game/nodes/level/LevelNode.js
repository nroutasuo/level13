define([
	'ash', 'game/components/type/LevelComponent'
], function(Ash, LevelComponent) {
	var LevelNode = Ash.Node.create({
		level : LevelComponent
	});

	return LevelNode;
});
