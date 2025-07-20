define([
	'ash',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/UIConstants',
	'game/GlobalSignals'
], function (Ash, GameGlobals, GameConstants, PlayerActionConstants, UIConstants, GlobalSignals) {
	
    let UIOutAudioSystem = Ash.System.extend({

		context: "audio",

		elements: {},

		previousSound: null,

		soundTimestamps: {}, // triggerID -> timestamp

		constructor: function () {
			return this;
		},

		addToEngine: function (engine) {
			GlobalSignals.add(this, GlobalSignals.pageSetUpSignal, this.onPageSetup)
			GlobalSignals.add(this, GlobalSignals.settingsChangedSignal, this.onSettingsChanged);

			GlobalSignals.add(this, GlobalSignals.triggerSoundSignal, this.onTriggerSound);

			GlobalSignals.add(this, GlobalSignals.actionStartingSignal, this.onActionStarted);
			GlobalSignals.add(this, GlobalSignals.actionCompletedSignal, () => this.triggerSound(UIConstants.soundTriggerIDs.actionCompleted));
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
		},

		initElements: function () {
			this.elements = {};
			this.elements[UIConstants.soundTriggerIDs.actionStarted] = $("#audio-action-started");
			this.elements[UIConstants.soundTriggerIDs.actionCompleted] = $("#audio-action-completed");
			this.elements[UIConstants.soundTriggerIDs.buttonClicked] = $("#audio-button-clicked");
			this.elements[UIConstants.soundTriggerIDs.moveTransition] = $("#audio-moved-camp");
			this.elements[UIConstants.soundTriggerIDs.moveNormal] = $("#audio-moved");
			this.elements[UIConstants.soundTriggerIDs.logMessage] = $("#audio-notification");
			this.elements[UIConstants.soundTriggerIDs.openPopup] = $("#audio-popup-opened");
			this.elements[UIConstants.soundTriggerIDs.closePopup] = $("#audio-popup-closed");

			this.audios = {};
			this.paths = {};

			for (let key in this.elements) {
				let path = this.elements[key].find("source").attr("src");
				this.paths[key] = path;
				this.audios[key] = new Audio(path);
			}
		},

		triggerSound: function (soundTriggerID, delay) {
			let $soundElement = this.getSoundElement(soundTriggerID);

			if (!$soundElement || $soundElement.length === 0) {
				log.w("triggered sound but audio element not found: " + soundTriggerID, this);
				return;
			}
			
			let sfxEnabled = GameGlobals.gameState.settings.sfxEnabled;
			if (!sfxEnabled) {
				log.i("triggered sound but sfx are disabled: " + soundTriggerID, this);
				return;
			}

			delay = delay || 0;
			
			log.i("play sound: " + soundTriggerID + ", delay: " + delay, this);

			if (this.previousSound) {
				this.previousSound.pause();
			}

			setTimeout(() => {
				if (GameGlobals.gameState.uiStatus.isHidden) {
					if (GameConstants.isDebugVersion) log.w("skip sound because game is hidden", this);
					return;
				}
				
				let playTimestamp = new Date().getTime();
				let previousPlayTimestamp = this.soundTimestamps[soundTriggerID] || 0;
				if (playTimestamp - previousPlayTimestamp < 300) {
					if (GameConstants.isDebugVersion) log.w("skip sound due to repetition: " + soundTriggerID, this);
					return;
				}

				let audio = new Audio(this.paths[soundTriggerID]);

				audio.play().catch(e => {
					log.w("failed to play audio: " + soundTriggerID + " | " + e, this);
				});

				this.previousSound = audio;
				this.soundTimestamps[soundTriggerID] = playTimestamp;
			}, delay);
		},

		getSoundElement: function (soundTriggerID) {
			return this.elements[soundTriggerID];
		},

		onTriggerSound: function (soundTriggerID, delay) {
			this.triggerSound(soundTriggerID, delay || 0);
		},

		onActionStarted: function (action) {
			let duration = PlayerActionConstants.getDuration(action);
			if (duration <= 0) return;
			this.triggerSound(UIConstants.soundTriggerIDs.actionStarted)
		},

		onPageSetup: function () {
			this.initElements();
		},

		onSettingsChanged: function () {
			
		},

	});

	return UIOutAudioSystem;
});
