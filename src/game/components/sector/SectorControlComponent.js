// Current sector control status & wins needed for sector contorl (no more random encounters)
define(['ash'], function (Ash) {
    
    var SectorControlComponent = Ash.Class.extend({
        
        maxSectorEnemies: 0,
        currentSectorEnemies: 0,
        
        maxLocaleEnemies: {},
        currentLocaleEnemies: {},
        
        constructor: function (enemies, localeEnemies) {
            this.maxSectorEnemies = enemies;
            this.currentSectorEnemies = enemies;
            
            this.initLocaleEnemies(localeEnemies);
        },
        
        initLocaleEnemies: function (localeEnemies) {
            this.maxLocaleEnemies = {};
            this.currentLocaleEnemies = {};
            
            for (var localeId in localeEnemies) {
                this.maxLocaleEnemies[localeId] = localeEnemies[localeId];
                this.currentLocaleEnemies[localeId] = localeEnemies[localeId];
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
        
        addWin: function (localeId) {
            if (!localeId) {
                console.log("add win " + localeId + " " + this.currentSectorEnemies);
                this.currentSectorEnemies--;
            } else {
                console.log("add win " + localeId + " " + this.currentLocaleEnemies[localeId]);
                this.currentLocaleEnemies[localeId]--;
            }
        },
         
        getSaveKey: function () {
            return "SectorCtrl";
        },
        
        getCustomSaveObject: function () {
            var copy = {};
            copy.cSE = this.currentSectorEnemies;
            copy.cLE = this.currentLocaleEnemies;
            return copy;
        },
        
        customLoadFromSave: function (componentValues) {
            if (componentValues.cSE)
                this.currentSectorEnemies = componentValues.cSE;
            else
                this.currentSectorEnemies = componentValues.currentSectorEnemies;
            
            var localeEnemies = componentValues.currentLocaleEnemies;
            if (componentValues.cLE)
                localeEnemies = componentValues.cLE;
            
            for (var locale in localeEnemies) {
                this.currentLocaleEnemies[locale] = localeEnemies[locale];
            }
        }
        
    });

    return SectorControlComponent;
});
