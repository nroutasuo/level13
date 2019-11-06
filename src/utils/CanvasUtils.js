define(function () {
    var CanvasUtils = {
        
        getCTX: function ($canvas) {
            var canvas = $canvas[0];
            return canvas ? canvas.getContext && canvas.getContext('2d') : null;
        },
        
        drawTriangle: function (ctx, color, lengthx, lengthy, pointx, pointy, angle) {
            ctx.fillStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pointx, pointy);
            ctx.lineTo(pointx-lengthx*Math.cos(angle-Math.PI/6), pointy-lengthy*Math.sin(angle-Math.PI/6));
            ctx.moveTo(pointx, pointy);
            ctx.lineTo(pointx-lengthx*Math.cos(angle+Math.PI/6), pointy-lengthy*Math.sin(angle+Math.PI/6));
            ctx.lineTo(pointx-lengthx*Math.cos(angle-Math.PI/6), pointy-lengthy*Math.sin(angle-Math.PI/6));
            ctx.fill();
            ctx.closePath();
        },
        
    };

    return CanvasUtils;
});
