define(['ash', 'game/constants/MovementConstants'], function (Ash, MovementConstants) {
	
	var MovementBlockerVO = Ash.Class.extend({
	
		constructor: function (type) {
			this.type = type;
			this.name = this.getName();
			this.bridgeable = type === MovementConstants.BLOCKER_TYPE_GAP;
			this.cleanable = type === MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE || MovementConstants.BLOCKER_TYPE_WASTE_TOXIC;
			this.defeatable = type === MovementConstants.BLOCKER_TYPE_GANG;
			
			this.actionBaseID = this.getActionBaseId();
		},
		
		getName: function () {
			switch (this.type) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "Gap";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "Toxic waste";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "Radioactive waste";
				case MovementConstants.BLOCKER_TYPE_GANG: return "Gang";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return "Debris";
				case MovementConstants.BLOCKER_TYPE_EXPLOSIVES: return "Explosives";
				case MovementConstants.BLOCKER_TYPE_TOLL_GATE: return "Toll gate";
			}
		},
		
		getActionBaseId: function () {
			switch (this.type) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "bridge_gap";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "clear_waste_t";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "clear_waste_r";
				case MovementConstants.BLOCKER_TYPE_GANG: return "fight_gang";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return "clear_debris";
				case MovementConstants.BLOCKER_TYPE_EXPLOSIVES: return "clear_explosives";
				case MovementConstants.BLOCKER_TYPE_TOLL_GATE: return "clear_gate";
			}
		},
		
	});

	return MovementBlockerVO;
});
