define(['ash'], function (Ash) {

    var OutgoingCaravansComponent = Ash.Class.extend({

        pendingCaravan: null,
        outgoingCaravans: [],
        totalCaravans: 1, // todo upgrades / buildings to increase num of caravans per camp

        constructor: function () {
            this.pendingCaravan = null;
            this.outgoingCaravans = [];
            this.totalCaravans = 1;
        },

        getCustomSaveObject: function () {
            var copy = {};
            copy.outgoingCaravans = this.outgoingCaravans;
            copy.totalCaravans = this.totalCaravans;
            return copy;
        },

        getSaveKey: function () {
            return "OutgoingCaravans";
        },
    });

    return OutgoingCaravansComponent;
});
