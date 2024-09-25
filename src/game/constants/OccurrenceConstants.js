define(['ash', 'utils/MathUtils', 'game/constants/CampConstants', 'game/constants/GameConstants'],
	function (Ash, MathUtils, CampConstants, GameConstants) {

	let OccurrenceConstants = {
	
		campOccurrenceTypes: {
			accident: "accident",
			birth: "birth",
			disaster: "disaster",
			disease: "disease",
			raid: "raid",
			recruit: "recruit",
			refugees: "refugees",
			trader: "trader",
			visitor: "visitor",
		},

		// NTOE: all times are in seconds
		
		EVENT_DURATION_INFINITE: -999,

		campOccurrenceDurations: {
			accident: 0,
			disaster: 10,
			disease: -999,
			raid: 10,
			recruit: 60 * 5,
			refugees: 60 * 10,
			trader: 60 * 10,
			visitor: 60 * 5,
		},

		campOccurrenceCooldowns: {
			accident: 60 * 30,
			disaster: 60 * 60,
			disease: 60 * 30,
			raid: 60 * 20,
			recruit: 60 * 25,
			refugees: 60 * 30,
			trader: 60 * 20,
			visitor: 60 * 10,
		},

		campOccurrenceCooldownsNew: {
			trader: 60,
		},
		
		campOccurrenceCooldownsVariations: {
			accident: 5,
			disaster: 5,
			disease: 3,
			raid: 3,
			recruit: 3,
			refugees: 3,
			trader: 1.5,
			visitor: 2,
		},

		RAID_RANGER_FACTOR: 1 / 25,
		
		getTimeToNext: function (occurrenceType, isNew, upgradeLevel, reputation, numCamps) {
			let minimumTime = this.getMinimumTimeToNext(occurrenceType, isNew, numCamps);
			let maximumTime = this.getMaximumTimeToNext(occurrenceType, isNew, numCamps);
			
			let randomFactor = Math.random();
            let upgradeFactor = 1 - (upgradeLevel - 1) * 0.075;
			let reputationFactor = 1 - MathUtils.map(reputation, 1, CampConstants.MAX_REPUTATION, 0, 1);
			
			let variationFactor = MathUtils.clamp(randomFactor * upgradeFactor * reputationFactor, 0, 1);
			let diff = maximumTime - minimumTime;
			let result = Math.floor(minimumTime + diff * variationFactor);
			
			return result / GameConstants.gameSpeedCamp;
		},
		
		getMinimumTimeToNext: function (occurrenceType, isNew, numCamps) {
			let baseValue = this.campOccurrenceCooldowns[occurrenceType] || 60 * 10;
			let numCampsFactor = 1;

			if (isNew) {
				baseValue = this.campOccurrenceCooldownsNew[occurrenceType] || baseValue;
			}

			switch (occurrenceType) {
				case this.campOccurrenceTypes.disaster:
				case this.campOccurrenceTypes.trader:
				case this.campOccurrenceTypes.recruit:
				case this.campOccurrenceTypes.visitor:
					numCampsFactor = numCamps;
					break;
			}
			
			return baseValue * numCampsFactor;
		},
		
		getMaximumTimeToNext: function (occurrenceType, isNew, numCamps) {
			let variation = this.campOccurrenceCooldownsVariations[occurrenceType] || 2;
			return this.getMinimumTimeToNext(occurrenceType, isNew, numCamps) * variation;
		},
		
		getDuration: function (occurrenceType) {
			return this.campOccurrenceDurations[occurrenceType] || 0;
		},

		isNegative: function (occurrenceType) {
			switch (occurrenceType) {
				case OccurrenceConstants.campOccurrenceTypes.accident: return true;
				case OccurrenceConstants.campOccurrenceTypes.disaster: return true;
				case OccurrenceConstants.campOccurrenceTypes.disease: return true;
				case OccurrenceConstants.campOccurrenceTypes.raid: return true;
				default: return false;
			}
		},

		getDiseaseOutbreakChance: function (population, hasHerbs, hasMedicine) {
			let rawChance = population / (population + 80);
			let baseChance = Math.min(0.5, rawChance);
			
			if (hasMedicine) {
				return baseChance * this.getDiseaseMedicineFactor();
			} else if (hasHerbs) {
				return baseChance * this.getDiseaseHerbsFactor();
			} else {
				return baseChance;
			}
		},

		getDiseaseMedicineFactor: function () {
			return 0.2;
		},

		getDiseaseHerbsFactor: function () {
			return 0.5;
		},
		
		getRaidDanger: function (improvements, soldiers, soldierLevel, levelRaidDangerFactor) {
			soldiers = soldiers || 0;
			let dangerPoints = this.getRaidDangerPoints(improvements, levelRaidDangerFactor);
			let defencePoints = this.getRaidDefencePoints(improvements, soldiers, soldierLevel);
			let result = (dangerPoints - defencePoints) * this.RAID_RANGER_FACTOR;
			return Math.max(0, Math.min(1, result));
		},
		
		getRaidDangerPoints: function (improvements, levelRaidDangerFactor) {
			levelRaidDangerFactor = levelRaidDangerFactor || 1;
			var dangerPoints = 0;
			dangerPoints += improvements.getTotal(improvementTypes.camp);
			dangerPoints *= levelRaidDangerFactor;
			dangerPoints -= improvements.getCount(improvementNames.fortification);
			return Math.round(dangerPoints * 0.9);
		},
		
		getRaidDefencePoints: function (improvements, soldiers, soldierLevel) {
			return CampConstants.CAMP_BASE_DEFENCE
				+ this.getFortificationsDefencePoints(improvements)
				+ this.getSoldierDefencePoints(soldiers, soldierLevel, improvements.getLevel(improvementNames.barracks));
		},
		
		getRaidDefenceString: function (improvements, soldiers, soldierLevel) {
			let result = "Base: " + CampConstants.CAMP_BASE_DEFENCE;
			
			let fortificationsPoints = this.getFortificationsDefencePoints(improvements);
			let fortificationsPointsWithoutDamaged = this.getFortificationsDefencePoints(improvements, true);
			let fortificationsPointsDiff = fortificationsPoints - fortificationsPointsWithoutDamaged;
			if (fortificationsPointsWithoutDamaged > 0) {
				result += "<br/>Fortifications: " + fortificationsPointsWithoutDamaged;
				if (fortificationsPoints != fortificationsPointsWithoutDamaged) {
					result += "<br/>Damage: -" + fortificationsPointsDiff;
				}
			}
			let soldierPoints = this.getSoldierDefencePoints(soldiers, soldierLevel, improvements.getLevel(improvementNames.barracks));
			if (soldierPoints > 0) result += "<br/>Soldiers: " + soldierPoints;
			
			return result;
		},
		
		getFortificationsDefencePoints: function (improvements, ignoreDamaged) {
			let count = improvements.getCountWithModifierForDamaged(improvementNames.fortification, ignoreDamaged ? 1 : 0.5) || 0;
			let level = improvements.getLevel(improvementNames.fortification) || 1;
			let levelFactor = 1 + (level - 1) * 0.5;
			return count * CampConstants.FORTIFICATION_1_DEFENCE * levelFactor;
		},
		
		getSoldierDefencePoints: function (soldiers, soldierLevel, barracksLevel) {
			soldiers = soldiers || 0;
			soldierLevel = soldierLevel || 0;
			return soldiers * CampConstants.getSoldierDefence(soldierLevel, barracksLevel);
		},
	
	};
	
	return OccurrenceConstants;
	
});
