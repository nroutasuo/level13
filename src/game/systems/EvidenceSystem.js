define([
    'ash', 'game/nodes/PlayerStatsNode', 'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, PlayerStatsNode, CampNode, SectorImprovementsComponent) {
    var EvidenceSystem = Ash.System.extend({
	
        gameState: null,
	
        playerStatsNodes: null,
	campNodes: null,

        constructor: function (gameState) {
	    this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.playerStatsNodes = engine.getNodeList( PlayerStatsNode );
            this.campNodes = engine.getNodeList( CampNode );
        },

        removeFromEngine: function (engine) {
            this.playerStatsNodes = null;
            this.campNodes = null;
        },

        update: function (time) {
	    var evidenceComponent = this.playerStatsNodes.head.evidence;
	    
	    evidenceComponent.accSources = [];
	    evidenceComponent.accumulation = 0;
	    var cap = 100;
	    
	    if (this.campNodes.head) {
			var accSpeed = 0;
			var improvementsComponent;
			var libraryCount = 0;
			for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
				improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
				libraryCount = improvementsComponent.getCount(improvementNames.library);
				var accLibrary = 0.0005 * libraryCount;
				var accSpeedCamp = accLibrary;
				accSpeed += accSpeedCamp;
				cap += libraryCount * 100;
				
				evidenceComponent.addChange("Libraries", accSpeedCamp);
				evidenceComponent.accumulation += accSpeed;
			}
			
			evidenceComponent.value += time * accSpeed;
			evidenceComponent.isAccumulating = true;
	    }
	    
	    evidenceComponent.cap = cap;
        },
    });

    return EvidenceSystem;
});
