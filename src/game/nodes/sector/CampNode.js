define([
	'ash',
	'game/components/type/SectorComponent',
	'game/components/common/PositionComponent',
	'game/components/common/CampComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/ReputationComponent',
], function(Ash, SectorComponent, PositionComponent, CampComponent, CampEventTimersComponent, SectorImprovementsComponent, ReputationComponent) {
	var CampNode = Ash.Node.create({
		sector : SectorComponent,
		camp : CampComponent,
		position : PositionComponent,
		improvements: SectorImprovementsComponent,
		campTimers: CampEventTimersComponent,
		reputation: ReputationComponent
	});

	return CampNode;
});
