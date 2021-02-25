define(['game/constants/CampConstants'], function (CampConstants) {
	
	var ImprovementConstants = {
		
		maxLevel: 10,

		campImprovements: {
			home: {
				description: "Foundation of a camp.",
				useActionName: "Rest"
			},
			campfire: {
				description: "Increases rumour generation and unlocks upgrades.",
				useActionName: "Sit down"
			},
			house: {
				description: "A place for " + CampConstants.POPULATION_PER_HOUSE + " people to stay.",
			},
			house2: {
				description: "Houses " + CampConstants.POPULATION_PER_HOUSE2 + " people.",
			},
			storage: {
				description: "Increases resource storage.",
			},
			hospital: {
				description: "Enables healing injuries.",
				useActionName: "Treatment"
			},
			market: {
				description: "Enables foreign traders to visit.",
				useActionName: "Visit"
			},
			inn: {
				description: "Increases rumours and enables recruitment.",
				useActionName: "Recruit"
			},
			library: {
				description: "Generates evidence.",
			},
			darkfarm: {
				description: "Produces food.",
			},
			aqueduct: {
				description: "Water infrastructure to improve collecting efficiency.",
			},
			temple: {
				description: "A central location for religious and cultural activities.",
				useActionName: "Donate",
			},
			shrine: {
				description: "A place to connect to the strange spirits.",
				useActionName: "Meditate",
			},
			barracks: {
				description: "Allows 10 soldiers.",
			},
			apothecary: {
				description: "Enables production of medicine.",
			},
			smithy: {
				description: "Workspace for toolsmiths.",
			},
			cementmill: {
				description: "Enables production of a new kind of construction material.",
			},
			stable: {
				 description: "Space to set up a trading caravan.",
			},
			fortification: {
				description: "Camp defences: +" + CampConstants.FORTIFICATION_1_DEFENCE + ".",
			},
			fortification2: {
				description: "Camp defences: +" + CampConstants.FORTIFICATION_2_DEFENCE + ".",
			},
			researchcenter: {},
			tradepost: {
				description: "Connect camps to a trade network.",
			},
			ceiling: {},
			radiotower: {
				description: "Increases reputation.",
			},
			lights: {
				 description: "Keep the darkness at bay for good.",
			},
			generator: {
				description: "Increases reputation bonus from housing (" + CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR + "% per house).",
			},
			square: {
				description: "A place to relax and socialize.",
			},
			garden: {
				 description: "A dash of beauty in the concrete desert.",
			},
		},

	};
	return ImprovementConstants;
});
