define([
	'ash',
	'game/components/player/VisionComponent',
	'game/components/player/StaminaComponent',
	'game/components/player/RumoursComponent',
	'game/components/player/EvidenceComponent',
	'game/components/player/HopeComponent',
	'game/components/player/InsightComponent',
	'game/components/player/PerksComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/ExplorersComponent',
], function (Ash, VisionComponent, StaminaComponent, RumoursComponent, EvidenceComponent, HopeComponent, InsightComponent, PerksComponent, ItemsComponent, ExplorersComponent) {
	var PlayerStatsNode = Ash.Node.create({
		vision : VisionComponent,
		stamina : StaminaComponent,
		rumours : RumoursComponent,
		evidence: EvidenceComponent,
		hope: HopeComponent,
		insight: InsightComponent,
		perks: PerksComponent,
		items: ItemsComponent,
		explorers: ExplorersComponent
	});

	return PlayerStatsNode;
});
