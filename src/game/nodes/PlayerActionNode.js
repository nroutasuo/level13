define([
    'ash',
    'game/components/common/PlayerActionComponent',
], function (Ash, PlayerActionComponent) {
    var PlayerActionNode = Ash.Node.create({
        playerActions : PlayerActionComponent,
    });

    return PlayerActionNode;
});
