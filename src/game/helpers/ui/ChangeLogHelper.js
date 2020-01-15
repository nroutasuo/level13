// Loader for the changelog.json
define(['ash', 'game/GameGlobals', 'game/GlobalSignals', 'game/constants/GameConstants'],
function (Ash, GameGlobals, GlobalSignals, GameConstants) {

    var ChangeLogHelper = Ash.Class.extend({
		
		loadingSuccesfull: undefined,
		versions: null,
        
		constructor: function () {
			var helper = this;
            $.getJSON('changelog.json', function (json) {
				helper.loadingSuccessful = true;
				helper.versions = json.versions;
                var version = helper.getCurrentVersionNumber();
                log.i("Loaded version: " + version);
                gtag('set', { 'app_version': version });
                GlobalSignals.changelogLoadedSignal.dispatch();
                helper.displayVersionWarnings();
			})
			.fail(function (jqxhr, textStatus, error) {
				helper.loadingSuccessful = false;
                helper.versions = [];
                log.w("Failed to load version.");
				var err = "";
                if (jqxhr && jqxhr.status) err += "[" + jqxhr.status + "] ";
                err += textStatus;
				if (error) err += ", " + error;
                gtag('set', { 'app_version': 'unknown' });
                helper.displayVersionWarnings();
			});
		},
        
        displayVersionWarnings: function () {
            if (GameConstants.isDebugVersion) return;
			var currentVersion = this.getCurrentVersion();
            if (!currentVersion || !currentVersion.final) {
                GameGlobals.uiFunctions.showInfoPopup(
                    "Warning",
                    "Looks like you are playing an unsupported version of Level 13.</br>Continue at your own risk or play the latest official version <a href='" + GameConstants.gameURL + "'>here</a>.",
                    "Continue"
                );
            }
        },
		
		getCurrentVersionNumber: function () {
			var currentVersion = this.getCurrentVersion();
			if (currentVersion) {
				return this.getVersionNumber(currentVersion);
			}
			return "unknown";
		},
        
        getCurrentVersionDate: function () {
			var currentVersion = this.getCurrentVersion();
			if (currentVersion) {
				return currentVersion.final ? currentVersion.released : currentVersion.updated;
			}
			return "[no time stamp]";
        },
		
		getVersionNumber: function (version) {
			return version.version + " (" + version.phase + ")";
		},
		
		getCurrentVersion: function () {
			if (!this.versions) return null;
			
			var version = null;
			var i = 0;
			while (!version && i < this.versions.length) {
				if (this.versions[i].changes.length > 0) version = this.versions[i];
				i++;
			}
			return version;
		}
	
    });
    
    return ChangeLogHelper;
});
