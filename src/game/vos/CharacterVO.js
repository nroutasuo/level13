define(['ash'], function (Ash) {

	let CharacterVO = Ash.Class.extend({
		
		constructor: function (characterType, dialogueSourceID, minTimeActive) {
			this.characterType = characterType;
			this.dialogueSourceID = dialogueSourceID;
			this.minTimeActive = minTimeActive; // millis

			this.creationTimestamp = new Date().getTime();
			this.numTimesSeen = 0;
		},
	
	});
	
	return CharacterVO;
});
