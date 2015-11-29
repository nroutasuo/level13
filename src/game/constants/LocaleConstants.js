define(['ash'], function (Ash) {

    var LocaleConstants = {
    

        LOCALE_ID_WORKSHOP: "workshop",
        LOCALE_ID_PASSAGE: "passage",
        
        getPassageLocaleId: function (direction) {
            return this.LOCALE_ID_PASSAGE + "_" + direction;
        },
    
    };
    
    return LocaleConstants;
    
});
