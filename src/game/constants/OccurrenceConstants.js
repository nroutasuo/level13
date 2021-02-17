define(['ash', 'utils/MathUtils', 'game/constants/CampConstants', 'game/constants/GameConstants'],
function (Ash, MathUtils, CampConstants, GameConstants) {

    var OccurrenceConstants = {
	
		campOccurrenceTypes: {
			trader: "trader",
			raid: "raid",
		},
		
		OCCURRENCE_CAMP_TRADER_LENGTH: 60 * 5,
		OCCURRENCE_CAMP_TRADER_COOLDOWN: 60 * 25,
		OCCURRENCE_CAMP_TRADER_COOLDOWN_START: 60,
		OCCURRENCE_CAMP_TRADER_VARIATION: 2,
		
		OCCURRENCE_CAMP_RAID_LENGTH: 10,
		OCCURRENCE_CAMP_RAID_COOLDOWN: 60 * 20,
		OCCURRENCE_CAMP_RAID_VARIATION: 3,
		
		getTimeToNext: function (occurrenceType, isNew, upgradeLevel, campPopulation, numCamps) {
			let minimumTime = this.getMinimumTimeToNext(occurrenceType, isNew, numCamps);
            let maximumTime = this.getMaximumTimeToNext(occurrenceType, isNew, numCamps);
            
			let randomFactor = Math.random();
            let upgradeFactor = 1 - (upgradeLevel - 1) * 0.05;
            let populationFactor = 1;
            if (campPopulation < 4) {
                populationFactor = 3;
            } else if (campPopulation < 8) {
                populationFactor = 2;
            } else if (campPopulation < 12) {
                populationFactor = 1.5;
            } else if (campPopulation < 16) {
                populationFactor = 1.25;
            } else if (campPopulation < 32) {
                populationFactor = 1;
            } else {
                populationFactor = 0.9;
            }
            
            var variationFactor = MathUtils.clamp(randomFactor * upgradeFactor * populationFactor, 0, 1);
            var diff = maximumTime - minimumTime;
            var result = Math.floor(minimumTime + diff * variationFactor);
            return result / GameConstants.gameSpeedCamp;
		},
        
        getMinimumTimeToNext: function (occurrenceType, isNew, numCamps) {
            // base value per event type
            let base = 60 * 10;
            switch (occurrenceType) {
                case this.campOccurrenceTypes.trader:
                    if (isNew) {
                        base = this.OCCURRENCE_CAMP_TRADER_COOLDOWN_START;
                    } else {
                        base = this.OCCURRENCE_CAMP_TRADER_COOLDOWN;
                    }
                    break;
                
                case this.campOccurrenceTypes.raid:
                    base = this.OCCURRENCE_CAMP_RAID_COOLDOWN;
                    break;
            }
            // decreasing frequency when lots of camps
            let numCampsFactor = MathUtils.clamp(Math.ceil(numCamps / 2), 0.1, 10);
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
			}
            return this.getMinimumTimeToNext(occurrenceType, isNew, numCamps) * variation;
        },
		
		getDuration: function (occurrenceType) {
			switch(occurrenceType) {
			case this.campOccurrenceTypes.trader:
				return this.OCCURRENCE_CAMP_TRADER_LENGTH;
			
			case this.campOccurrenceTypes.raid:
				return this.OCCURRENCE_CAMP_RAID_LENGTH;
			}
			return 0;
		},
		
		getRaidDanger: function (improvements, soldiers, soldierLevel) {
            soldiers = soldiers || 0;
			var dangerPoints = this.getRaidDangerPoints(improvements)
			var defencePoints = this.getRaidDefencePoints(improvements, soldiers, soldierLevel);
            var result = (dangerPoints - defencePoints) / 25;
			return Math.max(0, Math.min(1, result));
		},
        
        getRaidDangerPoints: function (improvements) {
			var dangerPoints = 0;
			dangerPoints += improvements.getTotal(improvementTypes.camp);
            dangerPoints -= improvements.getCount(improvementNames.fortification);
            dangerPoints -= improvements.getCount(improvementNames.fortification2);
            return dangerPoints * 0.9;
        },
		
		getRaidDefencePoints: function (improvements, soldiers, soldierLevel) {
            return CampConstants.CAMP_BASE_DEFENCE + this.getFortificationsDefencePoints(improvements) + this.getSoldierDefencePoints(soldiers, soldierLevel);
		},
        
        getRaidDefenceString: function (improvements, soldiers, soldierLevel) {
            var result = "Base: " + CampConstants.CAMP_BASE_DEFENCE;
            var fortificationsPoints = this.getFortificationsDefencePoints(improvements);
            if (fortificationsPoints > 0) result += "<br/>Fortifications:" + fortificationsPoints;
            var soldierPoints = this.getSoldierDefencePoints(soldiers, soldierLevel);
            if (soldierPoints > 0) result += "<br/>Soldiers:" + soldierPoints;
            return result;
		},
        
        getFortificationsDefencePoints: function (improvements) {
			var regularFortifications = improvements.getCount(improvementNames.fortification) || 0;
            var improvedFortifications = improvements.getCount(improvementNames.fortification2) || 0;
            return regularFortifications * CampConstants.FORTIFICATION_1_DEFENCE + improvedFortifications * CampConstants.FORTIFICATION_2_DEFENCE;
        },
        
        getSoldierDefencePoints: function (soldiers, soldierLevel) {
            soldiers = soldiers || 0;
            soldierLevel = soldierLevel || 0;
            return soldiers * CampConstants.getSoldierDefence(soldierLevel);
        },
	
    };
    
    return OccurrenceConstants;
    
});
