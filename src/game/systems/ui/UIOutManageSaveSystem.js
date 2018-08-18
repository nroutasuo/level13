define(['ash', 'game/GlobalSignals', 'game/systems/GameManager'], function (Ash, GlobalSignals, GameManager) {
var UIOutManageSaveSystem = Ash.System.extend({
    
        spanSaveSeed: null,
        spanSaveVersion: null,
        textField: null,
        loadImportcontainer: null,
        spanMsg: null,
        
        constructor: function (uiFunctions, gameState, saveSystem, saveHelper, changeLogHelper) {
			this.gameState = gameState;
            this.uiFunctions = uiFunctions;
            this.saveSystem = saveSystem;
            this.saveHelper = saveHelper;
            this.changeLogHelper = changeLogHelper;
            
            this.spanSaveSeed = $("#save-seed");
            this.spanSaveVersion = $("#save-version");
            this.textField = $("#manage-save-textarea");
            this.loadImportcontainer = $("#load-import-container");
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
            $("#close-manage-save-popup").click(function (e) {
                system.resetElements();
                system.uiFunctions.popupManager.closePopup("manage-save-popup");
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
        
        update: function (time) {
        },
        
        initialize: function () {
            this.spanSaveSeed.text(this.gameState.worldSeed);
            this.spanSaveVersion.text(this.changeLogHelper.getCurrentVersionNumber());
            this.textField.toggle(false);
            this.uiFunctions.toggle(this.loadImportcontainer, false);
            this.uiFunctions.toggle(this.spanMsg, false);
        },
        
        resetElements: function () {
            this.textField.text("");
            this.uiFunctions.toggle(this.spanMsg, false);
            this.uiFunctions.toggle(this.textField, false);
            this.uiFunctions.toggle(this.loadImportcontainer, false);
            
        },
        
        openExport: function () {
            this.uiFunctions.toggle(this.loadImportcontainer, false);
            var saveString = this.saveSystem.getObfuscatedSaveJSON();
            var saveJSON = this.saveSystem.getSaveJSONfromObfuscated(saveString);
            var isOk = this.saveHelper.parseSaveJSON(saveJSON);
            if (isOk) {
                this.uiFunctions.toggle(this.spanMsg, false);
                this.textField.text(saveString);
                this.uiFunctions.toggle(this.textField, true);
                this.textField.select();
            } else {
                this.uiFunctions.toggle(this.spanMsg, true);
                this.spanMsg.text("Error exporting save.");
            }
        },
        
        openImport: function () {
            this.textField.text("");
            this.uiFunctions.toggle(this.textField, true);
            this.uiFunctions.toggle(this.loadImportcontainer, true);
            this.uiFunctions.toggle(this.spanMsg, false);
        },
        
        loadImport: function () {
            var importString = this.textField.val();
            var importJSON = this.saveSystem.getSaveJSONfromObfuscated(importString);
            var isOk = this.saveHelper.parseSaveJSON(importJSON);
            if (isOk) {            
                var sys = this;
                this.textField.text("");
                this.uiFunctions.popupManager.closePopup("manage-save-popup");
                this.uiFunctions.showConfirmation(
                    "Are you sure you want to load this save? Your current progress will be lost.<br/><br/>" + 
                    "Loaded data:<br/>Save version: " + isOk.version + "<br/>" + 
                    "Save timestamp: " + isOk.timeStamp + "<br/>" +
                    "Save world seed: " + isOk.gameState.worldSeed,
                    function () {
                        sys.loadState(importJSON);
                    });
            } else {                
                this.uiFunctions.toggle(this.spanMsg, true);
                this.spanMsg.text("Failed to import save.");
            }
        },
        
        loadState: function (importJSON) {
            gtag('event', 'game_load_import', { event_category: 'game_data' });
			this.uiFunctions.hideGame(true);            
			if (typeof(Storage) !== "undefined") {
                try {
                    localStorage.save = importJSON;
                    console.log("Replaced save.");
                } catch (ex) {
                    console.log("Failed to replace save.");
                }
			} else {
                console.log("Failed to replace save.");
			}
            this.engine.getSystem(GameManager).restartGame();
        }

    });
    return UIOutManageSaveSystem;
});