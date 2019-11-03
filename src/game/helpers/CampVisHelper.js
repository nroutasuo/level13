define(['ash'],
function (Ash) {
    
    var CampVisHelper = Ash.Class.extend({
        
        // TODO create differences between levels and worlds
        
        // i -> { x, z }
        // x: 0 (middle) to positive and negative infinity
        // z: 0-3 (smaller is in front)
        coordinates: {},

        constructor: function () {
            this.gridX = 12;
            this.defaultBuildingSize = 16;
        },
        
        initCoordinate: function (i) {
            var z = i % 4;
            var d = Math.floor(i/4);
            var x = Math.ceil(d/2);
            if (d % 2 > 0) x = -x;
            
            var result = { x: x, z: z };
            this.coordinates[i] = result;
            // log.i("assigned coordinate: " + i + " { x: " + x + ", z: " + z +" }");
        },
        
        initCoordinates: function (count) {
            for (var i = 0; i <= count; i++) {
                if (!this.coordinates[i]) {
                    this.initCoordinate(i);
                }
            }
        },
        
        getCoords: function (i) {
            if (!this.coordinates[i]) {
                this.initCoordinates(i);
            }
            return this.coordinates[i];
        },
        
        getSpotIndex: function (x, z) {
            var i = 0;
            while (this.coordinates[i]) {
                if (this.coordinates[i].x == x && this.coordinates[i].z == z) {
                    return i;
                }
                i++;
            }
            return -1;
        },
        
        getBuildingSize: function (buildingType) {
            var s = this.defaultBuildingSize;
            switch (buildingType) {
                case improvementNames.campfire:
                    return { x: 4, y: 4 };
                case improvementNames.lights:
                    return { x: 2, y: s / 2 * 3 };
                case improvementNames.storage:
                    return { x: s / 2 * 3, y: s * 2.5 };
                case improvementNames.hospital:
                    return { x: s, y: s * 1.5 };
                case improvementNames.fortification:
                case improvementNames.fortification2:
                    return { x: 4, y: s * 3 };
                case improvementNames.tradepost:
                    return { x: s, y: s * 1.25 };
                case improvementNames.square:
                    return { x: s * 3, y: 2 };
            }
            return { x: s, y: s };
        },
        
        isConflict: function (coords1, coords2, buildingType1, buildingType2) {
            var width1 = this.getBuildingSize(buildingType1).x;
            var width2 = this.getBuildingSize(buildingType2).x;
            var x1 = coords1.x * this.gridX;
            var x2 = coords2.x * this.gridX;
            var xdist = Math.abs(x1 - x2);
            var minDistance = 0;
            if (coords1.z == coords2.z) {
                // same layer, no overlap allowed and some margin
                minDistance = Math.ceil(width1/2 + width2/2) + 4;
            } else {
                // different layers, depends on height difference
                var height1 = this.getBuildingSize(buildingType1).y;
                var height2 = this.getBuildingSize(buildingType2).y;
                var ydiff = height1 - height2;
                var zdiff = coords1.z - coords2.z;
                if (zdiff < 0 && ydiff < 0) {
                    // 1 in front and 2 is taller, overlap fine
                    minDistance = 0;
                } else if (zdiff > 0 && ydiff > 0) {
                    // 2 in front and 1 is taller, overlap fine
                    minDistance = 0;
                } else if (ydiff == 0) {
                    // same height, a bit of margin
                    minDistance = 6;
                } else {
                    // taller building in front, ma sure shorter is visible
                    minDistance = Math.max(width1/2, width2/2) + 2;
                }
            }
            return xdist < minDistance;
        },
        
        isValidCoordinates: function (coords, buildingType) {
            // create soft rules / preferences by applying some rules to only some coordinates
            var isStrict = coords.x % 2 == 0;
            // z-coordinate: bigger buildings prefer higher z values
            var size = this.getBuildingSize(buildingType);
            if (isStrict && size.y > this.defaultBuildingSize && coords.z < 1) return false;
            if (size.y < this.defaultBuildingSize && coords.z > 1) return false;
            // x-coordinate: some building types avoid the center
            var xdist = Math.abs(coords.x);
            switch (buildingType) {
                case improvementNames.storage:
                    if (xdist < 4) return false;
                    break;
                case improvementNames.fortification:
                    if (xdist < 10  ) return false;
            }
            // both: no low z coordinates far from the center
            if (xdist > 10 && coords.z < 1) return false;
            if (xdist > 20 && coords.z < 2) return false;
            return true;
        },
        
        getFreeCampBuildingSpot: function (sectorImprovements, building) {
            var buildingType1 = building.name;
            for (var i = 0; i < 1000; i++) {
                var coords1 = this.getCoords(i);
                // valid coordinates for building type?
                if (!this.isValidCoordinates(coords1, buildingType1)) continue;
                // already occupied?
                var contents = sectorImprovements.buildingSpots[i];
                if (contents) continue;
                // conflicts with some existing?
                var j = 0;
                var foundConflict = false;
                for (var j = 0; j < sectorImprovements.buildingSpots.length; j++) {
                    var contents2 = sectorImprovements.buildingSpots[j];
                    if (contents2) {
                        var coords2 = this.getCoords(j);
                        var buildingType2 = contents2.buildingType;
                        if (this.isConflict(coords1, coords2, buildingType1, buildingType2)) {
                            foundConflict = true;
                            break;
                        }
                    }
                }
                if (foundConflict) continue;
                return i;
            }
            log.w("Couldn't find free valid buildings spot for " + building.name);
            return 0;
        },

        findNextFreeX: function (targetI, z) {
            // ensure previous i are initialized
            for (var i = 0; i < targetI; i++) {
                if (!this.coordinates[i]) {
                    this.coordinates[i] = this.initCoordinate(i);
                }
            }
            for (var x = 0; x < 1000; x++) {
                // TODO skip certain coords by level to create variety
                if (x % (z+2) == 0) x++;
                if (x / 2 % 4 == 0) x++;
                if (this.getSpotIndex(x, z) < 0) return x;
                if (this.getSpotIndex(-x, z) < 0) return -x;
            }
            log.w("Couldn't find free x coordinate for building spot: " + targetI);
            return 0;
        },
        
    });

    return CampVisHelper;
});
