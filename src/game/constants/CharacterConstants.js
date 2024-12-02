define(['ash', 'game/constants/DialogueConstants'], function (Ash, DialogueConstants) {
	
	let CharacterConstants = {

        characterTypes: {
            bard: "bard",
            crafter: "crafter",
            darkDweller: "darkDweller",
            doomsayer: "doomsayer",
            drifter: "drifter",
            hunter: "hunter",
            mercenary: "mercenary",
            messenger: "messenger",
            pet: "pet",
            scavenger: "scavenger",
            scout: "scout",
            shaman: "shaman",
            settlementRefugee: "settlementRefugee",
            slumRefugee: "slumRefugee",
            surfaceRefugee: "surfaceRefugee",
            trader: "trader",
            worker: "worker"
        },

        getDialogueSource: function (characterType) {
            return DialogueConstants.getDialogueSource("character_" + characterType + "_default");
        },

        getIcon: function (characterType) {
            switch (characterType) {
                case CharacterConstants.characterTypes.bard: return "img/characters/bard.png"; 
                case CharacterConstants.characterTypes.crafter: return "img/characters/crafter.png"; 
                case CharacterConstants.characterTypes.darkDweller: return "img/characters/dark-dweller.png"; 
                case CharacterConstants.characterTypes.doomsayer: return "img/characters/doomsayer.png"; 
                case CharacterConstants.characterTypes.drifter: return "img/characters/drifter.png"; 
                case CharacterConstants.characterTypes.hunter: return "img/characters/hunter.png"; 
                case CharacterConstants.characterTypes.mercenary: return "img/characters/mercenary.png"; 
                case CharacterConstants.characterTypes.messenger: return "img/characters/messenger.png"; 
                case CharacterConstants.characterTypes.pet: return "img/characters/pet.png"; 
                case CharacterConstants.characterTypes.scavenger: return "img/characters/scavenger.png"; 
                case CharacterConstants.characterTypes.scout: return "img/characters/scout.png"; 
                case CharacterConstants.characterTypes.shaman: return "img/characters/shaman.png"; 
                case CharacterConstants.characterTypes.settlementRefugee: return "img/characters/slum-refugee.png"; 
                case CharacterConstants.characterTypes.slumRefugee: return "img/characters/slum-refugee.png"; 
                case CharacterConstants.characterTypes.surfaceRefugee: return "img/characters/surface-refugee.png"; 
                case CharacterConstants.characterTypes.trader: return "img/characters/trader.png"; 
                case CharacterConstants.characterTypes.trader: return "img/characters/worker.png"; 
            }
        }
            
    };
	
	return CharacterConstants;
	
});
