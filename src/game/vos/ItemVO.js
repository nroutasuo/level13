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
        useable: false,
		
		equipped: false,
		carried: false,
	
        constructor: function (id, name, type, bonus, equippable, craftable, useable, icon, description) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.bonus = bonus;
			this.equippable = equippable;
			this.craftable = craftable;
            this.useable = useable;
			this.icon = icon;
			this.description = description;
			
			this.equipped = false;
			this.carried = false;
			this.itemID = Math.floor(Math.random() * 1000000);
        },
	
		clone: function () {
		    return new ItemVO(this.id, this.name, this.type, this.bonus, this.equippable, this.craftable, this.useable, this.icon, this.description);
		}
    });

    return ItemVO;
});
