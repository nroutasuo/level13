define(['ash', 'game/vos/UpgradeVO'], function (Ash, UpgradeVO) {
    
    var UpgradeConstants = {
    
        upgradeIds: {
            unlock_worker_rope: "unlock_worker_rope",
            unlock_building_library: "unlock_building_library",
            unlock_building_darkfarm: "unlock_building_darkfarm",
            unlock_building_hospital: "unlock_building_hospital",
            unlock_building_inn: "unlock_building_inn",
            unlock_building_lights: "unlock_building_lights",
            unlock_building_house2: "unlock_building_house2",
            unlock_building_researchcenter: "unlock_building_researchcenter",
            unlock_building_trade: "unlock_building_trade",
            unlock_building_fortifications: "unlock_building_fortifications",
            unlock_building_barracks: "unlock_building_barracks",
            unlock_building_apothecary: "unlock_building_apothecary",
            unlock_building_smithy: "unlock_building_smithy",
            unlock_building_cementmill: "unlock_building_cementmill",
            unlock_building_radio: "unlock_building_radio",
            unlock_building_passage_staircase: "unlock_building_passage_staircase",
            unlock_building_passage_hole: "unlock_building_passage_hole",
            unlock_building_passage_elevator: "unlock_building_passage_elevator",
            upgrade_building_campfire: "upgrade_building_campfire",
            upgrade_building_hospital: "upgrade_building_hospital",
        },
        
        upgradeDefinitions: {},
    };
    
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_worker_rope]
	= new UpgradeVO("unlock_worker_rope", "Rope-making", "Unlock new worker role: rope-maker.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_library]
	= new UpgradeVO("unlock_building_library", "Libraries", "Concentrated effort to build and store knowledge in your camps.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_darkfarm]
	= new UpgradeVO("unlock_building_darkfarm", "Urban Heliciculture", "Alternative source of food.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_hospital]
	= new UpgradeVO("unlock_building_hospital", "First Aid", "Enable hospitals and healing basic injuries.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_inn]
	= new UpgradeVO("unlock_building_inn", "Inn", "Enable building an inn where you can recruit followers.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_house2]
	= new UpgradeVO("unlock_building_house2", "Tower Blocks", "Reclaim tower blocks that can house more people.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_house2]
	= new UpgradeVO("unlock_building_lights", "Electric lights", "Defeat the darkness in  the camp once and for all. Required for some advanced jobs.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_trade]
	= new UpgradeVO("unlock_building_trade", "Trade", "Enable more buildings related to trade.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_fortifications]
	= new UpgradeVO("unlock_building_fortifications", "Fortification", "Protect your camps against beasts and outsiders.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_barracks]
	= new UpgradeVO("unlock_building_barracks", "Military", "Enable building a barracks and training soldiers.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_cementmill]
	= new UpgradeVO("unlock_building_cementmill", "Concrete", "Enable building cement mills and training concrete mixers.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_apothecary]
	= new UpgradeVO("unlock_building_apothecary", "Medicine", "Enable building an apothecary shop and training apothecaries.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_smithy]
	= new UpgradeVO("unlock_building_smithy", "Smithing", "Enable building a smithy and training tool smiths.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_radio]
	= new UpgradeVO("unlock_building_radio", "Radio", "Build radio towers to increase your civilization's reputation.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_staircase]
	= new UpgradeVO("unlock_building_passage_staircase", "Building projects", "Enables building huge structures that allow passages to different levels.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_hole]
	= new UpgradeVO("unlock_building_passage_hole", "Engineering", "Enables building huge structures that allow passages through holes.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_elevator]
	= new UpgradeVO("unlock_building_passage_elevator", "Elevator mechanics", "Enables repairing elevators that allow passage to new levels.");
    /*
     * Disabled/unimplemented upgrades:
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_campfire]
	= new UpgradeVO("upgrade_building_campfire", "Upgrade Campfires", "Upgrade all campfires to ??, which generate rumours faster.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_hospital]
	= new UpgradeVO("upgrade_building_hospital", "Hospitals", "Upgrade all ??s to hospitals, which ??");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_researchcenter]
	= new UpgradeVO("unlock_building_researchcenter", "Research Center", "");
    */
    
    return UpgradeConstants;
    
});
