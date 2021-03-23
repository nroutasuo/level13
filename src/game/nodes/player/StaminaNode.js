define([
	'ash',
	'game/components/player/StaminaComponent',
	'game/components/player/PerksComponent',
	'game/components/common/PositionComponent'
], function(Ash, StaminaComponent, PerksComponent, PositionComponent) {
	var StaminaNode = Ash.Node.create({
		stamina : StaminaComponent,
		perks: PerksComponent,
		position: PositionComponent,
	});

	return StaminaNode;
});
