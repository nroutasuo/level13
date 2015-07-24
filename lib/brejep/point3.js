/**
 * 3D point
 *
 * @author Brett Jephson
 */
define(function () {
    'use strict';

    var Point3 = function (x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    };
    Point3.VERSION = "0.1.0";
    Point3.prototype.x = null;
    Point3.prototype.y = null;
    Point3.prototype.z = null;

    return Point3;
});
