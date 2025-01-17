define(['ash'], function (Ash) {

	let MovementConstants = {
	
		BLOCKER_TYPE_GAP: 1,
		BLOCKER_TYPE_GANG: 3,
		BLOCKER_TYPE_DEBRIS: 4,
		BLOCKER_TYPE_WASTE_RADIOACTIVE: 5,
		BLOCKER_TYPE_WASTE_TOXIC: 6,
		BLOCKER_TYPE_EXPLOSIVES: 7,
		BLOCKER_TYPE_TOLL_GATE: 8,
		
		PASSAGE_TYPE_PREBUILT: "prebuilt",
		PASSAGE_TYPE_HOLE: "hole",
		PASSAGE_TYPE_ELEVATOR: "elevator",
		PASSAGE_TYPE_STAIRWELL: "stairwell",

		DESPAIR_TYPE_HUNGRER: "hunger",
		DESPAIR_TYPE_THIRST: "thirst",
		DESPAIR_TYPE_STAMINA: "stamina",
		DESPAIR_TYPE_MOVEMENT: "movement",
	
	};
	
	return MovementConstants;
	
});
