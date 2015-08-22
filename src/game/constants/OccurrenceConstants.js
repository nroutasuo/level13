define(['ash'],
function (Ash) {

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
			console.log(occurrenceType + " " +  Math.floor(minimumTime * randomFactor * upgradeTimeFactor) + " " + Math.floor(minimumTime * randomFactor));
			return Math.floor(minimumTime * randomFactor * upgradeTimeFactor);
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
		
		getRaidDanger: function (improvements, soldiers) {
			var dangerPoints = 0;
			dangerPoints += improvements.getAll().length;
			var defencePoints = this.getRaidDefence(improvements, soldiers);
			return dangerPoints / defencePoints * 100;
		},
		
		getRaidDefence: function (improvements, soldiers) {
			return 20 + improvements.getCount(improvementNames.fortification) * 20 + soldiers;
		}
	
    };
    
    return OccurrenceConstants;
    
});
