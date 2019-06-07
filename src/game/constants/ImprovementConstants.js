define(['game/constants/CampConstants'], function (CampConstants) {
    
    var ImprovementConstants = {
        
        maxLevel: 10,

        campImprovements: {
            home: {
                description: "Foundation of a camp",
                useActionName: "Rest"
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
            generator: {
                description: "Increases reputation bonus from housing (" + CampConstants.REPUTATION_PER_HOUSE_FROM_GENERATOR + "% per house)",
            },
            darkfarm: {
                description: "Produces food",
            },
            apothecary: {
                description: "Enables production of medicine",
            },
            smithy: {
                description: "Workspace for toolsmiths.",
            },
            cementmill: {
                description: "Enables production of a new kind of construction material",
            },
            library: {
                description: "Accumulate and store more evidence.",
            },
            shrine: {},
            barracks: {
                description: "Allows 10 soldiers.",
            },
            fortification: {
                description: "Camp defences: +" + CampConstants.FORTIFICATION_1_DEFENCE,
            },
            fortification2: {
                description: "Camp defences: +" + CampConstants.FORTIFICATION_2_DEFENCE,
            },
            campfire: {
                description: "Increases rumour generation and unlocks upgrades.",
                useActionName: "Sit down"
            },
            lights: {
                 description: "Keep the darkness at bay for good.",
            },
            aqueduct: {
                description: "Water infrastructure to improve collecting efficiency.",
            },
            ceiling: {},
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
            radiotower: {
                description: "Increases reputation.",
            },
            tradepost: {
                description: "Connect camps to a trade network.",
            },
            stable: {
                 description: "Space to set up a trading caravan.",
            },
            researchcenter: {},
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
