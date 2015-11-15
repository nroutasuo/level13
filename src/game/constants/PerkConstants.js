define(['ash', 'game/vos/PerkVO'], function (Ash, PerkVO) {
    
    var PerkConstants = {
	
		perkTypes: {
			injury: "Injury",
			movement: "Movement",
			health: "Health",
		},
		
		perkIds: {
			hunger: "hunger",
			thirst: "thirst",
			healthBonus: "health-1",
			healthAugment: "health-2",
		},
		
		perkDefinitions: {
			injury: [],
			health: [],
			movement: [],
		},
	
		getPerk: function (perkId) {
			for (var key in this.perkDefinitions) {
				for (var i = 0; i < this.perkDefinitions[key].length; i++) {
					if (this.perkDefinitions[key][i].id === perkId) return this.perkDefinitions[key][i];
				}
			}
			return null;
		},
		
		isPercentageEffect: function (perkType) {
			switch (perkType) {
				case this.perkTypes.health: return true;
				case this.perkTypes.injury: return true;
				default: return false;
			}
		},
	};
    
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hunger, "Hunger", "Health", -0.5, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.thirst, "Thist", "Health", -0.5, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.healthBonus, "Healthy", "Health", 1.25, "img/items/health-positive.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.healthAugment, "Augmented", "Health", 1.25, "img/items/health-positive.png"));
	PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-big", "Injury (serious)", "Injury", 0.5, "img/items/injury-basic.png"));
	PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-small", "Injury (light)", "Injury", 0.9, "img/items/injury-basic.png"));
	
	return PerkConstants;
    
});
