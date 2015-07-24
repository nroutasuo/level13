define([
    'ash', 'game/nodes/PlayerStatsNode', 'game/nodes/sector/CampNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, PlayerStatsNode, CampNode, SectorImprovementsComponent) {
    var RumourSystem = Ash.System.extend({
	
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
	    var rumoursComponent = this.playerStatsNodes.head.rumours;
	    
	    rumoursComponent.accSources = [];
	    rumoursComponent.accumulation = 0;
	    
	    if (this.campNodes.head) {
		var accSpeed = 0;
		
		var campfireFactor = 1;
		var improvementsComponent;
		var campfireCount = 0;
		for (var campNode = this.campNodes.head; campNode; campNode = campNode.next) {
		    improvementsComponent = campNode.entity.get(SectorImprovementsComponent);
		    
		    campfireCount = improvementsComponent.getCount(improvementNames.campfire);
		    campfireFactor = 1 + (campfireCount > 0 ? (campfireCount/10) : 0);
		    var accSpeedPopulation = 0.00005 * (Math.floor(campNode.camp.population)+1);
		    var accSpeedCampfire = accSpeedPopulation * campfireFactor - accSpeedPopulation;
		    var accSpeedCamp = accSpeedPopulation + accSpeedCampfire;
		    accSpeed += accSpeedCamp;
		    
		    rumoursComponent.addChange("Population", accSpeedPopulation);
		    rumoursComponent.addChange("Campfire", accSpeedCampfire);
		    rumoursComponent.accumulation += accSpeed;
		}
		
		rumoursComponent.value += time * accSpeed;
		if (rumoursComponent.value > rumoursComponent.cap) rumoursComponent.value = rumoursComponent.cap;
		rumoursComponent.isAccumulating = true;
	    }
	    
        },
    });

    return RumourSystem;
});
