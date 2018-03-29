define([
    'ash', 
    'webtoolkit/base64',
    'game/systems/GameManager', 
    'game/nodes/common/SaveNode'
], function (Ash, Base64, GameManager, SaveNode) {
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
            var entityObject;
            var nodes = 0;
            for (var node = this.saveNodes.head; node; node = node.next) {
                entityObject = this.getEntitySaveObject(node);
                if (entityObject && Object.keys(entityObject).length > 0) {
                    nodes++;
                    entitiesObject[node.save.entityKey] = entityObject;
                }
            }
                
            var save = {};
            save.entitiesObject = entitiesObject;
            save.gameState = this.gameState;
            save.timeStamp = new Date();
            save.version = version;
            
            var result = JSON.stringify(save);            
            // console.log("Total save size: " + result.length + ", " + nodes + " nodes");            
            return result;
        },
	
		getEntitySaveObject: function (node) {
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
                    if (saveObject) {
                        entityObject[componentKey] = saveObject;
                    }
					
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
        
        getObfuscatedSaveJSON: function () {
            var json = this.getSaveJSON();
            return Base64.encode(json);
        },
        
        getSaveJSONfromObfuscated: function (save) {
            var json = Base64.decode(save);
            return json;
        },
		
		restart: function () {
			if(typeof(Storage) !== "undefined") {
                // note: backwards compatibility; remove this code eventually
				localStorage.removeItem("entitiesObject");
				localStorage.removeItem("gameState");
				localStorage.removeItem("timeStamp");
                
				localStorage.removeItem("save");
			}
            this.engine.getSystem(GameManager).restartGame();
            console.log("Restarted.");
		},
	
    });

    return SaveSystem;
});
