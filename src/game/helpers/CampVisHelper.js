define(['ash'],
function (Ash) {
    
    var CampVisHelper = Ash.Class.extend({
        
        // TODO create differences between levels and worlds
        
        // i -> { x, z }
        // x: 0 (middle) to positive and negative infinity
        // z: 0 (front), 1 or 2 (back)
        coordinates: {},

        constructor: function () {
            this.gridX = 6;
        },
        
        initCoordinate: function (i) {
            // determine z
            var mod9 = i % 9;
            var mod9limit1 = 3;
            var mod9limit2 = 6;
            if (i < 8) {
                mod9limit1 = 9;
                mod9limit2 = 9;
            } else if (i < 20) {
                mod9limit1 = 2;
                mod9limit2 = 4;
            }
            var z = mod9 < mod9limit1 ? 0 : mod9 < mod9limit2 ? 1 : 2;
            
            // find next free x
            var x = this.findNextFreeX(i, z);
            
            var result = { x: x, z: z };
            this.coordinates[i] = result;
            // console.log("assigned coordinate: " + i + " { x: " + x + ", z: " + z +" }");
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
            switch (buildingType) {
                case improvementNames.campfire:
                    return { x: 4, y: 4 };
                case improvementNames.lights:
                    return { x: 2, y: 24 };
                case improvementNames.storage:
                    return { x: 16, y: 16 };
                case improvementNames.hospital:
                    return { x: 16, y: 12 };
                case improvementNames.fortification:
                case improvementNames.fortification2:
                    return { x: 4, y: 20 };
            }
            return { x: 12, y: 12 };
        },
        
        isConflict: function (coords1, coords2, buildingType1, buildingType2) {
            var width1 = this.getBuildingSize(buildingType1).x;
            var width2 = this.getBuildingSize(buildingType2).x;
            var x1 = coords1.x * this.gridX + width1 / 2;
            var x2 = coords2.x * this.gridX + width2 / 2;
            var xdist = Math.abs(x1 - x2);
            if (coords1.z == coords2.z) {
                // same layer, no overlap allowed
                var margin = 2;
                var minDistance = Math.ceil(width1/2 + width2/2 + margin);
                return xdist < minDistance;
            } else {
                // different layers, ok as long as they don't cover each other completely
                var minDistance = Math.max(width1/2, width2/2) + 2;
                return xdist < minDistance;
            }
        },
        
        getNextValidCampBuildingSpot: function (sectorImprovements, building) {
            var buildingType1 = building.name;
            for (var i = 0; i < 1000; i++) {
                var contents = sectorImprovements.buildingSpots[i];
                // already occupied
                if (contents) continue;
                // conflicts with some existing
                var j = 0;
                var foundConflict = false;
                var coords1 = this.getCoords(i);
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
            console.log("WARN: Couldn't find free valid buildings spot for " + building.name);
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
            console.log("WARN: Couldn't find free x coordinate for building spot: " + targetI);
            return 0;
        },
        
    });

    return CampVisHelper;
});
