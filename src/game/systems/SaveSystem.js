define([
    'ash', 
    'game/systems/GameManager', 
    'game/nodes/common/SaveNode'
], function (Ash, GameManager, SaveNode) {
    var SaveSystem = Ash.System.extend({
	
        engine: null,
		gameState: null,
		
		saveNodes:null,
		
		lastSaveTimeStamp: 0,
		saveFrequency: 1000 * 60 * 2,
        
        error: null,

        constructor: function (gameState, changeLogHelper) {
			this.gameState = gameState;
            this.changeLogHelper = changeLogHelper;
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
	
		save: function () {
            this.error = null;
			if (typeof(Storage) !== "undefined") {
                try {
                    localStorage.save = this.getSaveJSON();
                    console.log("Saved");
                } catch (ex) {
                    this.error = "Failed to save.";
                }
				this.lastSaveTimeStamp = new Date().getTime();
			} else {
                this.error = "Can't save (incompatible browser).";
			}
		},
        
        getSaveJSON: function () {
            var version = this.changeLogHelper.getCurrentVersionNumber();
            var entitiesObject = {};
            var nodes = 0;
            for (var node = this.saveNodes.head; node; node = node.next) {
                nodes++;
                entitiesObject[node.save.entityKey] = this.getEntityJSON(node);
            }
                
            var save = {};
            save.entitiesObject = entitiesObject;
            save.gameState = this.gameState;
            save.timeStamp = new Date();
            save.version = version;
            
            // console.log("Total save size: " + JSON.stringify(save).length + ", " + nodes + " nodes");
            
            return JSON.stringify(save);
        },
	
		getEntityJSON: function (node) {
			var entityObject = {};
			
			var biggestComponent = null;
			var biggestComponentSize = 0;
			var totalSize = 0;
			
			for (var i = 0; i < node.save.components.length; i++) {
				var componentType = node.save.components[i];
				var component = node.entity.get(componentType);
				if (component) {
                    var componentKey = component.getSaveKey ? component.getSaveKey() : componentType;
					var saveObject = component;
					if (component.getCustomSaveObject) {
						saveObject = component.getCustomSaveObject();
					}
					entityObject[componentKey] = saveObject;
					
					var size = JSON.stringify(saveObject).length;
					if (size > biggestComponentSize) {
						biggestComponent = saveObject;
						biggestComponentSize = size;
					}
					totalSize += size;
				}
			}
			
            //console.log(JSON.stringify(biggestComponent));
			//console.log(biggestComponentSize + " / " + totalSize + " " + JSON.stringify(entityObject).length);
            //console.log(entityObject);
			
			return entityObject;
		},
		
		restart: function () {
			if(typeof(Storage) !== "undefined") {
                // note: backwards compatibility; remove this code eventually
				localStorage.removeItem("entitiesObject");
				localStorage.removeItem("gameState");
				localStorage.removeItem("timeStamp");
                
				localStorage.removeItem("save");
				this.engine.getSystem(GameManager).restartGame();
				console.log("Restarted.");
			}
		},
	
    });

    return SaveSystem;
});
