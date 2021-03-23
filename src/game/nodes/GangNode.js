define(['ash', 'game/components/type/GangComponent'], function (Ash, GangComponent) {
	var LogNode = Ash.Node.create({
		gang : GangComponent
	});

	return LogNode;
});
