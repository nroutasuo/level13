define([
	'ash',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
], function (Ash, UIList, GameGlobals, GlobalSignals) {
	
    let UIOutMetaPopupsSystem = Ash.System.extend({

		constructor: function () {
            this.initElements();
			return this;
		},

		addToEngine: function (engine) {
			GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
			GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
		},

        initElements: function () {
            this.settingsPopupHotkeysList = UIList.create(this, $("#hotkeys-list"), this.createHotkeyListItem, this.updateHotkeyListItem, this.isHotkeyListItemDataEqual);

            let sys = this;
			$("#settings-checkbox-hotkeys-enabled").change(() => sys.onSettingToggled());
			$("#settings-checkbox-hotkeys-numpad").change(() => sys.onSettingToggled());
        },

        refreshSettingsPopup: function () {
            console.log(GameGlobals.gameState.settings);
            this.updateSettingsValues();
            this.updateHotkeyList();
        },

        updateSettingsValues: function () {
            $("#settings-checkbox-hotkeys-enabled").prop("checked", GameGlobals.gameState.settings.hotkeysEnabled);
            $("#settings-checkbox-hotkeys-numpad").prop("checked", GameGlobals.gameState.settings.hotkeysNumpad);

            $("#settings-checkbox-hotkeys-numpad").parent().find("input").prop('disabled', !GameGlobals.gameState.settings.hotkeysEnabled);
            $("#settings-checkbox-hotkeys-numpad").parent().toggleClass("dimmed", !GameGlobals.gameState.settings.hotkeysEnabled);
        },
        
        updateHotkeyList: function () {
            let hotkeyEntries = [];
            for (let code in GameGlobals.uiFunctions.hotkeys) {
                for (let i = 0; i < GameGlobals.uiFunctions.hotkeys[code].length; i++) {
                    let hotkey = GameGlobals.uiFunctions.hotkeys[code][i];
					if (hotkey.activeCondition && !hotkey.activeCondition()) continue;
                    if (hotkey.isUniversal) continue;
                    let modifier = GameGlobals.uiFunctions.getActualHotkeyModifier(hotkey.modifier);
                    let hotkeyValue = "";
                    if (modifier) hotkeyValue += modifier + " + ";
                    hotkeyValue += hotkey.displayKey;
                    let displayName = hotkey.description;
                    let isDisabled = !GameGlobals.gameState.settings.hotkeysEnabled;
                    hotkeyEntries.push({ displayName: displayName, value: hotkeyValue, isDisabled: isDisabled });
                }
            }
			UIList.update(this.settingsPopupHotkeysList, hotkeyEntries);
        },

        createHotkeyListItem: function () {
			let li = {};
			let div = "<div class='hotkey-list-item'><span class='hotkey-list-item-label'/><span class='hotkey-list-item-value'></div>";
			li.$root = $(div);
			li.$label = li.$root.find("span.hotkey-list-item-label");
			li.$value = li.$root.find("span.hotkey-list-item-value");
			return li;
        },

        updateHotkeyListItem: function (li, data) {
            li.$root.toggleClass("dimmed", data.isDisabled);
			li.$label.html(data.displayName);
			li.$value.html(data.value);
        },

        isHotkeyListItemDataEqual: function (d1, d2) {
            return d1.displayName == d2.displayName && d1.value == d2.value && d1.isDisabled == d2.isDisabled;
        },

        saveSettings: function () {
            GameGlobals.gameState.settings.hotkeysEnabled = $("#settings-checkbox-hotkeys-enabled").is(':checked');
            GameGlobals.gameState.settings.hotkeysNumpad = $("#settings-checkbox-hotkeys-numpad").is(':checked');
        },

        onSettingToggled: function () {
            this.saveSettings();
            this.updateSettingsValues();
            this.updateHotkeyList();
        },

		onPopupOpened: function (popupID) {
			if (popupID === "settings-popup") {
				this.refreshSettingsPopup();
			}
		},

        onPopupClosed: function (popupID) {
			if (popupID === "settings-popup") {
				this.saveSettings();
                GameGlobals.uiFunctions.updateHotkeyHints();
                GlobalSignals.settingsChangedSignal.dispatch();
			}
        }


	});

	return UIOutMetaPopupsSystem;
});
