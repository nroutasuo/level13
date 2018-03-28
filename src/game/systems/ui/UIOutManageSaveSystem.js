define([
    'ash',
    ], function (Ash) {
var UIOutManageSaveSystem = Ash.System.extend({
    
        spanSaveSeed: null,
        spanSaveVersion: null,
        textField: null,
        
        constructor: function (gameState, saveSystem, changeLogHelper) {
			this.gameState = gameState;
            this.saveSystem = saveSystem;
            this.changeLogHelper = changeLogHelper;
            
            this.spanSaveSeed = $("#save-seed");
            this.spanSaveVersion = $("#save-version");
            this.textField = $("#manage-save-textarea");
            this.loadImportcontainer = $("#load-import-container");
            
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
        },
        
        openExport: function () {
            var saveString = this.saveSystem.getSaveJSON();
            this.textField.text(saveString);
            this.textField.toggle(true);
            this.loadImportcontainer.toggle(false);
            this.textField.select();
        },
        
        openImport: function () {
            this.textField.text("");
            this.textField.toggle(true);
            this.loadImportcontainer.toggle(true);
        }

    });
    return UIOutManageSaveSystem;
});