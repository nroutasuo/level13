define(['text/Text', 'game/constants/CampConstants'], function (Text, CampConstants) {
	
	var ImprovementConstants = {

		improvements: {
			beacon: {
				canBeDismantled: true,
			},
			camp: {
				canBeDismantled: false,
			},
			home: {
				useActionName: "Rest",
				improvementLevelsPerTechLevel: 0,
				sortScore: 10000,
				canBeDismantled: false,
			},
			campfire: {
				displayNames: [ "campfire_name_default", "campfire_name_l2", "campfire_name_l3" ],
				useActionName: "Sit down",
				useActionName2: "Light",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
				logMsgImproved: "ui.log.improved_campfire_message",
				canBeDismantled: false,
			},
			house: {
				canBeDismantled: true,
				displayNames: [ "house_name_l1", "house_name_default" ],
				improvementLevelsPerTechLevel: 0,
				sortScore: 9000,
			},
			house2: {
				canBeDismantled: true,
				sortScore: 9000,
				improvementLevelsPerTechLevel: 1,
				improvementLevelsPerMajorLevel: 1,
			},
			storage: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 1,
				sortScore: 8000,
			},
			hospital: {
				canBeDismantled: true,
				displayNames: [ "hospital_name_l1", "hospital_name_default", "hospital_name_l3" ],
				useActionName: "Treatment",
				useActionName2: "Augment",
				improvementLevelsPerTechLevel: 1,
				improvementLevelsPerMajorLevel: 1,
			},
			market: {
				canBeDismantled: true,
				useActionName: "Visit",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			inn: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			library: {
				canBeDismantled: true,
				useActionName: "Study",
				improvementLevelsPerTechLevel: 5,
				logMsgImproved: "ui.log.improved_library_message",
			},
			darkfarm: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				sortScore: 10,
			},
			aqueduct: {
				improvementLevelsPerTechLevel: 1,
			},
			temple: {
				canBeDismantled: true,
				useActionName: "Donate",
				improvementLevelsPerTechLevel: 5,
			},
			shrine: {
				canBeDismantled: true,
				useActionName: "Meditate",
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			barracks: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 1,
			},
			apothecary: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
				sortScore: 50,
			},
			smithy: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				sortScore: 50,
			},
			cementmill: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				sortScore: 50,
			},
			stable: {
				canBeDismantled: true,
 				improvementLevelsPerTechLevel: 1,
			},
			fortification: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			researchcenter: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			tradepost: {
				canBeDismantled: false,
				improvementLevelsPerTechLevel: 1,
				improvementLevelsPerMajorLevel: 1,
			},
			radiotower: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 5,
				improvementLevelsPerMajorLevel: 5,
			},
			robotFactory: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 1,
				logMsgImproved: "ui.log.improved_robot_factory_message"
			},
			lights: {
				canBeDismantled: true,
			},
			square: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 1,
			},
			garden: {
				canBeDismantled: true,
 				improvementLevelsPerTechLevel: 1,
			},
			generator: {
				canBeDismantled: true,
				improvementLevelsPerTechLevel: 10,
				logMsgImproved: "ui.log.improved_generator_message",
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
			tradepost_connector: {
				isProject: true,
			},
			spaceship1: {
				isProject: true,
				logMsgBuilt: "ui.log.built_spaceship_part_message"
			},
			spaceship2: {
				isProject: true,
				logMsgBuilt: "ui.log.built_spaceship_part_message"
			},
			spaceship3: {
				isProject: true,
				logMsgBuilt: "ui.log.built_spaceship_part_message"
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
				if (key == improvementName) return key;
				if (name == improvementName) return key;
			}
			return null;
		},
		
		getImprovementDisplayName: function (improvementID, level) {
			return Text.t(this.getImprovementDisplayNameKey(improvementID, level));
		},

		getImprovementDisplayNameKey: function (improvementID, level) {
			level = level || 1;
			let id = this.getImprovementID(improvementID);
			let def = this.getDef(id);
			let result = "game.improvements." + id + "_name_default";
			if (!def) return result;
			let names = def.displayNames;
			if (!names || names.length == 0) return result;
			if (typeof names === "string") return names;
			let majorLevel = this.getMajorLevel(id, level);
			let index = Math.min(majorLevel - 1, names.length - 1);
			return "game.improvements." + names[index];
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
		
		getImprovementDescription: function (improvementID, level) {
			let p = this.getImprovementDescriptionParam(improvementID, level);
			return Text.t(this.getImprovementDescriptionKey(improvementID, level), p);
		},

		getImprovementDescriptionKey: function (improvementID, level) {
			level = level || 1;
			let def = this.getDef(improvementID);
			let result = "game.improvements." + improvementID + "_description_default";
			if (!def) return result;
			let descriptions = def.description;
			if (!descriptions || descriptions.length == 0) return result;
			if (typeof descriptions === "string") return descriptions;
			let majorLevel = this.getMajorLevel(improvementID, level);
			let index = Math.min(majorLevel - 1, descriptions.length - 1);
			return "game.improvements." + descriptions[index];
		},

		getImprovementDescriptionParam: function (improvementID, level) {
			let majorLevel = this.getMajorLevel(improvementID, level);

			if (improvementID == "house") return CampConstants.POPULATION_PER_HOUSE;
			if (improvementID == "house2") return majorLevel <= 1 ? CampConstants.POPULATION_PER_HOUSE2 : CampConstants.POPULATION_PER_HOUSE2_LEVEL_2;
			if (improvementID == "generator") return CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR;
			return null;
		},
		
		isProject: function (improvementName) {
			let improvementID = ImprovementConstants.getImprovementID(improvementName);
			let improvementDef = ImprovementConstants.getDef(improvementID);
			return improvementDef && improvementDef.isProject;
		},
		
		getImprovementActionOrdinalForImprovementLevel: function (improvementLevel) {
			return improvementLevel - 1;
		},
		
		getImprovedLogMessageTextVO: function (improvementID, level) {
			let def = this.getDef(improvementID);
			let displayName = this.getImprovementDisplayName(improvementID, level);
			let msg = def && def.logMsgImproved ? def.logMsgImproved : "ui.log.improved_building_message";
			return { textKey: msg, textParams: { name: displayName } };
		},
		
		getBuiltLogMessageTextVO: function (improvementID, level) {
			let def = this.getDef(improvementID);
			let displayName = this.getImprovementDisplayName(improvementID, level);
			let msg = def && def.logMsgBuilt ? def.logMsgBuilt : "ui.log.built_building_message";
			return { textKey: msg, textParams: { name: displayName } };
		},
	
		getDefaultReputationBonus: function (name) {
			if (getImprovementType(name) == improvementTypes.level) return 0;
			switch (name) {
				case improvementNames.home:
				case improvementNames.apothecary:
				case improvementNames.smithy:
				case improvementNames.cementmill:
				case improvementNames.barracks:
				case improvementNames.fortification:
				case improvementNames.storage:
				case improvementNames.stable:
					return 0;
				case improvementNames.house:
				case improvementNames.house2:
				case improvementNames.darkfarm:
				case improvementNames.library:
				case improvementNames.lights:
				case improvementNames.generator:
				case improvementNames.shrine:
					return 0.5;
				case improvementNames.inn:
				case improvementNames.market:
				case improvementNames.tradepost:
					return 1;
				case improvementNames.campfire:
				case improvementNames.hospital:
				case improvementNames.sundome:
					return 2;
				case improvementNames.temple:
					return 3;
				case improvementNames.square:
				case improvementNames.garden:
					return 2;
				case improvementNames.radiotower:
					return 2;
				default:
					return 1;
			}
		},

	};
	return ImprovementConstants;
});
