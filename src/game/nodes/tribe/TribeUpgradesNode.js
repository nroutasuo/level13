define([
	'ash',
	'game/components/type/TribeComponent',
	'game/components/tribe/UpgradesComponent',
], function(Ash, TribeComponent, UpgradesComponent) {
	
	var TribeUpgradesNode = Ash.Node.create({
		tribe : TribeComponent,
		upgrades: UpgradesComponent,
	});

	return TribeUpgradesNode;
});
