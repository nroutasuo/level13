define(['ash'], function (Ash) {

    var LocaleConstants = {

        LOCALE_ID_WORKSHOP: "w",
        LOCALE_ID_PASSAGE: "p",
        
        getPassageLocaleId: function (direction) {
            return this.LOCALE_ID_PASSAGE + "_" + direction;
        },
    
    };
    
    return LocaleConstants;
    
});
