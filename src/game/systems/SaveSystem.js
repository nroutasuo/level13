define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'lzstring/lz-string',
	'game/nodes/common/SaveNode'
], function (Ash, GameGlobals, GlobalSignals, GameConstants, LZString, SaveNode) {
	var SaveSystem = Ash.System.extend({

		engine: null,

		saveNodes:null,

		lastSaveTimeStamp: 0,
		saveFrequency: 1000 * 60 * 2,

		error: null,

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.saveNodes = engine.getNodeList(SaveNode);
			this.lastSaveTimeStamp = new Date().getTime();
			GlobalSignals.add(this, GlobalSignals.saveGameSignal, this.save);
			GlobalSignals.add(this, GlobalSignals.restartGameSignal, this.onRestart);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.engine = null;
			this.saveNodes = null;
		},

		update: function () {
			if (this.paused) return;
			if (!GameConstants.isAutosaveEnabled) return;
			var timeStamp = new Date().getTime();
			if (timeStamp - this.lastSaveTimeStamp > this.saveFrequency) {
				this.save();
			}
		},

		pause: function () {
			this.paused = true;
		},

		resume: function () {
			this.paused = false;
		},

		save: function (isPlayerInitiated) {
			if (this.paused) return;
			if (!isPlayerInitiated && !GameConstants.isAutosaveEnabled) return;
			this.error = null;
			if (typeof(Storage) !== "undefined") {
				try {
					localStorage.save = this.getCompressedSaveJSON();
					log.i("Saved");
				} catch (ex) {
					this.error = "Failed to save.";
				}
				this.lastSaveTimeStamp = new Date().getTime();
			} else {
				this.error = "Can't save (incompatible browser).";
			}
		},

		getSaveJSON: function () {
			var version = GameGlobals.changeLogHelper.getCurrentVersionNumber();
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
			save.gameState = GameGlobals.gameState;
			save.timeStamp = new Date();
			save.version = version;

			let result = JSON.stringify(save);
			// log.i("Total save size: " + result.length + ", " + nodes + " nodes");
			return result;
		},

		getEntitySaveObject: function (node) {
			var entityObject = {};

			var biggestComponent = null;
			var biggestComponentSize = 0;
			var totalSize = 0;

			for (let i = 0; i < node.save.components.length; i++) {
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

			//log.i(JSON.stringify(biggestComponent));
			//log.i(biggestComponentSize + " / " + totalSize + " " + JSON.stringify(entityObject).length);
			//log.i(entityObject);

			return entityObject;
		},

		getSaveJSONfromCompressed: function (compressed) {
			var json = LZString.decompressFromBase64(compressed);
			return json;
		},

		getCompressedSaveJSON: function (json) {
			var json = json || this.getSaveJSON();
			log.i("basic json: " + json.length);
			var compressed = LZString.compressToBase64(json);
			log.i("compressed: " + compressed.length);
			return compressed;
		},

		onRestart: function (resetSave) {
			if (!resetSave) return;
			if(typeof(Storage) !== "undefined") {
				localStorage.removeItem("save");
				log.i("Removed save");
			}
		}

	});

	return SaveSystem;
});
