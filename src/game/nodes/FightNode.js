define([
    'ash',
    'game/components/sector/FightComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/SectorControlComponent',
], function (Ash, FightComponent, EnemiesComponent, SectorControlComponent) {
    
    var FightNode = Ash.Node.create({
        fight : FightComponent
    });

    return FightNode;
});
