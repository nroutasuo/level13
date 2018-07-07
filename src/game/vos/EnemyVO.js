define(['ash'], function (Ash) {
    
    var EnemyVO = Ash.Class.extend({
	
		name: "",
		type: "",
		att: 0,
		def: 0,
		hp: 100,
		rarity: 0, // 0-100
		
		nouns: [],
        groupN: [],
		activeV: [],
		defeatedV: [],
		
		attRandomFactor: 1,
	
        constructor: function (name, type, nouns, groupN, activeV, defeatedV, att, def, rarity) {
			this.name = name;
			this.type = type;
			this.att = Math.round(att);
			this.def = Math.round(def);
			this.hp = 100;
			this.rarity = rarity ? Math.min(Math.max(Math.round(rarity), 0), 100) : 0;
			
			this.nouns = nouns;
            this.groupN = groupN;
			this.activeV = activeV;
			this.defeatedV = defeatedV;
			
			this.attRandomFactor = Math.random() - 0.5;
			this.id = this.name.replace(/ /g, "-") + "-" + this.att + "-" + this.def;
        },
	
		toString: function () {
			return this.name;
		},
		
		clone: function () {
			return new EnemyVO(this.name, this.type, this.nouns, this.groupN, this.activeV, this.defeatedV, this.att, this.def, this.rarity);
		}
    });

    return EnemyVO;
});
