define(['game/vos/PositionVO'], function (PositionVO) {
    
    var StringUtils = {
        
        getPosition: function (s) {
            var l = parseInt(s.split(".")[0]);
            var sX = parseInt(s.split(".")[1]);
            var sY = parseInt(s.split(".")[2]);
            return new PositionVO(l, sX, sY);
        },
    };

    return StringUtils;
});
