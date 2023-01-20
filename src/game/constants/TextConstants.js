// Level 13 specific text helpers

define(['ash',
	'utils/DescriptionMapper',
	'text/Text',
	'text/TextBuilder',
	'game/constants/GameConstants',
	'game/constants/EnemyConstants',
	'game/constants/ItemConstants',
	'game/constants/SectorConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/TradeConstants',
	'game/constants/WorldConstants',
],
function (Ash, DescriptionMapper, Text, TextBuilder, GameConstants, EnemyConstants, ItemConstants, SectorConstants, PositionConstants, MovementConstants, TradeConstants, WorldConstants) {
	
	var TextConstants = {
		
		getActionName: function (baseActionID) {
			switch (baseActionID) {
				case "scout_locale_i":
				case "scout_locale_u":
					return "Scout";
				case "clear_waste_r": return "clear radioactive waste";
				case "clear_waste_t": return "clear toxic waste";
				case "build_out_greenhouse": return "build greenhouse";
				case "build_out_luxury_outpost": return "build resource outpost";
				case "build_out_tradepost_connector": "build elevator";
				case "build_out_sundome": "build sun dome";
				case "bridge_gap": return "bridge gap";
				case "repair_item": return "repair item";
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
				template = " [A] [a-street] park overrun by plant-life. In the middle there is a grove of mature trees. Though strange and wild, it also seems somehow peaceful";
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
				for (let i = 0; i < values.length; i++) {
					options[param].push(values[i]);
				}
			};
			// - general: options always available
			addOptions("a-street", [ "quiet" ]);
			addOptions("n-building", [ "building" ]);
			addOptions("n-buildings", [ "buildings" ]);
			addOptions("a-building", [ "towering", "tall", "gloomy", "abandoned", "nondescript", "small", "typical", "symmetrical", "monolithic", "blocky", "massive", "functional", "colossal", "immense" ]);
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
					addOptions("a-building", [ "silent", "regular", "enourmous" ]);
					addOptions("an-items", [ "garbage" ]);
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					addOptions("n-sector", [ "industrial complex" ]);
					addOptions("a-street", [ "plain" ]);
					addOptions("a-street-past", [ "high-security" ]);
					addOptions("n-building", [ "power plant", "factory", "storehouse", "workshop" ]);
					addOptions("n-buildings", [ "factories", "workshops", "storehouses", "warehouses", "workshops", "refineries" ]);
					addOptions("a-building", [ "decommissioned", "regular", "enormous", "odd" ]);
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
					addOptions("a-building", [ "empty", "deserted", "ransacked", "ensormous", "bizarre" ]);
					addOptions("an-decos", [ "empty fountains", "abandoned stalls" ]);
					addOptions("an-items", [ "broken glass" ]);
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					addOptions("n-sector", ["prison complex", "amusement park", "library"]);
					addOptions("a-street", [ "dignified", "solemn", "grand", "ordinary" ]);
					addOptions("a-street-past", [ "leisurely", "orderly", "cheerful" ]);
					addOptions("n-building", [ "library", "prison", "school", "university", "park", "public square", "sports field", "metro station", "research laboratory", "government building" ]);
					addOptions("n-buildings", [ "public buildings", "government buildings" ]);
					addOptions("a-building", [ "empty", "inaccessible", "enormous", "uncanny" ]);
					addOptions("an-decos", [ "withered trees" ]);
					addOptions("an-items", [ "research samples", "trash" ]);
					break;
				case SectorConstants.SECTOR_TYPE_SLUM:
					addOptions("n-sector", [ "shanty town", "landfill site" ]);
					addOptions("a-street", [ "shabby", "chaotic" ]);
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
					addOptions("a-street", [ "desolate" ]);
					addOptions("a-building", [ "decaying", "desolate", "slowly decomposing", "long since abandoned", "crumbling" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_WORN:
					addOptions("a-building", [ "desolate", "abandoned", "bleak" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_RECENT:
					addOptions("a-building", [ "well-preserved", "modern" ]);
					break;
				case SectorConstants.SECTOR_CONDITION_MAINTAINED:
					addOptions("a-street", [ "modern", "slick" ]);
					break;
			}
			// - sunlight
			if (features.sunlit) {
				addOptions("a-street", [ "sunlit", "sun-swathed", "dazzling", "bright", "windy", "" ]);
				if (features.wear < 5 && features.damage < 5)
					addOptions("a-street", [ "gleaming", "glistening" ]);
				addOptions("a-building", [ "vibrant", "sunlit" ]);
				addOptions("an-decos", [ "persistent weeds" ]);
			} else {
				addOptions("a-street", [ "dark", "dark", "gloomy", "shadowy", "dull" ]);
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
			if (features.hazards.debris) {
				addOptions("a-street", [ "destroyed", "damaged", "ruined" ]);
				addOptions("n-building", [ "building" ]);
				addOptions("a-building", [ "destroyed", "unrecognizable", "hollowed out" ]);
				addOptions("na-items", [ "debris" ]);
			}
			// - level population
			if (features.populationFactor == 0) {
				addOptions("a-building", [ "long abandoned", "empty", "polluted"]);
			} else if (features.populationFactor < 1) {
				addOptions("a-street", [ "calm" ]);
				addOptions("a-building", [ "empty" ]);
			} else {
				addOptions("a-building", [ "recently looted" ]);
				addOptions("na-items", [ "signs of recent scavengers" ]);
			}
			// - level raid danger factor
			if (features.raidDangerFactor > 1) {
				addOptions("a-street", [ "looted" ]);
				addOptions("a-building", [ "ransacked", "damaged", "plundered", "looted" ]);
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
			let result = {};
			var rand = (features.buildingDensity + features.wear + features.damage) / 30;
			var pickRandom = function (options, excluded) {
				if (!options || options.length <= 0) return "";
				var validOptions = options.filter(option => !excluded.includes(option));
				let i = Math.floor(rand * validOptions.length);
				return validOptions[i];
			};
			var selectFromOptions = function (key, num) {
				var selection = [];
				for (let i = 0; i < num; i++) {
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
		
		getPassageFoundMessage: function (passageVO, direction, sunlit, isBuilt) {
			switch (passageVO.type) {
				case MovementConstants.PASSAGE_TYPE_HOLE:
					if (direction === PositionConstants.DIRECTION_UP) {
						if (sunlit)
							return "Far above in the ceiling there is a hole. Blinding sunlight streams in from it.";
						else
							return "Far above in the ceiling there is a hole, a mouth leading into blackness.";
					} else {
						if (isBuilt) {
							return "There is a massive sinkhole here. An elevator has been built.";
						} else {
							if (sunlit)
								return "There is a massive sinkhole here. A street is visible far, far below.";
							else
								return "There is a massive sinkhole here. Only vast emptiness is visible below.";
						}
					}
				case MovementConstants.PASSAGE_TYPE_BLOCKED:
					return "There seems to have been a staircase here once but it has been destroyed beyond repair.";
				default:
					if (isBuilt) {
						return "There is a " + Text.addArticle(passageVO.name.toLowerCase()) + " here.";
					} else {
						return "There used to be " + Text.addArticle(passageVO.name.toLowerCase()) + " here.";
					}
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
		
		getReadBookMessage: function (itemVO, bookType, campOrdinal) {
			let features = {};
			features.bookType = bookType;
			features.bookName = itemVO.name;
			features.bookLevel = itemVO.level || 1;
			features.campOrdinal = campOrdinal;
			features.randomSeed = itemVO.itemID;
			let params = this.getBookTextParams(features);
			
			let template = DescriptionMapper.get("book-intro", features) + " " + DescriptionMapper.get("book-description", features);
			let phrase = TextBuilder.build(template, params);
			
			return phrase;
		},
		
		getBookTextParams: function (features) {
			var result = {};
			
			let levels = [];
			switch (features.bookLevel) {
				case 1:
					levels.push("simple");
					levels.push("dated");
					break;
				case 2:
					levels.push("basic");
					levels.push("regular");
					break;
				case 3:
					levels.push("advanced");
					levels.push("detailed");
					levels.push("insightful");
					levels.push("heavy");
					break;
			}
			result["a-level"] = DescriptionMapper.pickRandom(levels, features);
			
			let styles = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
				case ItemConstants.bookTypes.engineering:
				case ItemConstants.bookTypes.history:
					styles.push("informative");
					styles.push("detailed");
					styles.push("dry");
					styles.push("insightful");
					styles.push("meandering");
					styles.push("illustrated");
					break;
				case ItemConstants.bookTypes.fiction:
					styles.push("inspiring");
					styles.push("realistic");
					styles.push("action-packed");
					styles.push("comedic");
					styles.push("tragic");
					styles.push("romantic");
					styles.push("dramatic");
					styles.push("whimsical");
					styles.push("boring");
					styles.push("dark");
					styles.push("exciting");
					styles.push("haunting");
					styles.push("glamorous");
					styles.push("heartfelt");
					break;
			}
			result["a-style"] = DescriptionMapper.pickRandom(styles, features);
			
			var topics = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
					topics.push("a species of slug that thrives in radiactive environments");
					topics.push("the infrastructure of the City");
					topics.push("the ocean");
					topics.push("forests");
					topics.push("ventilation in the City");
					topics.push("medicine");
					topics.push("electronics");
					topics.push("how to protect yourself from the harmful effects of sunlight");
					topics.push("how raw rubber is processed into many useful forms");
					topics.push("dark matter");
					topics.push("cancer treatment");
					topics.push("dna");
					topics.push("an ancient material called wood");
					topics.push("evolution");
					topics.push("plate tetonics");
					topics.push("batteries");
					topics.push("the planet's atmosphere");
					topics.push("fossils");
					topics.push("fermentation");
					topics.push("atomic weapons");
					topics.push("viruses");
					topics.push("the magnetic compass");
					topics.push("the solar calendar");
					topics.push("radar");
					topics.push("mathematics");
					topics.push("ecosystems");
					topics.push("the printing press");
					topics.push("optical lenses");
					topics.push("fertilizers");
					if (features.bookLevel == 1) {
						topics.push("weapons of old");
						topics.push("the many uses of baking soda");
					}
					if (features.bookLevel == 2) {
						topics.push("food crop rotation");
						topics.push("gunpowder");
						topics.push("electricity");
						topics.push("radio technology");
					}
					if (features.bookLevel == 3) {
						topics.push("electromagnetism");
						topics.push("other planets");
					}
					break;
				case ItemConstants.bookTypes.fiction:
					topics.push("pre-Fall popular music");
					topics.push("life in the Dark Levels");
					topics.push("the early immigrants to the City");
					topics.push("an island far away");
					topics.push("travel between different planets");
					topics.push("a famous actress");
					topics.push("life in the Slums");
					topics.push("life of a crime detecive on the Surface");
					break;
				case ItemConstants.bookTypes.history:
					topics.push("biological warfare");
					topics.push("pre-City civilizations");
					topics.push("the development of agriculture");
					topics.push("the history of painting");
					topics.push("the industrial revolution");
					topics.push("the digital revolution");
					topics.push("a specific ethnic group");
					topics.push("a famine soon after the founding of the City");
					topics.push("a pre-City global legal organization");
					topics.push("the history of mathematics");
					topics.push("a great scientific project");
					topics.push("shipwrecks");
					topics.push("slavery");
					topics.push("a historical dictatorship");
					if (features.bookLevel == 1) {
						topics.push("the early City");
						topics.push("architectural styles in different parts of the City");
						topics.push("the effects of a major earthquake on the City");
						topics.push("pre-Fall religions and how they contributed to wars");
					}
					if (features.bookLevel == 2) {
						topics.push("the history of a powerful crime syndicate");
						topics.push("a great war between two factions within the City");
					}
					if (features.bookLevel == 3) {
						topics.push("the history of a powerful crime syndicate");
					}
					break;
				case ItemConstants.bookTypes.engineering:
					topics.push("an industrial process");
					topics.push("transistors");
					topics.push("nuclear reactors");
					topics.push("radio");
					topics.push("steel production");
					topics.push("architecture");
					topics.push("elevators");
					topics.push("bridges");
					if (features.bookLevel == 2) {
						topics.push("artificial intelligence");
					}
					if (features.bookLevel == 3) {
						topics.push("programming");
						topics.push("the making of robots");
					}
					break;
			}
			result["n-topic"] = DescriptionMapper.pickRandom(topics, features);
			
			var objects = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.engineering:
					objects.push("transistors");
					objects.push("machines you don't really understand, but it seems they were used to stabilise the City");
					objects.push("a level-wide solar screen called the Ceiling");
					objects.push("an irrigation system in a pre-Fall greenhouse");
					if (features.bookLevel == 1) {
						objects.push("engines powering the old elevators");
					}
					if (features.bookLevel == 2) {
						objects.push("an information network spanning an entire level of the City");
						objects.push("a flying vehicle");
					}
					if (features.bookLevel == 3) {
						objects.push("different types of robots");
						objects.push("a great rocket");
					}
					break;
			}
			result["n-object"] = DescriptionMapper.pickRandom(objects, features);
			
			var themes = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.fiction:
					themes.push("a refugee from another continent");
					themes.push("a mine worker who saw the sun for the first time");
					themes.push("a terrifying storm that ripped open an edge of the City");
					themes.push("a great flood");
					themes.push("a shaman who could predict weather");
					themes.push("a war between different factions within the City");
					themes.push("the rise of a heroic leader");
					themes.push("a Slum-dweller who fights many obstacles but eventually moves up in the City");
					themes.push("the rise and fall of a criminal gang in the pre-Fall Slums");
					themes.push("a man who abandons the inhabited parts of the City and tries to find the Ground on their own");
					themes.push("a group of scientists trapped on a research station in the old parts of the City");
					themes.push("a romance between two people who are forced to work far away from each other");
					themes.push("a bureaucrat whose job is to assess the value of an individual's contribution to the City");
					themes.push("the unification of the people in the City under one Government");
					themes.push("someone missing a far-away homeland");
					themes.push("ghosts that are said to wander the abandoned parts of the City");
					break;
			}
			result["c-theme"] = DescriptionMapper.pickRandom(themes, features);
			
			var facts = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
					facts.push("the City's population was already on decline before the Fall");
					facts.push("ancient civilizations often used wood as a building material, because it was plentiful on the Ground");
					facts.push("there are were several Mining Towns deep in the City");
					facts.push("the maintenance of the City below certain levels was mainly done by robots");
					break;
				case ItemConstants.bookTypes.history:
					facts.push("a few powerful mining corporations held great power before the Fall");
					facts.push("ancient civilizations based their calendars on four seasons");
					facts.push("the City was originally built on swamp land");
					facts.push("the City was inhabited by people from several old civilizations");
					facts.push("there was something called the City Govermment");
					facts.push("the City has experienced several famines during its history");
					facts.push("the City was started to be built about 700 years ago");
					facts.push("there was a time when all religions were banned in the City");
					break;
				case ItemConstants.bookTypes.engineering:
					facts.push("the lower levels of the City have different heights");
					facts.push("most of the City used to be lit by electrical lights");
					facts.push("the Surface of the City used to be protected by one massive Dome");
					facts.push("sunlight used to be reflected deeper into the City with complex mirror systems");
					facts.push("parts of the City are built into the mountain");
					facts.push("the Ocean is deeply polluted");
					// TODO get general facts like these in features / otherwise
					// TODO add more and splt by level so these don't get repetitive
					// facts.push("there are X levels in the City");
					// facts.push("the lowest level of the City is in fact number X");
					break;
			}
			result["c-fact"] = DescriptionMapper.pickRandom(facts, features);
			
			var events = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.history:
					events.push("a war that the City waged against some far-away civilization hundreds of years ago");
					events.push("wars in the City in the past 500 years");
					events.push("the building of the first levels of the City");
					events.push("the migration to the City from some far-away island");
					events.push("something called the Great Famine which took place a few decades before the book was written");
					events.push("the establishment of the city-wide Government");
					events.push("a major gardener uprising");
					events.push("a nuclear power plant accident where waste was released to the lower levels of the City");
					break;
			}
			result["c-event"] = DescriptionMapper.pickRandom(events, features);
			
			return result;
		},
		
		getFoundStashMessage: function (stashVO) {
			switch (stashVO.stashType) {
				case ItemConstants.STASH_TYPE_ITEM:
					return "Found an item.";
				case ItemConstants.STASH_TYPE_SILVER:
					return "Found some coins.";
				default:
					log.w("Unknown stash type: " + stashVO.stashType);
					return "Found a stash.";
			}
		},
		
		getWaymarkText: function (waymarkVO, sectorFeatures) {
			let features = Object.assign({}, sectorFeatures);
			features.waymarkType = waymarkVO.type;
			features.direction = PositionConstants.getDirectionFrom(waymarkVO.fromPosition, waymarkVO.toPosition);
			
			let template = DescriptionMapper.get("waymark", features);
			let params = this.getWaymarkTextParams(waymarkVO, features);
			let phrase = TextBuilder.build(template, params);
			
			result = phrase;
			if (GameConstants.isDebugVersion) result += " [" + waymarkVO.toPosition + "]";
			
			return result;
		},
		
		getWaymarkTextParams: function (waymarkVO, features) {
			let result = {};
			
			let tradePartner = TradeConstants.getTradePartner(features.campOrdinal);
			
			result["n-target"] = "<span class='hl-functionality'>" + this.getWaymarkTargetName(waymarkVO) + "</span>";
			result["direction"] = PositionConstants.getDirectionName(features.direction, false);
			result["n-settlement-name"] = tradePartner ? tradePartner.name : null;
			return result;
		},
		
		getWaymarkTargetName: function (waymarkVO) {
			switch (waymarkVO.type) {
				case SectorConstants.WAYMARK_TYPE_SPRING: return "water";
				case SectorConstants.WAYMARK_TYPE_CAMP: return "safety";
				case SectorConstants.WAYMARK_TYPE_RADIATION: return "hazard";
				case SectorConstants.WAYMARK_TYPE_POLLUTION: return "hazard";
				case SectorConstants.WAYMARK_TYPE_SETTLEMENT: return "trade";
				default:
					log.w("unknown waymark type: " + waymarkVO.type);
					return "safe";
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
			for (let i = 0; i < items.length; i++) {
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
			for (let i = 0; i < replacements.length; i++) {
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
		
		getFightChancesText: function (probability) {
			if (probability >= 0.9) {
				return "fairly harmless";
			}
			if (probability > 0.8) {
				return "slightly unnerving";
			}
			if (probability > 0.6) {
				return "intimidating";
			}
			if (probability >= 0.5) {
				return "risky";
			}
			if (probability >= 0.4) {
				return "dangerous";
			}
			if (probability >= 0.2) {
				return "very dangerous";
			}
			return "deadly";
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
					noun = sectorFeatures.surface ? "office" : "factory";
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
					noun = sectorFeatures.level > 15 ? "shopping center" : "market";
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
					if (condition === SectorConstants.SECTOR_CONDITION_RECENT) modifier = "quiet";
					if (condition === SectorConstants.SECTOR_CONDITION_MAINTAINED) modifier = "quiet";
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
					if (condition === SectorConstants.SECTOR_CONDITION_RECENT) modifier = "recently built";
					if (condition === SectorConstants.SECTOR_CONDITION_MAINTAINED) modifier = "well-kept";
					noun = "hut";
					break;
				case localeTypes.library:
					modifier = "abandoned";
					if (sectorFeatures.level < 10) modifier = "ancient";
					noun = "library";
					break;
				case localeTypes.farm:
					modifier = "overgrown";
					if (sectorFeatures.level < 10) modifier = "ancient";
					noun = "farm";
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
		
		getEnemyText: function (enemyList, sectorControlComponent) {
			let result = "";
			var enemyActiveV = this.getEnemyActiveVerb(enemyList);
			var enemyNounSector = this.getEnemyNoun(enemyList, true);
			result += enemyActiveV + " " + enemyNounSector;
			return result;
		},
		
		getEnemyNoun: function (enemyList, detailed) {
			var baseNoun = this.getCommonText(enemyList, "nouns", detailed? "name" : "", "someone or something", true, true);
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
		
		getScaResourcesString: function (discoveredResources, knownResources, resourcesScavengable) {
			var s = "";
			 for(var key in resourceNames) {
				var name = resourceNames[key];
				var amount = resourcesScavengable.getResource(name);
				if (amount > 0 && discoveredResources.indexOf(name) >= 0) {
					var amountDesc = "scarce";
					if (amount == WorldConstants.resourcePrevalence.RARE) amountDesc = "rare";
					if (amount == WorldConstants.resourcePrevalence.DEFAULT) amountDesc = "scarce";
					if (amount == WorldConstants.resourcePrevalence.COMMON) amountDesc = "common";
					if (amount == WorldConstants.resourcePrevalence.ABUNDANT) amountDesc = "abundant";
					if (GameConstants.isDebugVersion) amountDesc += " " + Math.round(amount);
					s += key + " (" + amountDesc + "), ";
				} else if (amount > 0 && knownResources.indexOf(name) >= 0) {
					s += key + " (??), ";
				}
			}
			if (s.length > 0) return s.substring(0, s.length - 2);
			else if (resourcesScavengable.getTotal() > 0) return "Unknown";
			else return "None";
		},
		
		getScaItemString: function (discoveredItems, knownItems, itemsScavengeable) {
			let validItems = [];
			for (let i = 0; i < itemsScavengeable.length; i++) {
				let id = itemsScavengeable[i];
				if (knownItems.indexOf(id) < 0) continue;
				validItems.push(ItemConstants.getItemByID(id).name);
			}
			
			if (validItems.length == 0) {
				if (itemsScavengeable.length > 0) {
					return "Unknown ingredient";
				} else {
					return "None";
				}
			}
			
			return validItems.join(", ");
		},
		
		getMovementBlockerName: function (blockerVO, enemiesComponent, gangComponent) {
			switch (blockerVO.type) {
				case MovementConstants.BLOCKER_TYPE_GANG:
					let enemies = this.getAllEnemies(null, gangComponent);
					var groupNoun = this.getEnemyGroupNoun(enemies);
					var enemyNoun = this.getEnemyNoun(enemies);
					return groupNoun + " of " + Text.pluralify(enemyNoun);
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
					let enemies = this.getAllEnemies(null, gangComponent);
					return "Fight " + this.getEnemyNoun(enemies);
			}
		},
		
		getAllEnemies: function (enemiesComponent, gangComponent) {
			let enemies = [];
			if (enemiesComponent && enemiesComponent.possibleEnemies) {
				enemies = enemiesComponent.possibleEnemies.concat();
			}
			if (gangComponent) {
				for (let i = 0; i < gangComponent.enemyIDs.length; i++) {
					var gangEnemy = EnemyConstants.getEnemy(gangComponent.enemyIDs[i]);
					enemies.push(gangEnemy);
				}
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
		getCommonText: function (objectList, objectAttribute, objectDetailAttribute, defaultWord, allowSeveral, pluralify) {
			var allWords = [];
			var allDetails = [];
			var minimumWords = [];
			for (var i1 in objectList) {
				var o = objectList[i1];
				if (!o) continue;
				for (var j1 in o[objectAttribute]) {
					var word = o[objectAttribute][j1];
					var detail = objectDetailAttribute ? o[objectDetailAttribute] : "";
					if (!word) continue;
					if ($.inArray(word, allWords) < 0) allWords.push(word);
					if (objectDetailAttribute && $.inArray(detail, allDetails) < 0) allDetails.push(detail);
					if (j1 == 0 && $.inArray(word, minimumWords) < 0) minimumWords.push(word);
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
				return pluralify ? Text.pluralify(validDetail) : validDetail;
			} else if (validWords.length > 0) {
				return pluralify ? Text.pluralify(validWords[0]) : validWords[0];
			} else if (allowSeveral && minimumWords.length > 1) {
				return pluralify ? (Text.pluralify(minimumWords[0]) + " and " + Text.pluralify(minimumWords[1])) : (minimumWords[0] + " and " + minimumWords[1]);
			} else {
				return defaultWord;
			}
		},
		
		getListText: function (list, max) {
			if (!list || list.length == 0) {
				return "none";
			} else if (list.length == 1) {
				return list[0];
			} else if (list.length == 2) {
				return list[0] + " and " + list[1];
			} else if (max && list.length > max) {
				let displayedList = list.slice(0, max);
				let numHiddenItems = list.length - displayedList.length;
				return displayedList.join(", ") + ", +" + numHiddenItems;
			} else {
				return list.join(", ");
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
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] surrounded by [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [n-street] with some [an-decos] and [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { sectorType: wildcard }, "[A] [a-street] [n-street] between some [n-buildings]");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: false }, "[A] [n-street] at the base of an enormous pillar supporting the level above");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: false, wear: b12, sunlit: false, debris: b0 }, "[A] [a-street] [n-street] with long-abandoned buildings covered in strange moss");
		DescriptionMapper.add("sector-vision", { buildingDensity: b0, isGroundLevel: false }, "A system of bridges and passages connecting several buildings around a dizzying opening to the level below");
		DescriptionMapper.add("sector-vision", { buildingDensity: b12, isGroundLevel: false, campable: false }, "[A] [a-street] bridge over the level below with separate levels for tram tracks, utilities and pedestrians");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22 }, "Some kind of [A] [a-sectortype] complex with several narrow passages this way and that");
		DescriptionMapper.add("sector-vision", { buildingDensity: b13 }, "A wide square with [A] [a-building] [n-building] on one side and what looks like the remains of [A] [a-building] [n-building] on the other");
		DescriptionMapper.add("sector-vision", { buildingDensity: b23, isSurfaceLevel: false }, "[A] [a-street] [n-street] beneath a vast [n-building]");
		DescriptionMapper.add("sector-vision", { buildingDensity: b23, isSurfaceLevel: false }, "A street with multiple levels of passages crawling along the walls of the surrounding [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "Some sort of [A] [a-sectortype] corridor between two vast [n-buildings] with barely enough space to walk");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "[A] [a-street] [n-street] packed so full with [a-building] [n-buildings] and [an-decos] that there is barely enough space to pass through");
		DescriptionMapper.add("sector-vision", { buildingDensity: b33 }, "[A] [a-street] alley between two [a-building] [n-buildings]");
		DescriptionMapper.add("sector-vision", { wear: b13, sunlit: false, level: lmodern, debris: b0 }, "[A] [a-street] [n-street] between tall [n-buildings], lined with withered trees that until recently must have thrived in artificial light");
		DescriptionMapper.add("sector-vision", { wear: b13, level: lmodern, isSurfaceLevel: false }, "A [n-street] between some skeleton buildings that seem to have been abandoned while they were still under construction");
		DescriptionMapper.add("sector-vision", { wear: b23, damage: b0 }, "A former [n-sector] with [A] [a-street-past] atmosphere lingering from its past");
		DescriptionMapper.add("sector-vision", { wear: b23, damage: b0 }, "Once [a-street-past] [n-sector] with a few [an-decos] and [A] [a-building] [n-building] in the middle");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "[A] [a-building] building whose original purpose is hard to determine, stripped down to bare concrete");
		DescriptionMapper.add("sector-vision", { buildingDensity: b22, wear: b33 }, "[A] [a-street] corridor with scattered trash from long-gone inhabitants");
		DescriptionMapper.add("sector-vision", { wear: b33, isSurfaceLevel: false }, "[A] [a-street] [a-sectortype] [n-street] with a few large unidentifiable ruins looming over it");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A completely ruined [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { wear: b33 }, "A rubble-covered [n-street] surrounded by the crumbling remains of [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { damage: b22 }, "A former [a-sectortype] sector where [n-buildings] and [n-buildings] lie in ruins");
		DescriptionMapper.add("sector-vision", { damage: b33 }, "A completely destroyed [a-sectortype] [n-street]");
		DescriptionMapper.add("sector-vision", { damage: b22, buildingDensity: b12 }, "A [a-street] [n-street] flanked by shells of destroyed buildings");
		DescriptionMapper.add("sector-vision", { damage: b22, buildingDensity: b22 }, "A [n-street] so full of rubble it is difficult to pass through");
		DescriptionMapper.add("sector-vision", { sectorType: t_R }, "A small [n-street] between some [a-building] apartment towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b23, isSurfaceLevel: false }, "A [a-street] [n-street] along an enormous wall stretching to the level ceiling above, dotted with [a-building] apartments");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b12, level: [6, 100] }, "A [n-street] flanked by several identical narrow residential towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, buildingDensity: b23 }, "A [n-street] outside a [a-building] residental building with a dizzying geometrical pattern of balconies");
		DescriptionMapper.add("sector-vision", { sectorType: t_R, level: lmodern }, "A square surrounded by what must once have been rather comfortable apartment towers");
		DescriptionMapper.add("sector-vision", { sectorType: t_I }, "A street outside a huge [a-building] industrial complex");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b13 }, "An empty square with some damaged containers and huge rusting mechanical arms");
		DescriptionMapper.add("sector-vision", { sectorType: t_I, buildingDensity: b23 }, "[A] [n-street] between two blocks of what looks like [a-building] control rooms and offices");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "[A] [a-street] [n-street] behind [A] [n-building], the low ceiling criss-crossed by old wires and ducts");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "A desolate [n-street] criss-crossed with the remains of broken cable systems and maintenance ducts");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, isSurfaceLevel: false }, "A flooded passage underneath a massive bridge with [a-building] buildings looming in the distance");
		DescriptionMapper.add("sector-vision", { sectorType: t_M }, "A forgotten space among machine-run City facilities, smooth surfaces broken only by ducts and pipes");
		DescriptionMapper.add("sector-vision", { sectorType: t_M, level: lold, buildingDensity: b13 }, "A spacious square with a control room in the middle and old cable system lines disappearing in every direction");
		DescriptionMapper.add("sector-vision", { sectorType: t_C }, "[A] [a-street] shopping street with the remains of various shops and cafés");
		DescriptionMapper.add("sector-vision", { sectorType: t_C }, "A [n-street] between some commercial buildings, their [a-building] walls covered in a patchwork of dead screens");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, wear: b12 }, "A [a-street] [n-street] crowded with small shops, billboards and kiosks on multiple levels");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b12, isSurfaceLevel: false }, "A [n-street] where buildings are attached to the ceiling of the level like colossal stalactites");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b12, isSurfaceLevel: false }, "A square built around a massive statue with [a-building] shop fronts surrounding it on every side");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13 }, "A plaza under an elevated building with what must have once been a waterfall in the middle");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13 }, "[A] wide fenced terrace attached to a massive tower overlooking the [a-street] streets below");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b13 }, "A round courtyard enclosed by a [a-building] office building");
		DescriptionMapper.add("sector-vision", { sectorType: t_C, buildingDensity: b22, wear: b33 }, "[A] [a-building] building whose original purpose is hard to determine, stripped down to concrete, with an impressive spiral staircase in the middle");
		DescriptionMapper.add("sector-vision", { sectorType: t_P }, "[A] [n-street] dominated by huge building that looks like it was once a public facility of some kind");
		DescriptionMapper.add("sector-vision", { sectorType: t_P }, "A stretch of abandoned highway with some smaller buildings on the side" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b12 }, "[A] [a-street] [n-street] dominated a row of solemn statues" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b12, wear: b22 }, "An ornamental hall which seems to have once been a big station, with a domed roof, massive chandelier and small booths on the sides" );
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b13 }, "An open space that looks like it might have once been dedicated to a sport of some kind");
		DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: b33}, "[A] [a-street] [n-street] between two vast [n-buildings] with barely enough space fit through");
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
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b13, sectorType: t_R }, "An effulgent [a-street] lined with modern residential towers, now all deserted");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b23 }, "[A] [a-street] street between crumbling ancient [a-sectortype] buildings");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b23 }, "An open street with no ceiling, the next floor of the City hovering high above and ruins on either side");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b33 }, "A passage through an ancient building");
		DescriptionMapper.add("sector-vision", { isGroundLevel: true, buildingDensity: b33 }, "A narrow street with cracked pavement");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b13 }, "A once [a-street-past] square surrounded by glass-domed passages and small shopfronts");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b13 }, "A wide [n-street] where debris is pushed around by the wind");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b13, sectorType: t_P }, "A big square dominated by an ornate public building in the middle");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "A [a-street] street dotted by billboards and dead screens and surrounded by tall buildings");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "An exposed street flanked by tall buildings and shaken by gusts of strong wind");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b23 }, "A multi-layered street with space below for trams and below for pedestrians and small shops");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[A] [a-street] [n-street] between tall, ornate [n-buildings]");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[A] [a-street] passage between what used to be two shopping centers");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, buildingDensity: b33 }, "[A] [a-street] [n-street] where the wind is constantly howling in the narrow passages");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, sectorType: t_C }, "[A] [a-street] between what used to be two shopping centers");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, sectorType: t_C }, "An imposing shopping center which seems to have been full of shops selling luxury goods");
		DescriptionMapper.add("sector-vision", { isSurfaceLevel: true, sectorType: t_I }, "[A] [a-street] with grand office buildings");
		DescriptionMapper.add("sector-vision", { debris: b22 }, "A [n-street] full of debris");
		DescriptionMapper.add("sector-vision", { debris: b22, sectorType: t_R }, "[A] [n-street] flanked by several completely destroyed residential towers");

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
	
	function initWaymarkTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		var t_R = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
		var t_I = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
		var t_M = SectorConstants.SECTOR_TYPE_MAINTENANCE;
		var t_C = SectorConstants.SECTOR_TYPE_COMMERCIAL;
		var t_P = SectorConstants.SECTOR_TYPE_PUBLIC;
		var t_S = SectorConstants.SECTOR_TYPE_SLUM;
		
		var wt_C = SectorConstants.WAYMARK_TYPE_CAMP;
		var wt_W = SectorConstants.WAYMARK_TYPE_SPRING;
		var wt_P = SectorConstants.WAYMARK_TYPE_POLLUTION;
		var wt_R = SectorConstants.WAYMARK_TYPE_RADIATION;
		var wt_S = SectorConstants.WAYMARK_TYPE_SETTLEMENT;
		
		// brackets for values like building density, wear, damage
		var b0 = [0, 0];
		var b12 = [0, 5];
		var b22 = [5, 10];
		
		var lt1 = [ 0, 0.999 ];
		var gte1 = [ 1, 100 ];
		
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "A wall by a corridor leading [direction] has been painted with a big [n-target] symbol");
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "There is a graffiti with the word [n-target] and an arrow pointing [direction]");
		DescriptionMapper.add("waymark", { buildingDensity: b12 }, "Some bricks have been arranged in the shape of an arrow pointing [direction] and a crude symbol that might mean [n-target]");
		DescriptionMapper.add("waymark", { waymarkType: wt_C }, "You spot a few graffiti with arrows pointing [direction] and words like 'safe' and 'shelter'");
		DescriptionMapper.add("waymark", { waymarkType: wt_R }, "There are multiple skull signs on walls when heading towards [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_P }, "There are multiple skull signs on walls when heading towards [direction]");
		DescriptionMapper.add("waymark", { waymarkType: wt_S }, "There is a metal plaque on a wall by a passage leading [direction] with the name '[n-settlement-name]'");
		DescriptionMapper.add("waymark", { waymarkType: wt_W }, "A blue arrow painted on the street is pointing [direction]");
		DescriptionMapper.add("waymark", { sectorType: t_C }, "A store billboard has been painted over with the an arrow pointing [direction] and the word [n-target]");
		DescriptionMapper.add("waymark", { sectorType: t_I }, "A street sign with directions has been painted over. Towards [direction] it says [n-target]");
		DescriptionMapper.add("waymark", { sectorType: t_M }, "Pipes near the ceiling have arrows painted on them. One pointing [direction] is next to a symbol for [n-target]");
		DescriptionMapper.add("waymark", { sectorType: t_P }, "A statue is holding a crude sign saying there is [n-target] to the [direction]");
		DescriptionMapper.add("waymark", { sectorType: t_S }, "There are a few worn posters indicating there is [n-target] to the [direction]");
	}
	
	function initBookTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		let t_S = ItemConstants.bookTypes.science;
		let t_F = ItemConstants.bookTypes.fiction;
		let t_H = ItemConstants.bookTypes.history;
		let t_E = ItemConstants.bookTypes.engineering;
		
		let l_1 = 1;
		let l_2 = 2;
		let l_3 = 3;
		
		DescriptionMapper.add("book-intro", { bookType: wildcard }, "You read the book.");
		DescriptionMapper.add("book-intro", { bookLevel: l_1 }, "You leaf through the book.");
		DescriptionMapper.add("book-intro", { bookLevel: l_2 }, "You study the book.");
		DescriptionMapper.add("book-intro", { bookLevel: l_3 }, "You spend some time studying the book.");
		DescriptionMapper.add("book-intro", { bookType: t_S }, "You study the book.");
		DescriptionMapper.add("book-intro", { bookType: t_F }, "You examine the book.");
		DescriptionMapper.add("book-intro", { bookType: t_H }, "You study the book.");
		DescriptionMapper.add("book-intro", { bookType: t_H }, "You skim through the book.");
		DescriptionMapper.add("book-intro", { bookType: t_E }, "You study the book.");
		
		DescriptionMapper.add("book-description", { bookType: wildcard }, "A passage describing [n-topic] catches your eye.");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "A section describing [n-topic] seems interesting.");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "You learn something about [n-topic].");
		
		DescriptionMapper.add("book-description", { bookLevel: l_1 }, "It gives you some insights into [n-topic].");
		DescriptionMapper.add("book-description", { bookLevel: l_2 }, "It seems like a good source on [n-topic].");
		DescriptionMapper.add("book-description", { bookLevel: l_3 }, "It is not easy to follow, but teaches you a lot about [n-topic].");
		
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is [a] [a-level] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is [a] [a-style] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It describes [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "There are many interesting passages about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a rather dry text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It contains a description of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S }, "You learn that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It is an introductory text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "A description of a refining process offers clues to the kind of materials used commonly before the Fall.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It contains a catalog of known animal life in the \"Dark Levels\". You recognize several.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "You notice old census data about people who are exposed daily to sunlight versus those who are not.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "You find details about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "You are spell-bound by a description of abundant plant-life on the Ground.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "There is a wealth of information about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It contains a dissertation on [n-topic].");
		
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is [a] [a-level] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is [a] [a-style] textbook on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "There are abandoned plans of [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It contains a detailed description of [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "There is diagram explaining in detail how [n-object] worked.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is an operation manual for [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E }, "You learn that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_1 }, "There is an interesting diagram of [n-object].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_2 }, "It contains many useful bits of information on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_3 }, "There are technical drawings of [n-object]");
		
		DescriptionMapper.add("book-description", { bookType: t_H }, "You find details about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is a rather dry text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is [a] [a-style] overview of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is very [a-level] introduction [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "You learn that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It seems that [c-fact].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "You learn about [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "There is a [a] [a-style] chapter on [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "A chapter on [c-event] catches your eye.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "There are several references to [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H }, "A reference to the \"currently uninhabited levels\" of the City offers a perspective on the pre-Fall City.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an introductory text on [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "There is a long section about [c-event].");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_3 }, "You find a detailed timeline of [c-event].");
		
		DescriptionMapper.add("book-description", { bookType: t_F }, "There is a story about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is a tale about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "A story about [c-theme] stays with you.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "You are touched by a poem about [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It contains a vivid description of [c-theme].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is [a] [a-style] novel dealing with [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is [a] [a-style] tale about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is a very [a-style] portrayal of [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is [a] [a-style] story about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It a collection of [a-style] short stories about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_1 }, "It is a children's book featuring [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_2 }, "It is a classic novel about [n-topic].");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_3 }, "It is quite a heavy book on [n-topic].");
		
	}
	
	initSectorTexts();
	initWaymarkTexts();
	initBookTexts();
	
	return TextConstants;
	
});
