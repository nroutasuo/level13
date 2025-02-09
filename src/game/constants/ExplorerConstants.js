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
		MAX_EXPLORERS_BASE: 1,
		
		// unique explorers that are spawned in locales across the world and the player is guaranteed to meet (if they explore everything)
		// camp ordinal -> explorer template
		predefinedExplorers: {
			2: { id: "gambler", localeType: localeTypes.maintenance, abilityType: "attack", name: "Yimin", icon: "img/characters/mercenary.png", dialogueSource: "explorer_unique_gambler" },
			3: { id: "dog", localeType: localeTypes.warehouse, abilityType: "scavenge_capacity", name: "Dog", icon: "img/characters/animal_dog.png", dialogueSource: "explorer_generic_dog" },
			4: { id: "journalist", localeType: localeTypes.library, abilityType: "cost_scout", name: "Yevry", icon: "img/characters/scavenger.png", dialogueSource: "explorer_unique_journalist" },
			5: { id: "handler", localeType: localeTypes.house, abilityType: "detect_supplies", name: "Jezekiah", icon: "img/characters/scavenger.png", dialogueSource: "explorer_unique_handler" },
			6: { id: "prospector", localeType: localeTypes.store, abilityType: "scavenge_supplies", name: "Sunita", icon: "img/characters/scavenger.png", dialogueSource: "explorer_unique_prospector" },
			10: { id: "hermit", localeType: localeTypes.bunker, abilityType: "scavenge_general", name: "Eliasco", icon: "img/characters/scavenger.png", dialogueSource: "explorer_unique_hermit" },
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
			{ id: "template_architect", explorerType: "scout", origin: "surface", appearLevel: [ 15, 100 ], dialogueSource: "explorer_template_architect" },
			{ id: "template_hacker", explorerType: "scout", origin: "slums", dialogueSource: "explorer_template_hacker" },
			{ id: "template_shaman", explorerType: "scavenger", origin: "darklevels", appearLevel: [ -100, 12 ], dialogueSource: "explorer_template_shaman" },
			{ id: "generic_scout_01", explorerType: "scout", dialogueSource: "explorer_generic_scout_01" },
			{ id: "generis_scavenger_01", explorerType: "scavenger", dialogueSource: "explorer_generic_scavenger_01" },
			{ id: "generic_mercenary_01", explorerType: "fighter", dialogueSource: "explorer_generic_mercenary_01" },
			{ id: "generic_dog_01", isAnimal: true, animalType: "dog", dialogueSource: "explorer_generic_dog_01" },
			{ id: "generic_animal_01", isAnimal: true, abilityType: "scavenge_capacity", dialogueSource: "explorer_generic_animal_01" },
			{ id: "generic_servo_01", isRobot: true, dialogueSource: "explorer_generic_servo_01" },
			{ id: "generic_human_01", dialogueSource: "explorer_generic_01" },
		],

		icons: [
			// fighter
			{ icon: "img/characters/explorer_fighter_f.png", explorerType: "fighter", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_fighter.png", explorerType: "fighter" },
			// scout
			{ icon: "img/characters/scout.png", explorerType: "scout_f", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/scout.png", explorerType: "scout" },
			// scavenger
			{ icon: "img/characters/scavenger.png", explorerType: "scavenger", gender: CultureConstants.genders.FEMALE },
			{ icon: "img/characters/explorer_scavenger_m.png", explorerType: "scavenger", gender: CultureConstants.genders.MALE },
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
				icon = this.getRandomIcon(gender, abilityType);
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
			
			return MathUtils.randomElement[possibleTypes];
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
			return "img/explorers/follower_robot.png";
		},
		
		getRandomIcon: function (gender, abilityType) {
			var validIcons = [];
			let explorerType = this.getExplorerTypeForAbilityType(abilityType);
			for (let i = 0; i < this.icons.length; i++) {
				let iconDef = this.icons[i];
				if (this.isValidIcon(iconDef, gender, explorerType)) validIcons.push(iconDef);
			}
			return validIcons[Math.floor(Math.random() * validIcons.length)].icon;
		},
		
		isValidIcon: function (iconDef, gender, explorerType) {
			if (!iconDef.icon) return false;
			if (iconDef.gender && gender && gender != iconDef.gender) return false;
			if (iconDef.explorerType && explorerType && explorerType != iconDef.explorerType) return false;
			return true;
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
