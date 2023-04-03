define(['ash', 'utils/FileUtils', 'game/GameGlobals', 'game/GlobalSignals', 'game/systems/GameManager', 'game/systems/SaveSystem',],
function (Ash, FileUtils, GameGlobals, GlobalSignals, GameManager, SaveSystem) {
var UIOutManageSaveSystem = Ash.System.extend({

		spanSaveSeed: null,
		spanSaveVersion: null,
		textField: null,
		loadImportcontainer: null,
		spanWarning: null,
		spanMsg: null,
		
		lastExport: null,

		constructor: function () {
			this.spanSaveSeed = $("#save-seed");
			this.spanSaveVersion = $("#save-version");
			this.textField = $("#manage-save-textarea");
			this.loadImportcontainer = $("#load-import-container");
			this.downloadExportContainer = $("#export-download-container");
			this.spanWarning = $("#manage-save-warning");
			this.spanMsg = $("#manage-save-msg");

			var system = this;
			$("#open-export").click(function () {
				system.openExport();
			});
			$("#open-import").click(function () {
				system.openImport();
			});
			$("#load-import").click(function () {
				system.loadImport();
			});
			$("#btn-download-export").click(function () {
				system.downloadExport();
			});
			$("#close-manage-save-popup").click(function (e) {
				system.resetElements();
				GameGlobals.uiFunctions.popupManager.closePopup("manage-save-popup");
			});

			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, function (popupID) {
				if (popupID === "manage-save-popup") {
					this.initialize();
				}
			});
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},

		update: function () { },

		initialize: function () {
			this.spanSaveSeed.text(GameGlobals.gameState.worldSeed);
			this.spanSaveVersion.text(GameGlobals.changeLogHelper.getCurrentVersionNumber());
			this.resetElements();
		},

		resetElements: function () {
			this.textField.val("");
			GameGlobals.uiFunctions.toggle(this.spanMsg, false);
			GameGlobals.uiFunctions.toggle(this.spanWarning, false);
			GameGlobals.uiFunctions.toggle(this.textField, false);
			GameGlobals.uiFunctions.toggle(this.loadImportcontainer, false);
			GameGlobals.uiFunctions.toggle(this.downloadExportContainer, false);
		},

		openExport: function () {
			this.resetElements();
			var saveSystem = this.engine.getSystem(SaveSystem);
			var saveString = saveSystem.getCompressedSaveJSON();
			var saveJSON = saveSystem.getSaveJSONfromCompressed(saveString);
			var saveObject = GameGlobals.saveHelper.parseSaveJSON(saveJSON);
			var isOk = saveObject != null;
			if (isOk) {
				this.lastExport = saveString;
				GameGlobals.uiFunctions.toggle(this.textField, true);
				GameGlobals.uiFunctions.toggle(this.downloadExportContainer, true);
				this.textField.val(saveString);
				this.textField.select();
				GameGlobals.uiFunctions.toggle(this.spanMsg, true);
				this.spanMsg.text("Exported.");
			} else {
				GameGlobals.uiFunctions.toggle(this.spanWarning, true);
				this.spanWarning.text("Error exporting save.");
			}
		},

		openImport: function () {
			this.resetElements();
			GameGlobals.uiFunctions.toggle(this.textField, true);
			GameGlobals.uiFunctions.toggle(this.loadImportcontainer, true);
			GameGlobals.uiFunctions.toggle(this.downloadExportContainer, false);
		},

		loadImport: function () {
			var saveSystem = this.engine.getSystem(SaveSystem);

			var importString = this.textField.val();
			var importJSON = saveSystem.getSaveJSONfromCompressed(importString);
			var isOk = GameGlobals.saveHelper.parseSaveJSON(importJSON);
			if (isOk) {
				var sys = this;
				this.textField.val("");
				GameGlobals.uiFunctions.popupManager.closePopup("manage-save-popup");
				GameGlobals.uiFunctions.showConfirmation(
					"Are you sure you want to load this save? Your current progress will be lost.<br/><br/>" +
					"Loaded data:<br/>Save version: " + isOk.version + "<br/>" +
					"Save timestamp: " + isOk.timeStamp + "<br/>" +
					"Save world seed: " + isOk.gameState.worldSeed,
					function () {
						sys.loadState(importJSON);
					},
					true
				);
			} else {
				GameGlobals.uiFunctions.toggle(this.spanWarning, true);
				this.spanWarning.text("Failed to import save.");
			}
		},

		loadState: function (importJSON) {
			var saveSystem = this.engine.getSystem(SaveSystem);
			gtag('event', 'game_load_import', { event_category: 'game_data' });
			GameGlobals.uiFunctions.hideGame(true);
			if (typeof(Storage) !== "undefined") {
				try {
					localStorage.save = saveSystem.getCompressedSaveJSON(importJSON);
					log.i("Replaced save.");
				} catch (ex) {
					log.i("Failed to replace save.");
				}
			} else {
				log.i("Failed to replace save.");
			}
			GlobalSignals.restartGameSignal.dispatch(false);
			GameGlobals.uiFunctions.showGame(true);
		},
		
		downloadExport: function () {
			let now = new Date();
			FileUtils.saveTextToFile("level13-save", this.lastExport);
		},

	});
	return UIOutManageSaveSystem;
});
