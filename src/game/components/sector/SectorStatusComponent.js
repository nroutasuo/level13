// Current sector control status & wins needed
define(['ash', 'game/constants/MovementConstants'], function (Ash, MovementConstants) {

    var SectorStatusComponent = Ash.Class.extend({

        discoveredResources: [],
        scavenged: false,
        scouted: false,
        localesScouted: [],
        wasteClearedDirections: [],
        debrisClearedDirections: [],
        gapBridgedDirections: [],
        weightedNumScavenges: 0,
        stashesFound: 0,
        
        glowStickSeconds: -100, // not saved
        hazardReduction: null, // not saved

        constructor: function () {
            this.discoveredResources = [];
            this.scavenged = false;
            this.scouted = false;
            this.localesScouted = [];
            this.wasteClearedDirections = [];
            this.debrisClearedDirections = [];
            this.gapBridgedDirections = [];
            this.weightedNumScavenges = 0;
            this.stashesFound = 0;
            
            this.hazardReduction = {};
            this.glowStickSeconds = -100;
        },

        addDiscoveredResource: function (name) {
            if (this.discoveredResources.indexOf(name) < 0) {
                this.discoveredResources.push(name);
            }
        },

        isLocaleScouted: function (i) {
            if (!this.localesScouted[i]) return false;
            return this.localesScouted[i];
        },

        getNumLocalesScouted: function () {
            var scouted = 0;
            for (var i = 0; i < this.localesScouted.length; i++) {
                if (this.localesScouted[i]) scouted++;
            }
            return scouted;
        },
        
        getScavengedPercent: function () {
            return this.weightedNumScavenges / (10+this.weightedNumScavenges) * 100;
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
            if (this.scavenged)
                copy.sc = this.scavenged ? 1 : 0;
            if (this.scouted)
                copy.s = this.scouted ? 1 : 0;
            if (this.localesScouted.length > 0)
                copy.lS = this.localesScouted;
            if (this.wasteClearedDirections && this.wasteClearedDirections.length > 0)
                copy.wd = this.wasteClearedDirections;
            if (this.debrisClearedDirections && this.debrisClearedDirections.length > 0)
                copy.dd = this.debrisClearedDirections;
            if (this.gapBridgedDirections && this.gapBridgedDirections.length > 0)
                copy.bd = this.gapBridgedDirections;
            if (this.weightedNumScavenges)
                copy.sw = this.weightedNumScavenges;
            if (this.stashesFound)
                copy.sf = this.stashesFound;
            return Object.keys(copy).length > 0 ? copy : null;
        },

        customLoadFromSave: function (componentValues) {
            this.discoveredResources = componentValues.dR ? componentValues.dR : [];
            this.scavenged = typeof componentValues.sc !== "undefined" ? componentValues.sc : false;
            this.scouted = typeof componentValues.s !== "undefined" ? componentValues.s : false;
            if (componentValues.lS && componentValues.lS.length > 0)
                this.localesScouted = componentValues.lS;
            else
                this.localesScouted = [];
            this.wasteClearedDirections = componentValues.wd ? componentValues.wd : [];
            this.debrisClearedDirections = componentValues.dd ? componentValues.dd : [];
            this.gapBridgedDirections = componentValues.bd ? componentValues.bd : [];
            this.weightedNumScavenges = componentValues.sw ? componentValues.sw : 0;
            this.stashesFound = componentValues.sf ? componentValues.sf : 0;
        }

    });

    return SectorStatusComponent;
});
