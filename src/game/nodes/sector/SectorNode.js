define([
    'ash',
    'game/components/type/SectorComponent'
], function(Ash, SectorComponent) {
    var SectorNode = Ash.Node.create({
        sector : SectorComponent
        
    });

    return SectorNode;
});
