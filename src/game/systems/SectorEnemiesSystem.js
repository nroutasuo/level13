// Slowly spawns new enemies in uncontrolled sectors over time to not to run out of enemies to fight
define([
    'ash','game/nodes/sector/SectorControlNode', 'game/nodes/PlayerPositionNode','game/components/common/LogMessagesComponent',
], function (Ash, SectorControlNode, PlayerPositionNode, LogMessagesComponent) {
    var SectorEnemiesSystem = Ash.System.extend({	
	    
	sectorNodes: null,
	playerNodes: null,
	
	spawnFrequency: 1000 * 60 * 3,
	
        constructor: function (creator) {
        },

        addToEngine: function (engine) {
	    this.sectorNodes = engine.getNodeList( SectorControlNode );
	    this.playerNodes = engine.getNodeList( PlayerPositionNode );
        },

        removeFromEngine: function (engine) {
	    this.sectorNodes = null;
	    this.playerNodes = null;
        },	

        update: function () {
	    var timeStamp = new Date().getTime();
	    if (this.sectorNodes) {
		for (var node = this.sectorNodes.head; node; node = node.next) {
		    this.updateSector(node, timeStamp);
		}
	    }
        },
	
	updateSector: function( node, timeStamp ) {
	    var controlComponent = node.sectorControl;
	    var positionComponent = node.position;
	    
	    if (controlComponent.hasControl()) return;
	    if (Math.random() > 0.2) return;
	    
	    var hasRoom = controlComponent.currentUndefeatedEnemies < controlComponent.maxUndefeatedEnemies;
	    if (!hasRoom) return;
	    
	    var spawnCooldownOk = timeStamp - controlComponent.lastSpawnTimeStamp > this.spawnFrequency;
	    var winCooldownOk = timeStamp - controlComponent.lastWinTimeStamp > this.spawnFrequency;
	    var canSpawn = hasRoom && spawnCooldownOk && winCooldownOk;
	    
	    if (canSpawn) {
		controlComponent.spawn();
		console.log("Spawned new enemy at " + positionComponent.level + "." + positionComponent.sector);
		
		// TODO make the log messages enemy / sector type dependent but still recognizable
	    
		var playerPos = this.playerNodes.head.position;
		var logComponent = this.playerNodes.head.entity.get(LogMessagesComponent);
		if (positionComponent.level == playerPos.level) {
		    if (positionComponent.sector == playerPos.sector) {
			
			logComponent.addMessage("There is a hiss and a rustling sound nearby.");
		    }
		    else if (Math.abs(positionComponent.sector - playerPos.sector) < 2) {
			logComponent.addMessage("In the distance something creaks.");
		    }
		}		
	    }
	},
        
    });

    return SectorEnemiesSystem;
});
