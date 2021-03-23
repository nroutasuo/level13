define([
	'ash', 'game/components/common/SaveComponent'
], function(Ash, SaveComponent) {
	var SaveNode = Ash.Node.create({
		save : SaveComponent
	});

	return SaveNode;
});
