define(['ash', 'game/vos/ItemBonusVO'], function (Ash, ItemBonusVO) {
    
    var ItemVO = Ash.Class.extend({
	
		id: "",
		name: "",
		type: "",
		bonus: null,
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
			this.bonus = new ItemBonusVO(bonus);
			this.equippable = equippable;
			this.craftable = craftable;
            this.useable = useable;
			this.icon = icon;
			this.description = description;
			
			this.equipped = false;
			this.carried = false;
			this.itemID = Math.floor(Math.random() * 1000000);
        },
        
        getTotalBonus: function () {
            return this.bonus ? this.bonus.getTotal() : 0;
        },
        
        getBonus: function (bonusType) {
            return this.bonus ? this.bonus.getBonus(bonusType) : 0;
        },
	
		clone: function () {
		    return new ItemVO(this.id, this.name, this.type, this.bonus, this.equippable, this.craftable, this.useable, this.icon, this.description);
		}
    });

    return ItemVO;
});
