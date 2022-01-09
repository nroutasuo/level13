define(function () {
	
	var CultureConstants = {
		
		cultures: {
			ETRURIAN: "etrurian",
			HANSA: "hansa",
			INDUS: "indus",
			KIEVAN: "kievan",
			YUAN: "yuan",
		},
		
		origins: {
			SURFACE: "surface",
			SLUMS: "slums",
			DARKLEVELS: "darklevels"
		},
		
		genders: {
			MALE: "male",
			FEMALE: "female",
			OTHER: "other",
		},
		
		names: {
			personalNames: [],
			familyNames: [],
			nickNames: [],
		},
		
		initNames: function () {
			this.names.personalNames.push({name: "Jaro" });
			this.names.personalNames.push({name: "Adya" });
			this.names.personalNames.push({name: "Gift" });
			this.names.personalNames.push({name: "Noa" });
			this.names.personalNames.push({name: "Fiore", culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Giusi", culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Loue", culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Heike", culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Luca", culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Rae", culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Nehal", culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Ismat", culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Tomer", culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Parvin", culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Nasim", culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Noor", culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Robin", culture: this.cultures.KIEVAN });
			this.names.personalNames.push({name: "Vanja", culture: this.cultures.KIEVAN });
			this.names.personalNames.push({name: "Misheel", culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Naran", culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Togtuun", culture: this.cultures.YUAN });
			
			this.names.personalNames.push({name: "Jan", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Jakub", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Prince", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Ale", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Hugo", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Jakob", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Leo", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Max", gender: this.genders.MALE });
			this.names.personalNames.push({name: "Alessio", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Aurelio", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Matteo", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Lorenzo", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Antonio", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Elio", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Ennio", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Umberto", gender: this.genders.MALE, culture: this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Mikke", gender: this.genders.MALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Uchtred", gender: this.genders.MALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Florian", gender: this.genders.MALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Otto", gender: this.genders.MALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Eino", gender: this.genders.MALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Ole", gender: this.genders.MALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Jori", gender: this.genders.MALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Armin", gender: this.genders.MALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Batu", gender: this.genders.MALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Mehdi", gender: this.genders.MALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Medad", gender: this.genders.MALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Omar", gender: this.genders.MALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Jurij", gender: this.genders.MALE, culture: this.cultures.KIEVAN });
			this.names.personalNames.push({name: "Simon", gender: this.genders.MALE, culture: this.cultures.KIEVAN });
			this.names.personalNames.push({name: "Pawel", gender: this.genders.MALE, culture: this.cultures.KIEVAN });
			this.names.personalNames.push({name: "Arban", gender: this.genders.MALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Chuluun", gender: this.genders.MALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Jargal", gender: this.genders.MALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Bataar", gender: this.genders.MALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Khuanli", gender: this.genders.MALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Batbayar", gender: this.genders.MALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Timur", gender: this.genders.MALE, culture: this.cultures.YUAN });
			
			this.names.personalNames.push({name: "Wanda", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Olga", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Ulla", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Lena", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Julia", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Natalia", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Hana", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Anja", gender: this.genders.FEMALE });
			this.names.personalNames.push({name: "Anna", gender: this.genders.FEMALE, culture:this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Aurelia", gender: this.genders.FEMALE, culture:this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Sofia", gender: this.genders.FEMALE, culture:this.cultures.ETRURIAN });
			this.names.personalNames.push({name: "Giulia", gender: this.genders.FEMALE, culture:this.cultures.ETRURIAN });;
			this.names.personalNames.push({name: "Sabine", gender: this.genders.FEMALE, culture:this.cultures.ETRURIAN });;
			this.names.personalNames.push({name: "Gia", gender: this.genders.FEMALE, culture:this.cultures.ETRURIAN });;
			this.names.personalNames.push({name: "Elda", gender: this.genders.FEMALE, culture:this.cultures.ETRURIAN, origin: this.origins.DARKLEVELS });;
			this.names.personalNames.push({name: "Annike", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Elke", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Ilse", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Johanna", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Astrid", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Ebba", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Marjolein", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Rosalena", gender: this.genders.FEMALE, culture: this.cultures.HANSA });
			this.names.personalNames.push({name: "Salome", gender: this.genders.FEMALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Zahra", gender: this.genders.FEMALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Miriam", gender: this.genders.FEMALE, culture: this.cultures.INDUS });
			this.names.personalNames.push({name: "Zofia", gender: this.genders.FEMALE, culture: this.cultures.KIEVAN })
			this.names.personalNames.push({name: "Magda", gender: this.genders.FEMALE, culture: this.cultures.KIEVAN })
			this.names.personalNames.push({name: "Nadia", gender: this.genders.FEMALE, culture: this.cultures.KIEVAN })
			this.names.personalNames.push({name: "Maja Amelia", gender: this.genders.FEMALE, culture: this.cultures.KIEVAN, origin: this.origins.SURFACE })
			this.names.personalNames.push({name: "Khaliun", gender: this.genders.FEMALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Yargui", gender: this.genders.FEMALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Muur", gender: this.genders.FEMALE, culture: this.cultures.YUAN });
			this.names.personalNames.push({name: "Khulan", gender: this.genders.FEMALE, culture: this.cultures.YUAN });
			
			this.names.nickNames.push({name: "Rat", origin: this.origins.DARKLEVELS});
			this.names.nickNames.push({name: "Spider", origin: this.origins.DARKLEVELS});
			this.names.nickNames.push({name: "Squint", origin: this.origins.DARKLEVELS});
			this.names.nickNames.push({name: "Fang", origin: this.origins.DARKLEVELS});
			this.names.nickNames.push({name: "Soot", origin: this.origins.DARKLEVELS});
			this.names.nickNames.push({name: "Bullet", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Spark", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Junior", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Lion", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Lucky", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Needle", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Mouse", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Spike", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Sly", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Bandana", origin: this.origins.SLUMS});
			this.names.nickNames.push({name: "Benny", gender: this.genders.MALE});
			this.names.nickNames.push({name: "Vulture", gender: this.genders.MALE});
			this.names.nickNames.push({name: "Denlüü", culture: this.cultures.YUAN, origin: this.origins.SLUMS}); // lantern
			this.names.nickNames.push({name: "Chiiden", culture: this.cultures.YUAN, origin: this.origins.SLUMS}); // Light, eletric light
		},
		
		getRandomGender: function () {
			let r = Math.random();
			if (r < 0.4) return this.genders.MALE;
			if (r < 0.8) return this.genders.FEMALE;
			return this.genders.OTHER;
		},
		
		getRandomOrigin: function (level) {
			let r = Math.random();
			
			let surfaceThreshold = level > 14 ? 0.25 : 0;
			if (r < surfaceThreshold) return this.origins.SURFACE;
			
			let darkLevelThreshold = level < 10 ? 0.75 : 0.25;
			if (r < surfaceThreshold + darkLevelThreshold) return this.origins.DARKLEVELS;
			
			return this.origins.SLUMS;
		},
		
		getRandomCultures: function (num, origin) {
			let result = [];
			for (let i = 0; i < num; i++) {
				result.push(this.getRandomCulture(origin, result));
			}
			return result;
		},
		
		getRandomCulture: function (origin, excludedCultures) {
			let possibleCultures = [];
			
			for (let k in this.cultures) {
				let culture = this.cultures[k];
				if (excludedCultures.indexOf(culture) >= 0) continue;
				let probability = this.getCultureProbability(culture, origin);
				if (Math.random() < probability) possibleCultures.push(culture);
			}
				
			return possibleCultures[Math.floor(Math.random() * possibleCultures.length)];
		},
		
		getCultureProbability: function (culture, origin) {
			switch (culture) {
				case this.cultures.ETRURIAN: return origin == this.origins.SURFACE ? 0.5 : 0.25;
				case this.cultures.HANSA: return origin == this.origins.SURFACE ? 0.25 : 0.5;
				case this.cultures.INDUS: return origin == this.origins.SLUMS ? 0.5 : 1;
				case this.cultures.KIEVAN: return origin == this.origins.SLUMS ? 0.5 : 1;
				case this.cultures.YUAN: return origin == this.origins.SURFACE ? 0.25 : 0.5;
			}
		},
		
		getRandomShortName: function (gender, origin, culturalHeritage) {
			let validNames = this.getValidShortNames(gender, origin, culturalHeritage);
			return validNames[Math.floor(Math.random() * validNames.length)];
		},
		
		getValidShortNames: function (gender, origin, culturalHeritage) {
			let result = [];
			for (let i in CultureConstants.names.personalNames) {
				let name = CultureConstants.names.personalNames[i];
				if (CultureConstants.isValidName(name, gender, origin, culturalHeritage)) {
					result.push(name.name);
				}
			}
			for (let i in CultureConstants.names.nickNames) {
				let name = CultureConstants.names.nickNames[i];
				if (CultureConstants.isValidName(name, gender, origin, culturalHeritage)) {
					result.push(name.name);
				}
			}
			return result;
		},
		
		isValidName: function (name, gender, origin, culturalHeritage) {
			if (!name.name) return false;
			if (name.gender && gender && name.gender != gender) return false;
			if (name.origin && origin && name.origin != origin) return false;
			if (name.culture && culturalHeritage && culturalHeritage.length > 0) {
				let foundMatchingCulture = false;
				for (let i = 0; i < culturalHeritage.length; i++) {
					if (name.culture == culturalHeritage[i]) {
						foundMatchingCulture = true;
						break;
					}
				}
				if (!foundMatchingCulture) return false;
			}
			return true;
		},
		
	};
	
	CultureConstants.initNames();
	
	return CultureConstants;
});
