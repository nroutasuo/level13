// Marker component: this sector has a fight initialized (can still be fled)
define(['ash'], function (Ash) {

	var FightEncounterComponent = Ash.Class.extend({
		
		enemy: null,
		context: null,
		gangComponent: null,
		
		constructor: function (enemy, context, pendingEnemies, totalEnemies, gang) {
			this.enemy = enemy;
			this.context = context;
			this.pendingEnemies = pendingEnemies;
			this.totalEnemies = totalEnemies;
			this.gangComponent = gang;
		},
	});

	return FightEncounterComponent;
});
