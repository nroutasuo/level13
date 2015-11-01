define(['ash'], function (Ash) {
    
    var ItemVO = Ash.Class.extend({
	
		id: "",
		name: "",
		type: "",
		bonus: 0,
		icon: "",
		description: "",
		
		equippable: false,
		craftable: false,
		
		equipped: false,
	
        constructor: function (id, name, type, bonus, equippable, craftable, icon, description) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.bonus = bonus;
			this.equippable = equippable;
			this.craftable = craftable;
			this.icon = icon;
			this.description = description;
			
			this.equipped = false;
			this.itemID = Math.random() * 100000;
        },
	
		clone: function () {
		    return new ItemVO(this.id, this.name, this.type, this.bonus, this.equippable, this.craftable, this.icon, this.description);
		}
    });

    return ItemVO;
});
