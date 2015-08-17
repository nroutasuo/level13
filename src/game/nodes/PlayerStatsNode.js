define([
    'ash', 'game/components/player/VisionComponent', 'game/components/player/StaminaComponent',
    'game/components/player/ReputationComponent', 'game/components/player/RumoursComponent',
    'game/components/player/EvidenceComponent'
], function (Ash, VisionComponent, StaminaComponent, ReputationComponent, RumoursComponent, EvidenceComponent) {
    var PlayerStatsNode = Ash.Node.create({
        vision : VisionComponent,
        stamina : StaminaComponent,
        reputation : ReputationComponent,
        rumours : RumoursComponent,
        evidence: EvidenceComponent
    });

    return PlayerStatsNode;
});
