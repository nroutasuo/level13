define(['ash', 'game/vos/ItemBonusVO'], function (Ash, ItemBonusVO) {
    
    var ItemVO = Ash.Class.extend({
	
		id: "",
		name: "",
		type: "",
		bonus: null,
		icon: "",
		description: "",
        requiredLevel: 1,
        scavengeRarity: 1, // 1-10, higher = rarer, -1 = never found by scavenging
		
		equippable: false,
		craftable: false,
        useable: false,
		
        itemID: -1,
		equipped: false,
		carried: false,
	
        constructor: function (id, name, type, bonuses, equippable, craftable, useable, icon, description, requiredLevel, scavengeRarity) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.bonus = new ItemBonusVO(bonuses);
			this.equippable = equippable;
			this.craftable = craftable;
            this.useable = useable;
			this.icon = icon;
			this.description = description;
			this.requiredLevel = typeof requiredLevel != 'undefined' ? requiredLevel : 1;
            this.scavengeRarity = typeof scavengeRarity != 'undefined' ? scavengeRarity : 1;
            
			this.equipped = false;
			this.carried = false;
			this.itemID = Math.floor(Math.random() * 100000);
        },
        
        getTotalBonus: function () {
            return this.bonus.getTotal();
        },
        
        getBonus: function (bonusType) {
            return this.bonus ? this.bonus.getBonus(bonusType) : 0;
        },
        
        getCustomSaveObject: function () {
            var clone = this.clone();
            
            // add instance data
            clone.itemID = this.itemID;
            clone.equipped = this.equipped;
            clone.carried = this.carried;
            
            // delete static data
            delete clone.name;
            delete clone.bonus;
            delete clone.icon;
            delete clone.description;
            delete clone.requiredLevel;
            delete clone.scavengeRarity;
            delete clone.craftable;
            delete clone.useable;
            
            return clone;
        },
	
		clone: function () {
		    return new ItemVO(this.id, this.name, this.type, this.bonus.bonuses, this.equippable, this.craftable, this.useable, this.icon, this.description, this.requiredLevel, this.rarity);
		}
    });

    return ItemVO;
});
