define(['game/constants/CampConstants'], function (CampConstants) {
	
	var ImprovementConstants = {

		improvements: {
			beacon: {
				description: "Shines a light over a large area, making scavenging less dangerous.",
			},
			home: {
				description: "Foundation of a camp.",
				useActionName: "Rest",
				improvementLevelsPerTechLevel: 0,
				sortScore: 10000,
			},
			campfire: {
				displayNames: [ "Campfire", "Townfire", "Everfire" ],
				description: "Increases rumour generation and unlocks upgrades.",
				useActionName: "Sit down",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
				logMsgImproved: "Made the campfire a bit cozier",
			},
			house: {
				displayNames: [ "Hut", "House" ],
				description: "A place for " + CampConstants.POPULATION_PER_HOUSE + " people to stay.",
				improvementLevelsPerTechLevel: 0,
				sortScore: 9000,
			},
			house2: {
				description: "Houses " + CampConstants.POPULATION_PER_HOUSE2 + " people.",
				sortScore: 9000,
			},
			storage: {
				description: "Increases resource storage.",
				improvementLevelsPerTechLevel: 1,
				sortScore: 8000,
			},
			hospital: {
				canBeDismantled: true,
				displayNames: [ "Clinic", "Hospital", "Medical Center" ],
				description: "Enables healing injuries.",
				useActionName: "Treatment",
				useActionName2: "Augment",
				improvementLevelsPerTechLevel: 1,
				improvementLevelsPerMajorLevel: 1,
			},
			market: {
				canBeDismantled: true,
				description: "Enables foreign traders to visit.",
				useActionName: "Visit",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			inn: {
				canBeDismantled: true,
				description: "Increases rumours and enables recruiting followers.",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			library: {
				canBeDismantled: true,
				description: "Generates evidence.",
				improvementLevelsPerTechLevel: 5,
				logMsgImproved: "Upgraded the library",
			},
			darkfarm: {
				canBeDismantled: true,
				description: "Produces food.",
				improvementLevelsPerTechLevel: 5,
				sortScore: 10,
			},
			aqueduct: {
				description: "Water infrastructure to improve collecting efficiency.",
				improvementLevelsPerTechLevel: 1,
			},
			temple: {
				canBeDismantled: true,
				description: "A central location for religious and cultural activities.",
				useActionName: "Donate",
				improvementLevelsPerTechLevel: 5,
			},
			shrine: {
				canBeDismantled: true,
				description: "A place to connect to the strange spirits.",
				useActionName: "Meditate",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			barracks: {
				canBeDismantled: true,
				description: "Houses soldiers that improve camp defences.",
				improvementLevelsPerTechLevel: 1,
			},
			apothecary: {
				canBeDismantled: true,
				description: "Enables production of medicine.",
				improvementLevelsPerTechLevel: 5,
				sortScore: 50,
			},
			smithy: {
				canBeDismantled: true,
				description: "Workspace for toolsmiths.",
				improvementLevelsPerTechLevel: 5,
				sortScore: 50,
			},
			cementmill: {
				canBeDismantled: true,
				description: "Enables production of a new kind of construction material.",
				improvementLevelsPerTechLevel: 5,
				sortScore: 50,
			},
			stable: {
				canBeDismantled: true,
				description: "Space to set up a trading caravan.",
 				improvementLevelsPerTechLevel: 1,
			},
			fortification: {
				canBeDismantled: true,
				description: "Increases camp defences.",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			researchcenter: {
				canBeDismantled: true,
				description: "Generates evidence.",
				improvementLevelsPerTechLevel: 5,
			},
			tradepost: {
				description: "Connect camps to a trade network.",
			},
			radiotower: {
				canBeDismantled: true,
				description: "Increases reputation.",
				improvementLevelsPerTechLevel: 5,
			},
			robotFactory: {
				canBeDismantled: true,
				description: "Enables production and storage of worker robots.",
				improvementLevelsPerTechLevel: 5
			},
			lights: {
				canBeDismantled: true,
				description: "Keep the darkness at bay for good.",
			},
			square: {
				canBeDismantled: true,
				description: "A place to relax and socialize.",
				improvementLevelsPerTechLevel: 1,
			},
			garden: {
				canBeDismantled: true,
				description: "A dash of beauty in the concrete desert.",
 				improvementLevelsPerTechLevel: 1,
			},
			generator: {
				canBeDismantled: true,
				description: "Increases reputation bonus from housing (" + CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR + "% per house).",
				improvementLevelsPerTechLevel: 10,
				logMsgImproved: "Fixed up the generator",
			},
			collector_water: {
				improvementLevelsPerTechLevel: 1,
			},
			collector_food: {
				improvementLevelsPerTechLevel: 1,
			},
			greenhouse: {
				isProject: true,
			},
			luxuryOutpost: {
				isProject: true,
			},
			passageUpStairs: {
				isPassage: true,
				isProject: true,
			},
			passageUpElevator: {
				isPassage: true,
				isProject: true,
			},
			passageUpHole: {
				isPassage: true,
				isProject: true,
			},
			passageDownStairs: {
				isPassage: true,
				isProject: true,
			},
			passageDownElevator: {
				isPassage: true,
				isProject: true,
			},
			passageDownHole: {
				isPassage: true,
				isProject: true,
			},
			spaceship1: {
				isProject: true,
			},
			spaceship2: {
				isProject: true,
			},
			spaceship3: {
				isProject: true,
			},
			sundome: {
				isProject: true,
			},
		},
		
		getDef: function (improvementID) {
			let def = this.improvements[improvementID];
			if (!def) {
				let id = this.getImprovementID(improvementID);
				def = this.improvements[id];
			}
			if (!def) {
				log.w("no improvement def found: " + improvementID);
				return {};
			}
			return def;
		},
		
		getMaxLevel: function (improvementID, techLevel) {
			techLevel = techLevel || 1;
			let def = this.getDef(improvementID);
			if (!def) return 1;
			
			let improvementLevelsPerTechLevel = def.improvementLevelsPerTechLevel || 0;
			
			return Math.max(1, improvementLevelsPerTechLevel * techLevel);
		},
		
		getRequiredTechLevelForLevel: function (improvementID, level) {
			let def = this.getDef(improvementID);
			if (!def) return 1;
			
			let improvementLevelsPerTechLevel = def.improvementLevelsPerTechLevel || 0;
			if (improvementLevelsPerTechLevel < 1) {
				return 1;
			}
			
			return Math.ceil(level / improvementLevelsPerTechLevel);
		},
		
		getMajorLevel: function (improvementID, level) {
			let def = this.getDef(improvementID);
			if (!def) return 1;
			
			let improvementLevelsPerMajorLevel = def.improvementLevelsPerMajorLevel || 0;
			if (improvementLevelsPerMajorLevel < 1) {
				return 1;
			}
			
			return Math.ceil(level / improvementLevelsPerMajorLevel);
		},
		
		getImprovementID: function (improvementName) {
			for (var key in improvementNames) {
				var name = improvementNames[key];
				if (name == improvementName) return key;
			}
			return null;
		},
		
		getImprovementDisplayName: function (improvementID, level) {
			level = level || 1;
			let def = this.getDef(improvementID);
			let result = improvementNames[improvementID] || "[" + improvementID + "]";
			if (!def) return result;
			let names = def.displayNames;
			if (!names || names.length == 0) return result;
			let majorLevel = this.getMajorLevel(improvementID, level);
			let index = Math.min(majorLevel - 1, names.length - 1);
			return names[index];
		},
		
		getImproveActionName: function (improvementName) {
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			let improvementType = getImprovementType(improvementName);
			if (improvementType == improvementTypes.camp) {
				return "improve_in_" + improvementID;
			} else {
				return "improve_out_" + improvementID;
			}
		},
		
		getImprovementActionOrdinalForImprovementLevel: function (improvementLevel) {
			return improvementLevel - 1;
		},
		
		getImprovedLogMessage: function (improvementID, level) {
			let def = this.getDef(improvementID);
			return def && def.logMsgImproved ? def.logMsgImproved : "Improved the " + this.getImprovementDisplayName(improvementID, level);
		}

	};
	return ImprovementConstants;
});
