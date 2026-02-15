define(['ash', 'game/vos/PositionVO'], function (Ash, PositionVO) {

	let DistrictVO = Ash.Class.extend({
		
		position: null, // PositionVO
		stage: null,
		type: null, // sector type
		size: 1, // weight, 0.5 - 2

		affiliation: null, // sector affiliation, can be null
		style: null, // sector (architectural) style
		wear: 0, // 0-10
		wealth: 0, // 0-10

		adjustedPosition: null, // PositionVO (not saved)
		
		constructor: function (position, stage, type) {
			this.position = position || new PositionVO();
			this.stage = stage;
			this.type = type;
		},

		clone: function () {
			let copy = new DistrictVO(this.position, this.stage, this.type);

			copy.size = this.size;
			copy.affiliation = this.affiliation;
			copy.style = this.style;
			copy.wear = this.wear;
			copy.wealth = this.wealth;

			return copy;
		},

		getCustomSaveObject: function () {
			let copy = {};

			copy.position = this.position.getCustomSaveObjectWithoutCamp();
			copy.stage = this.stage;
			copy.type = this.type;
			copy.size = this.size;
			copy.affiliation = this.affiliation;
			copy.style = this.style;
			copy.wear = this.wear;
			copy.wealth = this.wealth;

			return copy;
		},

		customLoadFromSave: function (data) {
			this.position = new PositionVO();
			this.position.customLoadFromSave(data.position);
			this.stage = data.stage;
			this.type = data.type;
			this.size = data.size;
			this.affiliation = data.affiliation;
			this.style = data.style;
			this.wear = data.wear;
			this.wealth = data.wealth;
		},
		
		equals: function (districtVO) {
			return this.position.equals(districtVO.position) && this.stage == districtVO.stage && this.type == districtVO.type && this.size == districtVO.size && this.affiliation == districtVO.affiliation && this.style == districtVO.style && this.wear == districtVO.wear && this.wealth == districtVO.wealth;
		},
		
	});

	return DistrictVO;
});
