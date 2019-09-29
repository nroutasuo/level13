define(['ash', 'game/constants/WorldCreatorConstants', 'game/constants/PlayerActionConstants', 'game/constants/UpgradeConstants', 'game/vos/ItemVO'],
function (Ash, WorldCreatorConstants, PlayerActionConstants, UpgradeConstants, ItemVO) {

    var ItemConstants = {
        
        PLAYER_DEFAULT_STORAGE: 10,
        
        itemTypes: {
            // Equippable / slots:
            light: "Light",
            weapon: "Weapon",
            clothing_over: "Armor",
            clothing_upper: "Shirt",
            clothing_lower: "Legs",
            clothing_hands: "Hands",
            clothing_head: "Head",
            shoes: "Shoes",
            bag: "Bag",
            follower: "Follower",
            // Special effects / one-use:
            ingredient: "Ingredient",
            exploration: "Exploration",
            uniqueEquipment: "UniqueEquipment",
            // Just inventory - no effects:
            artefact: "Artefact",
            note: "Note",
        },
        
        itemBonusTypes: {
            light: "light",
            fight_att: "fight attack",
            fight_def: "fight defence",
            movement: "movement",
            bag: "bag",
            res_cold: "warmth",
            res_radiation: "radiation protection",
            res_poison: "poison protection",
            res_sunlight: "sunblindness protection",
        },
        
        itemDefinitions: {
            light: [
                new ItemVO("light1", "Lantern", "Light", {"light": 25}, true, true, false, "img/items/light-lantern.png",
                    "Feeble light for basic survival in the dark undercorridors.", 1, 2, 1),
                new ItemVO("light2", "Electric light", "Light", {"light": 75}, true, true, false, "img/items/light-electric.png",
                    "Advanced light for serious travellers.", 5, 5, 3),
                new ItemVO("light3", "Ghost light", "Light", {"light": 125}, true, false, false, "img/items/light-ghost.png",
                    "They say the ghost light can show you more the darker places you go.", 14, 9, 7),
            ],
            weapon: [
                new ItemVO("weapon1", "Shiv", "Weapon", {"fight attack": 2}, true, true, false, "img/items/weapon-shiv.png",
                    "Improvised sharp poking implement.", 1, 2, 2),
                new ItemVO("weapon12", "Knife", "Weapon", {"fight attack": 3}, true, true, false, "img/items/weapon-shiv.png",
                    "A bit sturdier than the shiv.", 2, 2, 1),
                new ItemVO("weapon2", "Spear", "Weapon", {"fight attack": 5}, true, true, false, "img/items/weapon-shiv.png",
                    "Old-fashioned but reliable weapon.", 4, 3, 1),
                new ItemVO("weapon25", "Heavy Axe", "Weapon", {"fight attack": 8}, true, true, false, "img/items/weapon-shiv.png",
                    "Easy to use and reliable.", 5, 3, 1),
                new ItemVO("weapon3", "Crossbow", "Weapon", {"fight attack": 12}, true, true, false, "img/items/weapon-shiv.png",
                    "A deadly ranged weapon consisting of a horizontal limb assembly mounted on a stock that shoots projectiles.", 6, 3, 1),
                new ItemVO("weapon4", "Pistol", "Weapon", {"fight attack": 24}, true, true, false, "img/items/weapon-bomb.png",
                    "A crude single-shot pistol, like a hand-held miniature cannon.", 8, 4, 1),
                new ItemVO("weapon5", "Revolver", "Weapon", {"fight attack": 30}, true, true, false, "img/items/weapon-bomb.png",
                    "A more sophisticated handgun that allows several shots before reloading.", 10, 4, 1),
                new ItemVO("weapon52", "Scrap Metal Waraxe", "Weapon", {"fight attack": 34}, true, true, false, "img/items/weapon-bomb.png",
                    "A formidable axe specifically designed for combat", 11, 1, 1),
                new ItemVO("weapon58", "Crude Shotgun", "Weapon", {"fight attack": 55}, true, true, false, "img/items/weapon-bomb.png",
                    "Devastating short-range firearm.", 12, 5, 1),
                new ItemVO("weapon6", "Custom SMG", "Weapon", {"fight attack": 116}, true, true, false, "img/items/weapon-bomb.png",
                    "It may be made from scrap metal but it is still a serious weapon.", 13, 5, 2),
                new ItemVO("weapon7", "Improvised bazooka", "Weapon", {"fight attack": 205}, true, true, false, "img/items/weapon-bomb.png",
                    "Powerful but heavy and somewhat unreliable construction of pipes, reclaimed weapon parts and improvised ammunition.", 14, 3, 3),
                new ItemVO("weapon8", "Rifle", "Weapon", {"fight attack": 245}, true, true, false, "img/items/weapon-bomb.png",
                    "Deadly weapon similar to those that were mass-produced just before the Fall.", 15, 3, 3),
            ],
            clothing_over: [
                new ItemVO("clothing_over_1", "Warm Coat", "Armor", {"fight defence": 1, warmth: 20}, true, true, false, "img/items/clothing-2.png",
                    "Something against the chill.", 1, 5, 1),
                new ItemVO("clothing_over_1x", "Lab Coat", "Armor", {"fight defence": 1, warmth: 2, "poison protection": 10}, true, false, false, "img/items/clothing-2.png",
                    "Might protect from environmental hazards.", 2, 5, 1),
                new ItemVO("clothing_over_2", "Biker jacket", "Armor", {"fight defence": 6, warmth: 10, "radiation protection": 3, "poison protection": 3}, true, false, false, "img/items/clothing-2.png",
                    "Doesn't make one invincible, but feels like it.", 3, 2, 1),
                new ItemVO("clothing_over_25", "Army Jacket", "Armor", {"fight defence": 15, warmth: 10, "radiation protection": 5, "poison protection": 5}, true, false, false, "img/items/clothing-2.png",
                    "Something that's actually produced with the aim of keeping one safe.", 6, 2, 1),
                new ItemVO("clothing_over_3", "Scrap metal armor", "Armor", {"fight defence": 25, warmth: 5, "radiation protection": 5, "poison protection": 5}, true, true, false, "img/items/clothing-2.png",
                    "An ugly but surprisingly comfortable metal blanket", 8, 5, 2),
                new ItemVO("clothing_over_4", "Kevlar vest", "Armor", {"fight defence": 40, "radiation protection": 5, "poison protection": 5}, true, true, false, "img/items/clothing-2.png",
                    "Heavy, but worth it.", 10, 3, 2),
                new ItemVO("clothing_over_45", "Scavenger vest", "Armor", {"fight defence": 40, warmth: 20, "radiation protection": 10, "poison protection": 10}, true, true, false, "img/items/clothing-2.png",
                    "Novel technology for maximal survival in the post-Fall City", 12, 3, 1),
                new ItemVO("clothing_over_5", "Riot police vest", "Armor", {"fight defence": 100, warmth: 10, "radiation protection": 0, "poison protection": 10}, true, false, false, "img/items/clothing-3.png",
                    "Based on the old Surface Guard uniform with additional environmental proection.", 13, 2, 2),
                new ItemVO("clothing_over_6", "Exoskeleton", "Armor", {"fight defence": 290, warmth: 10, "radiation protection": 30, "poison protection": 20}, true, true, false, "img/items/clothing-3.png",
                    "Futuristic armour designed for those exploring the world outside the City's protective walls.", 15, 8, 5),
            ],
            clothing_upper: [
                new ItemVO("clothing_upper_1", "Tattered shirt", "Shirt", {warmth: 1}, true, false, false, "img/items/clothing-rags.png",
                    "Barely counts for clothing, but for now it'll have to do.", 1, 1, 3),
                new ItemVO("clothing_upper_15", "T-shirt", "Shirt", { "fight defence": 1, warmth: 2, "radiation protection": 1, "poison protection": 1}, true, false, false, "img/items/clothing-shirt.png",
                    "Standard shirt.", 2, 2, 1),
                new ItemVO("clothing_upper_2", "Factory uniform shirt", "Shirt", {"fight defence": 2, warmth: 3, "radiation protection": 1, "poison protection": 1}, true, false, false, "img/items/clothing-shirt-2.png",
                    "Feels oddly comfortable in dark corridors and abandoned factories.", 5, 1, 1),
                new ItemVO("clothing_upper_3", "Guard uniform shirt", "Shirt", {"fight defence": 5, warmth: 10, "radiation protection": 3, "poison protection": 3}, true, true, false, "img/items/clothing-shirt-2.png",
                    "Looks official, but not particularly protective.", 8, 1, 1),
                new ItemVO("clothing_upper_35", "Synthetic shirt", "Shirt", {"fight defence": 5, warmth: 12, "radiation protection": 5, "poison protection": 5}, true, false, false, "img/items/clothing-2.png",
                    "Shirt made from recycled advanced textiles used before the Fall.", 10, 2, 2),
                new ItemVO("clothing_upper_4", "Protective shirt", "Shirt", {"fight defence": 8, warmth: 15, "radiation protection": 5, "poison protection": 5}, true, true, false, "img/items/clothing-3.png",
                    "Specifically made for keeping travellers warm and safe.", 12, 5, 1),
                new ItemVO("clothing_upper_45", "Explorer's shirt", "Shirt", {"fight defence": 10, warmth: 15, "radiation protection": 5, "poison protection": 5}, true, false, false, "img/items/clothing-3.png",
                    "Comes with many pockets.", 13, 2, 2),
                new ItemVO("clothing_upper_5", "Scavenger's raincoat", "Shirt", {"fight defence": 0, warmth: 25, "radiation protection": 40, "poison protection": 60}, true, true, false, "img/items/clothing-3.png",
                    "The best protection an explorer can hope for.", 15, 4, 2),
            ],
            clothing_lower: [
                new ItemVO("clothing_lower_1", "Ragged pants", "Legs", {warmth: 1}, true, false, false, "img/items/clothing-rags.png",
                    "Barely counts for clothing, but for now it'll have to do.", 1, 1, 3),
                new ItemVO("clothing_lower_15", "Basic pants", "Legs", {"fight defence": 1, warmth: 1}, true, true, false, "img/items/clothing-rags.png",
                    "Nothing wrong with these pants", 2, 3, 1),
                new ItemVO("clothing_lower_2", "Factory uniform pants", "Legs", {"fight defence": 1, warmth: 5}, true, false, false, "img/items/clothing-2.png",
                    "Used to be the standard uniform in the dark levels of the City.", 5, 1, 1),
                new ItemVO("clothing_lower_3", "Guard uniform pants", "Legs", {"fight defence": 3, warmth: 8}, true, true, false, "img/items/clothing-2.png",
                    "Looks official, but not particularly protective.", 8, 1, 2),
                new ItemVO("clothing_lower_4", "Padded pants", "Legs", {"fight defence": 15, warmth: 10}, true, true, false, "img/items/clothing-3.png",
                    "Protects from bites and scratches.", 11, 3, 3),
                new ItemVO("clothing_lower_45", "Explorer's pants", "Legs", {"fight defence": 15, warmth: 10, "radiation protection": 5, "poison protection": 5}, true, true, false, "img/items/clothing-3.png",
                    "Protects from bites and scratches.", 13, 5, 2),
                new ItemVO("clothing_lower_5", "Long underwear", "Legs", {"fight defence": 5, warmth: 50, "radiation protection": 1, "poison protection": 1}, true, true, false, "img/items/clothing-3.png",
                    "Nothing keeps you warm like long underwear.", 15, 3, 1),
            ],
            clothing_head: [
                new ItemVO("clothing_head_0", "Sunglasses", "Head", {"sunblindness protection": 30}, true, false, false, "img/items/clothing-hat-1.png",
                    "If there was any sunlight, these would probably be handy.", 2, 5, 1),
                new ItemVO("clothing_head_1", "Wool hat", "Head", {"fight defence": 1, warmth: 10}, true, true, false, "img/items/clothing-hat-1.png",
                    "Warm basic headwear.", 2, 3, 1),
                new ItemVO("clothing_head_2", "Medical mask", "Head", {"poison protection": 15}, true, false, false, "img/items/clothing-hat-1.png",
                    "Meager protection against the effects of polluted air.", 4, 5, 1),
                new ItemVO("clothing_head_25", "Bike helmet", "Head", {"fight defence": 3}, true, false, false, "img/items/clothing-hat-2.png",
                    "A bit clumsy, but quite useful in a fight.", 5, 3, 1),
                new ItemVO("clothing_head_3", "Scrap metal helmet", "Head", {"fight defence": 5, warmth: 5, "radiation protection": 5, "poison protection": 5, "sunblindness protection": 10}, true, true, false, "img/items/clothing-hat-2.png",
                    "Perfect apparel for the post-apocalyptic hero.", 7, 4, 2),
                new ItemVO("clothing_head_4", "Gas mask", "Head", {"fight defence": 5, warmth: 3, "radiation protection": 15, "poison protection": 30, "sunblindness protection": 10}, true, true, false, "img/items/clothing-hat-2.png",
                    "Gives a definite sense of security in dangerous environments.", 11, 2, 1),
                new ItemVO("clothing_head_45", "Scavenger's hood", "Head", {"fight defence": 10, warmth: 10, "radiation protection": 15, "poison protection": 15, "sunblindness protection": 15}, true, true, false, "img/items/clothing-hat-2.png",
                    "A practical, protective hood that doesn't get in the way.", 12, 3, 1),
                new ItemVO("clothing_head_5", "Explorer's helmet", "Head", {"fight defence": 30, warmth: 15, "radiation protection": 20, "poison protection": 10, "sunblindness protection": 50}, true, true, false, "img/items/clothing-hat-3.png",
                    "Headgear designed specifically for scavenging in the City.", 13, 5, 2),
            ],
            clothing_hands: [
                new ItemVO("clothing_hands_1", "Mittens", "Hands", {"warmth": 5}, true, true, false, "img/items/clothing-hand-0.png",
                    "Nothing keeps hands warm like fluffy mittens.", 2, 3, 1),
                new ItemVO("clothing_hands_12", "Leather Gloves", "Hands", {"fight defence": 1, "warmth": 3, "radiation protection": 1, "poison protection": 1}, true, true, false, "img/items/clothing-hand-0.png",
                    "Not only warm but also protective.", 3, 3, 1),
                new ItemVO("clothing_hands_2", "Work gloves", "Hands", {"fight defence": 1, "warmth": 3, "radiation protection": 3, "poison protection": 3}, true, true, false, "img/items/clothing-hand-0.png",
                    "Basic protection for hands.", 5, 1, 1),
                new ItemVO("clothing_hands_25", "Good gloves", "Hands", {"fight defence": 2, "warmth": 3, "radiation protection": 3, "poison protection": 3}, true, true, false, "img/items/clothing-hand-0.png",
                    "Good gloves make scavenging much safer.", 7, 2, 1),
                new ItemVO("clothing_hands_3", "Quality gloves", "Hands", {"fight defence": 2, "warmth": 7, "radiation protection": 5, "poison protection": 10}, true, true, false, "img/items/clothing-hand-0.png",
                    "No scavenger ever regretted having good gloves.", 10, 2, 1),
                new ItemVO("clothing_hands_4", "Scavenger's gloves", "Hands", {"fight defence": 5, warmth: 15, "radiation protection": 15, "poison protection": 15}, true, true, false, "img/items/clothing-hand-0.png",
                    "Gloves that protect from almost all environmental hazards.", 12, 3, 1),
                new ItemVO("clothing_hands_5", "Synthetic gloves", "Hands", {"fight defence": 8, warmth: 15, "radiation protection": 15, "poison protection": 15}, true, false, false, "img/items/clothing-hand-0.png",
                    "Gloves made from recycled advanced textiles from before the Fall.", 14, 3, 2),
            ],
            shoes: [
                new ItemVO("shoe_1", "Improvised flip-flops", "Shoes", {"movement": 0.9}, true, true, false, "img/items/shoe-1.png",
                    "Protects a scavenger's feet from sharp things that might be lying around.", 1, 2, 1),
                new ItemVO("shoe_2", "Worn trainers", "Shoes", {"movement": 0.8}, true, false, false, "img/items/shoe-2.png",
                    "Decent, reasonable shoes for walking in most places.", 5, 5, 3),
                new ItemVO("shoe_3", "Hiking boots", "Shoes", {"movement": 0.5}, true, false, false, "img/items/shoe-3.png",
                    "Good shoes like these can make travelling much easier.", 10, 8, 5),
            ],
            follower: [
            ],
            bag: [
                new ItemVO("bag_0", "Plastic bag", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_1}, true, true, false, "img/items/bag-0.png",
                    "It's not fancy, but allows one to carry around more stuff than their hands and pockets can hold.", 1, 1, 5),
                new ItemVO("bag_1", "Basic backpack", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_2}, true, true, false, "img/items/bag-1.png",
                    "A more spacious bag with lots of pockets.", WorldCreatorConstants.CAMP_ORDINAL_BAG_2 - 1, 4, 1),
                new ItemVO("bag_2", "Jumbo backpack", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_3}, true, true, false, "img/items/bag-1.png",
                    "A huge backpack with plenty of space.", 5, WorldCreatorConstants.CAMP_ORDINAL_BAG_3 - 1, 6, 2),
                new ItemVO("bag_3", "Hiker's rucksack", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_4}, true, false, false, "img/items/bag-1.png",
                    "With this bag, weight is starting to be more of a problem than space.", WorldCreatorConstants.CAMP_ORDINAL_BAG_4 - 1, 6, 3),
                new ItemVO("bag_4", "Scavenger bag", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_5}, true, false, false, "img/items/bag-1.png",
                    "A really practical backpack with lots of pockets.", WorldCreatorConstants.CAMP_ORDINAL_BAG_5 - 1, 8, 3),
                new ItemVO("bag_5", "Automatic luggage", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_6}, true, false, false, "img/items/bag-3.png",
                    "Mechanical chest that automatically follows its owner around. No more worrying about carrying all that stuff yourself.", 15, 10, 8),
            ],
            artefact: [
                new ItemVO("artefact_ground_1", "Runestone", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Puzzling piece of stone with an ancient rune on it.", 3, 8, 2),
                new ItemVO("artefact_ground_2", "Charred seed", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Seeds are said to contain life itself. They do not grow in the dark city.", 7, 10, 2),
                new ItemVO("artefact_ground_3", "Round stone", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Smooth stone that fits in the palm of a hand. There is something calming about it.", 3, 6, 1),
                new ItemVO("artefact_ground_4", "Leather pouch", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Small leather pouch with a string that allows it to be worn around the neck. All it contains is some kind of a powder.", 1, 6, 2),
                new ItemVO("artefact_surface_1", "Canned tuna", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Leftovers from a bygone time. They say there used to be fish tanks, somewhere near the surface.", 15, 5, 2),
                new ItemVO("artefact_surface_2", "ID Chip", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Chips like these used to be placed under people's skins, giving them certain powers. It probably doesn't work anymore.", 15, 7, 3),
                new ItemVO("artefact_surface_3", "Scientist's notebook", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Worn but still mostly legible, this notebook seems to contain calculations related to fuel consumption of some kind of a large and complex vehicle over very long distances.", 15, 7, 3),
                new ItemVO("artefact_history_1", "Fountain pen", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Long since dried and useless as a writing implement, but still popular among sages and philosophers as a symbol of knowledge.", 1, 6, 1),
                new ItemVO("artefact_history_2", "Pearl", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "A beautiful orb said to have formed in the Sea, a massive body of water that is the origin of all life.", 7, 8, 3),
                new ItemVO("artefact_history_3", "CD", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "An old circular data storage with the word 'backup' written on it. Without an electric computing machine, it's impossible to stay if it is still readable.", 1, 6, 2),
                new ItemVO("artefact_doom_1", "Volcanic rock", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Unnerving piece of black rock. Something is etched on it in an unfamiliar language.", 4, 7, 3),
                new ItemVO("artefact_doom_2", "Temple key", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Heavy key with a demonic eel-like ornament so intricately carved it feels almost alive. Strangely cold to the touch.", 1, 7, 3),
                new ItemVO("artefact_doom_3", "Seashell", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Fragile, yellow and light pink shell that must have been looted from a museum.", 1, 9, 5),
                new ItemVO("artefact_doom_4", "Pamphlet", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Bold political leaflet printed on thick paper urging residents of the 'sewers' to rebel against segregation.", 1, 5, 1),
                new ItemVO("artefact_doom_5", "Starchart", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Complicated astrological map with calculations indicating an event occurring on year 783.", 15, 8, 2),
                new ItemVO("artefact_science", "Data stick", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Some kind of a data storage. Unfortunately, nothing that reads it seems to have survived.", 10, 7, 3),
            ],
            ingredient: [
                new ItemVO("res_tape", "Duct tape", "Ingredient", null, false, false, false, "img/items/res-tape.png", "Used for crafting."),
                new ItemVO("res_bands", "Rubber bands", "Ingredient", null, false, false, false, "img/items/res-bands.png", "Used for crafting."),
                new ItemVO("res_silk", "Spider silk", "Ingredient", null, false, false, false, "img/items/res-silk.png", "Used for crafting."),
                new ItemVO("res_glowbug", "Glowbug", "Ingredient", null, false, false, false, "img/items/res-glowbug.png", "Used for crafting."),
                new ItemVO("res_hairpin", "Hairpin", "Ingredient", null, false, false, false, "img/items/res-pin.png", "Used for crafting."),
                new ItemVO("res_bottle", "Plastic bottle", "Ingredient", null, false, false, false, "img/items/res-bottle.png", "Used for crafting."),
                new ItemVO("res_leather", "Leather", "Ingredient", null, false, false, false, "img/items/res-leather.png", "Used for crafting."),
            ],
            exploration: [
                new ItemVO("exploration_1", "Lockpick", "Exploration", null, false, true, false, "img/items/exploration-1.png", "Useful tool when exploring and scouting.", 1, 1, 1),
                new ItemVO("first_aid_kit_1", "Basic first aid kit", "Exploration", null, false, true, true, "img/items/firstaid-1.png", "Heal light injuries on the go.", 3, 6, 1),
                new ItemVO("first_aid_kit_2", "Full first aid kit", "Exploration", null, false, true, true, "img/items/firstaid-2.png", "Heal all injuries on the go.", 10, 8, 2),
                new ItemVO("glowstick_1", "Glowstick", "Exploration", null, false, true, true, "img/items/glowstick-1.png", "Temporary light. Can be used as a distraction.", 1, 8, 2)
            ],
            uniqueEquipment: [
                new ItemVO("equipment_map", "Map", "UniqueEquipment", null, false, false, false, "img/items/exploration-map.png", "Helps navigating the City."),
            ],
        },
        
        getItemByID: function (id) {
            if (id.indexOf("follower-") >= 0)
                return this.getFollowerByID(id);
            for (var type in this.itemDefinitions ) {
                for (var i in this.itemDefinitions[type]) {
                    var item = this.itemDefinitions[type][i];
                    if (item.id === id) {
                        return item;
                    }
                }
            }
            return null;
        },

        getItemDefaultBonus: function (item) {
            switch (item.type) {
                case ItemConstants.itemTypes.light:
                    return ItemConstants.itemBonusTypes.light;
                case ItemConstants.itemTypes.weapon:
                    return ItemConstants.itemBonusTypes.fight_att;
                case ItemConstants.itemTypes.shoes:
                    return ItemConstants.itemBonusTypes.movement;
                case ItemConstants.itemTypes.bag:
                    return ItemConstants.itemBonusTypes.bag;
                case ItemConstants.itemTypes.clothing_over:
                case ItemConstants.itemTypes.clothing_upper:
                case ItemConstants.itemTypes.clothing_lower:
                case ItemConstants.itemTypes.clothing_head:
                case ItemConstants.itemTypes.clothing_hands:
                case ItemConstants.itemTypes.follower:
                    return ItemConstants.itemBonusTypes.fight_def;
                default:
                    return null;
            }
        },
        
        getRequiredCampOrdinalToCraft: function (item) {
            var campOrdinal = 0;
            var reqs = PlayerActionConstants.requirements["craft_" + item.id];
            if (reqs && reqs.upgrades) {
                var requiredTech = Object.keys(reqs.upgrades);
                for (var k = 0; k < requiredTech.length; k++) {
                    var requiredTechCampOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(requiredTech[k]);
                    campOrdinal = Math.max(campOrdinal, requiredTechCampOrdinal);
                }
            }
            return campOrdinal;
        },
        
        getFollower: function (level, campCount) {
            var minStrength = campCount;
            var maxStrength = 1.5 + campCount * 1.5;
            var strengthDiff = maxStrength - minStrength;
            var strength = Math.round(minStrength + strengthDiff * Math.random());
            var type = "d";
            if (level < 5)
                type = "g";
            if (level > 15)
                type = "c";
            var id = "follower-" + strength + "-" + type;
            return this.getFollowerByID(id);
        },
        
        getFollowerByID: function (id) {
            var name = "Follower";
            var type = this.itemTypes.follower;
            var strength = parseInt(id.split("-")[1]);

            // TODO persist image depending on id
            var icon = "img/items/follower-" + Math.floor(Math.random() * 4 + 1) + ".png";

            // TODO more varied follower descriptions
            var description = "A fellow traveller who has agreed to travel together.";

            return new ItemVO(id, name, type, {"fight attack": strength}, true, false, false, icon, description);
        },
        
        getBag: function (campOrdinal) {
            if (levelOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_2) {
                return this.itemDefinitions.bag[0];
            }
            if (levelOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_3) {
                return this.itemDefinitions.bag[1];
            }
            if (levelOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_4) {
                return this.itemDefinitions.bag[2];
            }
            if (levelOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_5) {
                return this.itemDefinitions.bag[3];
            }
            return this.itemDefinitions.bag[4];
        },
        
        getShoes: function (campOrdinal) {
            if (campOrdinal < this.itemDefinitions.shoes[1].requiredCampOrdinal) {
                return this.itemDefinitions.shoes[0];
            }
            if (campOrdinal < this.itemDefinitions.shoes[2].requiredCampOrdinal) {
                return this.itemDefinitions.shoes[Math.floor(2 * Math.random())];
            }
            return this.itemDefinitions.shoes[Math.floor(3 * Math.random())];
        },
        
        getDefaultWeapon: function (campOrdinal, step) {
            var step = step || 2;
            var totalWeapons = this.itemDefinitions.weapon.length;
            var result = null;
            for (var i = 0; i < totalWeapons; i++) {
                var weapon = this.itemDefinitions.weapon[i];
                var weaponCampOrdinal = Math.min(weapon.requiredCampOrdinal);
                if (step == 1 && weaponCampOrdinal >= campOrdinal) break;
                if (step == 2 && weaponCampOrdinal >= campOrdinal) break;
                if (step == 3 && weaponCampOrdinal > campOrdinal) break;
                result = weapon;
            }
            return result;
        },
        
        getIngredient: function () {
            var i = (this.itemDefinitions.ingredient.length) * Math.random();
            return this.itemDefinitions.ingredient[parseInt(i)];
        }
    };

    return ItemConstants;

});
