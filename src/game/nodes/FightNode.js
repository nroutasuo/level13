define([
	'ash',
	'game/components/sector/FightComponent',
	'game/components/sector/EnemiesComponent',
], function (Ash, FightComponent, EnemiesComponent) {
	
	var FightNode = Ash.Node.create({
		fight : FightComponent
	});

	return FightNode;
});
