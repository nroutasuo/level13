define([
    'ash',
    ], function (Ash) {
var UIOutManageSaveSystem = Ash.System.extend({
    
        spanSaveSeed: null,
        spanSaveVersion: null,
        textField: null,
        loadImportcontainer: null,
        spanMsg: null,
        
        constructor: function (gameState, saveSystem, saveHelper, changeLogHelper) {
			this.gameState = gameState;
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
            
            return this;
        },

		addToEngine: function (engine) {
		},
		
		removeFromEngine: function (engine) {
		},
        
        update: function (time) {
            if (!($("#manage-save-popup").is(":visible")) || $("#manage-save-popup").data("fading") == true) {
                this.wasVisible = false;
                return;
            }
            
            if (!this.wasVisible) {
                this.initialize();
            }
            
            this.wasVisible = true;
        },
        
        initialize: function () {
            this.spanSaveSeed.text(this.gameState.worldSeed);
            this.spanSaveVersion.text(this.changeLogHelper.getCurrentVersionNumber());
            this.textField.toggle(false);
            this.loadImportcontainer.toggle(false);
            this.spanMsg.toggle(false);
        },
        
        openExport: function () {
            this.loadImportcontainer.toggle(false);
            var saveString = this.saveSystem.getObfuscatedSaveJSON();
            var saveJSON = this.saveSystem.getSaveJSONfromObfuscated(saveString);
            var isOk = this.saveHelper.parseSaveJSON(saveJSON);
            if (isOk) {
                this.spanMsg.toggle(false);
                this.textField.text(saveString);
                this.textField.toggle(true);
                this.textField.select();
            } else {
                this.spanMsg.toggle(true);
                this.spanMsg.text("Error exporting save.");
            }
        },
        
        openImport: function () {
            this.textField.text("");
            this.textField.toggle(true);
            this.loadImportcontainer.toggle(true);
            this.spanMsg.toggle(false);
        }

    });
    return UIOutManageSaveSystem;
});