define([
	'ash', 'game/components/player/DialogueComponent'
], function(Ash, DialogueComponent) {
	
	let DialogueNode = Ash.Node.create({
		dialogue : DialogueComponent
	});

	return DialogueNode;
});
