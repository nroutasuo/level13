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
                    "Feeble light for basic survival in the dark undercorridors.", 1, 2),
                new ItemVO("light2", "Electric light", "Light", {"light": 75}, true, true, false, "img/items/light-electric.png",
                    "Advanced light for serious travellers.", 5, -1),
                new ItemVO("light3", "Ghost light", "Light", {"light": 125}, true, false, false, "img/items/light-ghost.png",
                    "They say the ghost light can show you more the darker places you go.", 15, 9),
            ],
            weapon: [
                new ItemVO("weapon1", "Shiv", "Weapon", {"fight attack": 2}, true, true, false, "img/items/weapon-shiv.png",
                    "Improvised sharp poking implement.", 1, 2),
                new ItemVO("weapon2", "Spear", "Weapon", {"fight attack": 5}, true, true, false, "img/items/weapon-shiv.png",
                    "Old-fashioned but reliable weapon.", 5, 2),
                new ItemVO("weapon3", "Crossbow", "Weapon", {"fight attack": 11}, true, true, false, "img/items/weapon-shiv.png",
                    "A deadly ranged weapon consisting of a horizontal limb assembly mounted on a stock that shoots projectiles.", 8, 7),
                new ItemVO("weapon4", "Pistol", "Weapon", {"fight attack": 24}, true, true, false, "img/items/weapon-bomb.png",
                    "A crude single-shot pistol, like a hand-held miniature cannon.", 11, 7),
                new ItemVO("weapon5", "Revolver", "Weapon", {"fight attack": 52}, true, true, false, "img/items/weapon-bomb.png",
                    "A more sophisticated handgun that allows several shots before reloading.", 14, 7),
                new ItemVO("weapon6", "Custom SMG", "Weapon", {"fight attack": 116}, true, true, false, "img/items/weapon-bomb.png",
                    "It may be made from scrap metal but it is still a serious weapon.", 17, -1),
                new ItemVO("weapon7", "Improvised bazooka", "Weapon", {"fight attack": 225}, true, true, false, "img/items/weapon-bomb.png",
                    "Powerful but heavy and somewhat unreliable construction of pipes, reclaimed weapon parts and improvised ammunition.", 19, -1),
            ],
            clothing_over: [
                new ItemVO("clothing_over_1", "Warm Coat", "Armor", {"fight defence": 1, warmth: 20}, true, true, false, "img/items/clothing-2.png",
                    "Something against the chill.", 1, 5),
                new ItemVO("clothing_over_2", "Biker jacket", "Armor", {"fight defence": 6, warmth: 10, "radiation protection": 3, "poison protection": 3}, true, false, false, "img/items/clothing-2.png",
                    "Doesn't make one invincible, but feels like it.", 7, 6),
                new ItemVO("clothing_over_3", "Scrap metal armor", "Armor", {"fight defence": 18, warmth: 0, "radiation protection": 5, "poison protection": 5}, true, true, false, "img/items/clothing-2.png",
                    "Something that's actually produced with the aim of keeping one safe.", 1, 7),
                new ItemVO("clothing_over_4", "Kevlar vest", "Armor", {"fight defence": 40, warmth: 0, "radiation protection": 0, "poison protection": 5}, true, true, false, "img/items/clothing-2.png",
                    "Heavy, but worth it.", 1, 7),
                new ItemVO("clothing_over_5", "Riot police vest", "Armor", {"fight defence": 100, warmth: 10, "radiation protection": 0, "poison protection": 10}, true, false, false, "img/items/clothing-3.png",
                    "Based on the old Surface Guard uniform with additional environmental proection.", 17, 6),
                new ItemVO("clothing_over_6", "Exoskeleton", "Armor", {"fight defence": 290, warmth: 10, "radiation protection": 30, "poison protection": 20}, true, true, false, "img/items/clothing-3.png",
                    "Based on the old Surface Guard uniform with additional environmental proection.", 18, -1),
            ],
            clothing_upper: [
                new ItemVO("clothing_upper_1", "Tattered shirt", "Shirt", {warmth: 1}, true, false, false, "img/items/clothing-rags.png",
                    "Barely counts for clothing, but for now it'll have to do.", 1, 2),
                new ItemVO("clothing_upper_2", "Factory uniform shirt", "Shirt", {"fight defence": 1, warmth: 3}, true, false, false, "img/items/clothing-2.png",
                    "Feels oddly comfortable in dark corridors and abandoned factories.", 5, 4),
                new ItemVO("clothing_upper_3", "Guard shirt", "Shirt", {"fight defence": 2, warmth: 3}, true, true, false, "img/items/clothing-2.png",
                    "Looks official, but not particularly protective.", 12, 4),
                new ItemVO("clothing_upper_4", "Protective shirt", "Shirt", {"fight defence": 10, warmth: 10, "radiation protection": 5, "poison protection": 5}, true, true, false, "img/items/clothing-3.png",
                    "Specifically made for keeping travellers warm and safe.", 1, 8),
                new ItemVO("clothing_upper_5", "Scavenger's raincoat", "Shirt", {"fight defence": 0, warmth: 25, "radiation protection": 40, "poison protection": 60}, true, true, false, "img/items/clothing-3.png",
                    "The best protection an explorer can hope for.", 1, 9),
            ],
            clothing_lower: [
                new ItemVO("clothing_lower_1", "Ragged pants", "Legs", {warmth: 1}, true, false, false, "img/items/clothing-rags.png",
                    "Barely counts for clothing, but for now it'll have to do.", 1, 2),
                new ItemVO("clothing_lower_2", "Factory uniform pants", "Legs", {"fight defence": 1, warmth: 3}, true, false, false, "img/items/clothing-2.png",
                    "Used to be the standard uniform in the dark levels of the City.", 5, 4),
                new ItemVO("clothing_lower_3", "Guard uniform pants", "Legs", {"fight defence": 2, warmth: 3}, true, true, false, "img/items/clothing-2.png",
                    "Looks official, but not particularly protective.", 12, 4),
                new ItemVO("clothing_lower_4", "Padded pants", "Legs", {"fight defence": 15, warmth: 5}, true, true, false, "img/items/clothing-3.png",
                    "Protects from bites and scratches.", 13, -1),
                new ItemVO("clothing_lower_5", "Long underwear", "Legs", {"fight defence": 1, warmth: 20}, true, true, false, "img/items/clothing-3.png",
                    "Nothing keeps you warm like long underwear.", 15, 6),
            ],
            clothing_head: [
                new ItemVO("clothing_head_0", "Sunglasses", "Head", {"sunblindness protection": 30}, true, false, false, "img/items/clothing-hat-1.png",
                    "If there was any sunlight, these would probably be handy.", 2, 8),
                new ItemVO("clothing_head_1", "Wool hat", "Head", {"fight defence": 1, warmth: 10}, true, true, false, "img/items/clothing-hat-1.png",
                    "Warm basic headwear.", 1, 5),
                new ItemVO("clothing_head_2", "Pollution mask", "Head", {"poison protection": 15}, true, false, false, "img/items/clothing-hat-1.png",
                    "Meager protection against the effects of polluted air.", 4, 7),
                new ItemVO("clothing_head_3", "Scrap metal helmet", "Head", {"fight defence": 5, warmth: 5, "radiation protection": 5, "poison protection": 5, "sunblindness protection": 10}, true, true, false, "img/items/clothing-hat-2.png",
                    "Perfect apparel for the post-apocalyptic knight.", 5, -1),
                new ItemVO("clothing_head_4", "Gas mask", "Head", {"fight defence": 5, warmth: 5, "radiation protection": 15, "poison protection": 30, "sunblindness protection": 10}, true, false, false, "img/items/clothing-hat-2.png",
                    "Gives a definite sense of security in dangerous environments.", 11, 8),
                new ItemVO("clothing_head_5", "Explorer's helmet", "Head", {"fight defence": 30, warmth: 10, "radiation protection": 20, "poison protection": 10, "sunblindness protection": 50}, true, true, false, "img/items/clothing-hat-3.png",
                    "Headgear designed specifically for scavenging in the City.", 15, -1),
            ],
            clothing_hands: [
                new ItemVO("clothing_hands_1", "Mittens", "Hands", {"warmth": 10}, true, true, false, "img/items/clothing-hand-0.png",
                    "Nothing keeps hands warm like fluffy mittens.", 2, 5),
                new ItemVO("clothing_hands_2", "Work gloves", "Hands", {"warmth": 5, "radiation protection": 2, "poison protection": 2}, true, true, false, "img/items/clothing-hand-0.png",
                    "Basic protection for hands.", 5, 5),
                new ItemVO("clothing_hands_3", "Quality gloves", "Hands", {"warmth": 5, "radiation protection": 5, "poison protection": 10}, true, true, false, "img/items/clothing-hand-0.png",
                    "No scavenger ever regretted having good gloves.", 8, 6),
                new ItemVO("clothing_hands_4", "Scavenger's gloves", "Hands", {"fight defence": 5, warmth: 15, "radiation protection": 10, "poison protection": 10}, true, true, false, "img/items/clothing-hand-0.png",
                    "Gloves that protect from almost all environmental hazards.", 15, 9),
            ],
            shoes: [
                new ItemVO("shoe_1", "Improvised flip-flops", "Shoes", {"movement": 0.9}, true, true, false, "img/items/shoe-1.png",
                    "Protects a scavenger's feet from sharp things that might be lying around.", 1, 6),
                new ItemVO("shoe_2", "Worn trainers", "Shoes", {"movement": 0.8}, true, false, false, "img/items/shoe-2.png",
                    "Decent, reasonable shoes for walking in most places.", 7, 4),
                new ItemVO("shoe_3", "Hiking boots", "Shoes", {"movement": 0.5}, true, false, false, "img/items/shoe-3.png",
                    "Good shoes like these can make travelling much easier.", 14, 7),
            ],
            follower: [
            ],
            bag: [
                new ItemVO("bag_0", "Plastic bag", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_1}, true, true, false, "img/items/bag-0.png",
                    "It's not fancy, but allows one to carry around more stuff than their hands and pockets can hold.", 1, 1),
                new ItemVO("bag_1", "Basic backpack", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_2}, true, true, false, "img/items/bag-1.png",
                    "A more spacious bag with lots of pockets.", WorldCreatorConstants.LEVEL_ORDINAL_BAG_2, 4),
                new ItemVO("bag_2", "Jumbo backpack", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_3}, true, true, false, "img/items/bag-1.png",
                    "A huge backpack with plenty of space.", 5, WorldCreatorConstants.LEVEL_ORDINAL_BAG_3, 6),
                new ItemVO("bag_3", "Hicker's rucksack", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_4}, true, false, false, "img/items/bag-1.png",
                    "With this bag, weight is starting to be more of a problem than space.", WorldCreatorConstants.LEVEL_ORDINAL_BAG_4, 6),
                new ItemVO("bag_4", "Scavenger bag", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_5}, true, false, false, "img/items/bag-1.png",
                    "A really practical backpack with lots of pockets.", WorldCreatorConstants.LEVEL_ORDINAL_BAG_5, 8),
                new ItemVO("bag_5", "Automatic luggage", "Bag", {"bag": WorldCreatorConstants.BAG_BONUS_6}, true, false, false, "img/items/bag-3.png",
                    "Mechanical chest that automatically follows its owner around. No more worrying about carrying all that stuff yourself.", WorldCreatorConstants.LEVEL_ORDINAL_BAG_6, 10),
            ],
            artefact: [
                new ItemVO("artefact_ground_1", "Runestone", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Puzzling piece of stone with an ancient rune on it.", 3, 8),
                new ItemVO("artefact_ground_2", "Charred seed", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Seeds are said to contain life itself. They do not grow in the dark city.", 10, 10),
                new ItemVO("artefact_ground_3", "Round stone", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Smooth stone that fits in the palm of a hand. There is something calming about it.", 3, 6),
                new ItemVO("artefact_ground_4", "Leather pouch", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Small leather pouch with a string that allows it to be worn around the neck. All it contains is some kind of a powder.", 1, 6),
                new ItemVO("artefact_surface_1", "Canned tuna", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Leftovers from a bygone time. They say there used to be fish tanks, somewhere near the surface.", 15, 5),
                new ItemVO("artefact_surface_2", "ID Chip", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Chips like these used to be placed under people's skins, giving them certain powers. It probably doesn't work anymore.", 15, 7),
                new ItemVO("artefact_surface_3", "Scientist's notebook", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Worn but still mostly legible, this notebook seems to contain calculations related to fuel consumption of some kind of a large and complex vehicle over very long distances.", 15, 7),
                new ItemVO("artefact_history_1", "Fountain pen", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Long since dried and useless as a writing implement, but still popular among sages and philosophers as a symbol of knowledge.", 1, 6),
                new ItemVO("artefact_history_2", "Pearl", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "A beautiful orb said to have formed in the Sea, a massive body of water that is the origin of all life.", 7, 8),
                new ItemVO("artefact_history_3", "CD", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "An old circular data storage with the word 'backup' written on it. Without an electric computing machine, it's impossible to stay if it is still readable.", 1, 6),
                new ItemVO("artefact_doom_1", "Volcanic rock", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Unnerving piece of black rock. Something is etched on it in an unfamiliar language.", 4, 7),
                new ItemVO("artefact_doom_2", "Temple key", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Heavy key with a demonic eel-like ornament so intricately carved it feels almost alive. Strangely cold to the touch.", 1, 7),
                new ItemVO("artefact_doom_3", "Seashell", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Fragile, yellow and light pink shell that must have been looted from a museum.", 1, 9),
                new ItemVO("artefact_doom_4", "Pamphlet", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Bold political leaflet printed on thick paper urging residents of the 'sewers' to rebel against segregation.", 1, 5),
                new ItemVO("artefact_doom_5", "Starchart", "Artefact", null, false, false, false, "img/items/artefact-test.png",
                    "Complicated astrological map with calculations indicating an event occurring on year 783.", 15, 8),
            ],
            ingredient: [
                new ItemVO("res_matches", "Matches", "Ingredient", null, false, false, false, "img/items/res-matches.png", "Used for crafting."),
                new ItemVO("res_bands", "Rubber bands", "Ingredient", null, false, false, false, "img/items/res-bands.png", "Used for crafting."),
                new ItemVO("res_silk", "Spider silk", "Ingredient", null, false, false, false, "img/items/res-silk.png", "Used for crafting."),
            ],
            exploration: [
                new ItemVO("exploration_1", "Lockpick", "Exploration", null, false, true, false, "img/items/exploration-1.png", "Useful tool when exploring and scouting."),
                new ItemVO("first_aid_kit_1", "Basic first aid kit", "Exploration", null, false, true, true, "img/items/firstaid-1.png", "Heal light injuries on the go.", 3, 6),
                new ItemVO("first_aid_kit_2", "Full first aid kit", "Exploration", null, false, true, true, "img/items/firstaid-2.png", "Heal all injuries on the go.", 10, 8),
                new ItemVO("glowstick_1", "Glowstick", "Exploration", null, false, true, true, "img/items/glowstick-1.png", "Temporary light. Can be used as a distraction.", 1, 8)
            ],
            uniqueEquipment: [
                new ItemVO("equipment_map", "Map", "UniqueEquipment", null, false, false, false, "img/items/exploration-map.png", "Helps you navigate the City."),
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
        
        getBag: function (levelOrdinal) {
            if (levelOrdinal < WorldCreatorConstants.LEVEL_ORDINAL_BAG_2) {
                return this.itemDefinitions.bag[0];
            }
            if (levelOrdinal < WorldCreatorConstants.LEVEL_ORDINAL_BAG_3) {
                return this.itemDefinitions.bag[1];
            }
            if (levelOrdinal < WorldCreatorConstants.LEVEL_ORDINAL_BAG_4) {
                return this.itemDefinitions.bag[2];
            }
            if (levelOrdinal < WorldCreatorConstants.LEVEL_ORDINAL_BAG_5) {
                return this.itemDefinitions.bag[3];
            }
            if (levelOrdinal < WorldCreatorConstants.LEVEL_ORDINAL_BAG_6) {
                return this.itemDefinitions.bag[4];
            }
            return this.itemDefinitions.bag[5];
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
        
        getDefaultWeapon: function (campOrdinal) {
            var totalWeapons = this.itemDefinitions.weapon.length;
            var weapon = Math.max(1, Math.floor(campOrdinal / WorldCreatorConstants.CAMPS_TOTAL * totalWeapons));
            return this.itemDefinitions.weapon[weapon - 1];
        },
        
        getIngredient: function () {
            var i = (this.itemDefinitions.ingredient.length) * Math.random();
            return this.itemDefinitions.ingredient[parseInt(i)];
        }
    };

    return ItemConstants;

});
