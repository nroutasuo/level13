define(['ash', 'game/vos/PerkVO'], function (Ash, PerkVO) {
	
	var PerkConstants = {
	
		perkTypes: {
			injury: "Injury",
			movement: "Movement",
			health: "Health",
			stamina: "Stamina",
			light: "Light",
			luck: "Luck",
			visualNegative: "VisualN",
			visualPositive: "VisualP",
		},
		
		perkIds: {
			hunger: "hunger",
			thirst: "thirst",
			tired: "tired",
			blessed: "blessed",
			healthPenalty: "health--",
			healthBonus1: "health-1",
			healthBonus2: "health-2",
			healthBonus3: "health-3",
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
			luck: [],
			visualNegative: [],
			visualPositive: [],
		},
		
		perkStatus: {
			ACTIVATING: 1,
			ACTIVE: 2,
			DEACTIVATING: 3,
		},
		
		injuryType: {
			BLUNT: "BLUNT",
			SHARP: "SHARP",
			FIRE: "FIRE",
			CHEMICAL: "CHEMICAL",
		},
		
		injuryLevel: {
			LIGHT: "LIGHT",
			MEDIUM: "MEDIUM",
			SERIOUS: "SERIOUS"
		},
		
		PERK_RECOVERY_FACTOR_REST: 3,
		TIMER_DISABLED: -1,
		
		ACTIVATION_TIME_HEALTH_DEBUFF: 30,
		
		addInjuryDefinition: function (injuryLevel, injuryType, idBase, name) {
			let id = "injury-" + injuryLevel.toLowerCase() + "-" + idBase;
			let effect = 1;
			
			switch (injuryLevel) {
				case PerkConstants.injuryLevel.LIGHT:
					effect = 0.9;
					levelAsNumber = 3;
					break;
				case PerkConstants.injuryLevel.MEDIUM:
					effect = 0.7;
					levelAsNumber = 2;
					break;
				case PerkConstants.injuryLevel.SERIOUS:
					effect = 0.5;
					levelAsNumber = 1;
					break;
			}
			
			let icon = "img/items/injury-" + levelAsNumber + ".png";
			let perkVO = new PerkVO(id, name, "Injury", effect, icon, 0);
			perkVO.injuryType = injuryType;
			
			PerkConstants.perkDefinitions.injury.push(perkVO);
		},
	
		getPerk: function (perkId, startTimer, removeTimer) {
			for (var key in this.perkDefinitions) {
				for (let i = 0; i < this.perkDefinitions[key].length; i++) {
					if (this.perkDefinitions[key][i].id === perkId) {
						let result = this.perkDefinitions[key][i].clone();
						result.setStartTimer(startTimer || PerkConstants.TIMER_DISABLED);
						result.setRemoveTimer(removeTimer || PerkConstants.TIMER_DISABLED);
						return result;
					};
				}
			}
			return null;
		},
		
		getRandomInjury: function (allowedTypes) {
			let options = [];
			
			for (let i = 0; i < PerkConstants.perkDefinitions.injury.length; i++) {
				let perk = PerkConstants.perkDefinitions.injury[i];
				if (!allowedTypes || allowedTypes.length == 0 || allowedTypes.indexOf(perk.injuryType) >= 0) {
					options.push(perk);
				}
			}
			
			return options[Math.floor(Math.random() * options.length)];
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

		isNegative: function (perk) {
			switch (perk.type) {
				case PerkConstants.perkTypes.injury:
				case PerkConstants.perkTypes.visualNegative:
					return true;
				case PerkConstants.perkTypes.movement:
					return perk.effect > 1;
				default:
					return perk.effect < 1;
			}
		},
		
		getCurrentEffect: function (perk) {
			var status = this.getStatus(perk);
			switch (status) {
				case PerkConstants.perkStatus.ACTIVE: return perk.effect;
				case PerkConstants.perkStatus.DEACTIVATING:
					return this.getPartialEffect(perk, perk.effectFactor);
				case PerkConstants.perkStatus.ACTIVATING:
					var activePercent = this.getPerkActivePercent(perk);
					return this.getPartialEffect(perk, activePercent);
			}
		},
		
		getPerkActivePercent: function (perk) {
			if (perk.removeTimer != PerkConstants.TIMER_DISABLED)
				return 1;
			if (perk.startTimer == PerkConstants.TIMER_DISABLED)
				return 1;
			var duration = perk.startTimerDuration || perk.startTimer;
			var activePercent = Math.min(1, 1 - perk.startTimer / duration);
			activePercent = Math.round(activePercent * 10) / 10;
			return activePercent;
		},
		
		getPartialEffect: function (perk, percent) {
			if (this.isPercentageEffect(perk.type)) {
				if (perk.effect > 1) {
					let mod = perk.effect - 1;
					return 1 + mod * percent;
				} else {
					let mod = 1 - perk.effect;
					return 1 - mod * percent;
				}
			} else {
				return perk.effect * percent;
			}
		},
		
		getStatus: function (perk) {
			if (perk.removeTimer != PerkConstants.TIMER_DISABLED) {
				return PerkConstants.perkStatus.DEACTIVATING;
			}
			if (perk.startTimer != PerkConstants.TIMER_DISABLED) {
				return PerkConstants.perkStatus.ACTIVATING;
			}
			return PerkConstants.perkStatus.ACTIVE;
		},
		
		getRemoveTimeFactor: function (perk, isResting) {
			return this.isNegative(perk) && isResting ? PerkConstants.PERK_RECOVERY_FACTOR_REST : 1;
		},
		
		getStartTimeFactor: function (perk, isResting) {
			return 1;
		},
		
	};
	
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.healthBonus1, "Healthy", "Health", 1.1, "img/items/health-positive.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.healthBonus2, "Augmented (L1)", "Health", 1.25, "img/items/health-positive.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.healthBonus3, "Augmented (L2)", "Health", 1.5, "img/items/health-positive.png"));
	
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hunger, "Hunger", "Health", 0.75, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.thirst, "Thirst", "Health", 0.75, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hazardRadiation, "Radiation sickness", "Health", 0.25, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hazardPoison, "Poisoned", "Health", 0.5, "img/items/health-negative.png"));
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.hazardCold, "Cold", "Health", 0.75, "img/items/health-negative.png"));
	
	PerkConstants.perkDefinitions.health.push(new PerkVO(PerkConstants.perkIds.encumbered, "Encumbered", "Movement", 1.5, "img/items/weight.png"));
	
	PerkConstants.perkDefinitions.stamina.push(new PerkVO(PerkConstants.perkIds.staminaBonus, "Energized", "Stamina", 1, "img/items/health-positive.png"));
	PerkConstants.perkDefinitions.stamina.push(new PerkVO(PerkConstants.perkIds.staminaBonusPenalty, "Headache", "Stamina", 0.9, "img/items/health-negative.png"));
	
	PerkConstants.perkDefinitions.stamina.push(new PerkVO(PerkConstants.perkIds.lightBeacon, "Beacon", "Light", 20, "img/items/perk-light-beacon.png"));
	
	PerkConstants.perkDefinitions.luck.push(new PerkVO(PerkConstants.perkIds.blessed, "Blessed", "Luck", 20, "img/items/perk-blessed.png"));
	
	PerkConstants.perkDefinitions.visualNegative.push(new PerkVO(PerkConstants.perkIds.tired, "Tired", "VisualN", 0, "img/items/perk-tired.png"));
	
	let woundBodyParts = ["Leg", "Arm", "Head", "Foot", "Chest", "Hand"];
	for (let i = 0; i < woundBodyParts.length; i++) {
		let bodyPart = woundBodyParts[i];
		let id = "wounded-" + bodyPart.toLowerCase();
		
		if (bodyPart != "Head") {
			PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.LIGHT, PerkConstants.injuryType.SHARP, id, bodyPart + " wound (light)");
		}
		if (bodyPart != "Hand") {
			PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.SHARP, id, bodyPart + " wound (medium)");
		}
		if (bodyPart != "Foot" && bodyPart != "Hand") {
			PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.SERIOUS, PerkConstants.injuryType.SHARP, id, bodyPart + " wound (serious)");
		}
	}
	
	let bruiseBodyParts = ["Leg", "Arm", "Shoulder", "Knee" ];
	for (let i = 0; i < woundBodyParts.length; i++) {
		let bodyPart = woundBodyParts[i];
		let id = "bruised-" + bodyPart.toLowerCase();
		
		PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.LIGHT, PerkConstants.injuryType.BLUNT, id, "Bruised " + bodyPart + " (light)");
		PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.BLUNT, id, "Bruised " + bodyPart + " (medium)");
	}
	
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.LIGHT, PerkConstants.injuryType.FIRE, "burn-fire", "Burn (light)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.FIRE, "burn-fire", "Burn (medium)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.SERIOUS, PerkConstants.injuryType.FIRE, "burn-fire", "Burn (serious)");
	
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.LIGHT, PerkConstants.injuryType.CHEMICAL, "burn-chemical", "Chemical burn (light)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.CHEMICAL, "burn-chemical", "Chemical burn (medium)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.SERIOUS, PerkConstants.injuryType.CHEMICAL, "burn-chemical", "Chemical burn (serious)");
	
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.BLUNT, "sprained-ankle", "Sprained ankle (medium)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.SERIOUS, PerkConstants.injuryType.BLUNT, "sprained-ankle", "Sprained ankle (serious)");
	
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.BLUNT, "broken-wrist", "Broken wrist (medium)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.SERIOUS, PerkConstants.injuryType.BLUNT, "broken-wrist", "Broken wrist (serious)");
	
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.BLUNT, "broken-thumb", "Broken thumb (medium)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.BLUNT, "broken-finger", "Broken finger (medium)");
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.BLUNT, "broken-toe", "Broken toe (medium)");
	
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.MEDIUM, PerkConstants.injuryType.BLUNT, "dislocated-shoulder", "Dislocated shoulder");
	
	PerkConstants.addInjuryDefinition(PerkConstants.injuryLevel.SERIOUS, PerkConstants.injuryType.BLUNT, "broken-rib", "Broken rib");
		
	return PerkConstants;
	
});
