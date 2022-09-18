define(['ash', 'game/vos/ItemBonusVO'], function (Ash, ItemBonusVO) {

	var ItemVO = Ash.Class.extend({

		id: "",
		name: "",
		type: "",
		level: 1,
		bonus: null,
		icon: "",
		description: "",
		requiredCampOrdinal: 1,
		maximumCampOrdinal: -1,
		isSpecialEquipment: false,
		
		scavengeRarity: -1,
		localeRarity: -1,
		tradeRarity: -1,
		investigateRarity: -1,

		equippable: false,
		craftable: false,
		repairable: false,
		useable: false,
		
		// item specific data (not saved on instances)
		configData: {},

		// instance data (varies between instances)
		itemID: -1,
		equipped: false,
		carried: false,
		broken: false,
		foundPosition: null,

		constructor: function (id, name, type, level, requiredCampOrdinal, maximumCampOrdinal, equippable, craftable, repairable, useable, bonuses, icon, description, isSpecialEquipment) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.level = level;
			this.bonus = new ItemBonusVO(bonuses);
			this.equippable = equippable;
			this.craftable = craftable;
			this.repairable = repairable;
			this.useable = useable;
			this.icon = icon;
			this.description = description;
			this.requiredCampOrdinal = typeof requiredCampOrdinal != 'undefined' ? requiredCampOrdinal : 1;
			this.maximumCampOrdinal = typeof maximumCampOrdinal != 'undefined' ? maximumCampOrdinal : 0;
			this.isSpecialEquipment = isSpecialEquipment || false;
			
			this.scavengeRarity = -1;
			this.localeRarity = -1;
			this.tradeRarity = -1;
			this.investigateRarity = -1;
			
			this.configData = {};
			
			this.itemID = Math.floor(Math.random() * 100000);
			this.equipped = false;
			this.carried = false;
			this.broken = false;
			this.foundPosition = null;
		},
		
		getBaseTotalBonus: function () {
			return this.bonus.getTotal();
		},

		getCurrentTotalBonus: function () {
			let result = 0;
			if (this.bonus) {
				for (let key in this.bonus.bonuses) {
					let value = this.bonus.getBonus(key);
					if (this.broken && this.isBonusAffectedByBrokenStatus(key)) value = Math.floor(value / 2);
					result += value;
				}
			}
			return result;
		},
		
		getBaseBonus: function (bonusType) {
			return this.bonus ? this.bonus.getBonus(bonusType) : 0;
		},

		getCurrentBonus: function (bonusType) {
			let result = this.getBaseBonus(bonusType);
			if (this.broken && this.isBonusAffectedByBrokenStatus(bonusType)) result = Math.floor(result / 2);
			return result;
		},
		
		isBonusAffectedByBrokenStatus: function (bonusType) {
			// TODO refer to ItemConstants here / move whole function
			if (bonusType == "spd") return false;
			return true;
		},

		getCustomSaveObject: function () {
			var clone = this.clone();

			// add instance data
			clone.itemID = this.itemID;
			clone.equipped = this.equipped ? 1 : 0;
			clone.carried = this.carried ? 1 : 0;
			clone.broken = this.broken ? 1 : 0;

			// delete static data
			delete clone.name;
			delete clone.nameShort;
			delete clone.bonus;
			delete clone.icon;
			delete clone.description;
			delete clone.requiredCampOrdinal;
			delete clone.isSpecialEquipment;
			delete clone.scavengeRarity;
			delete clone.localeRarity;
			delete clone.tradeRarity;
			delete clone.investigateRarity;
			delete clone.craftable;
			delete clone.repairable;
			delete clone.useable;
			delete clone.type;
			delete clone.level;
			delete clone.equippable;
			delete clone.balancingData;
			delete clone.configData;
			delete clone.maximumCampOrdinal;
			
			if (this.foundPosition == null)
				delete clone.foundPosition;

			return clone;
		},

		clone: function () {
			var clone = new ItemVO(this.id, this.name, this.type, this.level, this.requiredCampOrdinal, this.maximumCampOrdinal, this.equippable, this.craftable, this.repairable, this.useable, this.bonus.bonuses, this.icon, this.description, this.isSpecialEquipment);
			clone.scavengeRarity = this.scavengeRarity;
			clone.localeRarity = this.localeRarity;
			clone.tradeRarity = this.tradeRarity;
			clone.investigateRarity = this.investigateRarity;
			clone.tradePrice = this.tradePrice;
			clone.broken = this.broken;
			return clone;
		}
	});

	return ItemVO;
});
