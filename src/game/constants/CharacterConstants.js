define(['ash', 'game/constants/DialogueConstants'], function (Ash, DialogueConstants) {
	
	let CharacterConstants = {

        characterTypes: {
            bard: "bard",
            beggar: "beggar",
            crafter: "crafter",
            darkDweller: "darkDweller",
            doomsayer: "doomsayer",
            drifter: "drifter",
            fortuneTeller: "fortuneTeller",
            guard: "guard",
            hunter: "hunter",
            mercenary: "mercenary",
            messenger: "messenger",
            pet: "pet",
            scavenger: "scavenger",
            scout: "scout",
            settlementRefugee: "settlementRefugee",
            shaman: "shaman",
            slumRefugee: "slumRefugee",
            surfaceRefugee: "surfaceRefugee",
            trader: "trader",
            workerApothecary: "workerApothecary",
            workerChemist: "workerChemist",
            workerCleric: "workerCleric",
            workerConcrete: "workerConcrete",
            workerGardener: "workerGardener",
            workerRobotmaker: "workerRobotmaker",
            workerRope: "workerRope",
            workerRubber: "workerRubber",
            workerScavenger: "workerScavenger",
            workerScientist: "workerScientist",
            workerSoldier: "workerSoldier",
            workerToolsmith: "workerToolsmith",
            workerTrapper: "workerTrapper",
            workerWater: "workerWater",
        },

        getDialogueSource: function (characterType) {
            return DialogueConstants.getDialogueSource(this.getDialogueSourceID(characterType));
        },

        getDialogueSourceID: function (characterType) {
            return "character_" + characterType + "_default";
        },

        getIcon: function (characterType, randomIndex) {
            randomIndex = randomIndex || 0;
            let possibleIcons = [];
            switch (characterType) {
                case CharacterConstants.characterTypes.bard:
                    possibleIcons.push("character_bard_01");
                    possibleIcons.push("character_bard_02");
                    possibleIcons.push("character_bard_03");
                    possibleIcons.push("character_bard_04");
                    possibleIcons.push("character_bard_05");
                    break;
                case CharacterConstants.characterTypes.beggar:
                    possibleIcons.push("character_beggar_01");
                    possibleIcons.push("character_beggar_02");
                    break;
                case CharacterConstants.characterTypes.crafter:
                    possibleIcons.push("character_crafter_01");
                    possibleIcons.push("character_crafter_02");
                    break;
                case CharacterConstants.characterTypes.darkDweller:
                    possibleIcons.push("character_darkDweller_01");
                    possibleIcons.push("character_darkDweller_02");
                    possibleIcons.push("character_darkDweller_03");
                    possibleIcons.push("character_darkDweller_04");
                    break;
                case CharacterConstants.characterTypes.doomsayer:
                    possibleIcons.push("character_doomsayer_01");
                    possibleIcons.push("character_doomsayer_02");
                    possibleIcons.push("character_doomsayer_03");
                    break;
                case CharacterConstants.characterTypes.drifter:
                    possibleIcons.push("character_drifter_01");
                    possibleIcons.push("character_drifter_02");
                    possibleIcons.push("character_drifter_03");
                    break;
                case CharacterConstants.characterTypes.fortuneTeller:
                    possibleIcons.push("character_fortuneteller_01");
                    break;
                case CharacterConstants.characterTypes.guard:
                    possibleIcons.push("character_guard_01");
                    possibleIcons.push("character_guard_02");
                    break;
                case CharacterConstants.characterTypes.hunter:
                    possibleIcons.push("character_hunter_01");
                    possibleIcons.push("character_hunter_02");
                    break;
                case CharacterConstants.characterTypes.mercenary:
                    possibleIcons.push("character_mercenary_01");
                    possibleIcons.push("character_mercenary_02");
                    possibleIcons.push("character_mercenary_03");
                    break;
                case CharacterConstants.characterTypes.messenger:
                    possibleIcons.push("character_messenger_01");
                    possibleIcons.push("character_messenger_02");
                    possibleIcons.push("character_messenger_03");
                    possibleIcons.push("character_messenger_04");
                    break;
                case CharacterConstants.characterTypes.scavenger:
                    possibleIcons.push("character_scavenger_01");
                    possibleIcons.push("character_scavenger_02");
                    break;
                case CharacterConstants.characterTypes.scout:
                    possibleIcons.push("character_scout_01");
                    possibleIcons.push("character_scout_02");
                    break;
                case CharacterConstants.characterTypes.shaman:
                    possibleIcons.push("character_shaman_01");
                    possibleIcons.push("character_shaman_02");
                    break;
                case CharacterConstants.characterTypes.slumRefugee:
                    possibleIcons.push("character_slumRefugee_01");
                    possibleIcons.push("character_slumRefugee_02");
                    possibleIcons.push("character_slumRefugee_03");
                    break;
                case CharacterConstants.characterTypes.surfaceRefugee:
                    possibleIcons.push("character_surfaceRefugee_01");
                    possibleIcons.push("character_surfaceRefugee_02");
                    possibleIcons.push("character_surfaceRefugee_03");
                    break;
                case CharacterConstants.characterTypes.trader:
                    possibleIcons.push("character_trader_01");
                    possibleIcons.push("character_trader_02");
                    break;
                case CharacterConstants.characterTypes.workerApothecary:
                    possibleIcons.push("worker_apothecary_01");
                    possibleIcons.push("worker_apothecary_02");
                    break;
                case CharacterConstants.characterTypes.workerChemist:
                    possibleIcons.push("worker_chemist_01");
                    possibleIcons.push("worker_chemist_02");
                    break;
                case CharacterConstants.characterTypes.workerCleric:
                    possibleIcons.push("worker_cleric_01");
                    possibleIcons.push("worker_cleric_02");
                    possibleIcons.push("worker_cleric_03");
                    possibleIcons.push("worker_cleric_04");
                    break;
                case CharacterConstants.characterTypes.workerConcrete:
                    possibleIcons.push("worker_concrete_01");
                    possibleIcons.push("worker_concrete_02");
                    break;
                case CharacterConstants.characterTypes.workerGardener:
                    possibleIcons.push("worker_gardener_01");
                    possibleIcons.push("worker_gardener_02");
                    break;
                case CharacterConstants.characterTypes.workerRobotmaker:
                    possibleIcons.push("worker_robotmaker_01");
                    break;
                case CharacterConstants.characterTypes.workerRope:
                    possibleIcons.push("worker_rope_01");
                    possibleIcons.push("worker_rope_02");
                    possibleIcons.push("worker_rope_03");
                    break;
                case CharacterConstants.characterTypes.workerRubber:
                    possibleIcons.push("worker_rubber_01");
                    possibleIcons.push("worker_rubber_02");
                    break;
                case CharacterConstants.characterTypes.workerScavenger:
                    possibleIcons.push("worker_scavenger_01");
                    possibleIcons.push("worker_scavenger_02");
                    break;
                case CharacterConstants.characterTypes.workerScientist:
                    possibleIcons.push("worker_scientist_02");
                    possibleIcons.push("worker_scientist_03");
                    break;
                case CharacterConstants.characterTypes.workerSoldier:
                    possibleIcons.push("worker_soldier_01");
                    possibleIcons.push("worker_soldier_02");
                    break;
                case CharacterConstants.characterTypes.workerToolsmith:
                    possibleIcons.push("worker_toolsmith_01");
                    possibleIcons.push("worker_toolsmith_02");
                    possibleIcons.push("worker_toolsmith_03");
                    break;
                case CharacterConstants.characterTypes.workerTrapper:
                    possibleIcons.push("worker_trapper_01");
                    possibleIcons.push("worker_trapper_02");
                    break;
                case CharacterConstants.characterTypes.workerWater:
                    possibleIcons.push("worker_water_01");
                    possibleIcons.push("worker_water_02");
                    break;
                case CharacterConstants.characterTypes.settlementRefugee:
                    possibleIcons.push("refugee_01");
                    possibleIcons.push("refugee_02");
                    break;
                default:
                    log.w("no icons mapped for character type: " + characterType);
                    break;
                        
            }
            let index = randomIndex % possibleIcons.length;
            return "img/characters/" + possibleIcons[index] + ".png";
        }
            
    };
	
	return CharacterConstants;
	
});
