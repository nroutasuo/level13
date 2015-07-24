/**
 * 2D point
 *
 * @author Brett Jephson
 */
define(function () {
    'use strict';

    var Point = function (x, y) {
        this.x = x || 0;
        this.y = y || 0;
    };
    Point.VERSION = "0.1.0";
    Point.prototype.x = null;
    Point.prototype.y = null;
    Point.prototype.distanceSquaredTo = function( targetPoint ) {
        var dx = this.x - targetPoint.x,
            dy = this.y - targetPoint.y;
        return dx * dx + dy * dy;
    };
    Point.prototype.distanceTo = function( targetPoint ) {
        var dx = this.x - targetPoint.x,
            dy = this.y - targetPoint.y;
        return Math.sqrt( dx * dx + dy * dy );
    };

    return Point;
});
