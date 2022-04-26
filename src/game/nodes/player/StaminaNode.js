define([
	'ash',
	'game/components/player/StaminaComponent',
	'game/components/player/PerksComponent',
	'game/components/player/ItemsComponent',
	'game/components/common/PositionComponent'
], function(Ash, StaminaComponent, PerksComponent, ItemsComponent, PositionComponent) {
	var StaminaNode = Ash.Node.create({
		stamina : StaminaComponent,
		perks: PerksComponent,
		items: ItemsComponent,
		position: PositionComponent,
	});

	return StaminaNode;
});
