define([
    'ash',
    'game/components/type/SectorComponent',
    'game/components/common/PositionComponent',
    'game/components/common/CampComponent',
    'game/components/sector/events/CampEventTimersComponent',
], function(Ash, SectorComponent, PositionComponent, CampComponent, CampEventTimersComponent) {
    var CampNode = Ash.Node.create({
        sector : SectorComponent,
        camp : CampComponent,
        position : PositionComponent,
        campTimers: CampEventTimersComponent,
    });

    return CampNode;
});
