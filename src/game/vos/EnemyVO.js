define(['ash'], function (Ash) {
	
	var EnemyVO = Ash.Class.extend({
	
		id: "",
		name: "",
		type: "",
		att: 0,
		def: 0,
		speed: 0,
		maxHP: 100,
		maxShield: 100,
		rarity: 0, // 0-100
		
		nouns: [],
		groupN: [],
		activeV: [],
		defeatedV: [],
		size: 1,
		
		droppedResources: [],
		droppedIngredients: [],
		causedInjuryTypes: [],
		
		// stat IVs (0-100)
		attIV: 0,
		defIV: 0,
		speedIV: 0,
		
		hp: 100,
		shield: 0,
	
		constructor: function (id, name, type, nouns, groupN, activeV, defeatedV, size, att, def, hp, shield, speed, rarity, droppedResources, droppedIngredients, causedInjuryTypes) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.att = Math.round(att);
			this.def = Math.round(def);
			this.speed = speed || 1;
			this.maxHP = hp;
			this.hp = this.maxHP;
			this.maxShield = shield;
			this.shield = this.maxShield;
			this.rarity = rarity ? Math.min(Math.max(Math.round(rarity), 0), 100) : 0;
			
			this.nouns = nouns || [];
			this.groupN = groupN || [];
			this.activeV = activeV || [];
			this.defeatedV = defeatedV || [];
			this.size = size;
			
			this.droppedResources = droppedResources || [];
			this.droppedIngredients = droppedIngredients || [];
			this.causedInjuryTypes = causedInjuryTypes || null;
			
			this.attIV = Math.round(Math.random() * 100);
			this.defIV = Math.round(Math.random() * 100);
			this.speedIV = Math.round(Math.random() * 100);
			
			this.enemyID = this.name.replace(/ /g, "-") + "-" + this.att + "-" + this.def;
		},
		
		resetHP: function () {
			this.hp = this.maxHP;
		},
		
		resetShield: function () {
			this.shield = this.maxShield;
		},
		
		getIVAverage: function () {
			return Math.round((this.attIV + this.defIV + this.speedIV) / 4);
		},
		
		getAtt: function () {
			return this.getStat(this.att, this.attIV);
		},
		
		getDef: function () {
			return this.getStat(this.def, this.defIV);
		},
		
		getSpeed: function () {
			return Math.round(this.getStat(this.speed * 100, this.speedIV)) / 100;
		},
		
		getStat: function (baseStat, iv) {
			let ivFactor = (iv - 50) * 2 / 100;
			let ivVariation = Math.max(1, baseStat * 0.05);
			let result = baseStat + Math.round(ivFactor * ivVariation);
			if (result < 0) result = 0;
			if (result == 0 && baseStat > 0) result = 1;
			return result;
		},
		
		isMechanical: function () {
			return this.hp <= 0;
		},
	
		toString: function () {
			return this.name;
		},
		
		clone: function () {
			let clone = new EnemyVO(this.id, this.name, this.type, this.nouns, this.groupN, this.activeV, this.defeatedV, this.size, this.att, this.def, this.maxHP, this.maxShield, this.speed, this.rarity, this.droppedResources, this.droppedIngredients, this.causedInjuryTypes);
			clone.enemyClass = this.enemyClass;
			return clone;
		},
		
		cloneWithIV: function (iv) {
			let result = this.clone();
			result.attIV = iv;
			result.defIV = iv;
			result.speedIV = iv;
			return result;
		}
		
	});

	return EnemyVO;
});
