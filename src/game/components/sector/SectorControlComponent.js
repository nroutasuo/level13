// Status of enemies in a sector including locales 
define(['ash'], function (Ash) {
    
    var SectorControlComponent = Ash.Class.extend({
        
        maxSectorEnemies: 0,
        
        maxLocaleEnemies: {},
        currentLocaleEnemies: {},
        
        constructor: function (enemies, localeEnemies) {
            this.maxSectorEnemies = enemies;
            this.maxLocaleEnemies = {};
            this.currentLocaleEnemies = {};
            
            for (var localeId in localeEnemies) {
                this.maxLocaleEnemies[localeId] = localeEnemies[localeId];
                this.currentLocaleEnemies[localeId] = localeEnemies[localeId];
            }
        },
        
        hasControlOfLocale: function (localeId) {
            if (!localeId) false;
            return this.currentLocaleEnemies[localeId] <= 0;
        },
        
        getMaxEnemies: function (localeId) {
            if (!localeId) return this.maxSectorEnemies;
            return this.maxLocaleEnemies[localeId] ? this.maxLocaleEnemies[localeId] : 0;
        },
        
        getCurrentEnemies: function (localeId) {
            if (!localeId) return 25;
            return this.currentLocaleEnemies[localeId] ? this.currentLocaleEnemies[localeId] : 0;
        },
        
        addWin: function (localeId) {
            if (!localeId) return;
            console.log("add win " + localeId + " " + this.currentLocaleEnemies[localeId]);
            this.currentLocaleEnemies[localeId]--;
        },
         
        getSaveKey: function () {
            return "SCtrl";
        },
        
        getCustomSaveObject: function () {
            var copy = {};
            var cLE = {};
            if (this.currentLocaleEnemies && Object.keys(this.currentLocaleEnemies).length > 0) {
                for (var locale in this.currentLocaleEnemies) {
                    if (this.currentLocaleEnemies[locale] != this.maxLocaleEnemies[locale]) {
                        cLE[locale] = this.currentLocaleEnemies[locale];
                    }
                }                
            }
            return Object.keys(copy).length > 0 ? copy : null;
        },
        
        customLoadFromSave: function (componentValues) {
            var cLE = componentValues.currentLocaleEnemies;
            
            if (componentValues.cLE)
                cLE = componentValues.cLE;
            
            for (var locale in cLE) {
                this.currentLocaleEnemies[locale] = cLE[locale];
            }
        }
        
    });

    return SectorControlComponent;
});
