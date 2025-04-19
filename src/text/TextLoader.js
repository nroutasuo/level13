define(['ash', 'text/Text', 'game/GameGlobals', 'game/GlobalSignals', 'game/constants/GameConstants'],
    function (Ash, Text, GameGlobals, GlobalSignals, GameConstants) {
    
        let TextLoader = Ash.Class.extend({
            
            constructor: function () { },

            textSources: {
                default: { language: "default", source: "strings/strings.json", name: "Default" },
                EN_GB: { language: "EN_GB", source: "strings/strings.json", name: "English" },
                FI_FI: { language: "FI_FI", source: "strings/strings-fi.json", name: "suomi" },
            },
    
            isSupportedLanguage: function (language) {
                return Object.keys(this.textSources).indexOf(language) >= 0;
            },

            loadTexts: function () {
                return Promise.all([ this.loadDefaultTexts(), this.loadCurrentLanguageTexts() ]);
            },
    
            loadDefaultTexts: function () {
                let sys = this;
                return new Promise((resolve, reject) => {
                    if (Text.hasDefaultTexts()) {
                        resolve();
                        return;
                    }
    
                    resolve(sys.loadTextsFile(sys.textSources.default));
                });
            },
    
            loadCurrentLanguageTexts: function () {
                let sys = this;
    
                return new Promise((resolve, reject) => {
                    let language = null;
                    
                    if (GameGlobals.metaState.settings && GameGlobals.metaState.settings.language) {
                        language = GameGlobals.metaState.settings.language;
                    }

                    if (!language) {
                        resolve();
                        return;
                    }

                    if (Text.hasCurrentLanguage(language)) {
                        resolve();
                        return;
                    }
    
                    if (!sys.isSupportedLanguage(language)) {
                        reject();
                        return;
                    }
    
                    resolve(sys.loadTextsFile(sys.textSources[language]));
                });
            },
    
            loadTextsFile: function (source) {
                return new Promise((resolve, reject) => {
                    var url = source.source;
                    log.i("Loading texts: " + url);
                    if (GameConstants.isDebugVersion) $.ajaxSetup({ cache: false });
                    $.getJSON(url, function (json) {
                        Text.setTexts(source.language, json);
                        resolve();
                    })
                    .fail(function (jqxhr, textStatus, error) {
                        log.e("Failed to load texts: " + error);
                        reject();
                    });
                });
            },
        
        });
        
        return TextLoader;
    });
    