define(['ash', 'game/vos/PerkVO'], function (Ash, PerkVO) {
    
    var PerkConstants = {
	
		perkTypes: {
			injury: "Injury",
			movement: "Movement",
			health: "Health",
			stamina: "Stamina",
            light: "Light",
		},
		
		perkIds: {
			hunger: "hunger",
			thirst: "thirst",
			healthBonus: "health-1",
			healthAugment: "health-2",
			hazardRadiation: "hazard-radiation",
			hazardPoison: "hazard-poison",
			hazardCold: "hazard-cold",
            encumbered: "encumbered",
            staminaBonus: "energized",
            staminaBonusPenalty: "headache",
            lightBeacon: "beacon",
		},
		
		perkDefinitions: {
			injury: [],
			health: [],
			stamina: [],
			movement: [],
		},
        
        PERK_RECOVERY_FACTOR_REST: 3,
        TIMER_DISABLED: -1,
	
		getPerk: function (perkId, effectTimer) {
			for (var key in this.perkDefinitions) {
				for (var i = 0; i < this.perkDefinitions[key].length; i++) {
					if (this.perkDefinitions[key][i].id === perkId) {
                        var result = this.perkDefinitions[key][i].clone();
                        result.effectTimer = effectTimer || PerkConstants.TIMER_DISABLED;
                        return result;
                    };
				}
			}
			return null;
		},
		
		isPercentageEffect: function (perkType) {
			switch (perkType) {
				case this.perkTypes.health: return true;
				case this.perkTypes.injury: return true;
				case this.perkTypes.stamina: return true;
				case this.perkTypes.movement: return true;
				default: return false;
			}
		},
	};
    
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hunger, "Hunger", "Health", 0.5, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.thirst, "Thirst", "Health", 0.5, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.healthBonus, "Healthy", "Health", 1.25, "img/items/health-positive.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.healthAugment, "Augmented", "Health", 1.25, "img/items/health-positive.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hazardRadiation, "Radiation sickness", "Health", 0.25, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hazardPoison, "Poisoned", "Health", 0.5, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hazardCold, "Cold", "Health", 0.75, "img/items/health-negative.png"));
    PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.encumbered, "Encumbered", "Movement", 1.5, "img/items/weight.png"));
    
    PerkConstants.perkDefinitions.stamina.push(new PerkVO(PerkConstants.perkIds.staminaBonus, "Energized", "Stamina", 1.5, "img/items/health-positive.png"));
    PerkConstants.perkDefinitions.stamina.push(new PerkVO(PerkConstants.perkIds.staminaBonusPenalty, "Headache", "Stamina", 0.9, "img/items/health-negative.png"));
    
    PerkConstants.perkDefinitions.stamina.push(new PerkVO(PerkConstants.perkIds.lightBeacon, "Beacon", "Light", 20, "img/items/perk-light-beacon.png"));
    
    var lightInjuryEffect = 0.9;
    var medInjuryEffect = 0.7;
    var seriousInjuryEffect = 0.5;
    var bodyParts = ["Leg", "Arm", "Head", "Foot", "Chest", "Hand"];
    for (var i = 0; i < bodyParts.length; i++) {
        var id = bodyParts[i].toLowerCase();
        PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-big-" + id, bodyParts[i] + " wound (serious)", "Injury", seriousInjuryEffect, "img/items/injury-1.png"));
        PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-med-" + id, bodyParts[i] + " wound (medium)", "Injury", medInjuryEffect, "img/items/injury-2.png"));
        PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-small-" + id, bodyParts[i] + " wound (light)", "Injury", lightInjuryEffect, "img/items/injury-3.png"));
    }
    var injuryTypes = [ "Burn", "Strained ankle", "Broken rib"];
    for (var j = 0; j < injuryTypes.length; j++) {
        var id = injuryTypes[j].toLowerCase();
        PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-big-" + id, injuryTypes[j] + " (serious)", "Injury", seriousInjuryEffect, "img/items/injury-1.png"));
        PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-med-" + id, injuryTypes[j] + " (medium)", "Injury", medInjuryEffect, "img/items/injury-2.png"));
        PerkConstants.perkDefinitions.injury.push(new PerkVO("injury-small-" + id, injuryTypes[j] + " (light)", "Injury", lightInjuryEffect, "img/items/injury-3.png"));
    }
	
	return PerkConstants;
    
});
