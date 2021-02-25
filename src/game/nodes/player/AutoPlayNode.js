define([
	'ash', 'game/components/player/AutoPlayComponent'
], function (Ash, AutoPlayComponent) {
	
	var AutoPlayNode = Ash.Node.create({
		autoPlay : AutoPlayComponent
	});

	return AutoPlayNode;
});
