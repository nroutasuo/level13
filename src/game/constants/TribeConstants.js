define(['ash', 'game/constants/OccurrenceConstants', 'game/constants/UIConstants'], function (Ash, OccurrenceConstants, UIConstants) {
	
	let TribeConstants = {
		
		milestones: [
			{
				name: "lone camp",
				maxRumours: 100,
				maxEvidence: 300,
				maxFavour: 0,
				baseReputation: 0,
			},
			{
				name: "milestone 1",
				maxRumours: 500,
				maxEvidence: 400,
				maxFavour: 0,
				baseReputation: 1,
				unlockedEvents: [ OccurrenceConstants.campOccurrenceTypes.raid ],
			},
			{
				name: "milestone 2",
				maxRumours: 1000,
				maxEvidence: 500,
				maxFavour: 0,
				baseReputation: 2,
			},
			{
				name: "milestone 3",
				maxRumours: 3000,
				maxEvidence: 600,
				maxFavour: 100,
				baseReputation: 3,
				unlockedFeatures: [ UIConstants.UNLOCKABLE_FEATURE_WORKER_AUTO_ASSIGNMENT ],
			},
			{
				name: "milestone 4",
				maxRumours: 5000,
				maxEvidence: 800,
				maxFavour: 400,
				baseReputation: 4,
			},
			{
				name: "milestone 5",
				maxRumours: 10000,
				maxEvidence: 1000,
				maxFavour: 500,
				baseReputation: 5,
			},
			{
				name: "milestone 6",
				maxRumours: 15000,
				maxEvidence: 3000,
				maxFavour: 1000,
				baseReputation: 6,
			},
			{
				name: "milestone 7",
				maxRumours: 20000,
				maxEvidence: 5000,
				maxFavour: 2000,
				baseReputation: 8,
			},
		],
		
		luxuryType: {
			// consumable
			CHOCOLATE: "CHOCOLATE",
			COFFEE: "COFFEE",
			HONEY: "HONEY",
			OLIVES: "OLIVES",
			SALT: "SALT",
			SPICES: "SPICES",
			TEA: "TEA",
			TOBACCO: "TOBACCO",
			TRUFFLES: "TRUFFLES",
			// materials
			AMBER: "AMBER",
			DIAMONDS: "DIAMONDS",
			EMERALDS: "EMERALDS",
			GOLD: "GOLD",
			IVORY: "IVORY",
			JADE: "JADE",
			PEARLS: "PEARLS",
			SILVER: "SILVER",
		},
		
		possibleLuxuriesByCampOrdinal: [
			{ campOrdinal: 3, possibleLuxuries: [ "CHOCOLATE", "COFFEE", "TEA", "DIAMONDS", "JADE" ] },
			{ campOrdinal: 6, possibleLuxuries: [ "COFFEE", "SALT", "TEA", "AMBER", "GOLD", "JADE", "SILVER", "EMERALDS" ] },
			{ campOrdinal: 8, possibleLuxuries: [ "COFFEE", "HONEY", "TRUFFLES", "OLIVES", "SALT", "AMBER", "PEARLS" ] },
			{ campOrdinal: 10, possibleLuxuries: [ "CHOCOLATE", "COFFEE", "SPICES", "TOBACCO", "DIAMONDS", "EMERALDS", "GOLD", "SILVER" ] },
			{ campOrdinal: 13, possibleLuxuries: [ "CHOCOLATE", "COFFEE", "IVORY", "TOBACCO" ] },
			{ campOrdinal: 15, possibleLuxuries: [ "CHOCOLATE", "COFFEE", "HONEY", "OLIVES", "IVORY", "PEARLS", "SPICES" ] },
		],
		
		init: function () {
			for (let i = 0; i < this.milestones.length; i++) {
				this.milestones[i].index = i;
			}
		},
		
		getMilestone: function (i) {
			let milestone = this.milestones[i] || {};
			milestone.index = i;
			return milestone;
		},
		
		getPreviousMilestone: function (milestone) {
			let previousIndex = milestone.index - 1;
			if (previousIndex < 0) return null;
			return this.milestones[previousIndex];
		},
		
		getNextMilestone: function (milestone) {
			let nextIndex = milestone.index + 1;
			if (nextIndex >= this.milestones.length) return null;
			return this.milestones[nextIndex];
		},
		
		getPossibleLuxuriesByCampOrdinal: function (campOrdinal) {
			for (let i = 0; i < this.possibleLuxuriesByCampOrdinal.length; i++) {
				let entry = this.possibleLuxuriesByCampOrdinal[i];
				if (entry.campOrdinal == campOrdinal) {
					return entry.possibleLuxuries;
				}
			}
			return [];
		},
		
		getMaxNumAvailableLuxuryResources: function (campOrdinal) {
			let result = 0;
			for (let i = 0; i < this.possibleLuxuriesByCampOrdinal.length; i++) {
				let entry = this.possibleLuxuriesByCampOrdinal[i];
				if (entry.campOrdinal <= campOrdinal) {
					result++;
				}
			}
			return result;
		},
		
		getLuxuryDisplayName: function (luxuryType) {
			switch (luxuryType) {
				case TribeConstants.luxuryType.HONEY: return "honey";
				case TribeConstants.luxuryType.OLIVES: return "olives";
				case TribeConstants.luxuryType.TRUFFLES: return "truffles";
				case TribeConstants.luxuryType.CHOCOLATE: return "chocolate";
				case TribeConstants.luxuryType.COFFEE: return "coffee";
				case TribeConstants.luxuryType.SPICES: return "spices";
				case TribeConstants.luxuryType.TOBACCO: return "tobacco";
				case TribeConstants.luxuryType.TEA: return "tea";
				case TribeConstants.luxuryType.AMBER: return "amber";
				case TribeConstants.luxuryType.PEARLS: return "pearls";
				case TribeConstants.luxuryType.IVORY: return "ivory";
				case TribeConstants.luxuryType.SALT: return "salt";
				case TribeConstants.luxuryType.DIAMONDS: return "diamonds";
				case TribeConstants.luxuryType.EMERALDS: return "emeralds";
				case TribeConstants.luxuryType.GOLD: return "gold";
				case TribeConstants.luxuryType.JADE: return "jade";
				case TribeConstants.luxuryType.SILVER: return "silver";
				
				default:
					log.w("unknown luxury resource type: " + luxuryType);
					return luxuryType;
			}
		},
		
	};
	
	TribeConstants.init();
	
	return TribeConstants;
	
});
