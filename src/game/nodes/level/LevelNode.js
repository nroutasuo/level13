define([
	'ash', 'game/components/type/LevelComponent', 'game/components/level/LevelStatusComponent'
], function(Ash, LevelComponent, LevelStatusComponent) {
	
	let LevelNode = Ash.Node.create({
		level : LevelComponent,
		levelStatus : LevelStatusComponent
	});

	return LevelNode;
});
