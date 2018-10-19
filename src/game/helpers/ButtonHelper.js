define(['ash', 'game/GameGlobals'], function (Ash, GameGlobals) {
    
    var ButtonHelper = Ash.Class.extend({

        constructor: function () {
        },

        getButtonSectorEntity: function ($button) {
            var sector = $button.attr("sector");
            var sectorEntity = null;
            if (sector) {
                var l = parseInt(sector.split(".")[0]);
                var sX = parseInt(sector.split(".")[1]);
                var sY = parseInt(sector.split(".")[2]);
                sectorEntity = GameGlobals.levelHelper.getSectorByPosition(l, sX, sY);
            }
            return sectorEntity;
        },
        
    });

    return ButtonHelper;
});