// Level 13 specific text helpers

define(
['ash',
	'utils/DescriptionMapper', 'text/Text', 'text/TextBuilder',
	'game/constants/GameConstants',
	'game/constants/EnemyConstants',
	'game/constants/ItemConstants',
	'game/constants/SectorConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants'],
function (Ash, DescriptionMapper, Text, TextBuilder, GameConstants, EnemyConstants, ItemConstants, SectorConstants, PositionConstants, MovementConstants) {
	
	var TextConstants = {
		
		getActionName: function (baseActionID) {
			switch (baseActionID) {
				case "scout_locale_i":
				case "scout_locale_u":
					return "Scout";
				case "clear_waste_r": return "clear radioactive waste";
				case "clear_waste_t": return "clear toxic waste";
				case "build_out_greenhouse": return "build greenhouse";
				case "bridge_gap": return "bridge gap";
				default:
					return baseActionID;
			}
		},
		
		getSectorName: function (isScouted, features) {
			var template = "[a-sectortype] [n-street]";
			var params = this.getSectorTextParams(features);
			var phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorHeader: function (hasVision, features) {
			var template = "[a-street] [a-sectortype] [n-street]";
			if (features.hasCamp) {
				template = "[n-street] with camp";
			}
			if (features.hasGrove) {
				template = "[a-street] park";
			}
			if (!hasVision) {
				if (features.sunlit) {
					template = "sunlit [n-street]";
				} else {
					template = "dark [n-street]";
				}
			}
			var params = this.getSectorTextParams(features);
			var phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorDescription: function (hasVision, features) {
			var type = hasVision ? "sector-vision" : "sector-novision";
			var template = DescriptionMapper.get(type, features);
			if (features.hasGrove) {
				template = " [A] [a-street] park overrun by plantlife. In the middle there is a grove of mature trees. Though strange and wild, it also seems somehow peaceful";
			}
			var params = this.getSectorTextParams(features);
			var phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorTextParams: function (features) {
			// 1) Collect options for each param based on several features
			var options = {};
			var addOptions = function (param, values) {
				if (!options[param]) options[param] = [];
				for (var i = 0; i < values.length; i++) {
					options[param].push(values[i]);
				}
			};
			// - general: options always available
			addOptions("a-street", [ "quiet" ]);
			addOptions("n-building", [ "building" ]);
			addOptions("n-buildings", [ "buildings" ]);
			addOptions("a-building", [ "towering", "tall", "gloomy", "abandoned", "nondescript", "small", "typical", "regular", "unusual", "symmetrical", "monolithic", "blocky", "massive", "functional", "colossal", "immense", "enormous" ]);
			addOptions("an-decos", [ "stranded benches", "broken elevators" ]);
			addOptions("an-items", [ "debris" ]);
			// - sector type: determines n-sector and affects many others
			switch (features.sectorType) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL:
					addOptions("n-sector", [ "apartment complex" ]);
					addOptions("a-street-past", [ "beautiful", "calm", "orderly", "relaxed" ]);
					addOptions("n-building", [ "residential tower", "apartment house", "residential building with countless of rows of identical balconies" ]);
					addOptions("n-buildings", [ "residential towers", "apartments", "tower blocks", "identical residential towers" ]);
					addOptions("an-decos", [ "tram tracks" ]);
					addOptions("a-building", [ "silent" ]);
					addOptions("an-items", [ "garbage" ]);
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					addOptions("n-sector", [ "industrial complex" ]);
					addOptions("a-street-past", [ "high-security" ]);
					addOptions("n-building", [ "power plant", "factory", "storehouse", "workshop" ]);
					addOptions("n-buildings", [ "factories", "workshops", "storehouses", "warehouses", "workshops", "refineries" ]);
					addOptions("a-building", [ "decommissioned" ]);
					addOptions("an-items", [ "broken machinery" ]);
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					addOptions("n-sector", [ "transport hall", "maintenance area", "transport hub" ]);
					addOptions("a-street", [ "strange", "chaotic", "cluttered" ]);
					addOptions("a-street-past", [ "orderly" ]);
					addOptions("n-building", [ "maintenace hub", "cable car station", "utility building", "water treatment station" ]);
					addOptions("n-buildings", [ "utility buildings", "data centers", "control rooms", "automated control units" ]);
					addOptions("a-building", [ "decommissioned", "inaccessible" ]);
					addOptions("an-decos", [ "broken pipes", "broken trams" ]);
					addOptions("an-items", [ "electrical wiring" ]);
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					addOptions("n-sector", [ "shopping mall", "shopping center", "office complex" ]);
					addOptions("a-street-past", [ "glamorous", "buzzling" ]);
					addOptions("n-building", [ "shopping center", "department store", "office building", "cafe", "bar" ]);
					addOptions("n-buildings", [ "shopping towers", "shopping malls", "shops", "stores", "offices", "office towers" ]);
					addOptions("a-building", [ "empty", "deserted" ]);
					addOptions("an-decos", [ "empty fountains", "abandoned stalls" ]);
					addOptions("an-items", [ "broken glass" ]);
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					addOptions("n-sector", ["prison complex", "amusement park", "library"]);
					addOptions("a-street-past", [ "leisurely", "orderly", "cheerful" ]);
					addOptions("n-building", [ "library", "prison", "school", "university", "park", "public square", "sports field", "metro station", "research laboratory", "government building" ]);
					addOptions("n-buildings", [ "public buildings", "government buildings" ]);
					addOptions("a-building", [ "empty", "inaccessible" ]);
					addOptions("an-decos", [ "withered trees" ]);
					addOptions("an-items", [ "research samples", "trash" ]);
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					addOptions("n-sector", [ "shanty town", "landfill site" ]);
					addOptions("a-street-past", [ "gloomy", "crowded", "lively" ]);
					addOptions("n-building", [ "apartment building" ]);
					addOptions("a-building", [ "abandoned", "sketchy" ]);
					addOptions("n-buildings", [ "shacks", "huts", "slum residences", "residential towers that don't seem to have ever been connected to the grid" ]);
					addOptions("an-decos", [ "collapsed shacks", "garbage piles" ]);
					addOptions("an-items", [ "rusted pipes" ]);
					break;
			}
			// - building density
			if (features.buildingDensity < 3) {
				addOptions("n-street", [ "sector", "space", "square" ]);
				if (features.sectorType == SectorConstants.SECTOR_TYPE_RESIDENTIAL || features.sectorType == SectorConstants.SECTOR_TYPE_COMMERCIAL)
					addOptions("n-street", [ "plaza", "courtyard" ]);
				addOptions("a-street", [ "wide", "spacious", "enormous" ]);
			} else if (features.buildingDensity < 6) {
				addOptions("n-street", [ "throughfare", "square", "area", "hall" ]);
				if (features.sectorType == SectorConstants.SECTOR_TYPE_RESIDENTIAL || features.sectorType == SectorConstants.SECTOR_TYPE_COMMERCIAL)
					addOptions("n-street", [ "boulevard", "avenue" ]);
				addOptions("a-street", [ "wide", "spacious" ]);
			} else if (features.buildingDensity < 9) {
				addOptions("n-street", [ "street", "street", "alley", "complex", "sector" ]);
				addOptions("a-street", [ "narrow" ]);
			} else {
				addOptions("n-street", [ "corridor", "passage", "alley" ]);
				addOptions("a-street", [ "narrow", "cramped", "dense", "low" ]);
			}
			// - wear and damage
			switch (features.condition) {
				case SectorConstants.SECTOR_CONDITION_RUINED:
					addOptions("a-street", [ "ruined", "crumbling" ]);
					addOptions("n-buildings", [ "crumbling ruins" ]);
					addOptions("n-buildings", [ "crumbling ruins" ]);
					addOptions("a-building", [ "ruined", "skeletal" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_DAMAGED:
					addOptions("a-street", [ "damaged", "destroyed", "broken" ]);
					addOptions("a-building", [ "damaged" ]);
					addOptions("an-decos", [ "collapsed tunnels" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_ABANDONED:
					addOptions("a-building", [ "decaying", "desolate", "slowly decomposing", "long since abandoned", "crumbling" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_WORN:
					addOptions("a-building", [ "desolate", "abandoned", "bleak" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_RECENT:
					addOptions("a-building", [ "well-preserved", "modern" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_MAINTAINED:
					break;
			}
			// - sunlight
			if (features.sunlit) {
				addOptions("a-street", [ "sunlit", "sun-swathed", "bright", "windy" ]);
				addOptions("a-building", [ "vibrant", "sunlit" ]);
				addOptions("an-decos", [ "persistent weeds" ]);
			} else {
				addOptions("a-street", [ "dark" ]);
			}
			// - hazards
			if (features.hazards.cold > 0) {
				addOptions("a-street", [ "cold" ]);
			}
			if (features.hazards.radiation > 0) {
				addOptions("a-street", [ "desolate" ]);
				addOptions("n-building", [ "nuclear power plant", "nuclear waste depot", "nuclear waste processing unit" ]);
				addOptions("a-building", [ "abadoned" ]);
				addOptions("na-items", [ "discarded safety equipment" ]);
			}
			if (features.hazards.poison > 0) {
				addOptions("a-street", [ "polluted" ]);
				addOptions("n-building", [ "chemical plant", "refinery", "garbage processing plant" ]);
				addOptions("a-building", [ "polluted" ]);
				addOptions("na-items", [ "used medical masks" ]);
			}
			// - level population
			if (features.populationFactor == 0) {
				addOptions("a-building", [ "long abandoned", "empty" ]);
				addOptions("a-building", [ "polluted" ]);
			} else if (features.populationFactor < 1) {
				addOptions("a-street", [ "calm" ]);
				addOptions("a-building", [ "empty" ]);
			} else {
				addOptions("a-building", [ "recently looted" ]);
				addOptions("na-items", [ "signs of recent scavengers" ]);
			}
			// - level: architectural style / age
			if (features.level < 6) {
				addOptions("a-street", [ "ancient", "quaint" ]);
				addOptions("a-building", [ "ancient", "obsolete", "quaint", "historical" ]);
			} else if (features.level < 14) {
				addOptions("a-street", [ "dated" ]);
				addOptions("a-building", [ "dated" ]);
			} else if (features.level < 18) {
				addOptions("a-street", [ "modern" ]);
				addOptions("a-building", [ "modern", "stylish", "functional" ]);
			}
			
			// 2) Build final result by selecting from options
			var result = {};
			var rand = (features.buildingDensity + features.wear + features.damage) / 30;
			var pickRandom = function (options, excluded) {
				if (!options || options.length <= 0) return "";
				var validOptions = options.filter(option => !excluded.includes(option));
				var i = Math.floor(rand * validOptions.length);
				return validOptions[i];
			};
			var selectFromOptions = function (key, num) {
				var selection = [];
				for (var i = 0; i < num; i++) {
					var sel = pickRandom(options[key], selection);
					if (sel) {
						selection.push(sel);
					} else {
						log.w("could not select valid [" + key + "] " + (i+1) + "/" + num)
						log.w(options);
					}
				}
				return selection;
			};
			result["a-sectortype"] = features.sectorType;
			result["n-sector"] = selectFromOptions("n-sector", 1);
			result["n-street"] = selectFromOptions("n-street", 1);
			result["a-street"] = selectFromOptions("a-street", 2);
			result["a-street-past"] = selectFromOptions("a-street-past", 1);
			result["n-building"] = selectFromOptions("n-building", 2);
			result["n-buildings"] = selectFromOptions("n-buildings", 2);
			result["a-building"] = selectFromOptions("a-building", 2);
			result["an-decos"] = selectFromOptions("an-decos", 2);
			result["an-items"] = selectFromOptions("an-items", 2);
			
			return result;
		},
		
		getPassageFoundMessage: function (passageVO, direction, sunlit) {
			switch (passageVO.type) {
				case MovementConstants.PASSAGE_TYPE_HOLE:
					if (direction === PositionConstants.DIRECTION_UP) {
						if (sunlit)
							return "Far above in the ceiling there is a hole. Blinding sunlight streams in from it.";
						else
							return "Far above in the ceiling there is a hole, a mouth leading into blackness.";
					} else {
						if (sunlit)
							return "There is a massive sinkhole here. A street is visible far, far below.";
						else
							return "There is a massive sinkhole here. Only vast emptiness is visible below.";
					}
				case MovementConstants.PASSAGE_TYPE_BLOCKED:
					return "There seems to have been a staircase here once but it has been destroyed beyond repair.";
				default:
					return "There used to be " + Text.addArticle(passageVO.name.toLowerCase()) + " here.";
			}
		},
		
		getPassageRepairedMessage: function (passageType, direction, sectorPosVO) {
			var directionName = (direction === PositionConstants.DIRECTION_UP ? " up" : " down");
			switch (passageType) {
				case MovementConstants.PASSAGE_TYPE_HOLE:
					return "Elevator " + directionName + " built at " + sectorPosVO.getInGameFormat(true);
				case MovementConstants.PASSAGE_TYPE_ELEVATOR:
					return "Elevator " + directionName + " repaired at " + sectorPosVO.getInGameFormat(true);
				case MovementConstants.PASSAGE_TYPE_STAIRWELL:
					return "Stairwell " + directionName + " repaired at " + sectorPosVO.getInGameFormat(true);
				default:
					log.w("Unknown passage type: [" + passageType + "]")
					return "Passage " + directionName + " ready at " + sectorPosVO.getInGameFormat(true);
			}
		},
				
		getPassageDescription: function (passageVO, direction, isBuilt, isShort) {
			var makeHighlight = function (content) { return "<span class='hl-functionality'>" + content + "</span>"; };
			var directionName = (direction === PositionConstants.DIRECTION_UP ? " up" : " down");
			if (isShort) {
				switch (passageVO.type) {
					case MovementConstants.PASSAGE_TYPE_HOLE:
						if (isBuilt) {
							return "passage " + directionName + " (elevator) (built)";
						} else {
							return "hole in the level " + (direction === PositionConstants.DIRECTION_UP ? "ceiling" : "floor");
						}
					default:
						var status = isBuilt ? "repaired" : "broken";
						if (passageVO.type === MovementConstants.PASSAGE_TYPE_BLOCKED) {
							status = "unrepairable"
						}
						return "passage " + directionName + " (" + passageVO.name.toLowerCase() + ") (" + status + ")";
				}
			} else {
				switch (passageVO.type) {
					case MovementConstants.PASSAGE_TYPE_HOLE:
						if (isBuilt) {
							return "A brand new " + makeHighlight("elevator " + directionName) + " has been built here. ";
						} else {
							return "There is a " + makeHighlight("hole") + " in the level " + (direction === PositionConstants.DIRECTION_UP ? "ceiling" : "floor") + " here. ";
						}
					default:
						var name = passageVO.name.toLowerCase() + " " + directionName;
						var article = Text.getArticle(name);
						var span = article + " " + makeHighlight(name);
						var state;
						if (isBuilt) {
							state = "and it has been repaired";
						} else if (passageVO.type === MovementConstants.PASSAGE_TYPE_ELEVATOR) {
							state = "but it is broken";
						} else if (passageVO.type === MovementConstants.PASSAGE_TYPE_BLOCKED) {
							state = "but it is unrepairable";
						} else {
							state = "but it needs to be repaired";
						}
						return "There is " + span + " here, " + state + ". ";
				}
			}
		},
		
		getFoundStashMessage: function (stashVO) {
			switch (stashVO.stashType) {
				case ItemConstants.STASH_TYPE_ITEM:
					return "Found an item stash.";
				case ItemConstants.STASH_TYPE_SILVER:
					return "Found some coins.";
				default:
					log.w("Unknown stash type: " + stashVO.stashType);
					return "Found a stash.";
			}
		},
		
		getLogResourceText: function (resourcesVO) {
			var msg = "";
			var replacements = [];
			var values = [];
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = resourcesVO.getResource(name);
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " " + name);
				values.push(Math.round(amount));
			}
			msg = msg.slice(0, -2);
			return { msg: msg, replacements: replacements, values: values };
		},
		
		getLogItemsText: function (items) {
			var msg = "";
			var replacements = [];
			var values = [];
			var loggedItems = {};
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (typeof loggedItems[item.id] === 'undefined') {
					msg += "$" + replacements.length + ", ";
					replacements.push("#" + replacements.length + " " + item.name.toLowerCase());
					values.push(1);
					loggedItems[item.id] = replacements.length - 1;
				} else {
					values[loggedItems[item.id]]++;
				}
			}
			msg = msg.slice(0, -2);
			if (Object.keys(loggedItems).length > 1) {
				var lastCommaIndex = msg.lastIndexOf(",");
				msg = msg.substring(0, lastCommaIndex) + " and" + msg.substring(lastCommaIndex + 1);
			}
			return {msg: msg, replacements: replacements, values: values};
		},
		
		createTextFromLogMessage: function (msg, replacements, values, includePeriod) {
			var text = msg;
			var value = 0;
			var useValues = values.length > 0;
			for (var i = 0; i < replacements.length; i++) {
				if (useValues) {
					value = values[i];
				}
				if (value > 0 || value.length > 0 || !useValues) {
					text = text.replace("$" + i, replacements[i]);
				} else {
					text = text.replace("$" + i, "");
				}
				
				if (useValues) {
					text = text.replace("#" + i, values[i]);
				}
			}
			
			text = text.trim();
			text = text.replace(/ ,/g, "");
			text = text.replace(/^,/g, "");
			text = text.replace(/,$/g, "");
			text = text.replace(/\, \./g, ".");
			if (includePeriod && text.substr(text.length - 1) !== "." && text.substr(text.length - 1) !== "!")
				text += ".";
			text = text.trim();
			return text;
		},
		
		getLocaleName: function (locale, sectorFeatures, isShort) {
			var condition = sectorFeatures.getCondition();
			var modifier = "";
			var noun = "";
			// default modifiers
			switch (condition) {
				case SectorConstants.SECTOR_CONDITION_RUINED:
					modifier = "ruined";
					break;
				case SectorConstants.SECTOR_CONDITION_DAMAGED:
					modifier = "damaged";
					break;
				case SectorConstants.SECTOR_CONDITION_ABANDONED:
					modifier = "abandoned";
					break;
				case SectorConstants.SECTOR_CONDITION_WORN:
					modifier = "neglected";
					break;
				case SectorConstants.SECTOR_CONDITION_RECENT:
					modifier = "empty";
					break;
				case SectorConstants.SECTOR_CONDITION_MAINTAINED:
					modifier = "pristine";
					break;
			}
			// nouns and special modifiers
			switch (locale.type) {
				case localeTypes.factory:
					noun = "factory";
					break;
				case localeTypes.house:
					if (condition === SectorConstants.SECTOR_CONDITION_DAMAGED) modifier = "destroyed";
					noun = "house";
					break;
				case localeTypes.lab:
					noun = "laboratory";
					break;
				case localeTypes.grove:
					modifier = "flourishing";
					noun = "grove";
					break;
				case localeTypes.market:
					noun = "market";
					break;
				case localeTypes.maintenance:
					switch (condition) {
						case SectorConstants.SECTOR_CONDITION_RUINED:
							noun = "control unit";
							break;
						case SectorConstants.SECTOR_CONDITION_DAMAGED:
							noun = "control unit";
							break;
						case SectorConstants.SECTOR_CONDITION_ABANDONED:
							modifier = "ancient";
							noun = "network switch";
							break;
						case SectorConstants.SECTOR_CONDITION_WORN:
							modifier = "old";
							noun = "water tower";
							break;
						case SectorConstants.SECTOR_CONDITION_RECENT:
							modifier = "defunct";
							noun = "control unit";
							break;
						case SectorConstants.SECTOR_CONDITION_MAINTAINED:
							noun = "firehouse";
							break;
						default:
					}
					break;
				case localeTypes.transport:
					noun = "station";
					if (condition === SectorConstants.SECTOR_CONDITION_RUINED) noun = "train depot";
					if (condition === SectorConstants.SECTOR_CONDITION_WORN) modifier = "defunct tram";
					if (condition === SectorConstants.SECTOR_CONDITION_RECENT) modifier = "cable car";
					if (condition === SectorConstants.SECTOR_CONDITION_MAINTAINED) modifier = "train";
					break;
				case localeTypes.sewer:
					noun = "sewer";
					break;
				case localeTypes.warehouse:
					if (condition === SectorConstants.SECTOR_CONDITION_RECENT) modifier = "sturdy";
					if (condition === SectorConstants.SECTOR_CONDITION_MAINTAINED) modifier = "sturdy";
					noun = "warehouse";
					break;
				case localeTypes.camp:
				case localeTypes.tradingpartner:
					modifier = "foreign";
					noun = "camp";
					break;
				case localeTypes.hut:
				case localeTypes.hermit:
					noun = "hut";
					break;
				case localeTypes.library:
					modifier = "abandoned";
					if (sectorFeatures.level < 10) modifier = "ancient";
					noun = "library";
					break;
				default:
					log.w("unknown locale type: " + locale.type);
					noun = "building";
					break;
			}
			
			return isShort ? noun : (modifier + " " + noun).trim();
		},
		
		getWorkshopName: function (resource) {
			switch (resource) {
					case resourceNames.fuel: return "refinery";
					case resourceNames.rubber: return "plantation";
					default: return "workshop";
			}
		},
		
		getSpringName: function (featuresComponent) {
			let hasHazards = featuresComponent.hazards.hasHazards();
			let type = featuresComponent.sectorType;
			if (featuresComponent.ground && featuresComponent.buildingDensity < 6
				 && !hasHazards && type != SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
				return "stream";
			}
			if (type == SectorConstants.SECTOR_TYPE_SLUM && featuresComponent.damage < 3 && featuresComponent.buildingDensity < 8) {
				return "old well";
			}
			if (type != SectorConstants.SECTOR_TYPE_SLUM && type != SectorConstants.SECTOR_TYPE_MAINTENANCE && featuresComponent.wear < 5 && featuresComponent.damage < 3) {
				return "drinking fountain";
			}
			if (featuresComponent.wear > 6 || featuresComponent.damage > 3) {
				return "leaking water pipe";
			}
			return "water tower";
		},
		
		getDirectionName: function (direction) {
			switch (direction) {
			case PositionConstants.DIRECTION_WEST: return "west";
			case PositionConstants.DIRECTION_NORTH: return "north";
			case PositionConstants.DIRECTION_SOUTH: return "south";
			case PositionConstants.DIRECTION_EAST: return "east";
			case PositionConstants.DIRECTION_UP: return "up";
			case PositionConstants.DIRECTION_DOWN: return "down";
			case PositionConstants.DIRECTION_CAMP: return "camp";
			}
		},
		
		getEnemyText: function (enemyList, sectorControlComponent) {
			var result = "";
			var enemyActiveV = this.getEnemyActiveVerb(enemyList);
			var enemyNounSector = this.getEnemyNoun(enemyList, true);
			result += enemyActiveV + " " + enemyNounSector;
			return result;
		},
		
		getEnemyNoun: function (enemyList, detailed) {
			var baseNoun = this.getCommonText(enemyList, "nouns", detailed? "name" : "", "someone or something", true);
			if (detailed) {
				return baseNoun;
			} else {
				var parts = baseNoun.split(" ");
				return parts[parts.length - 1];
			}
		},
		
		getEnemyGroupNoun: function (enemyList) {
			return this.getCommonText(enemyList, "groupN", "", "group", false)
		},
		
		getEnemyActiveVerb: function(enemyList) {
			return this.getCommonText(enemyList, "activeV", "", "occupied by", false);
		},
		
		getEnemeyDefeatedVerb: function (enemyList) {
			return this.getCommonText(enemyList, "defeatedV", "", "defeated", false);
		},
		
		getMovementBlockerName: function (blockerVO, enemiesComponent, gangComponent) {
			switch (blockerVO.type) {
				case MovementConstants.BLOCKER_TYPE_GANG:
					let enemies = this.getAllEnemies(enemiesComponent, gangComponent);
					var groupNoun = this.getEnemyGroupNoun(enemies);
					var enemyNoun = this.getEnemyNoun(enemies);
					return groupNoun + " of " + enemyNoun;
				default:
					return blockerVO.name;
			}
			return "";
		},
		
		getMovementBlockerAction: function (blockerVO, enemiesComponent, gangComponent) {
			switch (blockerVO.type) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "Bridge gap";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "Clear waste";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "Clear waste";
				case MovementConstants.BLOCKER_TYPE_GANG:
					let enemies = this.getAllEnemies(enemiesComponent, gangComponent);
					return "Fight " + this.getEnemyNoun(enemies);
			}
		},
		
		getAllEnemies: function (enemiesComponent, gangComponent) {
			let enemies = [];
			if (enemiesComponent.possibleEnemies) {
				enemies = enemiesComponent.possibleEnemies.concat();
			}
			if (gangComponent) {
				var gangEnemy = EnemyConstants.getEnemy(gangComponent.enemyID);
				enemies.push(gangEnemy);
			}
			return enemies;
		},
		
		getUnblockedVerb: function (blockerType) {
			switch (blockerType) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "bridged";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "cleared";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "cleared";
				case MovementConstants.BLOCKER_TYPE_GANG: return "defeated";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return "cleared";
			}
		},
		
		// get common description word for a list of objects that contain possible words are in arrays named objectAttribute
		// if nothing common is found, defaultWord is returned
		// is allowSeveral, two common words can be returned if one doesn't cover all objects
		getCommonText: function (objectList, objectAttribute, objectDetailAttribute, defaultWord, allowSeveral) {
			var allWords = [];
			var allDetails = [];
			var minimumWords = [];
			for (var i1 in objectList) {
				var o = objectList[i1];
				if (o) {
					for (var j1 in o[objectAttribute]) {
					var word = o[objectAttribute][j1];
					var detail = objectDetailAttribute ? o[objectDetailAttribute] : "";
					if ($.inArray(word, allWords) < 0) allWords.push(word);
					if (objectDetailAttribute && $.inArray(detail, allDetails) < 0) allDetails.push(detail);
					if (j1 == 0 && $.inArray(word, minimumWords) < 0) minimumWords.push(word);
					}
				}
			}
			
			var validWords = [];
			for (var i2 in allWords) {
				var word = allWords[i2];
				var valid = true;
					for (var j2 in objectList) {
					var o = objectList[j2];
					if ($.inArray(word, o[objectAttribute]) < 0) valid = false;
				}
				if (valid) validWords.push(word);
			}
			
			var validDetail = "";
			if (objectDetailAttribute) {
			for (var i3 in allDetails) {
				var detail = allDetails[i3];
				var valid = true;
				for (var j3 in objectList) {
					var o = objectList[j3];
					if (o[objectDetailAttribute] != detail) valid = false;
					}
					if (valid) validDetail = detail;
				}
			}
			
			// log.i("getCommonText " + objectAttribute + " | " + validDetail + " | " + validWords.join(",") + " | " + minimumWords.join(",") + " | " + defaultWord);
			// log.i(objectList)
			
			if (validDetail.length > 0) {
				return Text.pluralify(validDetail);
			} else if (validWords.length > 0) {
				return validWords[0];
			} else if (allowSeveral && minimumWords.length > 1) {
				return minimumWords[0] + " and " + minimumWords[1];
			} else {
				return defaultWord;
			}
		},
		
	};
		
	function initSectorTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		var t_R = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
		var t_I = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
		var t_M = SectorConstants.SECTOR_TYPE_MAINTENANCE;
		var t_C = SectorConstants.SECTOR_TYPE_COMMERCIAL;
		var t_P = SectorConstants.SECTOR_TYPE_PUBLIC;
		var t_S = SectorConstants.SECTOR_TYPE_SLUM;
		
		// brackets for values like building density, wear, damage
		var b0 = [0, 0];
		var bfull = [10, 10];
		var b12 = [0, 5];
		var b22 = [5, 10];
		var b13 = [0, 3];
		var b23 = [4, 6];
		var b33 = [7, 10];
		
		var lmodern = [15, 100];
		var lold = [10, 18];
		
		// default descriptions (player has vision)
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [n-street] in front of what looks like [A] [a-building] [n-building]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] between two [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] between two [n-buildings] with some [a-building] [n-buildings] on either side");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-sectortype] [n-street] with a few [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-sector] littered with [an-items] and [an-items]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] lined with [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] surrounded by [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] surrounded by [a-buildings] [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [n-street] with some [an-decos] and [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] between some [n-buildings]");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: false }, "[A] [n-street] at the base of an enormous pillar supporting the level above");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: false, wear: b12 }, "[A] [a-street] [n-street] with long-abandoned buildings covered in strange moss");
		DescriptionMapper.add("sector-vision", { buildingDensity: b0, isGroundLevel: false }, "A system of bridges and passages connecting several buildings around a dizzying opening to the level below");
		DescriptionMapper.add("sector-vision", { buildingDensity: b12, isGroundLevel: false, campable: false }, "[A] [a-street] bridge over the level below with separate levels for tram tracks, utilities and pedestrians");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22 }, "Some kind of [A] [a-sectortype] complex with several narrow passages this way and that");
		DescriptionMapper.add("sector-vision", { buildingDensity: b13 }, "A wide square with [A] [a-building] [n-building] on one side and what looks like the remains of [A] [a-building] [n-building] on the other");
		DescriptionMapper.add("sector-vision", { buildingDensity: b23, isSurfaceLevel: false }, "[A] [a-street] [n-street] beneath a vast [n-building]");
		DescriptionMapper.add("sector-vision", { buildingDensity: b23 }, "A street with multiple levels of passages crawling along the walls of the surrounding [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "Some sort of [A] [a-sectortype] corridor between two vast [n-buildings] with barely enough space to walk");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "[A] [a-street] [n-street] between two vast [n-buildings] with barely enough space fit through");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "[A] [a-street] [n-street] packed so full with [a-building] [n-buildings] and [an-decos] that there is barely enough space to pass through");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "A narrow, [a-street] alley between two [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { wear: b13, sunlit: false, level: lmodern }, "[A] [a-street] [n-street] between tall [n-buildings], lined with withered trees that until recently must have thrived in artificial light");
		DescriptionMapper.add("sector-vision", { wear: b13, level: lmodern, isSurfaceLevel: false }, "A [n-street] between some skeleton buildings that seem to have been abandoned while they were still under construction");
		DescriptionMapper.add("sector-vision", { wear: b23, damage: b0 }, "A former [n-sector] with [A] [a-street-past] atmosphere lingering from its past");
		DescriptionMapper.add("sector-vision", { wear: b23, damage: b0 }, "Once [a-street-past] [n-sector] with a few [an-decos] and [A] [a-building] [n-building]");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "[A] [a-building] building whose original purpose is hard to determine, stripped down to bare concrete");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, wear: b33 }, "[A] [a-street] corridor with remains of [an-items] from long-gone inhabitants");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "[A] [a-street] [a-sectortype] [n-street] with a few large unidentifiable ruins looming over it");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A completely ruined [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A rubble-covered [n-street] surrounded by the crumbling remains of [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { damage: b22 }, "A former [a-sectortype] sector where [n-buildings] and [n-buildings] lie in ruins");
		DescriptionMapper.add("sector-vision", { damage: b33 }, "A completely destroyed [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { sectorType: t_R }, "A small [n-street] between some [a-building] apartment towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b23, isSurfaceLevel: false }, "A [a-street] [n-street] along an enormous wall stretching to the level ceiling above, dotted with [a-building] apartments");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b12, level: [6, 100] }, "A [n-street] flanked by several identical narrow residential towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b23 }, "A [n-street] outside a [a-building] residental building with a dizzying geometrical pattern of balconies");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, level: lmodern }, "A square surrounded by what looks like rather comfortable apartment towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_I }, "A street outside a huge [a-building] industrial complex");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b13 }, "An empty square with some damaged containers and huge rusting mechanical arms");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b23 }, "[A] [n-street] between two blocks of what looks like [a-building] control rooms and offices");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "[A] [a-street] [n-street] behind [A] [n-building], the low ceiling criss-crossed by old wires and ducts");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "A desolate [n-street] criss-crossed with the remains of broken cable systems and maintenance ducts");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "A flooded passage underneath a massive bridge with [a-building] buildings looming in the distance");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "A forgotten space among machine-run City facilities, smooth surfaces broken only by ducts and pipes");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, level: lold, buildingDensity: b13 }, "A spacious square with a control room in the middle and old cable system lines disappearing in every direction");
		DescriptionMapper.add("sector-vision", { sectorType: t_C }, "[A] [a-street] shopping street with the remains of various shops and cafés");
		DescriptionMapper.add("sector-vision", { sectorType: t_C }, "A [n-street] between some commercial buildings, their [a-building] walls covered in a patchwork of dead screens");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, wear: b12 }, "A [n-street] [n-street] crowded with small shops, billboards and kiosks on multiple levels");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b12, isSurfaceLevel: false }, "A [n-street] where buildings are attached to the ceiling of the level like colossal stalactites");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13 }, "A plaza under an elevated building with what must have once been a waterfall in the middle");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13 }, "[A] wide fenced terrace attached to a massive tower overlooking the [a-street] streets below");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13 }, "A round courtyard enclosed by a [a-building] office building");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b22, wear: b33 }, "[A] [a-building] building whose original purpose is hard to determine, stripped down to concrete, with an impressive spiral staircase in the middle");
		DescriptionMapper.add("sector-vision", { sectorType: t_P }, "[A] [n-street] dominated by huge building that looks like it was once a public facility of some kind");
		DescriptionMapper.add("sector-vision", { sectorType: t_P }, "A stretch of abandoned highway with some smaller buildings on the side" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b12 }, "[A] [a-street] [n-street] dominated a row of solemn statues" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b12, wear: b22 }, "An ornamental hall which seems to have once been a big station, with a domed roof, massive chandelier and small booths on the sides" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b13 }, "An open space that looks like it might have once been dedicated to a sport of some kind");
		DescriptionMapper.add("sector-vision", { sectorType: t_S, buildingDensity: b33, wear: b22 }, "[A] [a-street] [n-street] surrounded (and in parts, covered) by [a-building] dwellings that have been abandoned for some time");
		DescriptionMapper.add("sector-vision", { sectorType: t_S, buildingDensity: b13 }, "A wide square whose walls support a few make-shift shacks");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b13 }, "A huge hall that looks like it was used as some kind of a storage area, with automated hands rusting in the ceiling");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b23 }, "[A] [a-street] passage between two defunct, walled-off nuclear reactors");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b23 }, "[A] [a-street] [n-street] outside a huge industrial processing complex, all entrances tightly shut");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b33 }, "[A] [a-street] passage that seems to have been used to transport goods between the various facilities on this level");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b33 }, "[A] [a-sectortype] corridor that must have once looked sterile, but is now littered with debris");
		DescriptionMapper.add("sector-vision", { level: 14, buildingDensity: b33 }, "A windowed hallway above the ruined remains of a nuclear facility");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b13 }, "A wide open space beneath the City with mud, grass and other plants pushing their way through cracks in the concrete floor");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b13 }, "An ancient square, long since forgotten, with huge pillars supporting the City above on either side");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b13 }, "An open space, perhaps once a park, now overrun strange plants and mushrooms");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b23 }, "[A] [a-street] street between crumbling ancient [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b23 }, "An open street with no ceiling, the next floor of the City hovering high above and ruins on either side");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b33 }, "A passage through an ancient building");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b33 }, "A narrow street with cracked pavement");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b13 }, "A once [a-street-past] square surrounded by glass-domed passages and small shopfronts");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b13 }, "A big square dominated by an ornate public building in the middle");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "A [a-street] street dotted by billboards and dead screens and surrounded by tall buildings");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "A multi-layered street with space below for trams and below for pedestrians and small shops");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[A] [a-street] [n-street] between tall, ornate [n-buildings]");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[A] [a-street] passage between what used to be two shopping centers");

		// descriptions when player has no vision (lamp/sunglasses)
		DescriptionMapper.add("sector-novision", { sunlit: false, buildingDensity: b0 }, "A rare empty space inside the City; there is no floor or walls, no buildings, nothing. Only vast empty darkness");
		DescriptionMapper.add("sector-novision", { sunlit: false, buildingDensity: b13 }, "A wide street or corridor. It's hard to find anything in the vast darkness");
		DescriptionMapper.add("sector-novision", { sunlit: false, buildingDensity: b23, wear: b22 }, "A street or corridor with an abandoned air. Details fade in the darkness");
		DescriptionMapper.add("sector-novision", { sunlit: false, buildingDensity: b23, wear: b12 }, "A quiet street or corridor. Details fade in the darkness");
		DescriptionMapper.add("sector-novision", { sunlit: false, buildingDensity: b33 }, "A dense passage with barely enough space to walk. You feel your way in the darkness");
		DescriptionMapper.add("sector-novision", { sunlit: false }, "A space inside the city, hidden in the darkness");
		DescriptionMapper.add("sector-novision", { sunlit: true, buildingDensity: b0 }, "A rare empty space inside the City; there is no floor or walls, no buildings, nothing. Only vast emptiness");
		DescriptionMapper.add("sector-novision", { sunlit: true, buildingDensity: b13 }, "A wide street or corridor. It's hard to find anything in the blinding sunlight");
		DescriptionMapper.add("sector-novision", { sunlit: true, buildingDensity: b23, wear: b22 }, "A street or corridor with an abandoned air. Details fade in the blinding light");
		DescriptionMapper.add("sector-novision", { sunlit: true, buildingDensity: b23, wear: b12 }, "A quiet street or corridor. Details fade in the sunlight");
		DescriptionMapper.add("sector-novision", { sunlit: true, buildingDensity: b33 }, "A dense passage with barely enough space to walk. You feel your way in the blinding light");
		DescriptionMapper.add("sector-novision", { sunlit: true }, "A space inside the city, indistinct in the blinding light");
	}
	
	initSectorTexts();
	
	return TextConstants;
	
});
