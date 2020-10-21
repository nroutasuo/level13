define([
    'ash',
    'game/components/player/VisionComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/RumoursComponent',
    'game/components/player/EvidenceComponent',
    'game/components/player/PerksComponent',
    'game/components/player/ItemsComponent',
], function (Ash, VisionComponent, StaminaComponent, RumoursComponent, EvidenceComponent, PerksComponent, ItemsComponent) {
    var PlayerStatsNode = Ash.Node.create({
        vision : VisionComponent,
        stamina : StaminaComponent,
        rumours : RumoursComponent,
        evidence: EvidenceComponent,
        perks: PerksComponent,
        items: ItemsComponent
    });

    return PlayerStatsNode;
});
