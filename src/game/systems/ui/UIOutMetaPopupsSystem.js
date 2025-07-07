define([
	'ash',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
], function (Ash, UIList, GameGlobals, GlobalSignals, GameConstants) {
	
    let UIOutMetaPopupsSystem = Ash.System.extend({

        metaMessages: [],

		constructor: function () {
            this.showLanguageSelection = GameConstants.isDebugVersion;
            this.initElements();
			return this;
		},

		addToEngine: function (engine) {
			GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
			GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.onPopupClosed);
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
		},

        initElements: function () {
            this.settingsPopupHotkeysList = UIList.create(this, $("#hotkeys-list"), this.createHotkeyListItem, this.updateHotkeyListItem, this.isHotkeyListItemDataSame);

            let sys = this;
			$("#settings-checkbox-sfx-enabled").change(() => sys.onSettingToggled());
			$("#settings-checkbox-hotkeys-enabled").change(() => sys.onSettingToggled());
			$("#settings-checkbox-hotkeys-numpad").change(() => sys.onSettingToggled());

            let languageOptions = "";
            for (var key in GameGlobals.textLoader.textSources) {
                if (key == "default") continue;
                let source = GameGlobals.textLoader.textSources[key];
                languageOptions += "<option value='" + key + "' id='language-dropdown-option-" + key + "'>" + source.name + "</option>";
            }

            $("#language-dropdown").append(languageOptions);
        },

        loadMetaMessages: function () {
			let sys = this;
			$.getJSON('messages.json', function (json) {
				sys.metaMessages = json.messages;
                sys.onMetaMessagesLoaded();
			})
			.fail(function () {
                log.w("Failed to load meta messages");
			});
        },

        showUnseenMetaMessages: function () {
            GameGlobals.metaState.seenMetaMessages = GameGlobals.metaState.seenMetaMessages || [];

            let maxCampOrdinalReached = GameGlobals.metaState.maxCampOrdinalReached || 0;
            
            for (let i = 0; i < this.metaMessages.length; i++) {
                let message = this.metaMessages[i];
                let id = message.id;
                if (!id) continue;
                if (GameGlobals.metaState.seenMetaMessages.indexOf(id) >= 0) continue;

                if (message.conditions) {
                    if (message.conditions.campOrdinalReached && maxCampOrdinalReached < message.conditions.campOrdinalReached) continue;
                }

                if (message.expires) {
                    let expires = new Date(message.expires).getTime();
                    if (expires < Date.now()) continue;
                }

                this.showMetaMessage(message);
                GameGlobals.metaState.seenMetaMessages.push(id);
                return;
            }
        },

        showMetaMessage: function (message) {
            let text = message.text;
            if (!text) return;
            GameGlobals.uiFunctions.showInfoPopup("System Message", text, "Continue");
        },

        refreshSettingsPopup: function () {
            this.updateSettingsValues();
            this.updateHotkeyList();
        },

        updateSettingsValues: function () {
            $("#settings-checkbox-sfx-enabled").prop("checked", GameGlobals.gameState.settings.sfxEnabled);
            $("#settings-checkbox-hotkeys-enabled").prop("checked", GameGlobals.gameState.settings.hotkeysEnabled);
            $("#settings-checkbox-hotkeys-numpad").prop("checked", GameGlobals.gameState.settings.hotkeysNumpad);

            $("#settings-checkbox-hotkeys-numpad").parent().find("input").prop('disabled', !GameGlobals.gameState.settings.hotkeysEnabled);
            $("#settings-checkbox-hotkeys-numpad").parent().toggleClass("dimmed", !GameGlobals.gameState.settings.hotkeysEnabled);
            
            GameGlobals.uiFunctions.toggle($("#language-selection"), this.showLanguageSelection);
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
                    let isDev = hotkey.isDev;
                    let displayName = hotkey.description;
                    let isDisabled = !GameGlobals.gameState.settings.hotkeysEnabled;
                    hotkeyEntries.push({ displayName: displayName, value: hotkeyValue, isDisabled: isDisabled, isDev: isDev });
                }
            }
			UIList.update(this.settingsPopupHotkeysList, hotkeyEntries);
        },

        createHotkeyListItem: function () {
			let li = {};
			let div = "<div class='hotkey-list-item'><span class='hotkey-list-item-label'></span><span class='hotkey-list-item-value'></span></div>";
			li.$root = $(div);
			li.$label = li.$root.find("span.hotkey-list-item-label");
			li.$value = li.$root.find("span.hotkey-list-item-value");
			return li;
        },

        updateHotkeyListItem: function (li, data) {
            li.$root.toggleClass("dimmed", data.isDisabled);
            li.$root.toggleClass("debug-info", data.isDev);
			li.$label.html(data.displayName);
			li.$value.html(data.value);
        },

        isHotkeyListItemDataSame: function (d1, d2) {
            return d1.displayName == d2.displayName && d1.value == d2.value && d1.isDisabled == d2.isDisabled;
        },

        saveSettings: function () {
            GameGlobals.gameState.settings.sfxEnabled = $("#settings-checkbox-sfx-enabled").is(':checked');
            GameGlobals.gameState.settings.hotkeysEnabled = $("#settings-checkbox-hotkeys-enabled").is(':checked');
            GameGlobals.gameState.settings.hotkeysNumpad = $("#settings-checkbox-hotkeys-numpad").is(':checked');
        
            let language = this.getSelectedValidLanguage();
            if (language) {
                GameGlobals.metaState.settings.language = language;
            }
        },

        getSelectedValidLanguage: function () {
            if (!this.showLanguageSelection) return null;
            let language = $("#language-dropdown").val();
            return GameGlobals.textLoader.isSupportedLanguage(language) ? language : null;
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
        },

        onGameShown: function () {
            this.loadMetaMessages();
        },

        onMetaMessagesLoaded: function () {
            this.showUnseenMetaMessages();
        },


	});

	return UIOutMetaPopupsSystem;
});
