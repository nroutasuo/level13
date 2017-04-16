define(['ash'], function (Ash) {
    
    var PlayerActionVO = Ash.Class.extend({
	
        action: "",
        param: "",
	
        constructor: function (action, param) {
            this.action = action;
            this.param = param;
        },
        
    });

    return PlayerActionVO;
});
