define(['ash'], function (Ash) {
    var GameState = Ash.Class.extend({
        
        constructor: function () {
            this.reset();
        },
        
        reset: function () {
            this.stage = 1;
            this.worldSeed = 0;
            this.levelOffset = 0;
            this.numCamps = 0;
            
            this.unlockedFeatures = {
                vision: false,
                fight: false,
                investigate: false,
                bag: false,
                upgrades: false,
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
            };
            
            this.uiStatus = {
                currentTab: null,
                leaveCampRes: {},
            };
            
            this.actionCooldownEndTimestamps = {};
        },
        
        getLevelOrdinal: function (level) {
            if (level <= 13) return -level + 14;
            else return level + 1;
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
    });

    return GameState;
});
