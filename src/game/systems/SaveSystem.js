define([
    'ash', 
    'game/systems/GameManager', 'game/nodes/common/SaveNode', 'game/components/player/VisionComponent'
], function (Ash, GameManager, SaveNode, VisionComponent) {
    var SaveSystem = Ash.System.extend({
	
        engine: null,
	gameState: null,
	
	saveNodes:null,
	
	lastSaveTimeStamp: 0,
	saveFrequency: 1000 * 60,

        constructor: function (gameState) {
	    this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.engine = engine;
	    this.saveNodes = engine.getNodeList(SaveNode);
	    this.lastSaveTimeStamp = new Date().getTime();
        },

        removeFromEngine: function (engine) {
	    this.engine = null;
	    this.saveNodes = null;
        },

        update: function (time) {
	    var timeStamp = new Date().getTime();
	    if (timeStamp - this.lastSaveTimeStamp > this.saveFrequency) {
		this.save();
	    }
        },
	
	save: function() {
	    if(typeof(Storage) !== "undefined") {
		var entitiesObject = {};
		for (var node = this.saveNodes.head; node; node = node.next) {
		    entitiesObject[node.save.entityKey] = this.prepareNode(node);
		}
		localStorage.entitiesObject = JSON.stringify(entitiesObject);
		localStorage.gameState = JSON.stringify(this.gameState);
		localStorage.timeStamp = new Date();
		this.lastSaveTimeStamp = new Date().getTime();
	    } else {
		// No Web Storage support..
	    }
	},
	
	prepareNode: function(node) {
	    var entityObject = {};
	    var entity = node.entity;
	    
	    var biggestComponent = null;
	    var biggestComponentSize = 0;
	    var totalSize = 0;
	    
	    for (var i = 0; i < node.save.components.length; i++) {
		var componentType = node.save.components[i];
		var component = node.entity.get(componentType);
		if (component) {
		    var saveObject = component;
		    if(component.customSaveObject) {
			saveObject = component.customSaveObject();
		    }
		    entityObject[componentType] = saveObject;
		    
		    var size = JSON.stringify(saveObject).length;
		    if (size > biggestComponentSize) {
			biggestComponent = component;
			biggestComponentSize = size;
		    }
		    totalSize += size;
		}
	    }
	    
	    // console.log(biggestComponent);
	    // console.log(biggestComponentSize + " / " + totalSize);
	    
	    return entityObject;
	},
	
	restart: function() {
	    if(typeof(Storage) !== "undefined") {
		localStorage.removeItem("entitiesObject");;
		localStorage.removeItem("timeStamp");
		this.engine.getSystem(GameManager).restartGame();
		console.log("Restarted.");
	    } else {
		// Sorry! No Web Storage support..
	    }	        
	},
	
    });

    return SaveSystem;
});
