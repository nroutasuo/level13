define(['ash', 'game/constants/GameConstants'],
function (Ash, GameConstants) {

    var OccurrenceConstants = {
	
		campOccurrenceTypes: {
			trader: "trader",
			raid: "raid",
		},
		
		OCCURRENCE_CAMP_TRADER_LENGTH: 60 * 5,
		OCCURRENCE_CAMP_TRADER_COOLDOWN: 60 * 10,
		OCCURRENCE_CAMP_TRADER_RANDOMNESS: 3,
		
		OCCURRENCE_CAMP_RAID_LENGTH: 5,
		OCCURRENCE_CAMP_RAID_COOLDOWN: 60 * 30,
		OCCURRENCE_CAMP_RAID_RANDOMNESS: 5,
		
		scheduleNext: function (occurrenceType, upgradeTimeFactor) {
			var minimumTime = 1;
			var randomFactor = 1;
			switch (occurrenceType) {
				case this.campOccurrenceTypes.trader:
					minimumTime = this.OCCURRENCE_CAMP_TRADER_COOLDOWN;
					randomFactor = 1 + (Math.random() * this.OCCURRENCE_CAMP_TRADER_RANDOMNESS);
					break;
				
				case this.campOccurrenceTypes.raid:
					minimumTime = this.OCCURRENCE_CAMP_RAID_COOLDOWN;
					randomFactor = 1 + (Math.random() * this.OCCURRENCE_CAMP_RAID_RANDOMNESS);
					break;
			}
			return Math.floor(minimumTime * randomFactor * upgradeTimeFactor) / GameConstants.gameSpeedCamp;
		},
		
		getDuration: function(occurrenceType) {
			switch(occurrenceType) {
			case this.campOccurrenceTypes.trader:
				return this.OCCURRENCE_CAMP_TRADER_LENGTH;
			
			case this.campOccurrenceTypes.raid:
				return this.OCCURRENCE_CAMP_RAID_LENGTH;
			}
			return 0;
		},
		
		getRaidDanger: function (improvements, soldiers, fortificationUpgradeLevel) {
			var dangerPoints = 0;
			dangerPoints += Math.max(0, improvements.getTotal(improvementTypes.camp));
			var defencePoints = this.getRaidDefence(improvements, soldiers, fortificationUpgradeLevel);
			return dangerPoints / (defencePoints + 1);
		},
		
		getRaidDefence: function (improvements, soldiers, fortificationUpgradeLevel) {
			return improvements.getCount(improvementNames.fortification) * (5 + fortificationUpgradeLevel * 5) + soldiers;
		}
	
    };
    
    return OccurrenceConstants;
    
});
