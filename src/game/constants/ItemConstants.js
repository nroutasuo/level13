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
            fight_att: "atk",
            fight_def: "def",
            fight_speed: "spd",
            movement: "movement",
            bag: "bag",
            res_cold: "warmth",
            res_radiation: "res_rad",
            res_poison: "res_poison",
            res_sunlight: "shade",
        },
        
        itemDefinitions: {
            light: [
                new ItemVO("light1", "Lantern", "Light", 1, true, true, false, 3, 1, {light: 25}, "img/items/light-lantern.png", "Feeble light for basic survival in the dark undercorridors."),
                new ItemVO("light2", "Electric light", "Light", 5, true, true, false, 5, 3, {light: 75}, "img/items/light-electric.png", "Advanced light for serious travellers."),
                new ItemVO("light3", "Ghost light", "Light", 14, true, false, false, 9, 7, {light: 125}, "img/items/light-ghost.png", "They say the ghost light can show you more the darker places you go."),
            ],
            weapon: [
                new ItemVO("weapon1", "Shiv", "Weapon", 1, true, true, false, 2, 2, {atk: 3, spd: 1.1}, "img/items/weapon-shiv.png", "Improvised sharp poking implement."),
                new ItemVO("weapon12", "Knife", "Weapon", 2, true, true, false, 2, 1, {atk: 4, spd: 1}, "img/items/weapon-shiv.png", "A bit sturdier than the shiv."),
                new ItemVO("weapon122", "Sharp knife", "Weapon", 2, true, false, false, 6, 2, {atk: 5, spd: 1}, "img/items/weapon-shiv.png", "A good quality knife."),
                new ItemVO("weapon2", "Spear", "Weapon", 4, true, true, false, 3, 1, {atk: 6, spd: 1.1}, "img/items/weapon-shiv.png", "Old-fashioned but reliable weapon."),
                new ItemVO("weapon25", "Heavy Axe", "Weapon", 5, true, true, false, 3, 1, {atk: 8, spd: 1.5}, "img/items/weapon-shiv.png", "Easy to use and reliable."),
                new ItemVO("weapon3", "Crossbow", "Weapon", 6, true, true, false, 3, 1, {atk: 12, spd: 1.1}, "img/items/weapon-shiv.png", "A deadly ranged weapon."),
                new ItemVO("weapon35", "Improved Crossbow", "Weapon", 6, true, false, false, 8, 2, {atk: 14, spd: 1.1}, "img/items/weapon-shiv.png", "An extra deadly ranged weapon."),
                new ItemVO("weapon4", "Pistol", "Weapon", 8, true, true, false, 4, 1, {atk: 24, spd: 0.9}, "img/items/weapon-shiv.png", "A crude single-shot pistol, like a hand-held miniature cannon."),
                new ItemVO("weapon5", "Revolver", "Weapon", 10, true, true, false, 4, 1, {atk: 30, spd: 0.9}, "img/items/weapon-shiv.png", "A more sophisticated handgun that allows several shots before reloading."),
                new ItemVO("weapon52", "Scrap Metal Waraxe", "Weapon", 11, true, true, false, 1, 1, {atk: 38, spd: 1.25}, "img/items/weapon-shiv.png", "A formidable axe specifically designed for combat"),
                new ItemVO("weapon58", "Crude Shotgun", "Weapon", 12, true, true, false, 5, 1, {atk: 60, spd: 1}, "img/items/weapon-shiv.png", "Devastating short-range firearm."),
                new ItemVO("weapon6", "Custom SMG", "Weapon", 13, true, true, false, 5, 2, {atk: 116, spd: 0.5}, "img/items/weapon-shiv.png", "It may be made from scrap metal but it is still a serious weapon."),
                new ItemVO("weapon7", "Improvised bazooka", "Weapon", 14, true, true, false, 3, 3, {atk: 180, spd: 1}, "img/items/weapon-shiv.png", "Powerful but heavy and somewhat unreliable construction of pipes, reclaimed weapon parts and improvised ammunition."),
                new ItemVO("weapon8", "Rifle", "Weapon", 15, true, true, false, 3, 3, {atk: 200, spd: 0.75}, "img/items/weapon-shiv.png", "Deadly weapon similar to those that were mass-produced just before the Fall."),
            ],
            clothing_over: [
                new ItemVO("clothing_over_1", "Warm Coat", "Armor", 1, true, true, false, 5, 1, {def: 1, warmth: 20}, "img/items/clothing-2.png", "Something against the chill."),
                new ItemVO("clothing_over_1x", "Lab Coat", "Armor", 2, true, false, false, 5, 1, {def: 1, warmth: 2, res_poison: 10}, "img/items/clothing-2.png", "Might protect from environmental hazards."),
                new ItemVO("clothing_over_15", "Leather Jacket", "Armor", 3, true, true, false, 2, 1, {def: 4, warmth: 5, res_rad: 3, res_poison: 3}, "img/items/clothing-2.png", "A solid jacket."),
                new ItemVO("clothing_over_2", "Biker jacket", "Armor", 3, true, false, false, 2, 1, {def: 6, warmth: 10, res_rad: 3, res_poison: 3}, "img/items/clothing-2.png", "Doesn't make one invincible, but feels like it."),
                new ItemVO("clothing_over_25", "Army Jacket", "Armor", 5, true, false, false, 2, 1, {def: 15, warmth: 10, res_rad: 5, res_poison: 5}, "img/items/clothing-2.png", "Something that's actually produced with the aim of keeping one safe."),
                new ItemVO("clothing_over_25x", "Warm Army Jacket", "Armor", 5, true, false, false, 5, 5, {def: 15, warmth: 15, res_rad: 5, res_poison: 5}, "img/items/clothing-2.png", "Something that's actually produced with the aim of keeping one safe."),
                new ItemVO("clothing_over_3", "Scrap metal armor", "Armor", 8, true, true, false, 5, 2, {def: 25, warmth: 5, res_rad: 5, res_poison: 5}, "img/items/clothing-2.png", "An ugly but surprisingly comfortable metal blanket"),
                new ItemVO("clothing_over_4", "Kevlar vest", "Armor", 10, true, true, false, 3, 2, {def: 40, res_rad: 5, res_poison: 5}, "img/items/clothing-2.png", "Heavy, but worth it."),
                new ItemVO("clothing_over_45", "Scavenger vest", "Armor", 12, true, true, false, 3, 1, {def: 40, warmth: 20, res_rad: 10, res_poison: 10}, "img/items/clothing-2.png", "Novel technology for maximal survival in the post-Fall City"),
                new ItemVO("clothing_over_5", "Riot police vest", "Armor", 13, true, false, false, 2, 2, {def: 100, warmth: 10, res_rad: 0, res_poison: 10}, "img/items/clothing-3.png", "Based on the old Surface Guard uniform with additional environmental proection."),
                new ItemVO("clothing_over_6", "Exoskeleton", "Armor", 15, true, true, false, 8, 5, {def: 290, warmth: 10, res_rad: 30, res_poison: 20}, "img/items/clothing-3.png", "Futuristic armour designed for those exploring the world outside the City's protective walls."),
            ],
            clothing_upper: [
                new ItemVO("clothing_upper_1", "Tattered shirt", "Shirt", 1, true, false, false, 1, 3, {warmth: 1}, "img/items/clothing-rags.png", "Barely counts for clothing, but for now it'll have to do."),
                new ItemVO("clothing_upper_15", "T-shirt", "Shirt", 2, true, true, false, 2, 1, { def: 1, warmth: 2, res_rad: 1, res_poison: 1}, "img/items/clothing-shirt.png", "Standard shirt."),
                new ItemVO("clothing_upper_2", "Factory uniform shirt", "Shirt", 5, true, false, false, 1, 1, {def: 2, warmth: 3, res_rad: 1, res_poison: 1}, "img/items/clothing-shirt-2.png", "Feels oddly comfortable in dark corridors and abandoned factories."),
                new ItemVO("clothing_upper_3", "Guard uniform shirt", "Shirt", 8, true, true, false, 1, 1, {def: 5, warmth: 10, res_rad: 3, res_poison: 3}, "img/items/clothing-shirt-2.png", "Looks official, but not particularly protective."),
                new ItemVO("clothing_upper_35", "Synthetic shirt", "Shirt", 10, true, false, false, 2, 2, {def: 5, warmth: 12, res_rad: 5, res_poison: 5}, "img/items/clothing-2.png", "Shirt made from recycled advanced textiles used before the Fall."),
                new ItemVO("clothing_upper_4", "Protective shirt", "Shirt", 12, true, true, false, 5, 1, {def: 8, warmth: 15, res_rad: 5, res_poison: 5}, "img/items/clothing-3.png", "Specifically made for keeping travellers warm and safe."),
                new ItemVO("clothing_upper_45", "Explorer's shirt", "Shirt", 13, true, false, false, 2, 2, {def: 10, warmth: 15, res_rad: 5, res_poison: 5}, "img/items/clothing-3.png", "Comes with many pockets."),
                new ItemVO("clothing_upper_5", "Scavenger's raincoat", "Shirt", 15, true, true, false, 4, 2, {def: 0, warmth: 25, res_rad: 40, res_poison: 60}, "img/items/clothing-3.png", "The best protection an explorer can hope for."),
            ],
            clothing_lower: [
                new ItemVO("clothing_lower_1", "Ragged pants", "Legs", 1, true, false, false, 1, 3, {warmth: 1}, "img/items/clothing-rags.png", "Barely counts for clothing, but for now it'll have to do."),
                new ItemVO("clothing_lower_15", "Basic pants", "Legs", 2, true, true, false, 3, 1, {def: 1, warmth: 1}, "img/items/clothing-rags.png", "Nothing wrong with these pants"),
                new ItemVO("clothing_lower_2", "Factory uniform pants", "Legs", 5, true, false, false, 1, 1, {def: 1, warmth: 5}, "img/items/clothing-2.png", "Used to be the standard uniform in the dark levels of the City."),
                new ItemVO("clothing_lower_3", "Guard uniform pants", "Legs", 8, true, true, false, 1, 2, {def: 3, warmth: 8}, "img/items/clothing-2.png", "Looks official, but not particularly protective."),
                new ItemVO("clothing_lower_4", "Padded pants", "Legs", 11, true, true, false, 3, 3, {def: 15, warmth: 10}, "img/items/clothing-3.png", "Protects from bites and scratches."),
                new ItemVO("clothing_lower_45", "Explorer's pants", "Legs", 13, true, true, false, 5, 2, {def: 15, warmth: 10, res_rad: 5, res_poison: 5}, "img/items/clothing-3.png", "Protects from bites and scratches."),
                new ItemVO("clothing_lower_5", "Long underwear", "Legs", 15, true, true, false, 3, 1, {def: 5, warmth: 50, res_rad: 1, res_poison: 1}, "img/items/clothing-3.png", "Nothing keeps you warm like long underwear."),
            ],
            clothing_head: [
                new ItemVO("clothing_head_0", "Sunglasses", "Head", 2, true, false, false, 5, 1, {shade: 30}, "img/items/clothing-hat-1.png", "If there was any sunlight, these would probably be handy."),
                new ItemVO("clothing_head_1", "Wool hat", "Head", 2, true, true, false, 3, 1, {def: 1, warmth: 10}, "img/items/clothing-hat-1.png", "Warm basic headwear."),
                new ItemVO("clothing_head_2", "Medical mask", "Head", 4, true, false, false, 5, 1, {res_poison: 15}, "img/items/clothing-hat-1.png", "Meager protection against the effects of polluted air."),
                new ItemVO("clothing_head_25", "Bike helmet", "Head", 5, true, false, false, 3, 1, {def: 3}, "img/items/clothing-hat-2.png", "A bit clumsy, but quite useful in a fight."),
                new ItemVO("clothing_head_3", "Scrap metal helmet", "Head", 7, true, true, false, 4, 2, {def: 5, warmth: 5, res_rad: 5, res_poison: 5, "shade": 10}, "img/items/clothing-hat-2.png", "Perfect apparel for the post-apocalyptic hero."),
                new ItemVO("clothing_head_4", "Gas mask", "Head", 11, true, true, false, 2, 1, {def: 5, warmth: 3, res_rad: 15, res_poison: 30, "shade": 10}, "img/items/clothing-hat-2.png", "Gives a definite sense of security in dangerous environments."),
                new ItemVO("clothing_head_45", "Scavenger's hood", "Head", 12, true, true, false, 3, 1, {def: 10, warmth: 10, res_rad: 15, res_poison: 15, "shade": 15}, "img/items/clothing-hat-2.png", "A practical, protective hood that doesn't get in the way."),
                new ItemVO("clothing_head_5", "Explorer's helmet", "Head", 13, true, true, false, 5, 2, {def: 30, warmth: 15, res_rad: 20, res_poison: 10, "shade": 50}, "img/items/clothing-hat-3.png", "Headgear designed specifically for scavenging in the City."),
            ],
            clothing_hands: [
                new ItemVO("clothing_hands_1", "Mittens", "Hands", 2, true, true, false, 3, 1, {warmth: 5}, "img/items/clothing-hand-0.png", "Nothing keeps hands warm like fluffy mittens."),
                new ItemVO("clothing_hands_12", "Leather Gloves", "Hands", 3, true, true, false, 3, 1, {def: 1, warmth: 3, res_rad: 1, res_poison: 1}, "img/items/clothing-hand-0.png", "Not only warm but also protective."),
                new ItemVO("clothing_hands_2", "Work gloves", "Hands", 5, true, true, false, 1, 1, {def: 1, warmth: 5, res_rad: 3, res_poison: 3}, "img/items/clothing-hand-0.png", "Basic protection for hands."),
                new ItemVO("clothing_hands_25", "Good gloves", "Hands", 7, true, true, false, 2, 1, {def: 2, warmth: 5, res_rad: 3, res_poison: 3}, "img/items/clothing-hand-0.png", "Good gloves make scavenging much safer."),
                new ItemVO("clothing_hands_3", "Quality gloves", "Hands", 10, true, true, false, 2, 1, {def: 2, warmth: 7, res_rad: 5, res_poison: 10}, "img/items/clothing-hand-0.png", "No scavenger ever regretted having good gloves."),
                new ItemVO("clothing_hands_4", "Scavenger's gloves", "Hands", 12, true, true, false, 3, 1, {def: 5, warmth: 15, res_rad: 15, res_poison: 15}, "img/items/clothing-hand-0.png", "Gloves that protect from almost all environmental hazards."),
                new ItemVO("clothing_hands_5", "Synthetic gloves", "Hands", 14, true, false, false, 3, 2, {def: 8, warmth: 15, res_rad: 15, res_poison: 15}, "img/items/clothing-hand-0.png", "Gloves made from recycled advanced textiles from before the Fall."),
            ],
            shoes: [
                new ItemVO("shoe_1", "Improvised flip-flops", "Shoes", 1, true, true, false, 2, 1, {movement: 0.9}, "img/items/shoe-1.png", "Protects a scavenger's feet from sharp things that might be lying around."),
                new ItemVO("shoe_2", "Worn trainers", "Shoes", 5, true, false, false, 5, 3, {movement: 0.8}, "img/items/shoe-2.png", "Decent shoes for walking in most places."),
                new ItemVO("shoe_3", "Hiking boots", "Shoes", 10, true, false, false, 8, 5, {movement: 0.5}, "img/items/shoe-3.png", "Good shoes like these can make travelling much easier."),
            ],
            follower: [
            ],
            bag: [
                new ItemVO("bag_0", "Plastic bag", "Bag", 1, true, true, false, 2, 5, {bag: WorldCreatorConstants.BAG_BONUS_1}, "img/items/bag-0.png", "It's not fancy, but allows one to carry around more stuff than their hands and pockets can hold."),
                new ItemVO("bag_1", "Basic backpack", "Bag", WorldCreatorConstants.CAMP_ORDINAL_BAG_2 - 1, true, true, false, 4, 1, {bag: WorldCreatorConstants.BAG_BONUS_2}, "img/items/bag-1.png", "A more spacious bag with lots of pockets."),
                new ItemVO("bag_2", "Jumbo backpack", "Bag", WorldCreatorConstants.CAMP_ORDINAL_BAG_3 - 1, true, true, false, 6, 2, {bag: WorldCreatorConstants.BAG_BONUS_3}, "img/items/bag-1.png", "A huge backpack with plenty of space."),
                new ItemVO("bag_3", "Hiker's rucksack", "Bag", WorldCreatorConstants.CAMP_ORDINAL_BAG_4 - 1, true, false, false, 6, 3, {bag: WorldCreatorConstants.BAG_BONUS_4}, "img/items/bag-1.png", "With this bag, weight is starting to be more of a problem than space."),
                new ItemVO("bag_4", "Scavenger bag", "Bag", WorldCreatorConstants.CAMP_ORDINAL_BAG_5 - 1, true, false, false, 8, 3, {bag: WorldCreatorConstants.BAG_BONUS_5}, "img/items/bag-1.png", "A really practical backpack with lots of pockets."),
                new ItemVO("bag_5", "Automatic luggage", "Bag", 15, true, false, false, 10, 8, {"bag": WorldCreatorConstants.BAG_BONUS_6}, "img/items/bag-3.png", "Mechanical chest that automatically follows its owner around. No more worrying about carrying all that stuff yourself."),
            ],
            artefact: [
                new ItemVO("artefact_ground_1", "Runestone", "Artefact", 3, false, false, false, 8, 2, null, "img/items/artefact-test.png", "Puzzling piece of stone with an ancient rune on it."),
                new ItemVO("artefact_ground_2", "Charred seed", "Artefact", 7, false, false, false, 10, 2, null, "img/items/artefact-test.png", "Seeds are said to contain life itself. They do not grow in the dark city."),
                new ItemVO("artefact_ground_3", "Round stone", "Artefact", 3, false, false, false, 6, 1, null, "img/items/artefact-test.png", "Smooth stone that fits in the palm of a hand. There is something calming about it."),
                new ItemVO("artefact_ground_4", "Leather pouch", "Artefact", 1, false, false, false, 6, 2, null, "img/items/artefact-test.png", "Small leather pouch with a string that allows it to be worn around the neck. All it contains is some kind of a powder."),
                new ItemVO("artefact_surface_1", "Canned tuna", "Artefact", 15, false, false, false, 5, 2, null, "img/items/artefact-test.png", "Leftovers from a bygone time. They say there used to be fish tanks, somewhere near the surface."),
                new ItemVO("artefact_surface_2", "ID Chip", "Artefact", 15, false, false, false, 7, 3, null, "img/items/artefact-test.png", "Chips like these used to be placed under people's skins, giving them certain powers. It probably doesn't work anymore."),
                new ItemVO("artefact_surface_3", "Scientist's notebook", "Artefact", 15, false, false, false, 7, 3, null, "img/items/artefact-test.png", "Worn but still mostly legible, this notebook seems to contain calculations related to fuel consumption of some kind of a large and complex vehicle over very long distances."),
                new ItemVO("artefact_history_1", "Fountain pen", "Artefact", 1, false, false, false, 6, 1, null, "img/items/artefact-test.png", "Long since dried and useless as a writing implement, but still popular among sages and philosophers as a symbol of knowledge."),
                new ItemVO("artefact_history_2", "Pearl", "Artefact", 7, false, false, false, 8, 3, null, "img/items/artefact-test.png", "A beautiful orb said to have formed in the Sea, a massive body of water that is the origin of all life."),
                new ItemVO("artefact_history_3", "CD", "Artefact", 1, false, false, false, 6, 2, null, "img/items/artefact-test.png", "An old circular data storage with the word 'backup' written on it. Without an electric computing machine, it's impossible to stay if it is still readable."),
                new ItemVO("artefact_doom_1", "Volcanic rock", "Artefact", 4, false, false, false, 7, 3, null, "img/items/artefact-test.png", "Unnerving piece of black rock. Something is etched on it in an unfamiliar language."),
                new ItemVO("artefact_doom_2", "Temple key", "Artefact", 3, false, false, false, 7, 3, null, "img/items/artefact-test.png", "Heavy key with a demonic eel-like ornament so intricately carved it feels almost alive. Strangely cold to the touch."),
                new ItemVO("artefact_doom_3", "Seashell", "Artefact", 2, false, false, false, 9, 5, null, "img/items/artefact-test.png", "Fragile, yellow and light pink shell that must have been looted from a museum."),
                new ItemVO("artefact_doom_4", "Pamphlet", "Artefact", 1, false, false, false, 5, 1, null, "img/items/artefact-test.png", "Bold political leaflet printed on thick paper urging residents of the 'sewers' to rebel against segregation."),
                new ItemVO("artefact_doom_5", "Starchart", "Artefact", 15, false, false, false, 8, 2, null, "img/items/artefact-test.png", "Complicated astrological map with calculations indicating an event occurring on year 783."),
                new ItemVO("artefact_science", "Data stick", "Artefact", 10, false, false, false, 7, 3, null, "img/items/artefact-test.png", "Some kind of a data storage. Unfortunately, nothing that reads it seems to have survived."),
            ],
            ingredient: [
                new ItemVO("res_tape", "Duct tape", "Ingredient", 1, false, false, false, 1, 1, null, "img/items/res-tape.png", "Used for crafting."),
                new ItemVO("res_bands", "Rubber bands", "Ingredient", 1, false, false, false, 1, 1, null, "img/items/res-bands.png", "Used for crafting."),
                new ItemVO("res_silk", "Spider silk", "Ingredient", 1, false, false, false, 1, 1, null, "img/items/res-silk.png", "Used for crafting."),
                new ItemVO("res_glowbug", "Glowbug", "Ingredient", 1, false, false, false, 1, 1, null, "img/items/res-glowbug.png", "Used for crafting."),
                new ItemVO("res_hairpin", "Hairpin", "Ingredient", 1, false, false, false, 1, 1, null, "img/items/res-pin.png", "Used for crafting."),
                new ItemVO("res_bottle", "Plastic bottle", "Ingredient", 1, false, false, false, 1, 1, null, "img/items/res-bottle.png", "Used for crafting."),
                new ItemVO("res_leather", "Leather", "Ingredient", 1, false, false, false, 1, 1, null, "img/items/res-leather.png", "Used for crafting."),
            ],
            exploration: [
                new ItemVO("exploration_1", "Lockpick", "Exploration", 1, false, true, false, 1, 1, null, "img/items/exploration-1.png", "Useful tool when exploring and scouting."),
                new ItemVO("first_aid_kit_1", "Basic first aid kit", "Exploration", 3, false, true, true, 6, 1, null, "img/items/firstaid-1.png", "Heal light injuries on the go."),
                new ItemVO("first_aid_kit_2", "Full first aid kit", "Exploration", 10, false, true, true, 8, 2, null, "img/items/firstaid-2.png", "Heal all injuries on the go."),
                new ItemVO("glowstick_1", "Glowstick", "Exploration", 1, false, true, true, 8, 2, null, "img/items/glowstick-1.png", "Temporary light. Can be used as a distraction."),
                new ItemVO("consumable_weapon_1", "Shuriken", "Exploration", 2, false, true, false, 8, 2, null, "img/items/exploration-gear.png", "One-use weapon."),
                new ItemVO("flee_1", "Smoke Bomb", "Exploration", 3, false, true, false, 8, 2, null, "img/items/weapon-bomb.png", "Can be used to escape a fight."),
                new ItemVO("cache_metal_1", "Abandoned robot", "Exploration", 1, false, false, true, 5, -1, {}, "img/items/cahce-metal.png", "Can probably be taken apart down for some scrap metal"),
                new ItemVO("cache_metal_2", "Broken appliance", "Exploration", 1, false, false, true, 5, -1, {}, "img/items/cahce-metal.png", "Can probably be taken apart down for some scrap metal"),
            ],
            uniqueEquipment: [
                new ItemVO("equipment_map", "Map", "UniqueEquipment", 0, false, false, false, -1, -1, null, "img/items/exploration-map.png", "Helps navigating the City."),
            ],
        },

        
        getItemByID: function (id) {
            if (id.indexOf("follower-") >= 0)
                return this.getFollowerByID(id);
            for (var type in this.itemDefinitions ) {
                for (var i in this.itemDefinitions[type]) {
                    var item = this.itemDefinitions[type][i];
                    if (item.id === id) {
                        return item.clone();
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
        
        getRequiredCampAndStepToCraft: function (item) {
            var result = { campOrdinal: 0, step: 0 };
            if (!item.craftable) return result;
            
            var reqs = PlayerActionConstants.requirements["craft_" + item.id];
            if (reqs && reqs.upgrades) {
                var requiredTech = Object.keys(reqs.upgrades);
                for (var k = 0; k < requiredTech.length; k++) {
                    var campOrdinal = UpgradeConstants.getMinimumCampOrdinalForUpgrade(requiredTech[k]);
                    var step = UpgradeConstants.getMinimumLevelStepForUpgrade(requiredTech[k]);
                    if (campOrdinal > result.campOrdinal || step > result.step) {
                        result = { campOrdinal: campOrdinal, step: step };
                    }
                }
            }
            
            return result;
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
            var bonuses = {atk: strength};

            // TODO persist image depending on id
            var icon = "img/items/follower-" + Math.floor(Math.random() * 4 + 1) + ".png";

            // TODO more varied follower descriptions
            var description = "A fellow traveller who has agreed to travel together.";
            return new ItemVO(id, name, type, 1, true, false, false, -1, -1, bonuses, icon, description);
        },
        
        getBag: function (campOrdinal) {
            if (campOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_2) {
                return this.itemDefinitions.bag[0];
            }
            if (campOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_3) {
                return this.itemDefinitions.bag[1];
            }
            if (campOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_4) {
                return this.itemDefinitions.bag[2];
            }
            if (campOrdinal < WorldCreatorConstants.CAMP_ORDINAL_BAG_5) {
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
                var weaponCampOrdinal = Math.max(1, weapon.requiredCampOrdinal);
                if (step == 1 && weaponCampOrdinal >= campOrdinal) break;
                if (step == 2 && weaponCampOrdinal >= campOrdinal) break;
                if (step == 3 && weaponCampOrdinal > campOrdinal) break;
                result = weapon;
            }
            return result;
        },
        
        getIngredient: function (i) {
            var i = i || (this.itemDefinitions.ingredient.length) * Math.random();
            i = i % this.itemDefinitions.ingredient.length;
            return this.itemDefinitions.ingredient[parseInt(i)];
        },
        
        isQuicklyObsoletable: function (category) {
            var t = ItemConstants.itemTypes[category] || category;
            switch (t) {
                case ItemConstants.itemTypes.weapon:
                case ItemConstants.itemTypes.clothing_over:
                case ItemConstants.itemTypes.clothing_upper:
                case ItemConstants.itemTypes.clothing_lower:
                case ItemConstants.itemTypes.clothing_hands:
                case ItemConstants.itemTypes.clothing_head:
                    return true;
                default:
                    return false;
            }
        },
        
        isObsoletable: function (category) {
            var t = ItemConstants.itemTypes[category] || category;
            switch (t) {
                case ItemConstants.itemTypes.weapon:
                case ItemConstants.itemTypes.clothing_over:
                case ItemConstants.itemTypes.clothing_upper:
                case ItemConstants.itemTypes.clothing_lower:
                case ItemConstants.itemTypes.clothing_hands:
                case ItemConstants.itemTypes.clothing_head:
                case ItemConstants.itemTypes.light:
                case ItemConstants.itemTypes.bag:
                    return true;
                default:
                    return false;
            }
        }
    };
    
    return ItemConstants;

});
