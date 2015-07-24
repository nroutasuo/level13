define([
    'ash',
    'game/components/type/SectorComponent',
    'game/components/sector/improvements/CampComponent',
    'game/components/sector/events/CampEventTimersComponent',
], function(Ash, SectorComponent, CampComponent, CampEventTimersComponent) {
    var CampNode = Ash.Node.create({
        sector : SectorComponent,
        camp : CampComponent,
        campTimers: CampEventTimersComponent,
    });

    return CampNode;
});
