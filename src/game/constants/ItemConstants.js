define(['ash', 'game/vos/ItemVO'], function (Ash, ItemVO) {
    
    var ItemConstants = {
	
		PLAYER_DEFAULT_STORAGE: 5,
		
		itemTypes: {
			// Equippable:
			light: "Light",
			shades: "Shades",
			weapon: "Weapon",
			clothing: "Clothing",
			follower: "Follower",
			movement: "Movement",
			shoes: "Shoes",
			// One-time use
			bag: "Bag",
			// Just inventory
			artefact: "Artefact",
			note: "Note",
		},
		
		itemDefinitions: {
			light: [
				new ItemVO("light1", "Lantern", "Light", 25, true, true, "img/items/light-lantern.png", "Feeble light for basic survival in the dark undercorridors."),
				new ItemVO("light2", "Electric light", "Light", 75, true, true, "img/items/light-electric.png", "Advanced light for serious travellers."),
				new ItemVO("light3", "Ghost light", "Light", 125, true, true, "img/items/light-ghost.png", "They say the ghost light can show you more in the darkness."),
			],
			shades: [				
				new ItemVO("shade1", "Basic goggles", "Shades", 25, true, true, "img/items/shades-basic.png", "Improvised protection from sunlight."),
				new ItemVO("shade2", "Sporty sunglasses", "Shades", 75, true, true, "img/items/shades-fancy.png", "Good sunglasses help keep the blinding rays to a minimum."),
			],
			weapon: [
				new ItemVO("weapon1", "Shiv", "Weapon", 2, true, true, "img/items/weapon-shiv.png", "Improvised poking implement."),
				new ItemVO("weapon2", "Sword", "Weapon", 5, true, true, "img/items/weapon-shiv.png", "Old-fashioned but reliable."),
				new ItemVO("weapon3", "Fancy sword", "Weapon", 11, true, true, "img/items/weapon-shiv.png", "Old-fashioned but reliable."),
				new ItemVO("weapon4", "Fancy sword 2", "Weapon", 24, true, true, "img/items/weapon-shiv.png", "Old-fashioned but reliable."),
				new ItemVO("weapon5", "Handgun", "Weapon", 52, true, true, "img/items/weapon-shiv.png", "You're mostly impressed that it still works."),
				new ItemVO("weapon6", "Handgun2", "Weapon", 116, true, true, "img/items/weapon-shiv.png", "You're mostly impressed that it still works."),
				new ItemVO("weapon7", "Blaster", "Weapon", 225, true, true, "img/items/weapon-shiv.png", "State-of-the art destruction. Wait, that didn't go so well last time..?"),
				new ItemVO("weapon8", "Super Blaster", "Weapon", 600, true, true, "img/items/weapon-shiv.png", "State-of-the art destruction. Wait, that didn't go so well last time..?"),
			],
			clothing: [
				new ItemVO("clothing1", "Rags", "Clothing", 2, true, true, "img/items/clothing-rags.png", "Barely counts for clothing, but for now, it'll do."),
				new ItemVO("clothing2", "Worker's uniform", "Clothing", 4, true, true, "img/items/clothing-rags.png", "Wearing this makes you feel strangely comfortable in dark corridors and abandoned factories."),
				new ItemVO("clothing3", "Protective vest", "Clothing", 8, true, true, "img/items/clothing-rags.png", "Actually produced with the aim of keeping you safe."),
				new ItemVO("clothing4", "Kevalr vest", "Clothing", 21, true, true, "img/items/clothing-rags.png", "Heavy, but worth it."),
				new ItemVO("clothing5", "Fancy vest", "Clothing", 51, true, true, "img/items/clothing-rags.png", "Heavy, but worth it."),
				new ItemVO("clothing6", "Military vest", "Clothing", 126, true, true, "img/items/clothing-rags.png", "Protects you AND makes you look respectable."),
				new ItemVO("clothing7", "Intelligent armor", "Clothing", 309, true, true, "img/items/clothing-rags.png", "Heavy, but worth it."),
				new ItemVO("clothing8", "Super intelligent armor", "Clothing", 800, true, true, "img/items/clothing-rags.png", "Heavy, but worth it."),
			],
			movement: [
				new ItemVO("movement-bat", "Flying giant rat", "Movement", 0, true, true, "img/items/bat.png", "This well-trained rat will get you across most obstacles."),
			],
			shoes: [
				new ItemVO("shoe-1", "Improvised flip-flops", "Shoes", 0.9, true, true, "img/items/shoe-1.png", "Protects your feet from sharp things that might be lying around."),
				new ItemVO("shoe-2", "Worn trainers", "Shoes", 0.8, true, true, "img/items/shoe-2.png", "Reasonable shoes for walking in most places."),
				new ItemVO("shoe-3", "Hiking boots", "Shoes", 0.5, true, true, "img/items/shoe-3.png", "Good shoes like these can make travelling much easier."),
			],
			follower: [
			],
			bag: [
				new ItemVO("bag-0", "Sack", "Bag", 25, true, false, "img/items/bag-0.png", "It's not fancy, but allows you to carry around more stuff than what your hands and pockets can hold."),
				new ItemVO("bag-1", "Backpack", "Bag", 50, true, false, "img/items/bag-1.png", "A more spacious bag"),
				new ItemVO("bag-2", "Hiker's Rucksack", "Bag", 100, true, false, "img/items/bag-1.png", "Weight is starting to be more of a problem than space."),
				new ItemVO("bag-3", "Automatic luggage", "Bag", 200, true, false, "img/items/bag-1.png", "This mechanical chest automatically follows you around, so you don't have to worry about carrying all that stuff anymore."),
			],
			artefact: [
				new ItemVO("artefact-ground-1", "Runestone", "Artefact", 0, false, true, "img/items/artefact-test.png", "Puzzling piece of stone with an ancient-looking rune on it. A remainder of a bygone time, or a key to ancient power?"),
				new ItemVO("artefact-ground-2", "Charred seed", "Artefact", 0, false, true, "img/items/artefact-test.png", "They are said to contain life itself. Ancient gods knew how to unlock their power."),
				new ItemVO("artefact-surface-1", "Canned tuna", "Artefact", 0, false, true, "img/items/artefact-test.png", "Leftovers from a bygone time. They say there used to be fish tanks, somewhere near the surface."),
				new ItemVO("artefact-history-1", "Mobile phone", "Artefact", 0, false, true, "img/items/artefact-test.png", "Some ancient civilization used these for communication."),
				new ItemVO("artefact-history-2", "Pearl", "Artefact", 0, false, true, "img/items/artefact-test.png", "A beautiful orb said to have formed in the Sea, a massive body of water that is the origin of all life."),
				new ItemVO("artefact-doom-1", "USB Stick", "Artefact", 0, false, true, "img/items/artefact-test.png", "Hard to say if this would still work even if you found a port to connect it to. But if it did, who knows what it might contain?"),
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
		
		getFollower: function (level, levelOrdinal) {
			var minStrength = levelOrdinal;
			var maxStrength = 1.5 + levelOrdinal * 1.5;
			var strengthDiff = maxStrength - minStrength;
			var strength = Math.round(minStrength + strengthDiff*Math.random());
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
			
			return new ItemVO(id, name, type, strength, true, true, icon, description);
		},
		
		getDefaultWeapon: function (levelOrdinal) {
			if (levelOrdinal < 5) {
				return this.itemDefinitions.weapon[0];
			}
			if (levelOrdinal < 8) {
				return this.itemDefinitions.weapon[1];
			}
			if (levelOrdinal < 11) {
				return this.itemDefinitions.weapon[2];
			}
			if (levelOrdinal < 14) {
				return this.itemDefinitions.weapon[3];
			}
			if (levelOrdinal < 16) {
				return this.itemDefinitions.weapon[4];
			}
			if (levelOrdinal < 20) {
				return this.itemDefinitions.weapon[5];
			}
			return this.itemDefinitions.weapon[6];
		},
		
		getDefaultClothing: function (levelOrdinal) {
			if (levelOrdinal < 5) {
				return this.itemDefinitions.weapon[0];
			}
			if (levelOrdinal < 8) {
				return this.itemDefinitions.weapon[1];
			}
			if (levelOrdinal < 11) {
				return this.itemDefinitions.weapon[2];
			}
			if (levelOrdinal < 14) {
				return this.itemDefinitions.weapon[3];
			}
			if (levelOrdinal < 16) {
				return this.itemDefinitions.weapon[4];
			}
			if (levelOrdinal < 20) {
				return this.itemDefinitions.weapon[5];
			}
			return this.itemDefinitions.weapon[6];
		},
    };
    
    return ItemConstants;
    
});
