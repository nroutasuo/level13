define(function () {
    var CanvasUtils = {
        
        getCTX: function ($canvas) {
            var canvas = $canvas[0];
            return canvas ? canvas.getContext && canvas.getContext('2d') : null;
        }
        
    };

    return CanvasUtils;
});
