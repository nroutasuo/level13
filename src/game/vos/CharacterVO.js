define(['ash'], function (Ash) {

	let CharacterVO = Ash.Class.extend({
		
		constructor: function (characterType, dialogueSourceID, minTimeActive) {
			this.instanceID = Math.floor(Math.random() * 1000000);
			
			this.characterType = characterType;
			this.dialogueSourceID = dialogueSourceID;
			this.minTimeActive = minTimeActive; // millis

			this.creationTimestamp = new Date().getTime();
			this.numTimesSeen = 0;

			this.lastShownDialogue = null;
			this.lastShownDialogueTimestamp = null;
		},
	
	});
	
	return CharacterVO;
});
