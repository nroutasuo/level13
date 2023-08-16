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

		saveNodes: null,

		lastDefaultSaveTimestamp: 0,
		autoSaveFrequency: 1000 * 60 * 2,

		error: null,

		constructor: function () {},

		addToEngine: function (engine) {
			this.engine = engine;
			this.saveNodes = engine.getNodeList(SaveNode);
			this.lastDefaultSaveTimestamp = new Date().getTime();
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
			if (GameGlobals.gameState.isLaunched) return;
			if (!GameConstants.isAutosaveEnabled) return;
			var timeStamp = new Date().getTime();
			if (timeStamp - this.lastDefaultSaveTimestamp > this.autoSaveFrequency) {
				this.save(GameConstants.SAVE_SLOT_DEFAULT, false);
			}
		},

		pause: function () {
			this.paused = true;
		},

		resume: function () {
			this.paused = false;
		},

		save: function (slotID, isPlayerInitiated) {
			slotID = slotID || GameConstants.SAVE_SLOT_DEFAULT;
			isPlayerInitiated = isPlayerInitiated || false;
			let isDefaultSlot = slotID == GameConstants.SAVE_SLOT_DEFAULT;

			if (!isPlayerInitiated) {
				if (isDefaultSlot && this.paused) return;
				if (isDefaultSlot && !GameConstants.isAutosaveEnabled) return;
				if (GameGlobals.gameState.isLaunchStarted || GameGlobals.gameState.isLaunched || GameGlobals.gameState.isLaunchCompleted || GameGlobals.gameState.isFinished) return;
			}

			let data = this.getCompressedSaveJSON();
			let success = this.saveDataToSlot(slotID, data);
			
			if (isDefaultSlot) {
				this.error = success ? null : "Failed to save";
				this.lastDefaultSaveTimestamp = new Date().getTime();
			}
		},

		saveDataToDefaultSlot: function (data) {
			return this.saveDataToSlot(GameConstants.SAVE_SLOT_DEFAULT, data);
		},

		saveDataToSlot: function (slotID, data) {
			if (!data) return;

			if (typeof(Storage) === "undefined") {
				log.w("Could not save to save slot [" + slotID + "]: Storage not found");
				return false;
			}
			
			try {
				let storageKeys = this.getStorageKeysForSaveSlotID(slotID);
				for (let i = 0; i < storageKeys.length; i++) {
					localStorage.setItem(storageKeys[i], data);
				}
				log.i("Saved to slot [" + slotID + "]");
				return true;
			} catch (ex) {
				log.w("Could not save to save slot [" + slotID + "]: Exception: " + ex);
				return false;
			}
		},

		getDataFromSlot: function (slotID) {
			let storageKeys = this.getStorageKeysForSaveSlotID(slotID);
			for (let i = 0; i < storageKeys.length; i++) {
				let data = localStorage.getItem(storageKeys[i]);
				if (data) return data;
			}
			return null;
		},

		clearSlot: function (slotID) {
			if(typeof(Storage) === "undefined") return;

			let storageKeys = this.getStorageKeysForSaveSlotID(slotID);
			for (let i = 0; i < storageKeys.length; i++) {
				localStorage.removeItem(storageKeys[i]);
			}
			log.i("Cleared save slot [" + slotID + "]");
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

		getStorageKeysForSaveSlotID: function (slotID) {
			let result = [ "save-" + slotID ];
			if (slotID == GameConstants.SAVE_SLOT_DEFAULT) {
				// backwards compatibility
				result.push("save");
			}
			return result;
		},

		onRestart: function (resetSave) {
			if (!resetSave) return;
			this.clearSlot(GameConstants.SAVE_SLOT_DEFAULT);
		}

	});

	return SaveSystem;
});
