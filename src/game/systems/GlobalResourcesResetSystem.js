// Resets resource accumulation at the start of the update cycle.
define([
	'ash',
	'game/nodes/sector/CampNode',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/tribe/TribeResourcesNode',
	'game/components/common/ResourceAccumulationComponent',
], function (Ash,
	CampNode, PlayerResourcesNode, TribeResourcesNode, ResourceAccumulationComponent) {
	
	var GlobalResourcesResetSystem = Ash.System.extend({
		
		playerNodes: null,
		campNodes: null,
		tribeNodes: null,
		
		constructor: function () {
		},

		addToEngine: function (engine) {
			this.playerNodes = engine.getNodeList(PlayerResourcesNode);
			this.campNodes = engine.getNodeList(CampNode);
			this.tribeNodes = engine.getNodeList(TribeResourcesNode);
		},

		removeFromEngine: function (engine) {
			this.playerNodes = null;
			this.campNodes = null;
			this.tribeNodes = null;
		},

		update: function (time) {
			this.playerNodes.head.resourcesAcc.reset();

			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				campNode.entity.get(ResourceAccumulationComponent).reset();
			}

			this.tribeNodes.head.resources.storageCapacity = 0;
			this.tribeNodes.head.resourceAccumulation.reset();
		},
		
		
	});

	return GlobalResourcesResetSystem;
});
