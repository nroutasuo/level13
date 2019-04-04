// Lists miscellaneous improvements that the given entity (should be a Sector) contains
define(['ash', 'game/GameGlobals', 'game/vos/ImprovementVO'], function (Ash, GameGlobals, ImprovementVO) {
    var SectorImprovementsComponent = Ash.Class.extend({

        improvements: {},
        buildingSpots: [],

        constructor: function () {
            this.initImprovements();
        },

        initImprovements: function() {
            this.improvements = {};
            this.buildingSpots = [];
        },

        add: function(type, amount) {
            var vo = this.improvements[type];
            if (!vo) {
                this.improvements[type] = new ImprovementVO(type);
                vo = this.improvements[type];
            }

            if (!amount) amount = 1;
            for (var i = 0; i < amount; i++) {
                var visCount = vo.getVisCount();
                for (var j = 0; j < visCount; j++) {
                    var spotIndex = this.getNextFreeCampBuildingSpot(vo);
                    this.setSelectedCampBuildingSpot(vo, vo.count, spotIndex, j);
                }
                vo.count++;
            }
        },

        getCount: function(type) {
            var vo = this.improvements[type];
            if (vo) {
                return vo.count || 0;
            } else {
                return 0;
            }
        },

        getVO: function(type) {
            var vo = this.improvements[type];
            if (vo) {
                return vo;
            } else {
                return new ImprovementVO(type);
            }
        },

        getAll: function (improvementType) {
            var allImprovements = [];
            for (var key in this.improvements) {
				var val = this.improvements[key];
				if (typeof val == "object") {
					if (!improvementType || val.getType() === improvementType)
						allImprovements.push(val);
				}
			}

            return allImprovements;
        },

		getTotal: function (improvementType) {
			var allImprovements = this.getAll(improvementType);
			var count = 0;
			for (var i = 0; i < allImprovements.length; i++) {
				count += allImprovements[i].count;
			}
			return count;
		},

        hasCollectors: function () {
            return this.getCount(improvementNames.collector_food) > 0 || this.getCount(improvementNames.collector_water) > 0;
        },

        getSelectedCampBuildingSpot: function (building, i, j, assignIfNotSet) {
            for (var spotIndex = 0; spotIndex < this.buildingSpots.length; spotIndex++) {
                var contents = this.buildingSpots[spotIndex];
                if (contents && contents.id === this.getBuildingID(building, i, j)) {
                    return spotIndex;
                }
            }

            if (assignIfNotSet) {
                var nextAvailable = this.getNextFreeCampBuildingSpot(building);
                this.setSelectedCampBuildingSpot(building, i, j, nextAvailable);
                return this.getSelectedCampBuildingSpot(building, i, j);
            } else {
                return -1;
            }
        },

        setSelectedCampBuildingSpot: function (building, i, j, spotIndex) {
            var previous = this.getSelectedCampBuildingSpot(building, i, j);
            this.buildingSpots[spotIndex] = {
                id: this.getBuildingID(building, i, j),
                buildingType: building.name
             };
            if (previous >= 0) {
                this.buildingSpots[previous] = null;
            }
        },

        getMaxSelectedCampBuildingSpot: function () {
            var result = 0;
            for (var spotIndex = 0; spotIndex < this.buildingSpots.length; spotIndex++) {
                if (this.buildingSpots[spotIndex]) result = spotIndex;
            }
            return result;
        },

        // TODO move this kind of logic out of the component
        getNextFreeCampBuildingSpot: function (building) {
            return GameGlobals.campVisHelper.getNextValidCampBuildingSpot(this, building);
        },
        
        resetBuildingSpots: function () {
            this.buildingSpots = [];
        },
        
        getBuildingID: function (building, i, j) {
            return building.getKey() + "-" + i + "-" + j
        },

        getSaveKey: function () {
            return "SectorImpr";
        },

        getCustomSaveObject: function () {
            if (Object.keys(this.improvements).length === 0) return null;
            var copy = {};
            copy.i = this.improvements;
            if (this.buildingSpots.length > 0) copy.s = this.buildingSpots;
            return copy;
        },

        customLoadFromSave: function(componentValues) {
            for (var key in componentValues.i) {
                if (key == "undefined") continue;
                this.improvements[key] = new ImprovementVO(key);
                this.improvements[key].count = componentValues.i[key].count;
                if (componentValues.i[key].storedResources) {
                    for (var res in componentValues.i[key].storedResources) {
                        this.improvements[key].storedResources[res] = componentValues.i[key].storedResources[res];
                    }
                }
            }
            if (componentValues.s) {
                this.buildingSpots = componentValues.s;
            }
        }

    });

    return SectorImprovementsComponent;
});
