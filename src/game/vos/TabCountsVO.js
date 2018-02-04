define(['ash'], function (Ash) {
    
    var TabCountsVO = Ash.Class.extend({
        
        
        constructor: function () {
            this.current = {
                visible: {
                },
                available: {
                }
            };
            this.lastShown = {
                visible: {
                },
                available: {
                }     
            };
        }
        
    });

    return TabCountsVO;
});
