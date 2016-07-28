define(['ash', 'game/vos/ItemVO'], function (Ash, ItemVO) {
    
    var ItemConstants = {
	
		PLAYER_DEFAULT_STORAGE: 10,
		
		itemTypes: {
			// Equippable:
			light: "Light",
			weapon: "Weapon",
			clothing: "Clothing",
			follower: "Follower",
			shoes: "Shoes",
			// Special
			bag: "Bag",
			ingredient: "Ingredient",
			exploration: "Exploration",
			uniqueEquipment: "UniqueEquipment",
			// Just inventory
			artefact: "Artefact",
			note: "Note",
		},
		
		itemDefinitions: {
			light: [
				new ItemVO("light1", "Lantern", "Light", 25, true, true, false, "img/items/light-lantern.png",
						   "Feeble light for basic survival in the dark undercorridors."),
				new ItemVO("light2", "Electric light", "Light", 75, true, true, false, "img/items/light-electric.png",
						   "Advanced light for serious travellers."),
				new ItemVO("light3", "Ghost light", "Light", 125, true, false, false, "img/items/light-ghost.png",
						   "They say the ghost light can show you more the darker places you go."),
			],
			weapon: [
				new ItemVO("weapon1", "Shiv", "Weapon", 2, true, true, false, "img/items/weapon-shiv.png",
						   "Improvised sharp poking implement."),
				new ItemVO("weapon2", "Spear", "Weapon", 5, true, true, false, "img/items/weapon-shiv.png",
						   "Old-fashioned but reliable weapon."),
				new ItemVO("weapon3", "Crossbow", "Weapon", 11, true, true, false, "img/items/weapon-shiv.png",
						   "A deadly ranged weapon consisting of a horizontal limb assembly mounted on a stock that shoots projectiles."),
				new ItemVO("weapon4", "Pistol", "Weapon", 24, true, true, false, "img/items/weapon-bomb.png",
						   "A crude single-shot pistol, like a hand-held miniature cannon."),
				new ItemVO("weapon5", "Revolver", "Weapon", 52, true, true, false, "img/items/weapon-bomb.png",
						   "A more sophisticated handgun that allows several shots before reloading."),
				new ItemVO("weapon6", "Custom SMG", "Weapon", 116, true, true, false, "img/items/weapon-bomb.png",
						   "It may be made from scrap metal but it is still a serious weapon."),
				new ItemVO("weapon7", "Improvised bazooka", "Weapon", 225, true, true, false, "img/items/weapon-bomb.png",
						   "Powerful but heavy and somewhat unreliable construction of pipes, reclaimed weapon parts and improvised ammunition."),
			],
			clothing: [
				new ItemVO("clothing1", "Rags", "Clothing", 2, true, true, false, "img/items/clothing-rags.png",
						   "Barely counts for clothing, but for now, it'll do."),
				new ItemVO("clothing2", "Worker's uniform", "Clothing", 4, true, true, false, "img/items/clothing-rags.png",
						   "Feel oddly comfortable in dark corridors and abandoned factories."),
				new ItemVO("clothing3", "Protective vest", "Clothing", 8, true, true, false, "img/items/clothing-2.png",
						   "Something that's actually produced with the aim of keeping one safe."),
				new ItemVO("clothing4", "Kevlar vest", "Clothing", 21, true, true, false, "img/items/clothing-2.png",
						   "Heavy, but worth it."),
				new ItemVO("clothing5", "Scrap metal armor", "Clothing", 51, true, true, false, "img/items/clothing-3.png",
						   "Perfect apparel for the post-apocalyptic knight."),
				new ItemVO("clothing6", "Adapted security uniform", "Clothing", 126, true, true, false, "img/items/clothing-3.png",
						   "Protects AND looks respectable."),
				new ItemVO("clothing7", "Combat suit", "Clothing", 309, true, true, false, "img/items/clothing-3.png",
						   "Based on the old world military suit but with added environmental protection."),
			],
			shoes: [
				new ItemVO("shoe_1", "Improvised flip-flops", "Shoes", 0.9, true, false, false, "img/items/shoe-1.png",
						   "Protects a scavenger's feet from sharp things that might be lying around."),
				new ItemVO("shoe_2", "Worn trainers", "Shoes", 0.8, true, false, false, "img/items/shoe-2.png",
						   "Decent, reasonable shoes for walking in most places."),
				new ItemVO("shoe_3", "Hiking boots", "Shoes", 0.5, true, false, false, "img/items/shoe-3.png",
						   "Good shoes like these can make travelling much easier."),
			],
			follower: [
			],
			bag: [
				new ItemVO("bag_0", "Sack", "Bag", 50, true, true, false, "img/items/bag-0.png",
						   "It's not fancy, but allows one to carry around more stuff than their hands and pockets can hold."),
				new ItemVO("bag_1", "Backpack", "Bag", 80, true, true, false, "img/items/bag-1.png",
						   "A more spacious bag with lots of pockets."),
				new ItemVO("bag_2", "Hiker's Rucksack", "Bag", 120, true, true, false, "img/items/bag-1.png",
						   "With this bag, weight is starting to be more of a problem than space."),
				new ItemVO("bag_3", "Automatic luggage", "Bag", 200, true, true, false, "img/items/bag-3.png",
						   "Mechanical chest that automatically follows its owner around. No more worrying about carrying all that stuff yourself."),
			],
			artefact: [
				new ItemVO("artefact_ground_1", "Runestone", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Puzzling piece of stone with an ancient rune on it."),
				new ItemVO("artefact_ground_2", "Charred seed", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Seeds are said to contain life itself. They do not grow in the dark city."),
				new ItemVO("artefact_ground_3", "Round stone", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Smooth stone that fits in the palm of a hand. There is something calming about it."),
				new ItemVO("artefact_ground_4", "Leather pouch", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Small leather pouch with a string that allows it to be worn around the neck. All it contains is some kind of a powder."),
				new ItemVO("artefact_surface_1", "Canned tuna", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Leftovers from a bygone time. They say there used to be fish tanks, somewhere near the surface."),
				new ItemVO("artefact_surface_2", "ID Chip", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Chips like these used to be placed under people's skins, giving them certain powers. It probably doesn't work anymore."),
				new ItemVO("artefact_surface_3", "Scientist's notebook", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Worn but still mostly legible, this notebook seems to contain calculations related to fuel consumption of some kind of a large and complex vehicle over very long distances."),
				new ItemVO("artefact_history_1", "Fountain pen", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Long since dried and useless as a writing implement, but still popular among sages and philosophers as a symbol of knowledge."),
				new ItemVO("artefact_history_2", "Pearl", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "A beautiful orb said to have formed in the Sea, a massive body of water that is the origin of all life."),
				new ItemVO("artefact_history_3", "CD", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "An old circular data storage with the word 'backup' written on it. Without an electric computing machine, it's impossible to stay if it is still readable."),
				new ItemVO("artefact_doom_1", "Volcanic rock", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Unnerving piece of black rock. Something is etched on it in an unfamiliar language."),
				new ItemVO("artefact_doom_2", "Temple key", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Heavy key with a demonic eel-like ornament so intricately carved it feels almost alive. Strangely cold to the touch."),
				new ItemVO("artefact_doom_3", "Seashell", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Fragile, yellow and light pink shell that must have been looted from a museum."),
				new ItemVO("artefact_doom_4", "Pamphlet", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Bold political leaflet printed on thick paper urging residents of the 'sewers' to rebel against segregation."),
				new ItemVO("artefact_doom_5", "Starchart", "Artefact", 0, false, false, false, "img/items/artefact-test.png",
						   "Complicated astrological map with calculations indicating an event occurring on year 783."),
			],
			ingredient: [
				new ItemVO("res_matches", "Matches", "Ingredient", 0, false, false, false, "img/items/res-matches.png", "Used for crafting."),
				new ItemVO("res_bands", "Rubber bands", "Ingredient", 0, false, false, false, "img/items/res-bands.png", "Used for crafting."),
				new ItemVO("res_silk", "Spider silk", "Ingredient", 0, false, false, false, "img/items/res-silk.png", "Used for crafting."),
			],
			exploration: [
				new ItemVO("exploration_1", "Lock pick", "Exploration", 0, false, true, false, "img/items/exploration-1.png", "Useful tool when exploring and scouting."),
				new ItemVO("first_aid_kit_1", "Basic First Aid Kit", "Exploration", 0, false, true, true, "img/items/firstaid-1.png", "Heal light injuries on the go."),
				new ItemVO("first_aid_kit_2", "Full First Aid Kit", "Exploration", 0, false, true, true, "img/items/firstaid-2.png", "Heal all injuries on the go."),
				new ItemVO("glowstick_1", "Glowstick", "Exploration", 0, false, true, true, "img/items/glowstick-1.png", "Temporary light. Can be used as a distraction.")
			],
			uniqueEquipment: [
				new ItemVO("equipment_map", "Map", "UniqueEquipment", 0, false, false, false, "img/items/exploration-map.png", "Helps you navigate the City."),
			],
		},
		
		getItemByID: function (id) {
			if (id.indexOf("follower-") >= 0) return this.getFollowerByID(id);
			for (var type in this.itemDefinitions) {
				for (var i in this.itemDefinitions[type]) {
					var item = this.itemDefinitions[type][i];
					if (item.id === id) {
						return item.clone();
					}
				}
			}
			return null;
		},
		
		getFollower: function (level, campCount) {
			var minStrength = campCount;
			var maxStrength = 1.5 + campCount * 1.5;
			var strengthDiff = maxStrength - minStrength;
			var strength = Math.round(minStrength + strengthDiff * Math.random());
			var type = "d";
			if (level < 5) type = "g";
			if (level > 15) type = "c";
			var id = "follower-" + strength + "-" + type;
			return this.getFollowerByID(id);
		},
		
		getFollowerByID: function (id) {
			var name = "Follower";
			var type = this.itemTypes.follower;
			var strength = Number.parseInt(id.split("-")[1]);
			
			// TODO persist image depending on id
			var icon = "img/items/follower-" + Math.floor(Math.random() * 4 + 1) + ".png";
			
			// TODO more varied follower descriptions
			var description = "A fellow traveller who has agreed to travel together.";
			
			return new ItemVO(id, name, type, strength, true, false, icon, description);
		},
		
		getBag: function (levelOrdinal) {
			if (levelOrdinal < 5) {
				return this.itemDefinitions.bag[0];
			}
			if (levelOrdinal < 10) {
				return this.itemDefinitions.bag[1];
			}
			if (levelOrdinal < 15) {
				return this.itemDefinitions.bag[2];
			}
			return this.itemDefinitions.bag[3];
		},
		
		getLight: function (levelOrdinal) {
			if (levelOrdinal < 5) return this.itemDefinitions.light[0];
			if (levelOrdinal < 15 || Math.random() > 0.9) return this.itemDefinitions.light[1];
			return this.itemDefinitions.light[2];
		},
		
		getShoes: function (levelOrdinal) {
			if (levelOrdinal < 7) {
				return this.itemDefinitions.bag[0];
			}
			if (levelOrdinal < 14) {
				return this.itemDefinitions.bag[2 * Math.random()];
			}
			return this.itemDefinitions.bag[3 * Math.random()];
		},
		
		getDefaultWeapon: function (levelOrdinal, totalLevels) {
			var totalWeapons = this.itemDefinitions.weapon.length;
			var weapon = Math.max(1, Math.floor(levelOrdinal / totalLevels * totalWeapons));
			return this.itemDefinitions.weapon[weapon - 1];
		},
		
		getDefaultClothing: function (levelOrdinal, totalLevels) {
			var totalClothing = this.itemDefinitions.clothing.length;
			var clothing = Math.max(1, Math.min(7, Math.floor((levelOrdinal + 2) / totalLevels * totalClothing)));
			return this.itemDefinitions.clothing[clothing - 1];
		},
		
		getIngredient: function () {
			var i = (this.itemDefinitions.ingredient.length) * Math.random();
			return this.itemDefinitions.ingredient[parseInt(i)];
		}
    };
    
    return ItemConstants;
    
});
