define(['ash', 'game/components/type/GangComponent'], function (Ash, GangComponent) {
	var GangNode = Ash.Node.create({
		gang : GangComponent
	});

	return GangNode;
});
