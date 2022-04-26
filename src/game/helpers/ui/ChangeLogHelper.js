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
				GlobalSignals.changelogLoadedSignal.dispatch(true);
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
				GlobalSignals.changelogLoadedSignal.dispatch(false);
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
			let i = 0;
			while (!version && i < this.versions.length) {
				if (this.versions[i].changes.length > 0) version = this.versions[i];
				i++;
			}
			return version;
		},
		
		getVersion: function (version) {
			for (let i = 0; i < this.versions.legnth; i++) {
				if (this.versions[i].version == version) {
					return this.versions[i];
				}
			}
			return null;
		},
		
		getVersionDigits: function (version) {
			var parts1 = version.split(" ");
			var parts2 = parts1[0].split(".");
			return { major: parts2[0], minor: parts2[1], patch: parts2[2] };
		},
		
		isOldVersion: function (version) {
			var currentVersionNumber = this.getCurrentVersionNumber();
			var currentVersionDetails = this.getCurrentVersion();
			var requiredVersion = currentVersionDetails && currentVersionDetails.requiredVersion || currentVersionNumber;
			var requiredVersionDigits = this.getVersionDigits(requiredVersion);
			var compareVersionDigits = this.getVersionDigits(version);
			
			log.i("isOldVersion? " + version + ", current: " + currentVersionNumber + ", required: " + requiredVersion);
			if (!requiredVersionDigits) return false;
			if (!compareVersionDigits) return false;
			return compareVersionDigits.major < requiredVersionDigits.major || compareVersionDigits.minor < requiredVersionDigits.minor || compareVersionDigits.patch < requiredVersionDigits.patch;
		},
	
	});
	
	return ChangeLogHelper;
});
