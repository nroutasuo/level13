// Current sector control status & wins needed
define(['ash', 'game/constants/MovementConstants'], function (Ash, MovementConstants) {

	let SectorStatusComponent = Ash.Class.extend({
		
		NUM_SCAVENGES_PER_SECTOR: 30,
		NUM_HEAP_SCAVENGES_PER_SECTOR: 5,
		NUM_INVESTIGATES_PER_LOCALE: 3,

		discoveredResources: [],
		discoveredItems: [],
		visited: false,
		scavenged: false,
		scouted: false,
		revealedByMap: false,
		pendingRevealByMap: false,
		localesScouted: [], // locale index -> true
		localesInvestigated: [], // locale index -> float (weighted times investigated)
		wasteClearedDirections: [],
		blockerClearedDirections: [], // debris, explosives
		blockerDisabledDirections: [], // alternative way to disable a blocker (currently only toll gate)
		gapBridgedDirections: [],
		weightedNumScavenges: 0,
		weightedNumHeapScavenges: 0,
		stashesFound: [], // list of indices
		graffiti: null,
		
		scoutedTimestamp: 0, // seconds (DEPRECATED - See LevelStatusSystem)

		currentCharacters: [], // CharacterVO
		
		glowStickSeconds: -100, // not saved
		hazardReduction: null, // not saved

		constructor: function () {
			this.discoveredResources = [];
			this.discoveredItems = [];
			this.visited = false;
			this.scavenged = false;
			this.scouted = false;
			this.revealedByMap = false;
			this.pendingRevealByMap = false;
			this.localesScouted = [];
			this.localesInvestigated = [];
			this.wasteClearedDirections = [];
			this.blockerClearedDirections = [];
			this.blockerDisabledDirections = [];
			this.gapBridgedDirections = [];
			this.weightedNumScavenges = 0;
			this.weightedNumHeapScavenges = 0;
			this.stashesFound = [];
			this.graffiti = null;

			this.currentCharacters = [];
			
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
		
		getScavengedPercent: function (addition) {
			addition = addition || 0;
			return Math.min((this.weightedNumScavenges + addition) / this.NUM_SCAVENGES_PER_SECTOR, 1) * 100;
		},

		getInvestigatedPercent: function (localei, addition) {
			addition = addition || 0;
			let value = this.localesInvestigated[localei] || 0;
			return Math.min((value + addition) / this.NUM_INVESTIGATES_PER_LOCALE, 1) * 100;
		},

		isLocaleInvestigated: function (localei, addition) {
			return this.getInvestigatedPercent(localei, addition) >= 100;
		},
		
		getHeapScavengedPercent: function (addition) {
			addition = addition || 0;
			return Math.min((this.weightedNumHeapScavenges + addition) / this.NUM_HEAP_SCAVENGES_PER_SECTOR, 1) * 100;
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
				return this.blockerClearedDirections && this.blockerClearedDirections.indexOf(parseInt(direction)) >= 0;
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_EXPLOSIVES) {
				return this.blockerClearedDirections && this.blockerClearedDirections.indexOf(parseInt(direction)) >= 0;
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
				this.blockerClearedDirections.push(parseInt(direction));
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_EXPLOSIVES) {
				this.blockerClearedDirections.push(parseInt(direction));
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_GAP) {
				this.gapBridgedDirections.push(parseInt(direction));
			}
			if (blockerType == MovementConstants.BLOCKER_TYPE_TOLL_GATE) {
				this.blockerClearedDirections.push(parseInt(direction));
			}
		},

		unsetBlockerCleared: function (direction, blockerType) {
			if (blockerType == MovementConstants.BLOCKER_TYPE_TOLL_GATE) {
				let index = this.blockerClearedDirections.indexOf(direction);
				if (index >= 0) {
					this.blockerClearedDirections.splice(index, 1);
				}
			}
		},

		isBlockerDisabled: function (direction, blockerType) {
			return this.blockerDisabledDirections && this.blockerDisabledDirections.indexOf(parseInt(direction)) >= 0;
		},

		setBlockerDisabled: function (direction, blockerType) {
			if (this.isBlockerDisabled(direction, blockerType)) {
				return;
			}

			if (blockerType == MovementConstants.BLOCKER_TYPE_TOLL_GATE) {
				this.blockerDisabledDirections.push(parseInt(direction));
			}
		},

		getSaveKey: function () {
			return "ScS";
		},

		getOldSaveKey: function () {
			return "ScStatus";
		},

		getCustomSaveObject: function () {
			var copy = {};

			if (this.discoveredResources.length > 0)
				copy.dR = this.discoveredResources;
			if (this.discoveredItems.length > 0)
				copy.dI = this.discoveredItems;
			if (this.visited && !this.scouted && !this.scavenged) 
				copy.v = this.visited ? 1 : 0;
			if (this.scavenged && !this.weightedNumScavenges)
				copy.sc = this.scavenged ? 1 : 0;
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
			if (this.localesInvestigated.length > 0)
				copy.lI = this.localesInvestigated;
			if (this.wasteClearedDirections && this.wasteClearedDirections.length > 0)
				copy.wd = this.wasteClearedDirections;
			if (this.blockerClearedDirections && this.blockerClearedDirections.length > 0)
				copy.dd = this.blockerClearedDirections;
			if (this.blockerDisabledDirections && this.blockerDisabledDirections.length > 0)
				copy.ddd = this.blockerDisabledDirections;
			if (this.gapBridgedDirections && this.gapBridgedDirections.length > 0)
				copy.bd = this.gapBridgedDirections;
			if (this.weightedNumScavenges)
				copy.sw = Math.round(this.weightedNumScavenges * 100)/100;
			if (this.weightedNumHeapScavenges)
				copy.shw = Math.round(this.weightedNumHeapScavenges * 1000)/1000;
			if (this.stashesFound && this.stashesFound.length > 0)
				copy.sf = this.stashesFound;
			if (this.graffiti)
				copy.g = this.graffiti;
			if (this.currentCharacters.length > 0)
				copy.char = this.currentCharacters;
			
			return Object.keys(copy).length > 0 ? copy : null;
		},

		customLoadFromSave: function (componentValues) {
			this.discoveredResources = componentValues.dR ? componentValues.dR : [];
			this.discoveredItems = componentValues.dI ? componentValues.dI : [];
			this.visited = typeof componentValues.v !== "undefined" ? componentValues.v : false;
			this.scavenged = typeof componentValues.sc !== "undefined" ? componentValues.sc : false;
			this.scouted = typeof componentValues.s !== "undefined" ? componentValues.s : false;
			this.revealedByMap = typeof componentValues.rm !== "undefined" ? componentValues.rm : false;
			this.pendingRevealByMap = typeof componentValues.prm !== "undefined" ? componentValues.prm : false;
			this.scoutedTimestamp = typeof componentValues.st !== "undefined" ? componentValues.st : this.scouted ? 1 : null;
			
			if (componentValues.lS && componentValues.lS.length > 0) {
				this.localesScouted = componentValues.lS;
			} else {
				this.localesScouted = [];
			}

			if (componentValues.lI && componentValues.lI.length > 0) {
				this.localesInvestigated = componentValues.lI;
			} else {
				this.localesInvestigated = [];
			}

			this.wasteClearedDirections = componentValues.wd ? componentValues.wd : [];
			this.blockerClearedDirections = componentValues.dd ? componentValues.dd : [];
			this.blockerDisabledDirections = componentValues.ddd ? componentValues.ddd : [];
			this.gapBridgedDirections = componentValues.bd ? componentValues.bd : [];
			this.weightedNumScavenges = componentValues.sw ? componentValues.sw : 0;
			this.weightedNumHeapScavenges = componentValues.shw ? componentValues.shw : 0;
			this.stashesFound = componentValues.sf ? componentValues.sf : [];
			this.graffiti = componentValues.g ? componentValues.g : null;
			this.currentCharacters = componentValues.char ? componentValues.char : [];

			if (this.scouted) {
				this.visited = true;
			}

			if (this.scavenged) {
				this.visited = true;
			}

			if (this.weightedNumScavenges) {
				this.scavenged = true;
			}
		}

	});

	return SectorStatusComponent;
});
