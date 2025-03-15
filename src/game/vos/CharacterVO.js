define(['ash'], function (Ash) {

	let CharacterVO = Ash.Class.extend({
		
		constructor: function (characterType, dialogueSourceID, minTimeActive, randomIndex) {
			// unique id for the character
			this.instanceID = Math.floor(Math.random() * 1000000);

			// defines which icon variation to use
			this.randomIndex = randomIndex || Math.floor(Math.random() * 100);
			
			this.characterType = characterType;
			this.dialogueSourceID = dialogueSourceID;
			this.minTimeActive = minTimeActive; // millis

			this.creationTimestamp = new Date().getTime();
			this.numTimesSeen = 0;

			this.completedDialogues = [];
			this.lastShownDialogue = null;
			this.lastShownDialogueTimestamp = null;
		},
	
	});
	
	return CharacterVO;
});
