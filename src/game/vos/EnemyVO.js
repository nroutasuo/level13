define(['ash'], function (Ash) {
	
	var EnemyVO = Ash.Class.extend({
	
		name: "",
		type: "",
		att: 0,
		def: 0,
		speed: 0,
		maxHP: 100,
		rarity: 0, // 0-100
		
		nouns: [],
		groupN: [],
		activeV: [],
		defeatedV: [],
		
		droppedResources: [],
		
		attRandomFactor: 1,
		
		hp: 100,
	
		constructor: function (id, name, type, nouns, groupN, activeV, defeatedV, att, def, hp, speed, rarity, droppedResources) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.att = Math.round(att);
			this.def = Math.round(def);
			this.maxHP = hp;
			this.hp = this.maxHP;
			this.rarity = rarity ? Math.min(Math.max(Math.round(rarity), 0), 100) : 0;
			
			this.nouns = nouns;
			this.groupN = groupN;
			this.activeV = activeV;
			this.defeatedV = defeatedV;
			
			this.droppedResources = droppedResources || [];
			
			this.attRandomFactor = Math.random() - 0.5;
			this.enemyID = this.name.replace(/ /g, "-") + "-" + this.att + "-" + this.def;
		},
		
		resetHP: function () {
			this.hp = this.maxHP;
		},
	
		toString: function () {
			return this.name;
		},
		
		clone: function () {
			return new EnemyVO(this.id, this.name, this.type, this.nouns, this.groupN, this.activeV, this.defeatedV, this.att, this.def, this.maxHP, this.speed, this.rarity);
		}
	});

	return EnemyVO;
});
