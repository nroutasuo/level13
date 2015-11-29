// Current sector control status & wins needed for sector contorl (no more random encounters)
define(['ash'], function (Ash) {
    
    var SectorControlComponent = Ash.Class.extend({
        
        maxSectorEnemies: 0,
        currentSectorEnemies: 0,
        defeatedSectorEnemies: 0,
        
        maxLocaleEnemies: {},
        currentLocaleEnemies: {},
        defeatedLocaleEnemies: {},
        
        constructor: function (enemies, localeEnemies) {
            this.maxSectorEnemies = enemies;
            this.currentSectorEnemies = enemies;
            this.defeatedSectorEnemies = 0;
            
            this.initLocaleEnemies(localeEnemies);
        },
        
        initLocaleEnemies: function (localeEnemies) {
            this.maxLocaleEnemies = {};
            this.currentLocaleEnemies = {};
            this.defeatedLocaleEnemies = {};
            
            for (var localeId in localeEnemies) {
                this.maxLocaleEnemies[localeId] = localeEnemies[localeId];
                this.currentLocaleEnemies[localeId] = localeEnemies[localeId];
                this.defeatedLocaleEnemies[localeId] = 0;
            }
        },
        
        hasControl: function () {
            return this.currentSectorEnemies <= 0;
        },
        
        hasControlOfLocale: function (localeId) {
            if (!localeId) return this.hasControl();
            return this.currentLocaleEnemies[localeId] <= 0;
        },
        
        getMaxEnemies: function (localeId) {
            if (!localeId) return this.maxSectorEnemies;
            return this.maxLocaleEnemies[localeId] ? this.maxLocaleEnemies[localeId] : 0;
        },
        
        getCurrentEnemies: function (localeId) {
            if (!localeId) return this.currentSectorEnemies;
            return this.currentLocaleEnemies[localeId] ? this.currentLocaleEnemies[localeId] : 0;
        },
        
        getDefeatedLocaleEnemies: function (localeId) {
            if (!localeId) return this.defeatedSectorEnemies;
            return this.defeatedLocaleEnemies[localeId] ? this.defeatedLocaleEnemies[localeId] : 0;
        },
        
        addWin: function (localeId) {
            console.log("add win " + localeId);
            if (!localeId) {
                this.defeatedSectorEnemies++;
                this.currentSectorEnemies--;
            } else {
                this.defeatedLocaleEnemies[localeId]++;
                this.currentLocaleEnemies[localeId]--;
            }
        },
        
    });

    return SectorControlComponent;
});
