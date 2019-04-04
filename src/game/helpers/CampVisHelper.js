define(['ash'],
function (Ash) {
    
    var CampVisHelper = Ash.Class.extend({
        
        // TODO create differences between levels and worlds
        
        // i -> { x, z }
        // x: 0 (middle) to positive and negative infinity
        // z: 0 (front), 1 or 2 (back)
        coordinates: {},

        constructor: function () {
            this.gridX = 5;
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
                mod9limit1 = 5;
                mod9limit2 = 7;
            }
            var z = mod9 < mod9limit1 ? 0 : mod9 < mod9limit2 ? 1 : 2;
            
            // find next free x
            var x = this.findNextFreeX(i, z);
            
            var result = { x: x, z: z };
            this.coordinates[i] = result;
            console.log("assigned coordinate: " + i + " { x: " + x + ", z: " + z +" }");
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
                    return { x: 2, y: 11 };
                case improvementNames.storage:
                    return { x: 15, y: 11 };
                case improvementNames.hospital:
                    return { x: 11, y: 15 };
            }
            return { x: 11, y: 11 };
        },
        
        isConflict: function (coords1, coords2, buildingType1, buildingType2) {
            if (coords1.z == coords2.z) {
                // same layer, no overlap allowed
                var margin = 1;
                var xdist = Math.abs(coords1.x - coords2.x);
                var width1 = this.getBuildingSize(buildingType1).x;
                var width2 = this.getBuildingSize(buildingType2).x;
                return xdist > width1/2 + width2/2 + margin;
            } else {
                // different layers, ok as long as they don't cover each other completely
                return false;
            }
        },

        findNextFreeX: function (targetI, z) {
            // ensure previous i are initialized
            for (var i = 0; i < targetI; i++) {
                if (!this.coordinates[i]) {
                    this.coordinates[i] = this.initCoordinate(i);
                }
            }
            for (var x = 0; x < 1000; x++) {
                if (this.getSpotIndex(x, z) < 0) return x;
                if (this.getSpotIndex(-x, z) < 0) return -x;
            }
            console.log("WARN: Couldn't find free x coordinate for building spot: " + targetI);
            return 0;
        },
        
    });

    return CampVisHelper;
});
