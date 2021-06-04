// Status of enemies in a sector including locales
define(['ash'], function (Ash) {
	
	var SectorControlComponent = Ash.Class.extend({
		
		maxLocaleEnemies: {},
		currentLocaleEnemies: {},
		
		constructor: function (localeEnemies) {
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
			return this.maxLocaleEnemies[localeId] ? this.maxLocaleEnemies[localeId] : 0;
		},
		
		getCurrentEnemies: function (localeId) {
			if (!localeId) return 25;
			return this.currentLocaleEnemies[localeId] ? this.currentLocaleEnemies[localeId] : 0;
		},
		
		addWin: function (localeId) {
			if (!localeId) return;
			if (!this.currentLocaleEnemies[localeId]) this.currentLocaleEnemies[localeId] = 0;
			this.currentLocaleEnemies[localeId]--;
		},
		 
		getSaveKey: function () {
			return "SCtrl";
		},
		
		getCustomSaveObject: function () {
			var copy = {};
			copy.cLE = {};
			if (this.currentLocaleEnemies && Object.keys(this.currentLocaleEnemies).length > 0) {
				for (var locale in this.currentLocaleEnemies) {
					if (this.currentLocaleEnemies[locale] != this.maxLocaleEnemies[locale]) {
						copy.cLE[locale] = this.currentLocaleEnemies[locale];
					}
				}
			}
			return Object.keys(copy.cLE).length > 0 ? copy : null;
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
