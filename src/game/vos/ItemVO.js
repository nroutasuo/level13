define(['ash'], function (Ash) {
    
    var ItemVO = Ash.Class.extend({
	
		id: "",
		name: "",
		type: "",
		bonus: 0,
		icon: "",
		description: "",
		
		equipped: false,
	
        constructor: function (id, name, type, bonus, equippable, unequippable, icon, description) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.bonus = bonus;
			this.equippable = equippable;
			this.unequippable = unequippable;
			this.icon = icon;
			this.description = description;
			
			this.equipped = this.unequippable;
			this.itemID = Math.random() * 100000;
        },
	
	clone: function() {
	    return new ItemVO(this.id, this.name, this.type, this.bonus, this.equippable, this.unequippable, this.icon, this.description);
	}
    });

    return ItemVO;
});
