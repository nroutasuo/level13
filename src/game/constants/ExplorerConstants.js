define(['ash',
	'utils/MathUtils',
	'game/vos/ExplorerVO',
	'game/vos/LocaleVO',
	'game/constants/CultureConstants',
	'game/constants/DialogueConstants',
	'game/constants/ItemConstants',
	'game/constants/WorldConstants'
], function (Ash,
	MathUtils,
	ExplorerVO,
	LocaleVO,
	CultureConstants,
	DialogueConstants,
	ItemConstants,
	WorldConstants
) {
	
	let ExplorerConstants = {
		
		FIRST_EXPLORER_CAMP_ORDINAL: 2,
		
		explorerType: {
			FIGHTER: "fighter",
			SCOUT: "scout",
			SCAVENGER: "scavenger",
		},
		
		abilityType: {
			// fighter
			ATTACK: "attack",
			DEFENCE: "defence",
			// scout
			COST_MOVEMENT: "cost_movement",
			COST_SCAVENGE: "cost_scavenge",
			COST_SCOUT: "cost_scout",
			DETECT_SUPPLIES: "detect_supplies",
			DETECT_INGREDIENTS: "detect_ingredients",
			DETECT_HAZARDS: "detect_hazards",
			// scavenger
			SCAVENGE_GENERAL: "scavenge_general",
			SCAVENGE_INGREDIENTS: "scavenge_ingredients",
			SCAVENGE_SUPPLIES: "scavenge_supplies",
			SCAVENGE_CAPACITY: "scavenge_capacity", // always animal
		},
		
		// in order of rarity
		animalType: {
			DOG: "dog",
			MULE: "mule",
			BAT: "bat",
			RAVEN: "raven",
			OLM: "olm",
		},
		
		explorerSource: {
			CRAFT: "craft",
			EVENT: "event",
			SCOUT: "scout",
			SYSTEM: "system",
		},
		
		MAX_ABILITY_LEVEL: 100,
		MAX_EXPLORERS_BASE: 3,
		
		// unique explorers that are spawned in locales across the world and the player is guaranteed to meet (if they explore everything)
		// camp ordinal -> explorer template
		predefinedExplorers: {
			2: { id: "gambler", localeType: localeTypes.maintenance, abilityType: "attack", name: "Yimin", icon: "img/characters/explorer_unique_gambler.png", dialogueSource: "explorer_unique_gambler" },
			3: { id: "dog", localeType: localeTypes.warehouse, abilityType: "scavenge_capacity", name: "Dog", icon: "img/characters/animal_dog.png", dialogueSource: "explorer_generic_dog_01" },
			4: { id: "journalist", localeType: localeTypes.library, abilityType: "cost_scout", name: "Yevry", icon: "img/characters/explorer_unique_journalist.png", dialogueSource: "explorer_unique_journalist" },
			5: { id: "handler", localeType: localeTypes.house, abilityType: "detect_supplies", name: "Jezekiah", icon: "img/characters/explorer_unique_handler.png", dialogueSource: "explorer_unique_handler" },
			6: { id: "prospector", localeType: localeTypes.store, abilityType: "scavenge_supplies", name: "Sunita", icon: "img/characters/explorer_unique_prospector.png", dialogueSource: "explorer_unique_prospector" },
			10: { id: "hermit", localeType: localeTypes.bunker, abilityType: "scavenge_general", name: "Eliasco", icon: "img/characters/explorer_unique_hermit.png", dialogueSource: "explorer_unique_hermit" },
		},

		// templates used to generate random explorers
		// order matters, first is more likely to get picked if valid
		templateExplorers: [
			{ id: "template_lover", explorerType: "fighter", origin: "surface", gender: "male", dialogueSource: "explorer_template_lover", },
			{ id: "template_guard", explorerType: "fighter", origin: "slums", excludedCultures: [ "indus", "assurian" ], dialogueSource: "explorer_template_guard" },
			{ id: "template_teen", explorerType: "scavenger", dialogueSource: "explorer_template_teen" },
			{ id: "template_bard", explorerType: "scavenger", origin: "slums", dialogueSource: "explorer_template_bard" },
			{ id: "template_researcher", explorerType: "scout", origin: "surface", culture: [ "sahel" ], gender: "female", dialogueSource: "explorer_template_researcher" },
			{ id: "template_amnesiac", origin: "unknown", dialogueSource: "explorer_template_amnesiac" },
			{ id: "template_architect_scout", explorerType: "scout", origin: "surface", appearLevel: [ 15, 100 ], dialogueSource: "explorer_template_architect" },
			{ id: "template_architect_scavenger", explorerType: "scavenger", origin: "surface", appearLevel: [ 15, 100 ], dialogueSource: "explorer_template_architect" },
			{ id: "template_darkdweller", explorerType: "scavenger", origin: "darklevels", appearLevel: [ -100, 14 ], dialogueSource: "explorer_template_darkdweller" },
			{ id: "template_hacker", explorerType: "scout", origin: "slums", dialogueSource: "explorer_template_hacker" },
			{ id: "generic_scout_01", explorerType: "scout", dialogueSource: "explorer_generic_scout_01" },
			{ id: "generic_scavenger_01", explorerType: "scavenger", dialogueSource: "explorer_generic_scavenger_01" },
			{ id: "generic_mercenary_01", explorerType: "fighter", dialogueSource: "explorer_generic_mercenary_01" },
			{ id: "generic_dog_01", isAnimal: true, animalType: "dog", dialogueSource: "explorer_generic_dog_01" },
			{ id: "generic_animal_01", isAnimal: true, abilityType: "scavenge_capacity", dialogueSource: "explorer_generic_animal_01" },
			{ id: "generic_servo_01", isRobot: true, dialogueSource: "explorer_generic_servo_01" },
			{ id: "generic_human_01", dialogueSource: "explorer_generic_01" },
		],

		icons: [
			{ icon: "img/characters/explorer_fighter_01.png", explorerType: "fighter", gender: CultureConstants.genders.FEMALE, skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_fighter_02.png", explorerType: "fighter", gender: CultureConstants.genders.FEMALE, skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_fighter_03.png", explorerType: "fighter", gender: CultureConstants.genders.FEMALE, skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_fighter_04.png", explorerType: "fighter", skin: CultureConstants.skinColors.DARK },
			{ icon: "img/characters/explorer_fighter_05.png", explorerType: "fighter", skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_fighter_06.png" },
			{ icon: "img/characters/explorer_scavenger_01.png", explorerType: "scavenger", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_scavenger_02.png", explorerType: "scavenger", gender: CultureConstants.genders.MALE, skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_scavenger_03.png", explorerType: "scavenger", gender: CultureConstants.genders.MALE, skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_scavenger_04.png", explorerType: "scavenger", gender: CultureConstants.genders.MALE, skin: CultureConstants.skinColors.DARK },
			{ icon: "img/characters/explorer_scout_01.png", explorerType: "scout", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_scout_02.png", explorerType: "scout", gender: CultureConstants.genders.MALE, skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_scout_03.png", explorerType: "scout", skin: CultureConstants.skinColors.LIGHT },
			{ icon: "img/characters/explorer_template_amnesiac_01.png", dialogueSource: "explorer_template_amnesiac", gender: CultureConstants.genders.MALE },
			{ icon: "img/characters/explorer_template_amnesiac_02.png", dialogueSource: "explorer_template_amnesiac", gender: CultureConstants.genders.MALE, skin: CultureConstants.skinColors.DARK },
			{ icon: "img/characters/explorer_template_amnesiac_03.png", dialogueSource: "explorer_template_amnesiac", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_template_architect_01.png", dialogueSource: "explorer_template_architect", gender: CultureConstants.genders.FEMALE, explorerType: "scout" },
			{ icon: "img/characters/explorer_template_architect_02.png", dialogueSource: "explorer_template_architect", gender: CultureConstants.genders.FEMALE, explorerType: "scavenger" },
			{ icon: "img/characters/explorer_template_darkdweller_01.png", dialogueSource: "explorer_template_darkdweller", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_template_darkdweller_02.png", dialogueSource: "explorer_template_darkdweller", gender: CultureConstants.genders.MALE },
			{ icon: "img/characters/explorer_template_bard_01.png", dialogueSource: "explorer_template_bard", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_template_guard_01.png", dialogueSource: "explorer_template_guard", gender: CultureConstants.genders.MALE },
			{ icon: "img/characters/explorer_template_guard_02.png", dialogueSource: "explorer_template_guard", gender: CultureConstants.genders.FEMLAE },
			{ icon: "img/characters/explorer_template_hacker_01.png", dialogueSource: "explorer_template_hacker", gender: CultureConstants.genders.FEMLAE },
			{ icon: "img/characters/explorer_template_hacker_02.png", dialogueSource: "explorer_template_hacker", gender: CultureConstants.genders.MALE },
			{ icon: "img/characters/explorer_template_lover.png", dialogueSource: "explorer_template_lover", gender: CultureConstants.genders.MALE },
			{ icon: "img/characters/explorer_template_lover.png", dialogueSource: "explorer_template_researcher", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_template_teen_01.png", dialogueSource: "explorer_template_teen", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_template_teen_02.png", dialogueSource: "explorer_template_teen", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_template_teen_03.png", dialogueSource: "explorer_template_teen", gender: CultureConstants.genders.MALE },
		],

		getMaxExplorersRecruited: function (innMajorLevels) {
			let result = ExplorerConstants.MAX_EXPLORERS_BASE;
			for (let i = 0; i < innMajorLevels.length; i++) {
				result += Math.max(0, innMajorLevels[i]);
			}
			return result;
		},
		
		getMaxExplorersInParty: function () {
			return Object.keys(ExplorerConstants.explorerType).length;
		},
		
		getTypicalFighter: function (campOrdinal, step) {
			let source = ExplorerConstants.explorerSource.SYSTEM;
			let abilityType = ExplorerConstants.abilityType.ATTACK;
			let options = { forcedAbilityType : abilityType, forcedAbilityLevelRandomFactor: 0.5 }
			return ExplorerConstants.getNewRandomExplorer(source, campOrdinal, campOrdinal, options);
		},
		
		// options:
		// - forcedAbilityType: specify follower ability type (otherwise random)
		// - forcedAbilityLevelRandomFactor: replace random variation in ability level for camp ordinal with specified factor
		// - excludedDialogueSources: list of dialogue sources (ids) not to use (already in use)
		getNewRandomExplorer: function (source, campOrdinal, appearLevel, options) {
			campOrdinal = campOrdinal || 1;
			options = options || {};
			
			let forcedAbilityType = options.forcedAbilityType;
			let excludedDialogueSources = options.excludedDialogueSources || [];
			let isRobot = source == ExplorerConstants.explorerSource.CRAFT;

			let template = this.getRandomExplorerTemplate(source, appearLevel, forcedAbilityType, isRobot, excludedDialogueSources);

			let id = template.id + "_" + (10 + Math.floor(Math.random() * 100000));

			let abilityType = forcedAbilityType || template.abilityType || this.getAbilityTypeFromTemplate(source, template, campOrdinal);
			let abilityLevel = this.getRandomAbilityLevelByCampOrdinal(abilityType, campOrdinal, options.forcedAbilityLevelRandomFactor);
			
			let gender = null;
			let name = null;
			let icon = null;
			
			let isAnimal = template.isAnimal || this.isAnimal(abilityType);

			if (isAnimal) {
				let animalTypes = this.getAvailableAnimalTypes(source, campOrdinal);
				let animalType = template.animalType || ExplorerConstants.animalType[animalTypes[MathUtils.getWeightedRandom(0, animalTypes.length)]];
				gender = template.gender || CultureConstants.getRandomGender();
				name = this.getRandomAnimalName(animalType);
				icon = this.getRandomAnimalIcon(animalType);
			} else if (isRobot) {
				gender = CultureConstants.genders.OTHER;
				name = this.getRandomRobotName();
				icon = this.getRandomRobotIcon();
			} else {
				let origin = template.origin || CultureConstants.getRandomOrigin(appearLevel);
				let cultures = this.getExplorerCulturesFromTemplate(template, origin);
				gender = template.gender || CultureConstants.getRandomGender();
				name = CultureConstants.getRandomShortName(gender, origin, cultures);
				icon = this.getRandomIcon(gender, origin, cultures, abilityType, template.dialogueSource);
			}
			
			return new ExplorerVO(id, name, abilityType, abilityLevel, icon, gender, source, template.dialogueSource);
		},
		
		getNewPredefinedExplorer: function (explorerID) {
			let template = null;
			let templateCampOrdinal = 1;
			for (let campOrdinal in this.predefinedExplorers) {
				let t = this.predefinedExplorers[campOrdinal];
				if (t.id == explorerID) {
					template = t;
					templateCampOrdinal = campOrdinal;
					break;
				}
			}
			
			if (!template) {
				log.w("couldn't find template for predefined explorer id:" + explorerID);
				return null;
			}
			
			let abilityLevel = this.getRandomAbilityLevelByCampOrdinal(template.abilityType, templateCampOrdinal);
			
			return new ExplorerVO(explorerID, template.name, template.abilityType, abilityLevel, template.icon, template.gender, ExplorerConstants.explorerSource.SCOUT, template.dialogueSource);
		},

		getRandomExplorerTemplate: function (source, appearLevel, forcedAbilityType, isRobot, excludedDialogueSources) {
			let validTemplates = [];
			let forcedExplorerType = forcedAbilityType ? this.getExplorerTypeForAbilityType(forcedAbilityType) : null;
			let forcedAnimal = forcedAbilityType && this.isAnimal(forcedAbilityType);
			let forcedNotAnimal = forcedAbilityType && !this.isAnimal(forcedAbilityType);

			for (let i = 0; i < this.templateExplorers.length; i++) {
				let template = this.templateExplorers[i];

				let isTemplateRobot = template.isRobot || false;
				let isTemplateAnimal = template.isAnimal || false;

				if (excludedDialogueSources && excludedDialogueSources.indexOf(template.dialogueSource) >= 0) continue;
				if (forcedExplorerType && template.explorerType && template.explorerType != forcedExplorerType) continue;
				if (forcedAbilityType && template.abilityType && template.abilityType != forcedAbilityType) continue;
				if (isRobot != isTemplateRobot) continue;
				if (forcedAnimal && !isTemplateAnimal) continue;
				if (forcedNotAnimal && isTemplateAnimal) continue;
				if (template.appearLevel && (appearLevel < template.appearLevel[0] || appearLevel > template.appearLevel[1] )) continue;

				validTemplates.push(template);
			}

			if (validTemplates.length == 1) {
				log.w("no valid explorer templates found");
				return { id: "fallback", dialogueSource: "explorer_generic_01" };
			}

			let index = MathUtils.getWeightedRandom(0, validTemplates.length);
			return validTemplates[index];
		},

		getExplorerCulturesFromTemplate: function (template, origin) {
			if (template.culture) return [ template.culture ];

			let maxCultures = MathUtils.randomIntBetween(1, 3);
			let numCultures = MathUtils.randomIntBetween(1, maxCultures + 1);
			
			return CultureConstants.getRandomCultures(numCultures, origin, template.excludedCultures);
		},

		getAbilityTypeFromTemplate: function (source, template, campOrdinal) {
			if (template.abilityType) return template.abilityType;
			if (template.isAnimal) return ExplorerConstants.abilityType.SCAVENGE_CAPACITY;
			
			let possibleTypes = this.getAvailableAbilityTypes(source, campOrdinal, template.isRobot);
			
			if (template.explorerType) {
				possibleTypes = possibleTypes.filter(t => this.getExplorerTypeForAbilityType(t) == template.explorerType);
			}

			if (possibleTypes.length == 1) {
				log.w("no possible ability types found for template " + template.id);
				return ExplorerConstants.abilityType.COST_SCOUT;
			}
			
			return MathUtils.randomElement(possibleTypes);
		},
		
		getRandomAbilityLevelByCampOrdinal: function (abilityType, campOrdinal, forcedAbilityLevelRandomFactor) {
			campOrdinal = parseInt(campOrdinal);
			let minCampOrdinal = Math.min(campOrdinal, this.getUnlockCampOrdinal(abilityType));
			let maxCampOrdinal = WorldConstants.CAMPS_TOTAL;
			
			let variation = campOrdinal >= 3 ? 1 : 0.5;
			let minAbilityLevel = MathUtils.map(campOrdinal - variation, minCampOrdinal - 1, maxCampOrdinal + 1, 1, 100);
			let maxAbilityLevel = MathUtils.map(campOrdinal + variation, minCampOrdinal - 1, maxCampOrdinal + 1, 1, 100);
			let abilityLevel = MathUtils.randomIntBetween(minAbilityLevel, maxAbilityLevel);
			
			if (forcedAbilityLevelRandomFactor) {
				abilityLevel = MathUtils.intBetween(forcedAbilityLevelRandomFactor, minAbilityLevel, maxAbilityLevel);
			}
			
			return abilityLevel;
		},

		getAverageAbilityLevelByCampOrdinal: function (abilityType, campOrdinal) {
			return this.getRandomAbilityLevelByCampOrdinal(abilityType, campOrdinal, 0.5);
		},
		
		getRecruitCost: function (explorer, isFoundAsReward) {
			if (isFoundAsReward) return {};
			let result = {};
			
			let costFactor = MathUtils.map(explorer.abilityLevel, 1, 100, 1.0, 5.0);
			let explorerType = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
			let isAnimal = this.isAnimal(explorer.abilityType);
			let isHungry = explorerType != ExplorerConstants.explorerType.SCAVENGER && explorer.id % 3 == 0;
			let isStranded = explorerType != ExplorerConstants.explorerType.FIGHTER && explorer.id % 5 == 1;
			let isInjured = explorer.id % 7 == 1
			
			if (isAnimal || isHungry) {
				result.resource_food = MathUtils.roundToMultiple(100 * costFactor, 5);
				result.resource_water = MathUtils.roundToMultiple(50 * costFactor, 5);
			} else if (isInjured) {
				result.resource_medicine = MathUtils.roundToMultiple(3 * costFactor, 1);
			} else if (isStranded) {
				result.resource_fuel = MathUtils.roundToMultiple(20 * costFactor, 5);
			} else {
				result.silver = Math.round(1 * costFactor);
			}
			
			return result;
		},
		
		getAvailableAbilityTypes: function (source, campOrdinal, isRobot) {
			let result = [];

			isRobot = source == ExplorerConstants.explorerSource.CRAFT || isRobot;
			
			for (let k in ExplorerConstants.abilityType) {
				let abilityType = ExplorerConstants.abilityType[k];
				let unlockCampOrdinal = this.getUnlockCampOrdinal(abilityType);
				if (unlockCampOrdinal > campOrdinal) continue;
				if (isRobot && !this.isValidRobotAbility(abilityType)) continue;
				result.push(abilityType);
			}
			
			return result;
		},
		
		getAvailableAnimalTypes: function (source, campOrdinal) {
			let result = Object.keys(ExplorerConstants.animalType);
			if (campOrdinal < 8) {
				result.splice(result.indexOf(this.animalType.RAVEN), 1);
			}
			if (campOrdinal > 8) {
				result.splice(result.indexOf(this.animalType.OLM), 1);
			}
			if (campOrdinal > 13) {
				result.splice(result.indexOf(this.animalType.BAT), 1);
			}
			return result;
		},
		
		getUnlockCampOrdinal: function (abilityType) {
			let firstExplorerCampOrdinal = ExplorerConstants.FIRST_EXPLORER_CAMP_ORDINAL;
			
			switch (abilityType) {
				// fighter
				case ExplorerConstants.abilityType.ATTACK:
				case ExplorerConstants.abilityType.DEFENCE:
					return firstExplorerCampOrdinal;
				// scout
				case ExplorerConstants.abilityType.COST_SCOUT:
					return firstExplorerCampOrdinal + 1;
				case ExplorerConstants.abilityType.COST_SCAVENGE:
					return firstExplorerCampOrdinal + 2;
				case ExplorerConstants.abilityType.DETECT_HAZARDS:
				case ExplorerConstants.abilityType.DETECT_SUPPLIES:
				case ExplorerConstants.abilityType.DETECT_INGREDIENTS:
					return firstExplorerCampOrdinal + 3;
				case ExplorerConstants.abilityType.COST_MOVEMENT:
					return WorldConstants.CAMP_ORDINAL_GROUND + 4;
				// scavenger
				case ExplorerConstants.abilityType.SCAVENGE_INGREDIENTS:
					return firstExplorerCampOrdinal + 4;
				case ExplorerConstants.abilityType.SCAVENGE_SUPPLIES:
					return WorldConstants.CAMP_ORDINAL_GROUND;
				case ExplorerConstants.abilityType.SCAVENGE_CAPACITY:
					return WorldConstants.CAMP_ORDINAL_GROUND + 2;
				case ExplorerConstants.abilityType.SCAVENGE_GENERAL:
					return WorldConstants.CAMP_ORDINAL_GROUND + 3;
				default:
				 	log.w("no unlock camp ordinal defined for Explorer ability type: " + abilityType);
					return 1;
			}
		},
		
		getRandomAnimalName: function (animalType) {
			switch (animalType) {
				case ExplorerConstants.animalType.DOG:
					return "dog";
				case ExplorerConstants.animalType.MULE:
					return "mule";
				case ExplorerConstants.animalType.BAT:
					return "giant bat";
				case ExplorerConstants.animalType.OLM:
					return "giant olm";
				case ExplorerConstants.animalType.RAVEN:
					return "raven";
				default:
					return "monitor lizard";
			}
		},
		
		getRandomAnimalIcon: function (animalType) {
			switch (animalType) {
				case ExplorerConstants.animalType.DOG:
					return "img/characters/animal_dog.png";
				case ExplorerConstants.animalType.RAVEN:
					return "img/characters/animal_bird.png";
				case ExplorerConstants.animalType.BAT:
					return "img/characters/animal_bat.png";
				case ExplorerConstants.animalType.MULE:
					return "img/characters/animal_mule.png";
				case ExplorerConstants.animalType.OLM:
					return "img/characters/animal_olm.png";
				default:
					log.w("no icon defined for animal type: " + animalType);
					return "img/characters/animal_dog.png";
			}
		},

		getRandomRobotName: function () {
			return "robot";
		},
		
		getRandomRobotIcon: function () {
			let robotIcons = [
				"img/explorers/explorer_robot_01.png",
				"img/explorers/explorer_robot_02.png",
			];

			return MathUtils.randomElement(robotIcons);
		},
		
		getRandomIcon: function (gender, origin, cultures, abilityType, dialogueSource) {
			let validIcons = [];
			let preferredIcons = [];
			let explorerType = this.getExplorerTypeForAbilityType(abilityType);

			for (let i = 0; i < this.icons.length; i++) {
				let iconDef = this.icons[i];
				if (this.isValidIcon(iconDef, gender, origin, cultures, abilityType, explorerType, dialogueSource)) {
					validIcons.push(iconDef);
					if (iconDef.dialogueSource) preferredIcons.push(iconDef);
				}
			}
			
			if (preferredIcons.length > 0) return MathUtils.randomElement(preferredIcons).icon;
			if (validIcons.length > 0) return MathUtils.randomElement(validIcons).icon;

			log.w("no icon found for explorer with params: " + gender + ", " + origin + ", " + cultures + "," + abilityType + ", " + dialogueSource);

			return "img/explorers/img/characters/explorer_generic.png";
		},
		
		isValidIcon: function (iconDef, gender, origin, cultures, abilityType, explorerType, dialogueSource) {
			if (!iconDef.icon) return false;
			if (iconDef.gender && gender && gender != iconDef.gender && gender != CultureConstants.genders.OTHER) return false;
			if (iconDef.origin && origin && origin != iconDef.origin) return false;
			if (iconDef.skin && cultures && this.isValidSkinColor(iconDef.skin, cultures)) return false;
			if (iconDef.abilityType && abilityType && abilityType != iconDef.abilityType) return false;
			if (iconDef.explorerType && explorerType && explorerType != iconDef.explorerType) return false;
			if (iconDef.dialogueSource && dialogueSource && dialogueSource != iconDef.dialogueSource) return false;

			return true;
		},

		isValidSkinColor: function (iconSkinColor, characterCultures) {
			switch (iconSkinColor) {
				case CultureConstants.skinColors.LIGHT:
					if (characterCultures.indexOf(CultureConstants.cultures.SAHEL) >= 0) return false;
					if (characterCultures.indexOf(CultureConstants.cultures.ETRURIAN) >= 0) return false;
					if (characterCultures.indexOf(CultureConstants.cultures.YUAN) >= 0) return false;
					return true;
				case CultureConstants.skinColors.MID:
					if (characterCultures.indexOf(CultureConstants.cultures.SAHEL) >= 0) return false;
					if (characterCultures.indexOf(CultureConstants.cultures.KIEVAN) >= 0) return false;
					return true;
				case CultureConstants.skinColors.DARK:
					if (characterCultures.indexOf(CultureConstants.cultures.HANSA) >= 0) return false;
					if (characterCultures.indexOf(CultureConstants.cultures.KIEVAN) >= 0) return false;
					return true;
			}
			return true;
		},

		getRandomDialogueSource: function (abilityType) {
			if (this.isAnimal(abilityType)) return "explorer_generic_animal_01";
			let explorerType = this.getExplorerTypeForAbilityType(abilityType);
			switch (explorerType) {
				case this.explorerType.FIGHTER: return "explorer_generic_mercenary_01";
				case this.explorerType.SCOUT: return "explorer_generic_scout_01";
				case this.explorerType.SCAVENGER: return "explorer_generic_scavenger_01";
			}
		},
		
		getExplorerTypeForAbilityType: function (abilityType) {
			switch (abilityType) {
				case this.abilityType.ATTACK: return this.explorerType.FIGHTER;
				case this.abilityType.DEFENCE: return this.explorerType.FIGHTER;
				case this.abilityType.COST_MOVEMENT: return this.explorerType.SCOUT;
				case this.abilityType.COST_SCAVENGE: return this.explorerType.SCOUT;
				case this.abilityType.COST_SCOUT: return this.explorerType.SCOUT;
				case this.abilityType.DETECT_SUPPLIES: return this.explorerType.SCOUT;
				case this.abilityType.DETECT_INGREDIENTS: return this.explorerType.SCOUT;
				case this.abilityType.DETECT_HAZARDS: return this.explorerType.SCOUT;
				case this.abilityType.SCAVENGE_GENERAL: return this.explorerType.SCAVENGER;
				case this.abilityType.SCAVENGE_INGREDIENTS: return this.explorerType.SCAVENGER;
				case this.abilityType.SCAVENGE_SUPPLIES: return this.explorerType.SCAVENGER;
				case this.abilityType.SCAVENGE_CAPACITY: return this.explorerType.SCAVENGER;
				default:
					log.w("no explorerType defined for abilityType: " + abilityType);
					return this.explorerType.SCOUT;
			}
		},
		
		getAbilityTypeDisplayName: function (abilityType) {
			switch (abilityType) {
				case this.abilityType.ATTACK: return "attack";
				case this.abilityType.DEFENCE: return "defence";
				case this.abilityType.COST_MOVEMENT: return "trekking";
				case this.abilityType.COST_SCAVENGE: return "scouring";
				case this.abilityType.COST_SCOUT: return "scouting";
				case this.abilityType.DETECT_HAZARDS: return "surveying (hazards)";
				case this.abilityType.DETECT_SUPPLIES: return "surveying (supplies)";
				case this.abilityType.DETECT_INGREDIENTS: return "surveying (ingredients)";
				case this.abilityType.SCAVENGE_GENERAL: return "scavenging (general)";
				case this.abilityType.SCAVENGE_INGREDIENTS: return "scavenging (ingredients)";
				case this.abilityType.SCAVENGE_SUPPLIES: return "scavenging (supplies)";
				case this.abilityType.SCAVENGE_CAPACITY: return "pack animal";
				default:
					log.w("no display name defined for abilityType: " + abilityType);
					return abilityType;
			}
		},
		
		getExplorerTypeDisplayName: function (explorerType) {
			switch (explorerType) {
				case this.explorerType.FIGHTER: return "fighter";
				case this.explorerType.SCOUT: return "scout";
				case this.explorerType.SCAVENGER: return "scavenger";
				default:
					log.w("no display name defined for explorer type: " + type);
					return "";
			}
		},
		
		getTotalItemBonus: function (explorer) {
			let total = 0;
			for (let bonusKey in ItemConstants.itemBonusTypes) {
				let bonusType = ItemConstants.itemBonusTypes[bonusKey];
				let value = this.getExplorerItemBonus(explorer, bonusType);
				if (ItemConstants.isIncreasing(bonusType)) {
					total += value;
				} else {
					total -= value;
				}
			}
			return total;
		},
		
		getExplorerItemBonus: function (explorer, itemBonusType) {
			let roundingStep = 1;
			let abilityLevel = 0;
			let minBonus = 0;
			let maxBonus = 0;
			
			switch (itemBonusType) {
				case ItemConstants.itemBonusTypes.fight_att:
					abilityLevel = Math.max(
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.ATTACK),
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DEFENCE) * 0.7,
					);
					minBonus = 3;
					maxBonus = 81;
					roundingStep = 3;
					break;
				case ItemConstants.itemBonusTypes.fight_def:
					abilityLevel = Math.max(
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DEFENCE),
						ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.ATTACK) * 0.7,
					);
					minBonus = 3;
					maxBonus = 81;
					roundingStep = 3;
					break;
				case ItemConstants.itemBonusTypes.movement:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.COST_MOVEMENT);
					minBonus = 0.9;
					maxBonus = 0.7;
					roundingStep = 0.1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_cost:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.COST_SCAVENGE);
					minBonus = 0.6;
					maxBonus = 0.3;
					roundingStep = 0.3;
					break;
				case ItemConstants.itemBonusTypes.scout_cost:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.COST_SCOUT);
					minBonus = 0.9;
					maxBonus = 0.6;
					roundingStep = 0.15;
					break;
				case ItemConstants.itemBonusTypes.detect_hazards:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DETECT_HAZARDS);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.detect_supplies:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DETECT_SUPPLIES);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.detect_ingredients:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.DETECT_INGREDIENTS);
					minBonus = 1;
					maxBonus = 1;
					roundingStep = 1;
					break;
				case ItemConstants.itemBonusTypes.scavenge_general:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_GENERAL);
					minBonus = 1.025;
					maxBonus = 1.2;
					roundingStep = 0.025;
					break;
				case ItemConstants.itemBonusTypes.scavenge_ingredients:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_INGREDIENTS);
					minBonus = 1.05;
					maxBonus = 1.35;
					roundingStep = 0.05;
					break;
				case ItemConstants.itemBonusTypes.scavenge_supplies:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_SUPPLIES);
					minBonus = 1.05;
					maxBonus = 1.35;
					roundingStep = 0.05;
					break;
				case ItemConstants.itemBonusTypes.bag:
					abilityLevel = ExplorerConstants.getAbilityLevel(explorer, ExplorerConstants.abilityType.SCAVENGE_CAPACITY);
					minBonus = 5;
					maxBonus = 20;
					roundingStep = 5;
					break;
				
				case ItemConstants.itemBonusTypes.fight_speed:
				case ItemConstants.itemBonusTypes.fight_shield:
				case ItemConstants.itemBonusTypes.light:
				case ItemConstants.itemBonusTypes.shade:
				case ItemConstants.itemBonusTypes.res_cold:
				case ItemConstants.itemBonusTypes.res_radiation:
				case ItemConstants.itemBonusTypes.res_poison:
				case ItemConstants.itemBonusTypes.res_water:
					return 0;
					
				default:
					log.w("no explorer item bonus defined for item bonus type: " + itemBonusType);
					break;
			}
			
			if (abilityLevel == 0) return 0;
			
			let rawValue = MathUtils.map(abilityLevel, 1, 100, minBonus, maxBonus);
			
			return MathUtils.roundToMultiple(rawValue, roundingStep);
		},

		isSignificantAbilityLevelDifference: function (explorer, oldLevel, newLevel) {
			let currentLevel = explorer.abilityLevel;
			explorer.abilityLevel = oldLevel;
			let oldValue = this.getTotalItemBonus(explorer);
			explorer.abilityLevel = newLevel;
			let newValue = this.getTotalItemBonus(explorer);
			explorer.abilityLevel = currentLevel;
			return newValue > oldValue;
		},

		isValidAbilityTypeForLevelUp: function (abilityType) {
			switch (abilityType) {
				case ExplorerConstants.abilityType.DETECT_SUPPLIES: return false;
				case ExplorerConstants.abilityType.DETECT_INGREDIENTS: return false;
				case ExplorerConstants.abilityType.DETECT_HAZARDS: return false;
				case ExplorerConstants.abilityType.SCAVENGE_CAPACITY: return false;
				default: return true;
			}
		},
		
		isAnimal: function (abilityType) {
			return abilityType == ExplorerConstants.abilityType.SCAVENGE_CAPACITY;
		},

		isValidRobotAbility: function (abilityType) {
			switch (abilityType) {
				case ExplorerConstants.abilityType.DETECT_HAZARDS:
				case ExplorerConstants.abilityType.DETECT_SUPPLIES:
				case ExplorerConstants.abilityType.DETECT_INGREDIENTS:
					return true;
			}

			return false;
		},

		isFighter: function (explorerVO) {
			let bonusAtt = ExplorerConstants.getExplorerItemBonus(explorerVO, ItemConstants.itemBonusTypes.fight_att) > 0;
			let bonusDef = ExplorerConstants.getExplorerItemBonus(explorerVO, ItemConstants.itemBonusTypes.fight_def) > 0;
			return bonusAtt > 0 || bonusDef > 0;
		},
		
		isUnique: function (explorerVO) {
			return explorerVO && explorerVO.dialogueSource && explorerVO.dialogueSource.indexOf("unique") >= 0;
		},
		
		isComparableAbilityTypes: function (a, b) {
			if (a == b) return true;
			
			let isFighter = function (t) { return t == ExplorerConstants.abilityType.ATTACK || t == ExplorerConstants.abilityType.DEFENCE; }
			
			if (isFighter(a) && isFighter(b)) return true;
			
			return false;
		},
		
		getPronoun: function (explorer) {
			if (this.isAnimal(explorer.abilityType)) return "it";
			if (explorer.gender == CultureConstants.genders.FEMALE) return "she";
			if (explorer.gender == CultureConstants.genders.MALE) return "he";
			return "they";
		},
		
		getAbilityLevel: function (explorer, abilityType) {
			if (explorer.abilityType == abilityType) {
				return explorer.abilityLevel;
			}
			
			return 0;
		}
	};
	
	return ExplorerConstants;
	
});
