define(['ash'],
function (Ash) {
    
    var CampVisHelper = Ash.Class.extend({
        
        // i -> { x, z }
        // x: 0 (middle) to positive and negative infinity
        // z: 0-3 (smaller is in front) (4 for special cases like fortifications)
        coordinates: {},
        
        // settings per camp (ordinal) to create different camps on different levels
        // TODO adjust depending on world structure (what kind of sector/level the camp is actually located on)
        campSettings: {
            1: {},
            2: {},
            3: {},
            4: {},
            5: {},
            6: {},
            7: {},
            8: {},
            9: {},
            10: {},
            11: {},
            12: {},
            13: {},
            14: {},
            15: {},
        },

        constructor: function () {
            this.gridX = 10;
            this.defaultBuildingSize = 15;
        },
        
        initCampSettings: function (campOrdinal, settings) {
            this.campSettings[campOrdinal] = settings;
            log.i("init camp settings: " + campOrdinal);
            log.i(settings);
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
        
        getFortificationCoords: function (n) {
            return { x: 0, z: 4};
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
                case improvementNames.darkfarm:
                    return { x: s * 1.5, y: s * 1.25 };
                case improvementNames.fortification:
                case improvementNames.fortification2:
                    return { x: 1000, y: s * 1 };
                case improvementNames.generator:
                    return { x: s * 0.9, y: s * 0.65 };
                case improvementNames.hospital:
                    return { x: s * 1.25, y: s * 1.25 };
                case improvementNames.house2:
                    return { x: s, y: s * 3.25 };
                case improvementNames.inn:
                    return { x: s, y: s * 1.25 };
                case improvementNames.library:
                    return { x: s, y: s * 3.5 };
                case improvementNames.lights:
                    return { x: 3, y: s / 2 * 3.5 };
                case improvementNames.market:
                    return { x: s * 3, y: s * 1.25 };
                case improvementNames.stable:
                    return { x: s * 1.25, y: s * 1.5 };
                case improvementNames.storage:
                    return { x: s / 2 * 3, y: s * 2.35 };
                case improvementNames.square:
                    return { x: s * 3, y: s };
                case improvementNames.tradepost:
                    return { x: s * 1.25, y: s * 2.85 };
            }
            return { x: s, y: s };
        },
        
        isConflict: function (coords1, coords2, buildingType1, buildingType2) {
            if (buildingType1 == improvementNames.fortification) return false;
            if (buildingType1 == improvementNames.fortification2) return false;
            if (buildingType2 == improvementNames.fortification) return false;
            if (buildingType2 == improvementNames.fortification2) return false;
            var width1 = this.getBuildingSize(buildingType1).x;
            var width2 = this.getBuildingSize(buildingType2).x;
            var x1 = coords1.x * this.gridX;
            var x2 = coords2.x * this.gridX;
            var xdist = Math.abs(x1 - x2);
            var zdiff = coords1.z - coords2.z;
            var zdist = Math.abs(zdiff);
            var minDistance = 0;
            if (coords1.z == coords2.z) {
                // same layer, no overlap allowed and some margin
                minDistance = Math.ceil(width1/2 + width2/2) + 2;
            } else {
                // different layers, depends on height difference
                var height1 = this.getBuildingSize(buildingType1).y;
                var height2 = this.getBuildingSize(buildingType2).y;
                var ydiff = height1 - height2;
                if (zdiff < 0 && ydiff < 0) {
                    // 1 in front and 2 is taller, overlap fine
                    minDistance = zdist > 1 ? 0 : 1;
                } else if (zdiff > 0 && ydiff > 0) {
                    // 2 in front and 1 is taller, overlap fine
                    minDistance = zdist > 1 ? 0 : 1;
                } else if (ydiff == 0) {
                    // same height, a bit of margin
                    minDistance = Math.max(width1/2, width2/2);
                } else {
                    // taller building in front, make sure shorter is visible
                    minDistance = Math.max(width1/2, width2/2) + 2;
                }
            }
            return xdist < minDistance;
        },
        
        isValidCoordinates: function (coords, buildingType, buildingCount) {
            // create soft rules / preferences by applying some rules to only some coordinates
            var isStrict = coords.x % 2 == 0;
            
            // z-coordinate: limit by building count
            if (buildingCount < 6 && coords.z == 0) return false;
            if (buildingCount < 12 && coords.z == 3) return false;
            
            // z-coordinate: bigger buildings prefer higher z values
            var size = this.getBuildingSize(buildingType);
            if (isStrict && size.y > this.defaultBuildingSize && coords.z < 1) return false;
            if (size.y < this.defaultBuildingSize && coords.z > 1) return false;
            
            // z-coordinate: some buildings prefer foreground/bacgrkound
            switch (buildingType) {
                case improvementNames.fortification:
                case improvementNames.fortification2:
                    if (coords.z < 2) return false;
                    break;
                case improvementNames.campfire:
                case improvementNames.lights:
                    if (coords.z > 1) return false;
                    break;
            }
            
            // x-coordinate: some building types avoid the center
            var xdist = Math.abs(coords.x);
            switch (buildingType) {
                case improvementNames.house:
                    if (xdist < 4) return false;
                    break;
                case improvementNames.darkfarm:
                case improvementNames.storage:
                case improvementNames.cementmill:
                case improvementNames.generator:
                    if (xdist < 6) return false;
                    break;
                case improvementNames.stable:
                    if (xdist < 10) return false;
                    break;
            }
            
            // both: no low z coordinates far from the center
            if (xdist > 15 && coords.z < 1) return false;
            if (xdist > 25 && coords.z < 2) return false;
            
            return true;
        },
        
        getFreeCampBuildingSpot: function (campOrdinal, sectorImprovements, building) {
            var buildingType1 = building.name;
            if (buildingType1 == improvementNames.fortification) {
                return -1;
            }
            var buildingCount = sectorImprovements.getTotalCount();
            var minstarti = 1;
            var maxstarti = this.getMaxBuildingSpotAssignStartIndex(buildingType1, buildingCount);
            var starti = minstarti + Math.floor(Math.random() * (maxstarti - minstarti));
            var step = 1 +  Math.floor(Math.random() * 8);
            for (var i = starti; i < 1000; i += step) {
                var coords1 = this.getCoords(i);
                // valid coordinates for building type?
                if (!this.isValidCoordinates(coords1, buildingType1, buildingCount)) continue;
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
            return -1;
        },
        
        getMaxBuildingSpotAssignStartIndex: function (building, buildingCount) {
            switch (building) {
                case improvementNames.square:
                case improvementNames.inn:
                    return 0;
                case improvementNames.house:
                case improvementNames.house2:
                    return 1 + buildingCount * 2;
                default:
                    return 12 + buildingCount * 4;
            }
        },
        
    });

    return CampVisHelper;
});
