// Current sector control status & wins needed
define(['ash', 'game/constants/MovementConstants'], function (Ash, MovementConstants) {

    var SectorStatusComponent = Ash.Class.extend({

        discoveredResources: [],
        scavenged: false,
        scouted: false,
        localesScouted: [],
        glowStickSeconds: -100, // not saved
        wasteClearedDirections: [],
        debrisClearedDirections: [],

        constructor: function () {
            this.discoveredResources = [];
            this.scavenged = false;
            this.scouted = false;
            this.localesScouted = [];
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

        isCleared: function (direction, blockerType) {
            if (blockerType == MovementConstants.BLOCKER_TYPE_WASTE) {
                return this.wasteClearedDirections && this.wasteClearedDirections.indexOf(parseInt(direction)) >= 0;
            }
            if (blockerType == MovementConstants.BLOCKER_TYPE_DEBRIS) {
                return this.debrisClearedDirections && this.debrisClearedDirections.indexOf(parseInt(direction)) >= 0;
            }
            return false;
        },

        setCleared: function (direction, blockerType) {
            if (this.isCleared(direction, blockerType))
                return;
            if (blockerType == MovementConstants.BLOCKER_TYPE_WASTE) {
                this.wasteClearedDirections.push(parseInt(direction));
            }
            if (blockerType == MovementConstants.BLOCKER_TYPE_DEBRIS) {
                this.debrisClearedDirections.push(parseInt(direction));
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
                copy.wd = this.wasteClearedDirections ? this.wasteClearedDirections  : [];
            if (this.debrisClearedDirections && this.debrisClearedDirections.length > 0)
                copy.dd = this.debrisClearedDirections ? this.debrisClearedDirections  : [];
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
        }

    });

    return SectorStatusComponent;
});
