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
            unlock_building_tradingpost: "unlock_building_tradingpost",
            unlock_building_market: "unlock_building_market",
            unlock_building_fortifications: "unlock_building_fortifications",
            unlock_building_barracks: "unlock_building_barracks",
            unlock_building_apothecary: "unlock_building_apothecary",
            unlock_building_smithy: "unlock_building_smithy",
            unlock_building_cementmill: "unlock_building_cementmill",
            unlock_building_radio: "unlock_building_radio",
            unlock_building_passage_staircase: "unlock_building_passage_staircase",
            unlock_building_passage_hole: "unlock_building_passage_hole",
            unlock_building_passage_elevator: "unlock_building_passage_elevator",
            unlock_building_bridge: "unlock_building_bridge",
            unlock_building_ceiling: "unlock_building_ceiling",
            upgrade_building_inn: "upgrade_building_inn",
            upgrade_building_campfire: "upgrade_building_campfire",
            upgrade_building_hospital: "upgrade_building_hospital",
            upgrade_building_storage1: "upgrade_building_storage1",
            upgrade_building_market: "upgrade_building_market",
            upgrade_building_market2: "upgrade_building_market2",
            upgrade_building_library: "upgrade_building_library",
            upgrade_building_storage2: "upgrade_building_storage2",
            upgrade_building_cementmill: "upgrade_building_cementmill",
            upgrade_building_apothecary: "upgrade_building_apothecary",
            upgrade_worker_scavenger: "upgrade_worker_scavenger",
            upgrade_worker_collector2: "upgrade_worker_collector2",
            upgrade_worker_collector1: "upgrade_worker_collector1",
            upgrade_worker_trapper: "upgrade_worker_trapper",
            upgrade_worker_chemist: "upgrade_worker_chemist",
            unlock_item_shoe1: "unlock_item_shoe1",
            unlock_item_clothing2: "unlock_item_clothing2",
            unlock_item_bag2: "unlock_item_bag2",
            unlock_item_weapon2: "unlock_item_weapon2",
            unlock_item_clothing3: "unlock_item_clothing3",
            unlock_item_clothing4: "unlock_item_clothing4",
            unlock_item_weapon4: "unlock_item_weapon4",
            unlock_item_bag3: "unlock_item_bag3",
            unlock_item_clothing5: "unlock_item_clothing5",
            unlock_item_weapon5: "unlock_item_weapon5",
            unlock_item_clothing6: "unlock_item_clothing6",
            unlock_item_weapon6: "unlock_item_weapon6",
            unlock_item_shades1: "unlock_item_shades1",
            unlock_item_clothing7: "unlock_item_clothing7",
            unlock_item_shades2: "unlock_item_shades2",
            unlock_item_weapon7: "unlock_item_weapon7",
        },
        
		bluePrintsByCampOrdinal: {
			1: ["unlock_building_passage_staircase"],
			2: ["unlock_building_darkfarm", "unlock_building_tradingpost"],
			3: ["unlock_building_lights", "unlock_building_market", "unlock_building_inn"],
			4: ["upgrade_worker_scavenger", "unlock_building_library", "unlock_building_passage_hole", "unlock_item_weapon2"],
			5: ["unlock_building_passage_elevator", "unlock_item_clothing3"],
			6: ["upgrade_building_market", "unlock_building_smithy"],
			7: ["unlock_building_bridge", "upgrade_building_storage1", "unlock_item_clothing4"],
			8: ["upgrade_building_market2", "unlock_item_weapon4"],
			9: ["upgrade_worker_trapper", "unlock_item_clothing5"],
			10: ["upgrade_worker_collector2", "unlock_building_apothecary"],
			11: ["unlock_item_weapon5", "upgrade_building_storage2", "unlock_building_cementmill", "unlock_item_clothing6"],
			12: ["upgrade_worker_chemist", "unlock_item_bag3"],
			13: ["unlock_building_radio", "upgrade_building_hospital", "unlock_item_weapon6", "unlock_item_clothing7"],
			14: ["upgrade_building_cementmill", "unlock_building_researchcenter", "unlock_item_weapon7"],
			15: ["upgrade_building_apothecary", "unlock_item_shades2", "unlock_building_ceiling"],
		},
		
		getBlueprintCampOrdinal: function (upgradeId) {
			var level = 1;
			return level;
		},
        
        upgradeDefinitions: {},
    };
    
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_worker_rope]
	= new UpgradeVO("unlock_worker_rope", "Rope-making", "Using scavenged fiber and cloth to make rope, a useful building and crafting material.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_library]
	= new UpgradeVO("unlock_building_library", "Libraries", "Concentrated effort to build and store knowledge.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_darkfarm]
	= new UpgradeVO("unlock_building_darkfarm", "Urban Heliciculture", "Alternative source of food.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_hospital]
	= new UpgradeVO("unlock_building_hospital", "First Aid", "Treating basic injuries.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_inn]
	= new UpgradeVO("unlock_building_inn", "Hospitality", "Sometimes strangers pass by the camp. Perhaps we can offer them a place to sleep?");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_house2]
	= new UpgradeVO("unlock_building_house2", "Tower Blocks", "Reclaiming tower blocks that can house more people.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_lights]
	= new UpgradeVO("unlock_building_lights", "Electric light", "Defeating the darkness in the camp once and for all.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_tradingpost]
	= new UpgradeVO("unlock_building_tradingpost", "Compass", "A tool for reliable navigation in the vast city, enabling the establishment of basic trade routes.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_market]
	= new UpgradeVO("unlock_building_market", "Trade", "Establishing trade with people from foreign camps and cooperatives.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_fortifications]
	= new UpgradeVO("unlock_building_fortifications", "Fortification", "Constructions to keep unwelcome strangers away.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_barracks]
	= new UpgradeVO("unlock_building_barracks", "Military", "A dedicated and trained class of workers for protecting and fighting.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_cementmill]
	= new UpgradeVO("unlock_building_cementmill", "Cement", "Unlocks the production of concrete, a strong and versatile building material.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_apothecary]
	= new UpgradeVO("unlock_building_apothecary", "Herbal Alchemy", "Basic knowledge of making herbal medicines.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_smithy]
	= new UpgradeVO("unlock_building_smithy", "Metal working", "Smiths can turn scrap metal into tools and weapons.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_radio]
	= new UpgradeVO("unlock_building_radio", "Radio", "Build radio towers to increase your civilization's reputation.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_staircase]
	= new UpgradeVO("unlock_building_passage_staircase", "Building projects", "Managing large building projects and building structures that allow passage to different levels.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_hole]
	= new UpgradeVO("unlock_building_passage_hole", "Engineering", "Enables building huge structures to bridge levels when there is no existing staircase or elevator, and lays the foundation for more construction projects.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_passage_elevator]
	= new UpgradeVO("unlock_building_passage_elevator", "Elevator mechanics", "Repairing elevators that allow passage to new levels.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_bridge]
	= new UpgradeVO("unlock_building_bridge", "Bridge-building", "Building bridges over collapsed sectors.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_radio]
    = new UpgradeVO("unlock_building_radio", "Radio", "One-way communication over long distances.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_ceiling]
    = new UpgradeVO("unlock_building_ceiling", "UV Protection", "Sunlight may be irritating but it is not the most dangerous component of sunshine.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_campfire]
	= new UpgradeVO("upgrade_building_campfire", "Brewing", "Production of beer, which helps bring people together.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_hospital]
	= new UpgradeVO("upgrade_building_hospital", "Hospitals", "Upgrade all ??s to hospitals, which ??");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_market2]
	= new UpgradeVO("upgrade_building_market2", "Paper Money", "Further improve trade by using lighter currency that is easier to carry around.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_market]
	= new UpgradeVO("upgrade_building_market", "Currency", "Common medium of exchange makes trading more efficient.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_library]
	= new UpgradeVO("upgrade_building_library", "Education", "A more systematic approach to knowledge gathering and preservation. Will enable more specialized workers later on.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_hospital]
	= new UpgradeVO("upgrade_building_hospital", "Surgery", "Complex procedures for fixing the human body.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_cementmill]
	= new UpgradeVO("upgrade_building_cementmill", "Internal combustion", "More powerful engines for large-scale manufacturing.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_storage1]
	= new UpgradeVO("upgrade_building_storage1", "Pest control", "Keeping other animals away from food and materials for more reliable storage.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_storage2]
	= new UpgradeVO("upgrade_building_storage2", "Refrigeration", "Improving storage by controlling temperature.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_scavenger]
	= new UpgradeVO("upgrade_worker_scavenger", "Smelting", "Processing technique that allows more metal left behind by previous inhabitants to be salvaged.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_collector1]
	= new UpgradeVO("upgrade_worker_collector1", "Water purification", "Techniques for large-scale filtering and disinfecting drinking water that permit using more water sources.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_collector2]
	= new UpgradeVO("upgrade_worker_collector2", "Aqueducts", "Tapping into the decaying water infrastructure and extending it to efficiently store and convey water.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_trapper]
	= new UpgradeVO("upgrade_worker_trapper", "Food preservation", "Salting, smoking and pickling food to make it last longer.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_worker_chemist]
	= new UpgradeVO("upgrade_worker_chemist", "Chemistry", "Rediscovering the study of substances and chemical reactions.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_building_researchcenter]
	= new UpgradeVO("unlock_building_researchcenter", "Laboratories", "Places to generate new knowledge instead of just collecting and archiving the old.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_apothecary]
	= new UpgradeVO("upgrade_building_apothecary", "Medicine", "Rediscovering modern technology for disease prevention and treatment.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.upgrade_building_inn]
	= new UpgradeVO("upgrade_building_inn", "Music", "Another useful way to raise spirits and bond groups.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_shoe1]
    = new UpgradeVO("unlock_item_shoe1", "Crafting", "The varied skill of making useful things out of whatever happens to be available.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing2]
    = new UpgradeVO("unlock_item_clothing2", "Sewing", "The craft of making clothes.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag2]
    = new UpgradeVO("unlock_item_bag2", "Bag-making", "The art of crafting durable bags.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon2]
    = new UpgradeVO("unlock_item_weapon2", "Spears", "Crafting basic weapons.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing3]
    = new UpgradeVO("unlock_item_clothing3", "Vest plating", "Basic protective clothing to give an edge in fights.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing4]
    = new UpgradeVO("unlock_item_clothing4", "Synthetic fibers", "Create and manipulate new, stronger fibers for better protection and easier manufacturing.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon4]
    = new UpgradeVO("unlock_item_weapon4", "Metal working 2", "Better techniques for metal-working allow better weapons and more tools.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_bag3]
    = new UpgradeVO("unlock_item_bag3", "Bag-making 2", "Unlock the automatic luggage.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing5]
    = new UpgradeVO("unlock_item_clothing5", "Armour", "Adapting the new metal working techniques for protection.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon5]
    = new UpgradeVO("unlock_item_weapon5", "Revolvers", "The revolver allows the user to fire multiple rounds without reloading.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing6]
    = new UpgradeVO("unlock_item_clothing6", "Augmented clothing", "New techniques for improving old designs.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon6]
    = new UpgradeVO("unlock_item_weapon6", "Automatic pistols", "Unlocks a new class of lethal weapons.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_shades1]
    = new UpgradeVO("unlock_item_shades1", "Goggles", "Eyewear that offers basic protection from sunlight.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_clothing7]
    = new UpgradeVO("unlock_item_clothing7", "Augmented clothing 2", "New techniques for improving old designs.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_shades2]
    = new UpgradeVO("unlock_item_shades2", "Sunglasses", "Eyewear that offers better protection from sunlight.");
    UpgradeConstants.upgradeDefinitions[UpgradeConstants.upgradeIds.unlock_item_weapon7]
    = new UpgradeVO("unlock_item_weapon7", "Jet engine", "Taking weapons and fighting to a new level of destructiveness.");
    
    return UpgradeConstants;
    
});
