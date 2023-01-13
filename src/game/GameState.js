define(['ash', 'worldcreator/WorldCreatorHelper'], function (Ash, WorldCreatorHelper) {
	var GameState = Ash.Class.extend({

		constructor: function () {
			this.reset();
		},

		reset: function () {
			this.level = 0;
			this.worldSeed = 0;
			this.gameStartTimeStamp = 0;
			this.gameTime = 0; // total tick time passed
			this.playTime = 0; // total active play time - gameTime minus fast-forwarded time
			this.isPaused = false;
			this.hasCheated = false;
			this.numExceptions = 0;
			this.numCamps = 0;
			this.numVisitedSectors = 0;
			this.numUnlockedMilestones = 0;
			this.isLaunchStarted = false;
			this.isLaunched = false;
			this.isFinished = false;
			this.playedVersions = [];

			this.unlockedFeatures = {
				scavenge: false,
				scout: false,
				vision: false,
				camp: false,
				fight: false,
				followers: false,
				investigate: false,
				bag: false,
				upgrades: false,
				projects: false,
				blueprints: false,
				resources: {
					food: false,
					water: false,
					metal: false,
					rope: false,
					herbs: false,
					fuel: false,
					rubber: false,
					medicine: false,
					tools: false,
					concrete: false,
				},
				sectors: false,
				levels: false,
				trade: false,
				followers: false,
				favour: false,
				evidence: false,
				currency: false,
				workerAutoAssignment: false,
			};

			this.uiStatus = {
				mouseDown: false,
				currentTab: null,
				mapVisited: false,
				isHidden: false,
				isBlocked: false,
				isInCamp: false,
				hiddenProjects: [],
				leaveCampRes: {},
				leaveCampItems: {},
				lastSelection: {},
			};
			
			this.settings = {
				
			};

			this.uiBagStatus = {
				itemsOwnedSeen: [],
				itemsUsableSeen: [],
				itemsCraftableUnlockedSeen: [],
				itemsCraftableAvailableSeen: []
			},

			this.foundTradingPartners = []; // camp ordinals
			this.foundLuxuryResources = [];

			this.actionCooldownEndTimestamps = {};
			this.actionDurationEndTimestamps = {};
			
			this.pendingUpdateTime = 0;
			this.extraUpdateTime = 0;
		},

		syncData: function () {
			// remove duplicates / old values
						
			let partners = this.foundTradingPartners;
			this.foundTradingPartners = [];
			for (let campOrdinal = 1; campOrdinal < 15; campOrdinal++) {
				if (partners.indexOf(campOrdinal) >= 0) {
					this.foundTradingPartners.push(campOrdinal);
				}
			}
			
			if (!this.uiStatus.lastSelection) this.uiStatus.lastSelection = {};
		},

		passTime: function (seconds) {
			this.extraUpdateTime = seconds;
			var cooldownkeys = Object.keys(this.actionCooldownEndTimestamps);
			for (let i = 0; i < cooldownkeys.length; i++) {
				this.actionCooldownEndTimestamps[cooldownkeys[i]] = this.actionCooldownEndTimestamps[cooldownkeys[i]] - seconds * 1000;
			}
		},
		
		savePlayedVersion: function (version) {
			if (this.playedVersions.indexOf(version) < 0) {
				this.playedVersions.push(version);
			}
			log.i("played versions: " + this.playedVersions.join(","));
		},

		getLevelOrdinal: function (level) {
			return WorldCreatorHelper.getLevelOrdinal(this.worldSeed, level);
		},

		getLevelForOrdinal: function (levelOrdinal) {
			return WorldCreatorHelper.getLevelForOrdinal(this.worldSeed, levelOrdinal);
		},

		getCampOrdinal: function (level) {
			return WorldCreatorHelper.getCampOrdinal(this.worldSeed, level);
		},
		
		getCampOrdinalForLevelOrdinal: function (levelOrdinal) {
			let level = this.getLevelForOrdinal(levelOrdinal);
			return this.getCampOrdinal(level);
		},
		
		getLevelsForCamp: function (campOrdinal) {
			return WorldCreatorHelper.getLevelsForCamp(this.worldSeed, campOrdinal);
		},
		
		getLevelForCamp: function (campOrdinal) {
			let levelOrdinal = this.getLevelOrdinalForCampOrdinal(campOrdinal);
			return this.getLevelForOrdinal(levelOrdinal);
		},

		getLevelOrdinalForCampOrdinal: function (campOrdinal) {
			return WorldCreatorHelper.getLevelOrdinalForCampOrdinal(this.worldSeed, campOrdinal);
		},
		
		getLevelIndex: function (level) {
			var campOrdinal = this.getCampOrdinal(level);
			return WorldCreatorHelper.getLevelIndexForCamp(this.worldSeed, campOrdinal, level);
		},
		
		getMaxLevelIndex: function (level) {
			var campOrdinal = this.getCampOrdinal(level);
			return WorldCreatorHelper.getMaxLevelIndexForCamp(this.worldSeed, campOrdinal, level);
		},

		getTotalLevels: function () {
			return WorldCreatorHelper.getHighestLevel(this.worldSeed) - WorldCreatorHelper.getBottomLevel(this.worldSeed) + 1;
		},

		getGroundLevel: function () {
			return WorldCreatorHelper.getBottomLevel(this.worldSeed);
		},

		getGroundLevelOrdinal: function () {
			return WorldCreatorHelper.getLevelOrdinal(this.worldSeed, WorldCreatorHelper.getBottomLevel(this.worldSeed));
		},

		getSurfaceLevel: function () {
			return WorldCreatorHelper.getHighestLevel(this.worldSeed);
		},

		getSurfaceLevelOrdinal: function () {
			return WorldCreatorHelper.getLevelOrdinal(this.worldSeed, WorldCreatorHelper.getHighestLevel(this.worldSeed));
		},

		setActionCooldown: function (action, key, cooldown) {
			this.pruneActionCooldowns();
			var actionKey = action;
			if (key.length > 0) actionKey += "-" + key;
			this.actionCooldownEndTimestamps[actionKey] = new Date().getTime() + cooldown * 1000;
		},

		getActionCooldown: function (action, key, max) {
			var actionKey = action;
			if (key.length > 0) actionKey += "-" + key;
			var timestamp = this.actionCooldownEndTimestamps[actionKey];
			if (timestamp) {
				var now = new Date().getTime();
				var diff = (timestamp - now) / 1000;
				if (diff > 0) {
					if (max && diff > max) {
						log.w("fix action cooldown: " + diff + " -> " + max);
						this.actionCooldownEndTimestamps[actionKey] = now + max;
					}
					return timestamp - now;
				}
			}
			return 0;
		},

		pruneActionCooldowns: function () {
			var cooldownkeys = Object.keys(this.actionCooldownEndTimestamps);
			if (cooldownkeys.length < 10) return;
			var now = new Date().getTime();
			for (let i = 0; i < cooldownkeys.length; i++) {
				var key = cooldownkeys[i];
				var timestamp = this.actionCooldownEndTimestamps[key];
				var diff = timestamp - now;
				if (diff < -30) delete this.actionCooldownEndTimestamps[key];
			}
		},

		setActionDuration: function (action, key, duration) {
			var actionKey = action;
			if (key.length > 0) actionKey += "-" + key;
			this.actionDurationEndTimestamps[actionKey] = new Date().getTime() + duration * 1000;
		},

		getActionDuration: function (action, key, max) {
			var actionKey = action;
			if (key.length > 0) actionKey += "-" + key;
			var timestamp = this.actionDurationEndTimestamps[actionKey];
			if (timestamp) {
				var now = new Date().getTime();
				var diff = timestamp - now;
				if (diff > 0) {
					if (max && diff > max) {
						log.w("fix action duration: " + diff + " -> " + max);
						this.actionDurationEndTimestamps[actionKey] = now + max;
					}
					return timestamp - now;
				}
			}
			return 0;
		},

		getActionLocationKey: function (isLocationAction, playerPos) {
			var locationKey = "";
			if (isLocationAction) locationKey = playerPos.level + "-" + playerPos.sectorId();
			return locationKey;
		}

	});

	return GameState;
});
