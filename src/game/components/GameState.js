define(['ash', 'game/worldcreator/WorldCreatorHelper'], function (Ash, WorldCreatorHelper) {
    var GameState = Ash.Class.extend({
        
        constructor: function () {
            this.reset();
        },
        
        reset: function () {
            this.stage = 1;
            this.worldSeed = 0;
            this.gameStartTimeStamp = 0;
            this.gamePlayedSeconds = 0;
            this.isPaused = false;
            this.numCamps = 0;
            this.numTradePostCamps = 0;
            this.numVisitedSectors = 0;
            
            this.unlockedFeatures = {
                scavenge: false,
                vision: false,
                camp: false,
                fight: false,
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
            };
            
            this.uiStatus = {
                currentTab: null,
                mapVisited: false,
                leaveCampRes: {},
                leaveCampItems: {},
            };
            
            this.uiBagStatus = {
                itemsOwnedSeen: [],
                itemsCraftableUnlockedSeen: [],
                itemsCraftableAvailableSeen: []
            },
            
            this.actionCooldownEndTimestamps = {};
            this.actionDurationEndTimestamps = {};
        },
        
        getLevelOrdinal: function (level) {
            return WorldCreatorHelper.getLevelOrdinal(this.worldSeed, level);
        },
        
        getCampOrdinal: function (level) {
            return WorldCreatorHelper.getCampOrdinal(this.worldSeed, level);
        },
        
        getLevelOrdinalForCampOrdinal: function (campOrdinal) {
            return WorldCreatorHelper.getLevelOrdinalForCampOrdinal(this.worldSeed, campOrdinal);
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
        
        setActionCooldown: function (action, key, cooldown) {
            var actionKey = action;
            if (key.length > 0) actionKey += "-" + key;
            this.actionCooldownEndTimestamps[actionKey] = new Date().getTime() + cooldown * 1000;
        },
        
        getActionCooldown: function (action, key) {
            var actionKey = action;
            if (key.length > 0) actionKey += "-" + key;
            var timestamp = this.actionCooldownEndTimestamps[actionKey];
            if (timestamp) {
                var now = new Date().getTime();
                var diff = timestamp - now;
                if (diff > 0) return timestamp - now;
            }
            return 0;
        },
        
        setActionDuration: function (action, key, duration) {
            var actionKey = action;
            if (key.length > 0) actionKey += "-" + key;
            this.actionDurationEndTimestamps[actionKey] = new Date().getTime() + duration * 1000;
        },
        
        getActionDuration: function (action, key) {
            var actionKey = action;
            if (key.length > 0) actionKey += "-" + key;
            var timestamp = this.actionDurationEndTimestamps[actionKey];
            if (timestamp) {
                var now = new Date().getTime();
                var diff = timestamp - now;
                if (diff > 0) return timestamp - now;
            }
            return 0;
        },
    });

    return GameState;
});
