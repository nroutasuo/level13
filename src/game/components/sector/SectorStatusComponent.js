// Current sector control status & wins needed
define(['ash'], function (Ash) {

    var SectorStatusComponent = Ash.Class.extend({

        discoveredResources: [],
        scavenged: false,
        scouted: false,
        localesScouted: [],
        glowStickSeconds: -100, // not saved
        wasteClearedDirections: [],

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

        isCleared: function (direction) {
            return this.wasteClearedDirections && this.wasteClearedDirections.indexOf(parseInt(direction)) >= 0;
        },

        setCleared: function (direction) {
            if (this.isCleared(direction))
                return;
            this.wasteClearedDirections.push(parseInt(direction));
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
        }

    });

    return SectorStatusComponent;
});
