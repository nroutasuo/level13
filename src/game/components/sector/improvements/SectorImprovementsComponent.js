// Lists miscellaneous improvements that the given entity (should be a Sector) contains
define(['ash', 'game/GameGlobals', 'game/constants/ImprovementConstants', 'game/vos/ImprovementVO'], function (Ash, GameGlobals, ImprovementConstants, ImprovementVO) {
	var SectorImprovementsComponent = Ash.Class.extend({

		improvements: {},
		buildingSpots: [],

		constructor: function () {
			this.improvements = {};
			this.buildingSpots = [];
		},

		add: function (type, amount) {
			let vo = this.improvements[type];
			if (!vo) {
				this.improvements[type] = new ImprovementVO(type);
				vo = this.improvements[type];
			}

			if (!amount) amount = 1;
			
			for (let i = 0; i < amount; i++) {
				vo.count++;
			}
		},
		
		remove: function (type) {
			let vo = this.improvements[type];
			if (!vo) return;
			vo.count--;
			if (vo.count == 0) delete this.improvements[type];
		},
		
		improve: function (type) {
			var vo = this.improvements[type];
			if (!vo) return;
			if (!vo.level) vo.level = 1;
			if (vo.level < 1) vo.level = 1;
			vo.level++;
		},

		getCount: function (type) {
			var vo = this.improvements[type];
			if (vo) {
                return vo.count || 0;
			} else {
				return 0;
			}
		},
		
		getCountWithModifierForDamaged: function (type, modifier) {
			damagedModifier = isNaN(modifier) ? 1 : modifier;
			var vo = this.improvements[type];
			if (vo) {
				let countRaw = vo.count || 0;
				let numDamaged = this.getNumDamaged(type);
				let numUndamaged = countRaw - numDamaged;
				return numUndamaged + modifier * numDamaged;
			} else {
				return 0;
			}
		},
		
		getTotalCount: function () {
			let result = 0;
			for (var key in this.improvements) {
				var val = this.improvements[key];
				if (val) result += val.count;
			}
			return result;
		},
		
		getLevel: function (type) {
			var vo = this.improvements[type];
			if (vo) {
				return vo.level || 1;
			} else {
				return 0;
			}
		},
		
		getMajorLevel: function (type) {
			var level = this.getLevel(type);
			var id = ImprovementConstants.getImprovementID(type);
			return ImprovementConstants.getMajorLevel(id, level);
		},
		
		isDamaged: function (type) {
			var vo = this.improvements[type];
			if (vo) {
				return vo.numDamaged > 0;
			} else {
				return false;
			}
		},
		
		getNumDamaged: function (type) {
			var vo = this.improvements[type];
			if (vo) {
				return vo.numDamaged;
			} else {
				return false;
			}
		},
		
		hasDamagedBuildings: function () {
			for (var key in this.improvements) {
				var val = this.improvements[key];
				if (val && val.numDamaged > 0) return true;
			}
			return false;
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
			for (let i = 0; i < allImprovements.length; i++) {
				count += allImprovements[i].count;
			}
			return count;
		},

		hasCollectors: function () {
			return this.getCount(improvementNames.collector_food) > 0 || this.getCount(improvementNames.collector_water) > 0;
		},

		getSelectedCampBuildingSpot: function (building, i, j) {
			var id = this.getBuildingID(building, i, j);
			for (var spotIndex = 1; spotIndex < this.buildingSpots.length; spotIndex++) {
				var contents = this.buildingSpots[spotIndex];
				if (contents && contents.id == id) {
					return spotIndex;
				}
			}

			return -1;
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
		
		assignSelectedCampBuildingSpot: function (campOrdinal, building, i, j) {
			var newSpot = this.getNextCampBuildingSpot(campOrdinal, building);
			this.setSelectedCampBuildingSpot(building, i, j, newSpot);
			return this.getSelectedCampBuildingSpot(building, i, j);
		},

		getMaxSelectedCampBuildingSpot: function () {
			let result = 0;
			for (var spotIndex = 0; spotIndex < this.buildingSpots.length; spotIndex++) {
				if (this.buildingSpots[spotIndex]) result = spotIndex;
			}
			return result;
		},

		getNextCampBuildingSpot: function (campOrdinal, building) {
			return GameGlobals.campVisHelper.getNextCampBuildingSpot(campOrdinal, this, building);
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
				this.improvements[key].count = componentValues.i[key].count || 1;
				this.improvements[key].level = componentValues.i[key].level || 1;
				this.improvements[key].numDamaged = componentValues.i[key].numDamaged || 0;
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
