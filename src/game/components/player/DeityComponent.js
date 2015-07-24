define(['ash'], function (Ash) {
    var DeityComponent = Ash.Class.extend({
        constructor: function (name) {
            this.name = name;
            this.favour = 0;
        }
    });

    return DeityComponent;
});
