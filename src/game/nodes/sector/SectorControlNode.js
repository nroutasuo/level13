define([
    'ash',
    'game/components/type/SectorComponent',
    'game/components/common/PositionComponent',
    'game/components/sector/SectorControlComponent',
], function(Ash, SectorComponent, PositionComponent, SectorControlComponent) {
    var SectorNode = Ash.Node.create({
        sector : SectorComponent,
        position : PositionComponent,
        sectorControl : SectorControlComponent,
    });

    return SectorNode;
});
