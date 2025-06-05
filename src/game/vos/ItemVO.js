define(['ash', 'game/vos/ItemBonusVO'], function (Ash, ItemBonusVO) {

	let ItemVO = Ash.Class.extend({

		id: "",
		type: "",
		bonus: null,
		icon: "",
		requiredCampOrdinal: 1,
		maximumCampOrdinal: -1,
		isSpecialEquipment: false,
		
		scavengeRarity: -1,
		localeRarity: -1,
		tradeRarity: -1,
		investigateRarity: -1,
		tags: [],

		equippable: false,
		craftable: false,
		repairable: false,
		useable: false,
		
		// item config specific data (not saved on instances)
		configData: {},

		// instance data (varies between instances)
		itemID: -1,
		foundPosition: null,
		level: 1, // 0-100

		// status data (varies over time)
		equipped: false,
		carried: false,
		broken: false,

		constructor: function (id, type, level, requiredCampOrdinal, maximumCampOrdinal, equippable, craftable, repairable, useable, bonuses, icon, isSpecialEquipment) {
			this.id = id;
			this.type = type;
			this.level = level;
			this.bonus = new ItemBonusVO(bonuses);
			this.equippable = equippable;
			this.craftable = craftable;
			this.repairable = repairable;
			this.useable = useable;
			this.icon = icon;
			this.requiredCampOrdinal = typeof requiredCampOrdinal != 'undefined' ? requiredCampOrdinal : 1;
			this.maximumCampOrdinal = typeof maximumCampOrdinal != 'undefined' ? maximumCampOrdinal : 0;
			this.isSpecialEquipment = isSpecialEquipment || false;
			
			this.scavengeRarity = -1;
			this.localeRarity = -1;
			this.tradeRarity = -1;
			this.investigateRarity = -1;
			this.tags = [];
			
			this.configData = {};
			
			this.itemID = Math.floor(Math.random() * 1000000);
			this.equipped = false;
			this.carried = false;
			this.broken = false;
			this.foundPosition = null;
		},
		
		getBaseTotalBonus: function () {
			return this.bonus.getTotal();
		},
		
		getBaseBonus: function (bonusType) {
			return this.bonus ? this.bonus.getBonus(bonusType) : 0;
		},

		getCustomSaveObject: function () {
			let clone = this.clone();

			// add instance data
			clone.itemID = this.itemID;
			clone.equipped = this.equipped ? 1 : 0;
			clone.carried = this.carried ? 1 : 0;
			clone.broken = this.broken ? 1 : 0;
			clone.level = this.level;

			// delete static data
			delete clone.bonus;
			delete clone.icon;
			delete clone.requiredCampOrdinal;
			delete clone.isSpecialEquipment;
			delete clone.scavengeRarity;
			delete clone.localeRarity;
			delete clone.tradeRarity;
			delete clone.investigateRarity;
			delete clone.tags;
			delete clone.craftable;
			delete clone.repairable;
			delete clone.useable;
			delete clone.type;
			delete clone.equippable;
			delete clone.balancingData;
			delete clone.configData;
			delete clone.maximumCampOrdinal;
			delete clone.weight;
			
			if (this.foundPosition == null)
				delete clone.foundPosition;
			
			if (!this.broken)
				delete clone.broken;
		
			if (!this.equipped)
				delete clone.equipped;
		
			if (!this.carried)
				delete clone.carried;
			
			if (!this.equippable)
				delete clone.equipped;

			return clone;
		},

		clone: function (componentValues) {
			let clone = new ItemVO(this.id, this.type, this.level, this.requiredCampOrdinal, this.maximumCampOrdinal, this.equippable, this.craftable, this.repairable, this.useable, this.bonus.bonuses, this.icon, this.isSpecialEquipment);

			clone.scavengeRarity = this.scavengeRarity;
			clone.localeRarity = this.localeRarity;
			clone.tradeRarity = this.tradeRarity;
			clone.investigateRarity = this.investigateRarity;
			clone.tags = this.tags;
			clone.weight = this.weight;

			clone.tradePrice = this.tradePrice;
			clone.broken = this.broken;

			if (componentValues) {
				if (componentValues.itemID) clone.itemID = componentValues.itemID; 
				if (componentValues.foundPosition) clone.foundPosition = componentValues.foundPosition; 
				if (componentValues.level) clone.level = componentValues.level;
				clone.broken = componentValues.broken == 1;
			}

			return clone;
		}
	});

	return ItemVO;
});
