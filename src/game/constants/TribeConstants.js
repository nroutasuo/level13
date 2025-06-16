define(['ash', 'game/constants/OccurrenceConstants', 'game/constants/UIConstants'], function (Ash, OccurrenceConstants, UIConstants) {
	
	let TribeConstants = {
		
		milestones: [
			{
				name: "lone camp",
				description: "A shelter for a few rugged outcasts with sparse belongings",
				maxRumours: 100,
				maxEvidence: 100,
				maxHope: 0,
				maxInsight: 0,
				baseReputation: 0,
			},
			{
				name: "small settlement",
				description: "A safe place that several people call home and is starting to accumulate some resources",
				maxRumours: 500,
				maxEvidence: 500,
				maxHope: 1,
				maxInsight: 0,
				baseReputation: 1,
				unlockedEvents: [ OccurrenceConstants.campOccurrenceTypes.raid ],
			},
			{
				name: "multi-level collective",
				description: "The start of something that spans multiple levels",
				maxRumours: 800,
				maxEvidence: 500,
				maxHope: 10,
				maxInsight: 0,
				baseReputation: 2,
			},
			{
				name: "sanguine tribe",
				description: "Enough people to call it a tribe",
				maxRumours: 2000,
				maxEvidence: 1000,
				maxHope: 100,
				maxInsight: 0,
				baseReputation: 3,
			},
			{
				name: "city within the City",
				description: "An organized society with specialized labour and reliable means of food production",
				maxRumours: 3000,
				maxEvidence: 1500,
				maxHope: 300,
				maxInsight: 0,
				baseReputation: 4,
				unlockedFeatures: [ UIConstants.UNLOCKABLE_FEATURE_WORKER_AUTO_ASSIGNMENT ],
			},
			{
				name: "multiplex society",
				description: "A tribe that spans multiple levels",
				maxRumours: 8000,
				maxEvidence: 2000,
				maxHope: 600,
				maxInsight: 100,
				baseReputation: 5,
			},
			{
				name: "dominant state",
				description: "A society that has shown it can not only survive, but progress",
				maxRumours: 15000,
				maxEvidence: 3000,
				maxHope: 1000,
				maxInsight: 200,
				baseReputation: 6,
			},
			{
				name: "civilization rebuilt",
				description: "A new civilization born from the ruins of the old one",
				maxRumours: 20000,
				maxEvidence: 4000,
				maxHope: 1500,
				maxInsight: 500,
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
