define([
    'ash', 
    'game/components/player/VisionComponent', 
    'game/components/player/StaminaComponent',
    'game/components/player/RumoursComponent',
    'game/components/player/EvidenceComponent'
], function (Ash, VisionComponent, StaminaComponent, RumoursComponent, EvidenceComponent) {
    var PlayerStatsNode = Ash.Node.create({
        vision : VisionComponent,
        stamina : StaminaComponent,
        rumours : RumoursComponent,
        evidence: EvidenceComponent
    });

    return PlayerStatsNode;
});
