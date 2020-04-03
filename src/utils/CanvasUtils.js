define(function () {
    var CanvasUtils = {
        
        getCTX: function ($canvas) {
            var canvas = $canvas[0];
            return canvas ? canvas.getContext && canvas.getContext('2d') : null;
        },
        
        drawLine: function (ctx, x1, y1, x2, y2) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        },
        
        drawTriangle: function (ctx, color, lengthx, lengthy, pointx, pointy, angle, stroke) {
            if (stroke)
                ctx.strokeStyle = color;
            else
                ctx.fillStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pointx, pointy);
            ctx.lineTo(pointx-lengthx*Math.cos(angle-Math.PI/6), pointy-lengthy*Math.sin(angle-Math.PI/6));
            ctx.moveTo(pointx, pointy);
            ctx.lineTo(pointx-lengthx*Math.cos(angle+Math.PI/6), pointy-lengthy*Math.sin(angle+Math.PI/6));
            ctx.lineTo(pointx-lengthx*Math.cos(angle-Math.PI/6), pointy-lengthy*Math.sin(angle-Math.PI/6));
            if (stroke)
                ctx.stroke();
            else
                ctx.fill();
            ctx.closePath();
        },
        
        drawCircle: function (ctx, color, x, y, r) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fill();
        },
        
        drawArc: function (ctx, color, x, y, r, from, to) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, r, from, to);
            ctx.fill();
        },
        
        drawHexagon: function (ctx, color, size, x, y) {
            var r = size / 2;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x + r * Math.cos(0), y + r * Math.sin(0));
            for (var side = 0; side < 7; side++) {
              ctx.lineTo(x + r * Math.cos(side * 2 * Math.PI / 6), y + r * Math.sin(side * 2 * Math.PI / 6));
            }
            ctx.fill();
            ctx.closePath();
        },
        
        fillWithRectangles: function (ctx, color, xpx, ypx, w, h, xmargin, ymargin, xpadding, ypadding, numx, numy) {
            ctx.fillStyle = color;
            var xw = (w - xpadding*(numx-1)-xmargin*2) / numx;
            var yh = (h - ypadding*(numy-1)-ymargin*2) / numy;
            for (var x = xmargin; x < w - xw; x += xw + xpadding) {
                for (var y = ymargin; y < h - yh; y += yh + ypadding) {
                    ctx.fillRect(xpx+x, ypx+y, xw, yh);
                }
            }
        }
    };

    return CanvasUtils;
});
