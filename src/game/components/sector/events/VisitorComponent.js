// marks a camp entity has currently having the 'visitor' event
define(['ash'], function (Ash) {

	let VisitorComponent = Ash.Class.extend({
		
		id: "Visitor",

		constructor: function (npcType, dialogueSource) {
			this.visitorType = npcType;
			this.dialogueSource = dialogueSource;
			this.hasInteracted = false;
		},

		getSaveKey: function () {
			return this.id;
		},

	});

	return VisitorComponent;
});
