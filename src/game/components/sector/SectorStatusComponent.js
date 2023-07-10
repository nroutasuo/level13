// Current sector control status & wins needed
define(['ash', 'game/constants/MovementConstants'], function (Ash, MovementConstants) {

	var SectorStatusComponent = Ash.Class.extend({
		
		NUM_SCAVENGES_PER_SECTOR: 30,
		NUM_INVESTIGATES_PER_SECTOR: 3,

		discoveredResources: [],
		discoveredItems: [],
		scavenged: false,
		investigated: false,
		scouted: false,
		revealedByMap: false,
		pendingRevealByMap: false,
		localesScouted: [],
		wasteClearedDirections: [],
		debrisClearedDirections: [],
		gapBridgedDirections: [],
		weightedNumScavenges: 0,
		weightedNumInvestigates: 0,
		stashesFound: 0,
		graffiti: null,
		isFallbackInvestigateSector: false,
		
		scoutedTimestamp: 0,
		
		glowStickSeconds: -100, // not saved
		hazardReduction: null, // not saved

		constructor: function () {
			this.discoveredResources = [];
			this.discoveredItems = [];
			this.scavenged = false;
			this.investigated = false;
			this.scouted = false;
			this.revealedByMap = false;
			this.pendingRevealByMap = false;
			this.localesScouted = [];
			this.wasteClearedDirections = [];
			this.debrisClearedDirections = [];
			this.gapBridgedDirections = [];
			this.weightedNumScavenges = 0;
			this.weightedNumInvestigates = 0;
			this.stashesFound = 0;
			this.graffiti = null;
			this.isFallbackInvestigateSector = false;
			
			this.hazardReduction = {};
			this.glowStickSeconds = -100;
		},

		addDiscoveredResource: function (name) {
			if (this.discoveredResources.indexOf(name) < 0) {
				this.discoveredResources.push(name);
			}
		},
		
		addDiscoveredItem: function (id) {
			if (this.discoveredItems.indexOf(id) < 0) {
				this.discoveredItems.push(id);
			}
		},
		
		hasDiscoveredItem: function (id) {
			return this.discoveredItems.indexOf(id) >= 0;
		},

		isLocaleScouted: function (i) {
			if (!this.localesScouted[i]) return false;
			return this.localesScouted[i];
		},

		getNumLocalesScouted: function () {
			var scouted = 0;
			for (let i = 0; i < this.localesScouted.length; i++) {
				if (this.localesScouted[i]) scouted++;
			}
			return scouted;
		},
		
		getScavengedPercent: function () {
			return Math.min(this.weightedNumScavenges / this.NUM_SCAVENGES_PER_SECTOR, 1) * 100;
		},
		
		getInvestigatedPercent: function (addition) {
			addition = addition || 0;
			return Math.min((this.weightedNumInvestigates + addition) / this.NUM_INVESTIGATES_PER_SECTOR, 1) * 100;
		},
		
		getHazardReduction: function (hazard) {
			if (!this.hazardReduction)
				return 0;
			if (!this.hazardReduction[hazard])
				return 0;
			return this.hazardReduction[hazard];
		},

		isBlockerCleared: function (direction, blockerType) {
			if (blockerType == MovementConstants.BLOCKER_TYPE_WASTE_TOXIC || blockerType == MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE) {
				return this.wasteClearedDirections && this.wasteClearedDirections.indexOf(parseInt(direction)) >= 0;
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_DEBRIS) {
				return this.debrisClearedDirections && this.debrisClearedDirections.indexOf(parseInt(direction)) >= 0;
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_GAP) {
				return this.gapBridgedDirections && this.gapBridgedDirections.indexOf(parseInt(direction)) >= 0;
			}
			return false;
		},

		setBlockerCleared: function (direction, blockerType) {
			if (this.isBlockerCleared(direction, blockerType))
				return;
			if (blockerType == MovementConstants.BLOCKER_TYPE_WASTE_TOXIC || blockerType == MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE) {
				this.wasteClearedDirections.push(parseInt(direction));
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_DEBRIS) {
				this.debrisClearedDirections.push(parseInt(direction));
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_GAP) {
				this.gapBridgedDirections.push(parseInt(direction));
			}
		},

		getSaveKey: function () {
			return "ScStatus";
		},

		getCustomSaveObject: function () {
			var copy = {};
			if (this.discoveredResources.length > 0)
				copy.dR = this.discoveredResources;
			if (this.discoveredItems.length > 0)
				copy.dI = this.discoveredItems;
			if (this.scavenged)
				copy.sc = this.scavenged ? 1 : 0;
			if (this.investigated)
				copy.i = this.investigated ? 1 : 0;
			if (this.scouted) {
				copy.s = this.scouted ? 1 : 0;
				copy.st = this.scoutedTimestamp ? Math.round(this.scoutedTimestamp) : 1;
			}
			if (this.revealedByMap && !this.scouted) {
				copy.rm = this.revealedByMap;
			}
			if (this.pendingRevealByMap && !this.scouted) {
				copy.prm = this.pendingRevealByMap;
			}
			if (this.localesScouted.length > 0)
				copy.lS = this.localesScouted;
			if (this.wasteClearedDirections && this.wasteClearedDirections.length > 0)
				copy.wd = this.wasteClearedDirections;
			if (this.debrisClearedDirections && this.debrisClearedDirections.length > 0)
				copy.dd = this.debrisClearedDirections;
			if (this.gapBridgedDirections && this.gapBridgedDirections.length > 0)
				copy.bd = this.gapBridgedDirections;
			if (this.weightedNumScavenges)
				copy.sw = Math.round(this.weightedNumScavenges * 1000)/1000;
			if (this.weightedNumInvestigates)
				copy.iw = Math.round(this.weightedNumInvestigates * 1000)/1000;
			if (this.stashesFound)
				copy.sf = this.stashesFound;
			if (this.graffiti)
				copy.g = this.graffiti;
			if (this.isFallbackInvestigateSector)
				copy.fis = true;
			return Object.keys(copy).length > 0 ? copy : null;
		},

		customLoadFromSave: function (componentValues) {
			this.discoveredResources = componentValues.dR ? componentValues.dR : [];
			this.discoveredItems = componentValues.dI ? componentValues.dI : [];
			this.scavenged = typeof componentValues.sc !== "undefined" ? componentValues.sc : false;
			this.investigated = typeof componentValues.i !== "undefined" ? componentValues.i : false;
			this.scouted = typeof componentValues.s !== "undefined" ? componentValues.s : false;
			this.revealedByMap = typeof componentValues.rm !== "undefined" ? componentValues.rm : false;
			this.pendingRevealByMap = typeof componentValues.prm !== "undefined" ? componentValues.prm : false;
			this.scoutedTimestamp = typeof componentValues.st !== "undefined" ? componentValues.st : this.scouted ? 1 : null;
			if (componentValues.lS && componentValues.lS.length > 0)
				this.localesScouted = componentValues.lS;
			else
				this.localesScouted = [];
			this.wasteClearedDirections = componentValues.wd ? componentValues.wd : [];
			this.debrisClearedDirections = componentValues.dd ? componentValues.dd : [];
			this.gapBridgedDirections = componentValues.bd ? componentValues.bd : [];
			this.weightedNumScavenges = componentValues.sw ? componentValues.sw : 0;
			this.weightedNumInvestigates = componentValues.iw ? componentValues.iw : 0;
			this.stashesFound = componentValues.sf ? componentValues.sf : 0;
			this.graffiti = componentValues.g ? componentValues.g : null;
			this.isFallbackInvestigateSector = componentValues.fis ? true : false;
		}

	});

	return SectorStatusComponent;
});
