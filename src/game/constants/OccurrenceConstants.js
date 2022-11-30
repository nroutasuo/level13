define(['ash', 'utils/MathUtils', 'game/constants/CampConstants', 'game/constants/GameConstants'],
function (Ash, MathUtils, CampConstants, GameConstants) {

	var OccurrenceConstants = {
	
		campOccurrenceTypes: {
			trader: "trader",
			raid: "raid",
			recruit: "recruit"
		},
		
		EVENT_DURATION_INFINITE: -999,
		
		OCCURRENCE_CAMP_TRADER_LENGTH: 60 * 10,
		OCCURRENCE_CAMP_TRADER_COOLDOWN: 60 * 20,
		OCCURRENCE_CAMP_TRADER_COOLDOWN_START: 60,
		OCCURRENCE_CAMP_TRADER_VARIATION: 1.5,
		
		OCCURRENCE_CAMP_RAID_LENGTH: 10,
		OCCURRENCE_CAMP_RAID_COOLDOWN: 60 * 20,
		OCCURRENCE_CAMP_RAID_VARIATION: 3,
		
		OCCURRENCE_CAMP_RECRUIT_LENGTH: 60 * 5,
		OCCURRENCE_CAMP_RECRUIT_COOLDOWN: 60 * 20,
		OCCURRENCE_CAMP_RECRUIT_VARIATION: 3,
		
		getTimeToNext: function (occurrenceType, isNew, upgradeLevel, reputation, numCamps) {
			let minimumTime = this.getMinimumTimeToNext(occurrenceType, isNew, numCamps);
			let maximumTime = this.getMaximumTimeToNext(occurrenceType, isNew, numCamps);
			
			let randomFactor = Math.random();
            let upgradeFactor = 1 - (upgradeLevel - 1) * 0.05;
			let reputationFactor = 1 - MathUtils.map(reputation, 1, CampConstants.MAX_REPUTATION, 0, 1);
			
			let variationFactor = MathUtils.clamp(randomFactor * upgradeFactor * reputationFactor, 0, 1);
			let diff = maximumTime - minimumTime;
			let result = Math.floor(minimumTime + diff * variationFactor);
			
			return result / GameConstants.gameSpeedCamp;
		},
		
		getMinimumTimeToNext: function (occurrenceType, isNew, numCamps) {
			// base value per event type
			let base = 60 * 10;
			let numCampsFactor = 1;
			switch (occurrenceType) {
				case this.campOccurrenceTypes.trader:
					if (isNew) {
						base = this.OCCURRENCE_CAMP_TRADER_COOLDOWN_START;
					} else {
						base = this.OCCURRENCE_CAMP_TRADER_COOLDOWN;
					}
					numCampsFactor = numCamps;
					break;
				
				case this.campOccurrenceTypes.raid:
					base = this.OCCURRENCE_CAMP_RAID_COOLDOWN;
					break;
				case this.campOccurrenceTypes.recruit:
					base = this.OCCURRENCE_CAMP_RECRUIT_COOLDOWN;
					numCampsFactor = numCamps;
					break;
			}
			
			return base * numCampsFactor;
		},
		
		getMaximumTimeToNext: function (occurrenceType, isNew, numCamps) {
			let variation = 2;
			switch (occurrenceType) {
				case this.campOccurrenceTypes.trader:
					variation = this.OCCURRENCE_CAMP_TRADER_VARIATION;
					break;
				
				case this.campOccurrenceTypes.raid:
					variation = this.OCCURRENCE_CAMP_RAID_VARIATION;
					break;
				
				case this.campOccurrenceTypes.recruit:
					variation = this.OCCURRENCE_CAMP_RECRUIT_VARIATION;
					break;
			}
			
			return this.getMinimumTimeToNext(occurrenceType, isNew, numCamps) * variation;
		},
		
		getDuration: function (occurrenceType) {
			switch(occurrenceType) {
				case this.campOccurrenceTypes.trader:
					return this.OCCURRENCE_CAMP_TRADER_LENGTH;
				
				case this.campOccurrenceTypes.raid:
					return this.OCCURRENCE_CAMP_RAID_LENGTH;
				
				case this.campOccurrenceTypes.recruit:
					return this.OCCURRENCE_CAMP_RECRUIT_LENGTH;
			}
			return 0;
		},
		
		getRaidDanger: function (improvements, soldiers, soldierLevel, levelRaidDangerFactor) {
			soldiers = soldiers || 0;
			var dangerPoints = this.getRaidDangerPoints(improvements, levelRaidDangerFactor);
			var defencePoints = this.getRaidDefencePoints(improvements, soldiers, soldierLevel);
			let result = (dangerPoints - defencePoints) / 25;
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
			if (soldierPoints > 0) result += "<br/>Soldiers:" + soldierPoints;
			
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
