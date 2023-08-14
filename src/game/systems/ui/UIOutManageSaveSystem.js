define(['ash', 'utils/UIList', 'utils/FileUtils', 'game/GameGlobals', 'game/GlobalSignals', 'game/constants/GameConstants', 'game/systems/SaveSystem',],
function (Ash, UIList, FileUtils, GameGlobals, GlobalSignals, GameConstants, SaveSystem) {
var UIOutManageSaveSystem = Ash.System.extend({

		textField: null,
		loadImportcontainer: null,
		spanWarning: null,
		spanMsg: null,
		containerExport: null,
		
		lastExport: null,

		showImport: false,
		showExport: false,
		selectedSaveSlot: null,

		constructor: function () {
			this.textField = $("#manage-save-textarea");
			this.loadImportcontainer = $("#load-import-container");
			this.downloadExportContainer = $("#export-download-container");
			this.spanWarning = $("#manage-save-warning");
			this.spanMsg = $("#manage-save-msg");

			this.containerSaveList = $("#save-list-container");
			this.containerSaveListOptions = $("#save-list-options");
			this.containerSaveListOptionsEmpty = $("#save-list-options-empty");
			this.containerSaveListOptionsSelected = $("#save-list-options-selected");
			this.containerSaveListOptionsExport = $("#save-list-options-export");
			this.containerImport = $("#save-import-container");

			this.initElements();

			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},

		initElements: function () {
			this.saveSlotList = UIList.create($("#save-list"), this.createSaveSlotListItem, this.updateSaveSlotListItem, this.isSaveSlotListItemDataEqual);

			let system = this;
			$("#open-export").click(function () {
				system.openExport();
			});
			$("#open-import").click(function () {
				system.openImport();
			});
			$("#open-save-list").click(function () {
				system.closeImport();
			});
			$("#load-import").click(function () {
				system.loadImport();
			});
			$("#btn-download-export").click(function () {
				system.downloadExport();
			});
			$("#btn-copy-export").click(function () {
				navigator.clipboard.writeText($("#textarea-export-save").val());
			});
			$("#btn-back-from-export").click(function () {
				system.closeExport();
			});
			$("#close-manage-save-popup").click(function (e) {
				system.resetElements();
				GameGlobals.uiFunctions.popupManager.closePopup("manage-save-popup");
			});
			$("#btn-save-list-options-save").click(function (e) {
				system.saveToSelectedSlot();
			});
			$("#btn-save-list-options-load").click(function (e) {
				system.loadFromSelectedSlot();
			});
			$("#btn-save-list-options-export").click(function (e) {
				system.openExport();
			});
		},

		update: function () { },

		refresh: function () {
			this.showImport = false;
			this.showExport = false;
			this.selectedSaveSlot = null;

			this.resetElements();
			this.updateContainers();
			this.updateTexts();
			this.updateSlotList();
		},

		resetElements: function () {
			this.textField.val("");
			$(".li-save-slot").toggleClass("selected", false);
			GameGlobals.uiFunctions.toggle(this.spanMsg, false);
			GameGlobals.uiFunctions.toggle(this.spanWarning, false);
			GameGlobals.uiFunctions.toggle(this.textField, false);
			GameGlobals.uiFunctions.toggle(this.loadImportcontainer, false);
			GameGlobals.uiFunctions.toggle(this.downloadExportContainer, false);
		},

		updateContainers: function () {
			let showSaveList = !this.showImport;
			GameGlobals.uiFunctions.toggle(this.containerSaveList, showSaveList);
			GameGlobals.uiFunctions.toggle(this.containerSaveListOptions, showSaveList);
			GameGlobals.uiFunctions.toggle(this.containerSaveListOptionsEmpty, showSaveList && this.selectedSaveSlot == null);
			GameGlobals.uiFunctions.toggle(this.containerSaveListOptionsSelected, showSaveList && this.selectedSaveSlot != null && !this.showExport);
			GameGlobals.uiFunctions.toggle(this.containerSaveListOptionsExport, showSaveList && this.selectedSaveSlot != null && this.showExport);
			GameGlobals.uiFunctions.toggle(this.containerImport, this.showImport);
			$("#save-list-options").toggleClass("selected", this.selectedSaveSlot != null);
			GameGlobals.uiFunctions.toggle("#open-import", !this.showImport);
			GameGlobals.uiFunctions.toggle("#open-save-list", this.showImport);
		},

		updateTexts: function () {
			$("#manage-save-popup-header").text(this.showImport ? "Import save" : "Manage saves");
			$("#manage-save-info").text(this.showImport ? "Paste an exported save below to load it." : "Note that the game is still in alpha and updates can break old saves.");
		},
		
		updateSlotList: function () {
			UIList.update(this.saveSlotList, this.getSaveSlotListData());
		},

		updateSlotDetails: function () {
			let slotID = this.selectedSaveSlot;
			let data = this.getSaveSlotData(slotID);
			let showSave = GameGlobals.saveHelper.hasManualSave(slotID);
			let showLoad = data.hasData;
			let showExport = data.hasData;
			let showRename = GameGlobals.saveHelper.isCustomSaveSlot(slotID);

			let slotInfoText = data.slotDisplayName + "<br/>";
			if (data.hasData) {
				slotInfoText += "<span class='secondary'>" + this.getDateDisplayString(data.date) +"</span></br>";
				slotInfoText += "world seed: " + data.seed +"</br>";
				slotInfoText += "camps: " + data.numCamps +"</br>";
				slotInfoText += "version: " + data.version +"</br>";
			} else {
				slotInfoText += "(empty)"
			}

			$("#save-list-options-info").html(slotInfoText);
			GameGlobals.uiFunctions.toggle($("#btn-save-list-options-save"), showSave);
			GameGlobals.uiFunctions.toggle($("#btn-save-list-options-load"), showLoad);
			GameGlobals.uiFunctions.toggle($("#btn-save-list-options-export"), showExport);
			GameGlobals.uiFunctions.toggle($("#btn-save-list-options-rename"), showRename);
		},

		createSaveSlotListItem: function () {
			let li = {};
			let slotName = "<span class='save-slot-name'></span>";
			let saveName = "<span class='save-name'></span>";
			let date = "<span class='save-slot-date'></span>";
			let info = "<span class='save-slot-info'></span>";
			li.$root = $("<div class='li li-save-slot'>" 
				+ "<div class='save-slot-header'>" + date + slotName + saveName + "</div>" 
				+ "<div class='save-slot-content'>" + info + "</div>"
				+ "</div>"
			);
			li.$slotName = li.$root.find(".save-slot-name");
			li.$saveName = li.$root.find(".save-name");
			li.$date = li.$root.find(".save-slot-date");
			li.$info = li.$root.find(".save-slot-info");

			let sys = GameGlobals.engine.getSystem(UIOutManageSaveSystem);
			li.$root.click(function (e) {
				let $target = $(e.currentTarget);
				let slotID = $target.data("slotID");
				$(".li-save-slot").toggleClass("selected", false);
				$target.toggleClass("selected", true);
				sys.selectSlot(slotID);
			});

			return li;
		},

		updateSaveSlotListItem: function (li, data) {
			let hasData = data.hasData;
			let sys = GameGlobals.engine.getSystem(UIOutManageSaveSystem);
			let infoText = hasData ? ("world seed: " + data.seed + ", camps: " + data.numCamps) : "(empty)";
			li.$root.data("slotID", data.slotID);
			li.$slotName.text(data.slotDisplayName);
			li.$saveName.text(data.saveName || "");
			li.$date.text(hasData ? sys.getDateDisplayString(data.date) : "");
			li.$info.text(infoText);
			li.$info.toggleClass("dimmed", !hasData);
		},

		isSaveSlotListItemDataEqual: function (d1, d2) {
			return d1.slotID == d2.slotID;
		},

		getSaveSlotListData: function () {
			let slotIDs = [ GameConstants.SAVE_SLOT_DEFAULT, GameConstants.SAVE_SLOT_BACKUP, GameConstants.SAVE_SLOT_LOADED, GameConstants.SAVE_SLOT_USER_1, GameConstants.SAVE_SLOT_USER_2, GameConstants.SAVE_SLOT_USER_3 ];

			let result = [];
			for (let i = 0; i < slotIDs.length; i++) {
				let slotID = slotIDs[i];
				let data = this.getSaveSlotData(slotID);
				result.push(data);
			}

			return result;
		},

		getSaveSlotData: function (slotID) {
			let saveDataRaw = this.getSaveData(slotID);
			let saveData = saveDataRaw || {};
			let hasData = saveDataRaw != null;
			let date = hasData ? new Date(saveData.timeStamp) : null;
			let data = {
				slotID: slotID,
				slotDisplayName: this.getSaveSlotDisplayName(slotID),
				hasData: hasData,
				saveName: saveData.saveName,
				date: date,
				version: saveData.version,
				seed: hasData ? saveData.gameState.worldSeed : null,
				numCamps: hasData ? saveData.gameState.numCamps : 0,
			};
			return data;
		},

		getSaveData: function (slotID) {
			let saveSystem = this.getSaveSystem();
			let saveString = saveSystem.getDataFromSlot(slotID);
			if (!saveString) return null;
			let json = saveSystem.getSaveJSONfromCompressed(saveString);
			let saveObject = GameGlobals.saveHelper.parseSaveJSON(json);
			return saveObject;
		},

		getSaveSlotDisplayName: function (slotID) {
			switch (slotID) {
				case GameConstants.SAVE_SLOT_DEFAULT: return "Default";
				case GameConstants.SAVE_SLOT_BACKUP: return "Backup";
				case GameConstants.SAVE_SLOT_LOADED: return "Loaded";
				case GameConstants.SAVE_SLOT_USER_1: return "Custom #1";
				case GameConstants.SAVE_SLOT_USER_2: return "Custom #2";
				case GameConstants.SAVE_SLOT_USER_3: return "Custom #3";
			}
			log.w("Unknown save slot ID: " + slotID);
			return "";
		},

		getDateDisplayString: function (date) {
			return date.toLocaleString(navigator.language, { timeStyle: "short", dateStyle: "short" });
		},

		getSaveSystem: function () {
			return this.engine.getSystem(SaveSystem);
		},

		selectSlot: function (slotID) {
			if (!slotID) return;
			if (!slotID == this.selectedSaveSlot) return;
			this.closeExport();
			this.selectedSaveSlot = slotID;
			this.updateContainers();
			this.updateSlotDetails();
		},

		/*
		openExport: function () {
			this.resetElements();
			var saveSystem = this.getSaveSystem();
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
		*/

		openImport: function () {
			this.selectedSaveSlot = null;
			this.showImport = true;
			this.resetElements();
			this.updateTexts();
			this.updateContainers();

			GameGlobals.uiFunctions.toggle("#textarea-import-save", true);
			GameGlobals.uiFunctions.toggle("#import-save-warning", false);
			GameGlobals.uiFunctions.toggle("#import-save-msg", false);
		},
		
		closeImport: function () {
			this.selectedSaveSlot = null;
			this.showImport = false;
			this.resetElements();
			this.updateContainers();
			this.updateTexts();
			this.updateSlotList();
		},

		loadImport: function () {
			let saveSystem = this.engine.getSystem(SaveSystem);

			let importTextArea = $("#textarea-import-save");
			let importString = importTextArea.val();
			let importJSON = saveSystem.getSaveJSONfromCompressed(importString);
			let isOk = GameGlobals.saveHelper.parseSaveJSON(importJSON);
			if (isOk) {
				let sys = this;
				importTextArea.val("");
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
				GameGlobals.uiFunctions.toggle("#import-save-msg", true);
				$("#import-save-msg").text("Failed to import save.");
			}
		},

		loadState: function (importJSON) {
			let saveSystem = this.getSaveSystem();
			let data = saveSystem.getCompressedSaveJSON(importJSON);
			let success = saveSystem.saveDataToDefaultSlot(data);
			if (!success) return;
			
			GameGlobals.uiFunctions.hideGame(true);
			
			GlobalSignals.restartGameSignal.dispatch(false);
			GameGlobals.uiFunctions.showGame(true);
		},
		
		downloadExport: function () {
			let now = new Date();
			FileUtils.saveTextToFile("level13-save-" + this.selectedSaveSlot, $("#textarea-export-save").val());
		},

		saveToSelectedSlot: function () {
			let slotID = this.selectedSaveSlot;
			let saveSystem = this.getSaveSystem();
			let data = saveSystem.getCompressedSaveJSON();
			saveSystem.saveDataToSlot(slotID, data);

			this.updateSlotList();
			this.updateSlotDetails();
		},

		loadFromSelectedSlot: function () {
			let slotID = this.selectedSaveSlot;
			let saveSystem = this.getSaveSystem();
			let saveString = saveSystem.getDataFromSlot(slotID);
			let saveJSON = saveSystem.getSaveJSONfromCompressed(saveString);
			let isOk = GameGlobals.saveHelper.parseSaveJSON(saveJSON);
			if (!isOk) {
				log.w("failed to parse save loaded from selected slot");
				return;
			}

			let sys = this;
			GameGlobals.uiFunctions.popupManager.closePopup("manage-save-popup");
			GameGlobals.uiFunctions.showConfirmation(
				"Are you sure you want to load this save? Any unsaved progress will be lost.<br/><br/>" +
				"Loaded data:<br/>Save version: " + isOk.version + "<br/>" +
				"Save timestamp: " + isOk.timeStamp + "<br/>" +
				"Save world seed: " + isOk.gameState.worldSeed,
				function () {
					sys.loadState(saveJSON);
				},
				true
			);
		},

		openExport: function () {
			let slotID = this.selectedSaveSlot;
			let saveSystem = this.getSaveSystem();
			let saveString = saveSystem.getDataFromSlot(slotID);
			$("#textarea-export-save").text(saveString);

			this.showExport = true;
			this.updateContainers();
		},

		closeExport: function () {
			$("#textarea-export-save").text("");
			this.showExport = false;
			this.updateContainers();
		},

		onPopupOpened: function (popupID) {
			if (popupID === "manage-save-popup") {
				this.refresh();
			}
		},

	});
	return UIOutManageSaveSystem;
});
