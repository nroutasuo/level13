define([
    'ash'
], function (
    Ash) {
    
    var ButtonHelper = Ash.Class.extend({

        constructor: function (levelHelper) {
            this.levelHelper = levelHelper;
        },

        getButtonSectorEntity: function (button) {
            var sector = $(button).attr("sector");
            var sectorEntity = null;
            if (sector) {
                var l = parseInt(sector.split(".")[0]);
                var sX = parseInt(sector.split(".")[1]);
                var sY = parseInt(sector.split(".")[2]);
                sectorEntity = this.levelHelper.getSectorByPosition(l, sX, sY);
            }
            return sectorEntity;
        },
        
    });

    return ButtonHelper;
});