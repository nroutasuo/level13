// Level 13 specific text helpers

define(['ash',
	'json!game/data/TextData.json',
	'utils/ArrayUtils',
	'utils/MathUtils',
	'utils/ObjectUtils',
	'utils/DescriptionMapper',
	'text/Text',
	'text/TextBuilder',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/EnemyConstants',
	'game/constants/ItemConstants',
	'game/constants/SectorConstants',
	'game/constants/StoryConstants',
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TradeConstants',
	'game/constants/WorldConstants',
],
function (Ash, TextData, ArrayUtils, MathUtils, ObjectUtils, DescriptionMapper, Text, TextBuilder, GameConstants, CampConstants, EnemyConstants, ItemConstants, SectorConstants, StoryConstants, PositionConstants, MovementConstants, UpgradeConstants, TradeConstants, WorldConstants) {
	
	let TextConstants = {

		params: {},

		loadData: function (data) {
			this.loadDescriptionData("sector-description", data["sector-description"]);
			this.loadDescriptionData("cache-insight-message", data["cache-insight-message"]);
		},

		loadDescriptionData: function (type, data) {
			let macros = data.macros || {};
			let defaultFilters = data.defaultFilters || {};
			let filterScores = data.filterScores || {};
			let params = data.params;
			let descriptions = data.descriptions;

			for (let groupID in descriptions) {
				let group = descriptions[groupID];
				let groupScore = group.score || null;
				let groupFilters = group.filters;
				for (let i in group.descriptions) {
					let description = group.descriptions[i];

					let filters = {};
					ObjectUtils.assignValues(filters, defaultFilters);
					ObjectUtils.assignValues(filters, groupFilters);
					ObjectUtils.assignValues(filters, description.filters);
					TextConstants.loadFilters(filters, macros);

					let score = groupScore || description.score || null;

					DescriptionMapper.add(type, filters, description.text, score);
				}
			}

			this.params[type] = {};
			for (let paramID in params) {
				this.params[type][paramID] = [];
				for (let i in params[paramID]) {
					let entry = params[paramID][i];

					let filters = {};
					ObjectUtils.assignValues(filters, defaultFilters);
					ObjectUtils.assignValues(filters, entry.filters);
					TextConstants.loadFilters(Object.assign({}, filters), macros);

					for (let j in entry.text) {
						let text = entry.text[j];
						let param = { text: text, filters: filters };
						this.params[type][paramID].push(param);
					}
				}
			}

			for (let feature in filterScores) {
				DescriptionMapper.setParamScore("sector-description", feature, filterScores[feature]);
			}
		},

		loadFilters: function (filters, macros) {
			for (let key in filters) {
				let value = filters[key];
				for (let macroKey in macros) {
					if (value == macroKey) {
						filters[key] = macros[macroKey];
					}
				}
			}
		},

		getTextKey: function (trunk, modifiers) {
			for (let i = 0; i < modifiers.length; i++) {
				let modifier = modifiers[i];
				let key = trunk + "_" + modifier;
				if (Text.hasKey(key)) return key;
			}

			return trunk;
		},
		
		sentencify: function (s) {
			s = s.trim();
			if (s.length > 0) {
				if (s.endsWith(", ")) s = s.slice(0, -2);
				if (!this.isPunctuation(s[s.length - 1])) s = s + ".";
				if (s[s.length - 1] != " ") s = s + " ";
			}
			return s;
		},
		
		pluralify: function (s) {
			return Text.pluralify(s);
		},

		isPunctuation: function (c) {
			return c == "." || c == "!" || c == "?";
		},
		
		getActionName: function (baseActionID) {
			switch (baseActionID) {
				case "scavenge_heap": return "Scavenge";
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
				case "clear_workshop": return "clear workshop";
				default:
					return baseActionID;
			}
		},

		getLevelFeatureName: function (featureType) {
			switch (featureType) {
				case WorldConstants.FEATURE_HOLE_COLLAPSE_EDGE:
					return "collapse";
				case WorldConstants.FEATURE_HOLE_WELL_EDGE:
					return "sunwell";
				case WorldConstants.FEATURE_HOLE_MOUNTAIN_EDGE:
					return "mountain";
				case WorldConstants.FEATURE_STRUCTURE_GIGA_CENTER:
					return "giga center";
				case WorldConstants.FEATURE_STRUCTURE_PILLAR:
					return "level pillar";
				case WorldConstants.FEATURE_TRAIN_TRACKS_NEW:
				case WorldConstants.FEATURE_TRAIN_TRACKS_OLD:
					return "train tracks";
			}
			log.w("no name defined for feature type [" +  featureType + "]");
			return featureType;
		},
		
		getSectorName: function (isScouted, features, hasVision) {
			features.hasVision = hasVision;

			let template = "{a-sectortype} {n-street}";
			let params = this.getSectorTextParams(features, hasVision);
			let phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorHeader: function (hasVision, features) {
			features.hasVision = hasVision;
			
			let template = "{a-street} {a-sectortype} {n-street}";
			if (features.hasCamp) {
				template = "{n-street} with camp";
			}
			if (features.hasGrove) {
				template = "{a-street} park";
			}
			if (!hasVision) {
				if (features.sunlit) {
					template = "sunlit {n-street}";
				} else {
					template = "dark {n-street}";
				}
			}
			let params = this.getSectorTextParams(features, hasVision);
			let phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorDescription: function (hasVision, features) {
			features.hasVision = hasVision;
			
			let template = DescriptionMapper.get("sector-description", features);
			
			let params = this.getSectorTextParams(features, hasVision);
			let phrase = TextBuilder.build(template, params);
			return Text.capitalize(phrase);
		},
		
		getSectorTextParams: function (features, hasVision) {
			// 1) Collect options for each param based on several features (key -> [])
			let options = this.getPossibleSectorTextParams(features, hasVision);
			
			// 2) Build final result by selecting "randomly" from options
			let rand = Math.abs(Math.floor((features.buildingDensity + features.wear + features.damage) / 2) + features.sectorX + features.sectorY);

			let selectFromOptions = function (key, num, optional) {
				return TextConstants.selectTextParam(rand, key, num, options[key], optional);
			};

			let result = {};
			// - adjective describing sector type, used like a-street
			result["a-sectortype"] = selectFromOptions("a-sectortype", 1);
			// - noun describing the sector as a self-contained place such as shopping center or prison complex
			result["n-sector"] = selectFromOptions("n-sector", 1);
			// - noun describing the sector as a place that contain other buildings, such a street or plaza
			result["n-street"] = selectFromOptions("n-street", 1);
			// adjective describing the general mood of the sector, often used to qualify n-sector or n-street
			result["a-street"] = selectFromOptions("a-street", 2);
			// noun describing a building located on the sector, such as a ruin or a power plant
			result["n-building"] = selectFromOptions("n-building", 2);
			// plural noun describing several buildings located on the sector, such as high-rises or factories
			result["n-buildings"] = selectFromOptions("n-buildings", 2);
			// adjective used to modify n-building or n-buildings
			result["a-building"] = selectFromOptions("a-building", 2);
			// noun used to describe what the place or buildings are made of
			result["n-material"] = selectFromOptions("n-material", 1);
			// noun used to describe smaller items that litter or dominate the street, such as dead screens, fake trees or trash
			result["an-decos"] = selectFromOptions("an-decos", 2, !hasVision);
			// noun used to describe prominent feature in neighbouring sector (optional)
			result["n-neighbour"] = selectFromOptions("n-neighbour", 1, true);
			// noun used to describe enemies in the sector (optional)
			result["n-enemies"] = selectFromOptions("n-enemies", 1, true);
			
			return result;
		},

		getPossibleSectorTextParams: function (features, hasVision) {
			let options = {};
			
			let addOptions = function (param, condition, values) {
				if (!condition) return;
				if (!options[param]) options[param] = [];
				for (let i = 0; i < values.length; i++) {
					options[param].push(values[i]);
				}
			};

			// directly derived

			// - a-sectortype: only one option
			addOptions("a-sectortype", true, [ features.sectorType ]);

			// - n-enemies: from enemy tags
			addOptions("n-enemies", hasVision, features.enemyTags.map(tag => TextConstants.pluralify(tag)));

			// - neighbours: level features or neighbouring districts as n-neighbour (optional param)
			if (features.neighboursFeatures.length > 0) {
				addOptions("n-neighbour", hasVision, features.neighboursFeatures.map(featureType => TextConstants.getLevelFeatureName(featureType)));
			} else {
				for (let i = 0; i < features.neighboursDistricts.length; i++) {
					let districtType = features.neighboursDistricts[i];
					addOptions("n-neighbour", hasVision && districtType != features.districtType, [ districtType + " district" ]);
				}
			}

			// derived from descriptions data

			let params = this.params["sector-description"];

			for (let paramID in params) {
				let options = params[paramID];
				for (let i = 0; i < options.length; i++) {
					let param = options[i];
					addOptions(paramID, DescriptionMapper.matches(features, param), [ param.text ]);
				}
			}

			return options;
		},
		
		getPassageFoundMessage: function (passageVO, direction, sunlit, isBuilt) {			
			let passageType = passageVO.type;
			let textKey = "passage_found_" + passageType + "_message";

			if (isBuilt) {
				textKey = "passage_found_" + passageType + "_built_message";
			}

			if (passageVO.type == MovementConstants.PASSAGE_TYPE_HOLE) {
				if (direction === PositionConstants.DIRECTION_UP) {
					if (!isBuilt) {
						if (sunlit) {
							textKey = "passage_found_hole_up_sunlit_message";
						} else {
							textKey = "passage_found_hole_up_dark_message";
						}
					}
				} else {
					if (!isBuilt) {
						if (sunlit) {
							textKey = "passage_found_hole_down_sunlit_message";
						} else {
							textKey = "passage_found_hole_down_dark_message";
						}
					}
				}
			}

			return Text.t("story.messages." + textKey);
		},
		
		getPassageRepairedMessage: function (passageType, direction, sectorPosVO, numCampsBuilt) {
			let directionName = (direction === PositionConstants.DIRECTION_UP ? " up" : " down");
			let includeLevelInPosition = numCampsBuilt > 1;
			switch (passageType) {
				case MovementConstants.PASSAGE_TYPE_HOLE:
					return "Elevator " + directionName + " built at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
				case MovementConstants.PASSAGE_TYPE_ELEVATOR:
					return "Elevator " + directionName + " repaired at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
				case MovementConstants.PASSAGE_TYPE_STAIRWELL:
					return "Stairwell " + directionName + " repaired at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
				default:
					log.w("Unknown passage type: [" + passageType + "]")
					return "Passage " + directionName + " ready at " + sectorPosVO.getInGameFormat(includeLevelInPosition);
			}
		},
				
		getPassageDescription: function (passageVO, direction, isBuilt, isShort) {
			let passageType = passageVO.type;
			let passageTypeName = passageType;
			let directionName = (direction === PositionConstants.DIRECTION_UP ? "up" : "down");

			let result = "";

			if (isShort) {
				let statusDescription = this.getPassageStatusDescription(passageVO, isBuilt);
				result = Text.t("ui.map.passage_description_template_short", { direction: directionName, passageType: passageTypeName, status: statusDescription });
			} else {
					let textKey = "ui.exploration.sector_status_passage_" + passageType + "_default_description";

					if (isBuilt) {
						textKey = "ui.exploration.sector_status_passage_" + passageType + "_built_description";
					}

					if (!isBuilt && passageType == MovementConstants.PASSAGE_TYPE_HOLE) {
						textKey = "ui.exploration.sector_status_passage_hole_" + directionName + "_default_description";
					}

					result = Text.t(textKey, { direction: directionName });
			}

			return result;
		},

		getPassageStatusDescription: function (passageVO, isBuilt) {
			switch (passageVO.type) {
				case MovementConstants.PASSAGE_TYPE_PREBUILT:
					return Text.t("ui.map.passage_status_prebuilt");
				case MovementConstants.PASSAGE_TYPE_HOLE:
					return isBuilt ? Text.t("ui.map.passage_status_built") : Text.t("ui.map.passage_status_hole");
				case MovementConstants.PASSAGE_TYPE_ELEVATOR:
					return isBuilt ? Text.t("ui.map.passage_status_repaired") : Text.t("ui.map.passage_status_broken");
				case MovementConstants.PASSAGE_TYPE_STAIRWELL:
					return isBuilt ? Text.t("ui.map.passage_status_repaired") : Text.t("ui.map.passage_status_broken");
			}
		},
		
		getReadBookMessage: function (itemVO, bookType, campOrdinal, storyFlags) {
			let features = {};
			let itemName = ItemConstants.getItemDisplayName(itemVO);
			features.bookType = bookType;
			features.bookName = itemName;
			features.bookLevel = itemVO.level || 1;
			features.campOrdinal = campOrdinal;
			features.randomSeed = itemVO.itemID;
			let params = this.getBookTextParams(features, storyFlags);
			
			let template = DescriptionMapper.get("book-intro", features) + " " + DescriptionMapper.get("book-description", features);
			let phrase = TextBuilder.build(template, params);
			
			return phrase;
		},
		
		getBookTextParams: function (features, storyFlags) {
			var result = {};
			
			let levels = [];
			switch (features.bookLevel) {
				case 1:
					levels.push("simple");
					levels.push("dated");
					levels.push("simplistic");
					levels.push("biased");
					break;
				case 2:
					levels.push("basic");
					levels.push("regular");
					levels.push("decent");
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
					styles.push("scientific");
					styles.push("formal");
					styles.push("systematic");
					styles.push("official");
					break;
				case ItemConstants.bookTypes.fiction:
					styles.push("fantastical");
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
					styles.push("authentic");
					styles.push("graphic");
					styles.push("slow");
					styles.push("elaborate");
					styles.push("outlandish");
					break;
			}
			result["a-style"] = DescriptionMapper.pickRandom(styles, features);
			
			let goodAdjectives = [];
			goodAdjectives.push("eloquent");
			goodAdjectives.push("memorable");
			goodAdjectives.push("enjoyable");
			goodAdjectives.push("excellent");
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
				case ItemConstants.bookTypes.engineering:
				case ItemConstants.bookTypes.history:
					goodAdjectives.push("detailed");
					goodAdjectives.push("comprehensive");
					goodAdjectives.push("exhaustive");
					goodAdjectives.push("engaging");
					goodAdjectives.push("thorough");
					goodAdjectives.push("useful");
					break;
				case ItemConstants.bookTypes.fiction:
					goodAdjectives.push("brilliant");
					goodAdjectives.push("vivid");
					goodAdjectives.push("absorbing");
					break;
			}
			result["a-good"] = DescriptionMapper.pickRandom(goodAdjectives, features);
			
			let badAdjectives = [];
			badAdjectives.push("tedious");
			badAdjectives.push("monotonous");
			badAdjectives.push("dull");
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
				case ItemConstants.bookTypes.engineering:
				case ItemConstants.bookTypes.history:
					badAdjectives.push("impractical");
					badAdjectives.push("vague");
					break;
				case ItemConstants.bookTypes.fiction:
					badAdjectives.push("forgettable");
					badAdjectives.push("unoriginal");
					badAdjectives.push("tacky");
					break;
			}
			result["a-bad"] = DescriptionMapper.pickRandom(badAdjectives, features);
			
			let topics = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
					topics.push("a species of slug that thrives in radioactive environments");
					topics.push("the infrastructure of the City");
					topics.push("the ocean");
					topics.push("forests");
					topics.push("ventilation systems in the City");
					topics.push("medicine");
					topics.push("electronics");
					topics.push("how to protect yourself from the harmful effects of sunlight");
					topics.push("how raw rubber is processed into many useful forms");
					topics.push("cancer treatment");
					topics.push("dna");
					topics.push("greenhouse agriculture");
					topics.push("evolution");
					topics.push("plate tetonics");
					topics.push("batteries");
					topics.push("fossils");
					topics.push("the possibility of controlling the weather through singing");
					topics.push("the effect of flowering plants on dice rolls");
					topics.push("earthquakes");
					topics.push("fermentation");
					topics.push("viruses");
					topics.push("the solar calendar");
					topics.push("strange agricultural practices involving shamanism");
					topics.push("radar technology");
					topics.push("mathematics");
					topics.push("the ambitious and un-realised plan the Dictatorship government had for expansion of the City");
					topics.push("ecosystems");
					topics.push("dentistry");
					topics.push("computers");
					topics.push("volcanoes");
					topics.push("immortality through medical advancements");
					topics.push("meteorites");
					topics.push("the printing press");
					topics.push("optical lenses");
					topics.push("burning garbage for energy");
					topics.push("fertilizers");
					topics.push("water recycling facilities of the City");
					topics.push("the possibility of eternal life thanks to advanced medicine");
					
					if (features.bookLevel == 1) {
						topics.push("weapons of old");
						topics.push("the many uses of baking soda");
						topics.push("plate tectonics");
						topics.push("an ancient material called wood");
						topics.push("food preservation");
					}
					if (features.bookLevel == 2) {
						topics.push("food crop rotation");
						topics.push("gunpowder");
						topics.push("electricity");
						topics.push("radio technology");
						topics.push("the magnetic compass");
						topics.push("the planet's atmosphere");
						topics.push("greenhouse maintenance");
						topics.push("biochemistry");
						topics.push("origin of the calendar, the movement of the sun and the moons");
					}
					if (features.bookLevel == 3) {
						topics.push("electromagnetism");
						topics.push("other planets");
						topics.push("atomic weapons");
						topics.push("dark matter");
						topics.push("condensing and storing memories in a reusable format");
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
					topics.push("life of a crime detective on the Surface");
					topics.push("ghosts in the uninhabited levels of the City");
					topics.push("an ancient volcano");
					topics.push("undersea travel");
					topics.push("a monster that lives in the core of the planet.");
					topics.push("a terrifying sea monster");
					topics.push("the relationship of a boy and his bat");
					topics.push("a war");
					topics.push("an asteroid hitting the City");
					topics.push("a Blue Army soldier and what she did after the collapse of the Dictatorship");
					break;
					
				case ItemConstants.bookTypes.history:
					topics.push("biological warfare");
					topics.push("pre-City civilizations");
					topics.push("the development of agriculture");
					topics.push("rise of sea levels");
					topics.push("the history of painting");
					topics.push("the industrial revolution");
					topics.push("the digital revolution");
					topics.push("property rights to ground and mining sites");
					topics.push("the population decline that was apparent in the City already before the Fall");
					topics.push("a specific ethnic group");
					topics.push("a famine soon after the founding of the City");
					topics.push("a pre-City global legal organization");
					topics.push("the history of mathematics");
					topics.push("a great scientific project");
					topics.push("the city states period");
					topics.push("the city wars");
					topics.push("class tensions");
					topics.push("population crisis");
					topics.push("shipwrecks");
					topics.push("architectural styles on differetn Levels");
					topics.push("slavery");
					topics.push("the magical beliefs of people living in a specific part of the City");
					topics.push("a historical dictatorship");
					topics.push("sacred places in the City");
					
					if (features.bookLevel == 1) {
						topics.push("the early City");
						topics.push("architectural styles in different parts of the City");
						topics.push("the effects of a major earthquake on the City");
						topics.push("pre-Fall religions and how they contributed to several wars");
					}
					if (features.bookLevel == 2) {
						topics.push("the history of a powerful crime syndicate");
						topics.push("a great war between two factions within the City");
					}
					if (features.bookLevel == 3) {
						topics.push("the history of a powerful crime syndicate");
						topics.push("how the pre-Fall Government was formed");
					}
					break;
					
				case ItemConstants.bookTypes.engineering:
					topics.push("an industrial process");
					topics.push("transistors");
					topics.push("nuclear reactors");
					topics.push("nuclear waste containment");
					topics.push("dead air");
					topics.push("sundomes");
					topics.push("radio");
					topics.push("robotics");
					topics.push("structures to stabilise the City against earthquakes");
					topics.push("organ transfers");
					topics.push("architecture");
					topics.push("3D printing");
					topics.push("machine control systems");
					topics.push("mirror systems to distribute sunlight");
					topics.push("robot design");
					topics.push("elevators in the city");
					topics.push("statistics");
					topics.push("improving the City's ability to withstand extreme weather such as hurricanes");
					topics.push("flooding in the Dark Levels");
					topics.push("air quality");
					topics.push("space flight");
					topics.push("electronics");
					topics.push("bridges");
					topics.push("the Zones, Districts, Sectors and other divisions of the City");
					
					if (features.bookLevel == 1) {
						topics.push("steel production");
						topics.push("rubber production");
						topics.push("radioactive waste management");
					}
					if (features.bookLevel == 2) {
						topics.push("artificial intelligence");
						topics.push("a programming language");
					}
					if (features.bookLevel == 3) {
						topics.push("programming");
						topics.push("the making of robots");
						topics.push("programming");
					}
					break;
			}
			result["n-topic"] = DescriptionMapper.pickRandom(topics, features);
			
			let objects = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.engineering:
					objects.push("transistors");
					objects.push("robots");
					objects.push("machines you don't really understand, but it seems they were used to stabilise the City");
					objects.push("a level-wide solar screen called the Ceiling");
					objects.push("an irrigation system in a pre-Fall greenhouse");
					objects.push("a household appliance");
					
					if (features.bookLevel == 1) {
						objects.push("engines powering the old elevators");
						objects.push("a weapon");
						objects.push("a medical instrument");
					}
					if (features.bookLevel == 2) {
						objects.push("an information network spanning an entire level of the City");
						objects.push("a flying vehicle");
						objects.push("a robot meant for collecting and processing garbage");
						objects.push("a device used to store and transmit data");
					}
					if (features.bookLevel == 3) {
						objects.push("different types of robots");
						objects.push("a great rocket");
						objects.push("a sewage system");
					}
					break;
			}
			result["n-object"] = DescriptionMapper.pickRandom(objects, features);
			
			let themes = [];
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
					themes.push("a girl who never left her room");
					themes.push("a team of people working on the elevators and trams of a part of the City");
					themes.push("a complex social hierarchy in the office of a pre-Fall newspaper");
					themes.push("a neighbourhood in the City where there were only old people");
					themes.push("the life of a rich but lonely businessman");
					themes.push("a boy's friendship with a robot");
					themes.push("a computer program that made people forget who they were");
					themes.push("forgotten places outside the City");
					break;
			}
			result["c-theme"] = DescriptionMapper.pickRandom(themes, features);
			
			let facts = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.science:
					facts.push("the City's population was already on decline before the Fall");
					facts.push("ancient civilizations often used wood as a building material, because it was plentiful on the Ground");
					facts.push("there are were several Mining Towns deep in the City");
					facts.push("the maintenance of the City below certain levels was mainly done by robots");
					facts.push("most of the food greenhouses of the City were on its edges");
					facts.push("most of the water in the City is rainwater collected on the Surface and the Ground");
					facts.push("there are animals that live their entire lives underwater");
					facts.push("spider silk is the strongest known natural material");
					facts.push("bananas are radioactive");
					facts.push("you can't taste food without saliva");
					facts.push("the City was built on marshland and is slowly sinking in it");
					facts.push("the Ocean currents were changing direction before the Fall");
					break;
				case ItemConstants.bookTypes.history:
					facts.push("a few powerful mining corporations held great power before the Fall");
					facts.push("ancient civilizations based their calendars on four seasons");
					facts.push("the City was originally built on swamp land");
					facts.push("the City was inhabited by people from several old civilizations");
					facts.push("the City has experienced several famines during its history");
					facts.push("the City was started to be built about 700 years ago");
					facts.push("there was a time when all religions were banned in the City");
					facts.push("the last underwater research station closed down decades before the Fall");
					facts.push("several places in the City seem to be cursed due to a past injustice or horror");
					break;
				case ItemConstants.bookTypes.engineering:
					facts.push("the lower levels of the City have unequal heights");
					facts.push("most of the City used to be lit by electrical lights");
					facts.push("the Surface of the City used to be protected by one massive Dome");
					facts.push("sunlight used to be reflected deeper into the City with complex mirror systems");
					facts.push("parts of the City are built into the mountain");
					facts.push("the Ocean is deeply polluted");
					facts.push("at its population peak, the City needed a complex cooling system just because of the amount of heat generated by its people");
					// TODO get general facts like these in features / otherwise
					// TODO add more and splt by level so these don't get repetitive
					// facts.push("there are X levels in the City");
					// facts.push("the lowest level of the City is in fact number X");
					break;
			}
			result["c-fact"] = DescriptionMapper.pickRandom(facts, features);
			
			let events = [];
			switch (features.bookType) {
				case ItemConstants.bookTypes.history:
					events.push("a war that the City waged against some far-away civilization hundreds of years ago");
					events.push("wars in the City in the past 500 years");
					events.push("the building of the first levels of the City");
					events.push("the migration to the City from some far-away island");
					events.push("something called the Great Famine which took place a few decades before the book was written");
					events.push("the establishment of the city-wide Government");
					events.push("a major gardener uprising");
					events.push("a scandal related to pollution outside the City");
					events.push("a famine outside the City and the resulting immigration wave");
					events.push("a nuclear power plant accident where waste was released to the lower levels of the City");
					events.push("a major shift in agriculture from the Ground into the Greenhouses");
					events.push("a series of terror attacks in the City");
					events.push("the first computer virus");
					events.push("a devastating war between the City and another state somewhere outside it");
					events.push("women's suffrage");
					events.push("a series of experiments on augmenting the human body with implants");
					events.push("a scandal involving an influential politician");
					events.push("a doomed attempt by a religious sect to go live outside the City a few decades ago");
					events.push("building of a small manned space station orbiting the planet");
					break;
			}
			result["c-event"] = DescriptionMapper.pickRandom(events, features);
			
			return result;
		},
		
		getReadNewspaperMessage: function (itemVO) {
			let features = {};
			let itemName = ItemConstants.getItemDisplayName(itemVO);
			features.itemName = itemName;
			features.itemLevel = itemVO.level || 1;
			features.randomSeed = itemVO.itemID;
			let params = this.getNewspaperTextParams(features);
			
			let template = "You leaf through the newspaper. " + DescriptionMapper.get("newspaper-description", features);
			let phrase = TextBuilder.build(template, params);
			
			return phrase;
		},
		
		getNewspaperTextParams: function (features) {
			let result = {};
			
			let events = [];
			events.push("a worker strike");
			events.push("a local celebration");
			events.push("the arrival of a group of refugees");
			events.push("the birth of triplets");
			events.push("a disease outbreak");
			events.push("a lost trade caravan");
			events.push("a ghost sighting");
			events.push("an unexplained light in a certain building");
			switch (features.itemLevel) {
				case 1:
					events.push("the discovery of a new hunting grounds");
					events.push("the collapse of a level floor");
					events.push("a population milestone");
					break;
				case 2:
					events.push("the discovery of a new smelting technique");
					events.push("the election of a new leader");
					events.push("a music festival");
					events.push("the completion of a new aqueduct");
					events.push("an expedition to unexplored parts of the City");
					break;
				case 3:
					events.push("the discovery of a new building material");
					events.push("the discovery of a new medicine");
					events.push("a local sports event");
					break;
			}
			result["c-event"] = DescriptionMapper.pickRandom(events, features);
			
			let topics = [];
			topics.push("local politics");
			topics.push("local gossip");
			topics.push("horoscopes");
			topics.push("plant life surrounding the settlement");
			topics.push("the erosion of the City");
			topics.push("a haunted commercial center");
			topics.push("various theories about the fate of the Governor");
			topics.push("various theories about the real cause of the Fall");
			topics.push("the health effects of moonlight");
			switch (features.itemLevel) {
				case 1:
					topics.push("survival techniques in the Dark Levels");
					topics.push("life in the Dark Levels before the Fall");
					topics.push("keeping bats as pets");
					break;
				case 2:
					topics.push("medicine");
					topics.push("cooking");
					topics.push("private property");
					topics.push("small scale gardening");
					break;
				case 3:
					topics.push("the Network");
					topics.push("moral issues");
					break;
			}
			result["n-topic"] = DescriptionMapper.pickRandom(topics, features);

			let facts = [];
			facts.push("celebration of the new year was disrupted by flooding")
			facts.push("a restaurant has opened on Level 17")
			facts.push("drug trafficking continues on Level 19")
			facts.push("disease strikes at a major settlement")
			result["c-fact"] = DescriptionMapper.pickRandom(facts, features);
			
			return result;
		},
		
		getDonateSeedsMessage: function (itemVO) {
			return "Donated the seeds to the temple. The clerics will cherish them and perhaps something will grow.";
		},
		
		getReadInsightCacheMessage: function (itemVO, storyFlags) {
			let itemName = ItemConstants.getItemDisplayName(itemVO);

			let features = {};
			for (let key in storyFlags) {
				features[key] = storyFlags[key];
			}
			features.type = itemVO.id.replace("cache_insight_", "").replace(/_\d*/, "");

			let params = this.getInsightMessageParams(features);

			let template = DescriptionMapper.get("cache-insight-message", features);
			let message = TextBuilder.build(template, params);
			
			let textFragments = [];
			textFragments.push({ textKey: "game.actions.use_cache_insight_message", textParams: { name: itemName } });
			textFragments.push({ rawText: message });
			let textVO = { textFragments: textFragments, delimiter: "ui.common.sentence_separator" }
			return Text.compose(textVO) ;
		},
		
		getInsightMessageParams: function (features) {
			// 1) Collect possible options for each param (param (string) -> list of string)
			let options = this.getPossibleInsightMessageParams(features);

			// 2) Select randomly
			let rand = MathUtils.randomIntBetween(0, 100);
			
			let selectFromOptions = function (key, num, optional) {
				return TextConstants.selectTextParam(rand, key, num, options[key]);
			};

			let result = {};
			result["n-topic"] = selectFromOptions("n-topic", 1);
			result["a-area"] = selectFromOptions("a-area", 1);
			
			return result;
		},

		getPossibleInsightMessageParams: function (features) {
			let options = {};
			
			let addOptions = function (param, condition, values) {
				if (!condition) return;
				if (!options[param]) options[param] = [];
				for (let i = 0; i < values.length; i++) {
					options[param].push(values[i]);
				}
			};

			let params = this.params["cache-insight-message"];

			for (let paramID in params) {
				let options = params[paramID];
				for (let i = 0; i < options.length; i++) {
					let param = options[i];
					addOptions(paramID, DescriptionMapper.matches(features, param), [ param.text ]);
				}
			}

			return options;
		},
		
		getFoundStashMessage: function (stashVO) {
			switch (stashVO.stashType) {
				case ItemConstants.STASH_TYPE_ITEM:
					let itemID = stashVO.itemID;
					let item = ItemConstants.getItemDefinitionByID(itemID);
					if (item.type == ItemConstants.itemTypes.note) {
						return "Found some interesting documents.";
					} else { 
						return "Found an item stash.";
					}
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
			
			result["n-target"] = "<span class='hl-functionality'>" + this.getWaymarkTargetName(waymarkVO, features) + "</span>";
			result["direction"] = PositionConstants.getDirectionName(features.direction, false);
			result["n-settlement-name"] = tradePartner ? tradePartner.name : null;
			result["n-district-type"] = features.districtType;
			
			return result;
		},
		
		getWaymarkTargetName: function (waymarkVO, features) {
			switch (waymarkVO.type) {
				case SectorConstants.WAYMARK_TYPE_SPRING: return "water";
				case SectorConstants.WAYMARK_TYPE_CAMP: return "safety";
				case SectorConstants.WAYMARK_TYPE_CLINIC: return "clinic";
				case SectorConstants.WAYMARK_TYPE_RADIATION: return "hazard";
				case SectorConstants.WAYMARK_TYPE_POLLUTION: return "hazard";
				case SectorConstants.WAYMARK_TYPE_SETTLEMENT: return "trade";
				case SectorConstants.WAYMARK_TYPE_DISTRICT: return features.districtType + " district";
				case SectorConstants.WAYMARK_TYPE_PASSAGE: return "passage";
				default:
					log.w("unknown waymark type: " + waymarkVO.type);
					return "safe";
			}
		},

		getCampTerm: function (isOutpost) {
			return isOutpost ? "small camp" : "camp";
		},

		getCampModifier: function (campComponent, improvementsComponent) {
			if (improvementsComponent.getCount(improvementNames.lights) > 0) {
				return Text.t("ui.exploration.camp_description_lit");
			}
			if (improvementsComponent.getNumDamaged() > 0) {
				return Text.t("ui.exploration.camp_description_damaged_buildings");
			}
			if (campComponent.population < 1) {
				return Text.t("ui.exploration.camp_description_no_pop");
			}
			if (campComponent.population < 5) {
				return Text.t("ui.exploration.camp_description_low_pop");
			}
			if (improvementsComponent.getCount(improvementNames.fortification) > 0) {
				return Text.t("ui.exploration.camp_description_fortified");
			}
			if (campComponent.population > 50) {
				return Text.t("ui.exploration.camp_description_high_pop");
			}
			if (campComponent.assignedWorkers[CampConstants.workerTypes.soldier.id] > 1) {
				return Text.t("ui.exploration.camp_description_guarded");
			}
			if (improvementsComponent.getTotalCount() > 40) {
				return Text.t("ui.exploration.camp_description_many_buildings");
			}
			if (improvementsComponent.getTotalCount() > 40) {
				return Text.t("ui.exploration.camp_description_many_buildings");
			}

			return Text.t("ui.exploration.camp_description_default");
		},

		getResourceDisplayName: function (resourceName) {
			return Text.t("game.resources." + resourceName + "_name");
		},

		getHeapDisplayName: function (resourceName, features) {			
			let modifiers = SectorConstants.getSectorEnvironmentTags(null, null, null, features);
			return Text.t(this.getTextKey("ui.exploration.heap_" + resourceName + "_name", modifiers));
		},

		getResourcesTextVO: function (resourcesVO, currency) {
			let list = [];

			for (let key in resourceNames) {
				let name = resourceNames[key];
				let amount = resourcesVO.getResource(name);
				if (amount > 0) {
					let listFragment = { textKey: "ui.common.value_and_name", textParams: { value: Math.round(amount), name: name } };
					list.push(listFragment);
				}
			}

			if (currency > 0) {
				let listFragment = { textKey: "ui.common.value_and_name", textParams: { value: Math.round(currency), name: "game.resources.currency_name" } };
				list.push(listFragment);
			}

			return this.getListTextVO(list);
		},

		getItemsTextVO: function (items) {
			let itemCounts = {};
			let itemsByID = {};

			for (let i = 0; i < items.length; i++) {
				let item = items[i];
				let itemID = item.id;
				if (!itemCounts[itemID]) itemCounts[itemID] = 0;
				itemCounts[itemID]++;
				itemsByID[itemID] = item;
			}

			let list = [];

			for (let itemID in itemCounts) {
				let count = itemCounts[itemID];
				if (count == 0) continue;
				let item = itemsByID[itemID];
				let itemName = ItemConstants.getItemDisplayNameKey(item);
				let listFragment = { textKey: "ui.common.value_and_name", textParams: { value: count, name: itemName } };
				list.push(listFragment);
			}

			return this.getListTextVO(list);
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
			let condition = sectorFeatures.getCondition();

			let modifiers = [];
			if (isShort) {
				modifiers = "short";
			} else {
				modifiers = SectorConstants.getSectorEnvironmentTags(null, null, null, sectorFeatures);
			}

			let localeType = locale.type;
			if (localeType == localeTypes.shelter) localeType = localeTypes.house;
			if (localeType == localeTypes.tradingpartner) localeType = localeTypes.camp;

			let localeTypeKey = localeType;
			if (locale.textKey) localeTypeKey += "_" + locale.textKey;
			let textKey = this.getTextKey("game.locales." + localeTypeKey + "_name", modifiers);

			let defaultModifier = "game.locales.condition_" + condition + "_modifier";
			
			return Text.t(textKey, defaultModifier);
		},
		
		getWorkshopName: function (resource) {
			switch (resource) {
				case resourceNames.fuel: return "refinery";
				case resourceNames.rubber: return "plantation";
				default: return "workshop";
			}
		},
		
		getSpringName: function (featuresComponent) {
			let key = "";

			let hasHazards = featuresComponent.hazards.hasHazards();
			let type = featuresComponent.sectorType;
			let style = featuresComponent.sectorStyle;

			if (featuresComponent.ground && featuresComponent.buildingDensity < 6  && !hasHazards && type != SectorConstants.SECTOR_TYPE_INDUSTRIAL) {
				key = "ui.exploration.spring_name_natural";
			} else if (featuresComponent.wear > 7 || featuresComponent.damage > 3) {
				key = "ui.exploration.spring_name_damaged";
			} else if (type == SectorConstants.SECTOR_TYPE_PUBLIC || style == SectorConstants.STYLE_CITTADINIAN) {
				key = "ui.exploration.spring_name_public"
			} else if (type == SectorConstants.SECTOR_TYPE_INDUSTRIAL || style == SectorConstants.STYLE_INDUSTRIAL) {
				key = "ui.exploration.spring_name_industrial";
			} else if (type == SectorConstants.STYLE_SLUM_GENERAL || type == SectorConstants.STYLE_SLUM_HUN) {
				key = "ui.exploration.spring_name_slum";
			} else {
				key = "ui.exploration.spring_name"
			}
			
			return Text.t(key);
		},

		getDistrictTypeText: function (districtVO) {
			let districtType = districtVO.type;
			let key = "empty";
			switch (districtVO.type) {
				case SectorConstants.SECTOR_TYPE_RESIDENTIAL: 
					key = "residential";
					if (districtVO.wealth <= 3) key = "slum";
					break;
				case SectorConstants.SECTOR_TYPE_INDUSTRIAL:
					key = "industrial";
					break;
				case SectorConstants.SECTOR_TYPE_MAINTENANCE:
					key = "maintenance";
					break;
				case SectorConstants.SECTOR_TYPE_COMMERCIAL:
					key = "commercial";
					if (districtVO.wealth <= 3) key = "slum";
					if (districtVO.wealth >= 8) key = "financial";
					break;
				case SectorConstants.SECTOR_TYPE_PUBLIC:
					key = "public";
					break;
				case SectorConstants.SECTOR_TYPE_EMPTY:
					key = "empty";
					break;
			}
			return Text.t("ui.exploration.district_" + key + "_label");
		},

		getUpgradeDisplayName: function (id) {
			let key = UpgradeConstants.getDisplayNameTextKey(id);
			if (Text.hasKey(key)) {
				return Text.t(key);
			}

			return UpgradeConstants.getUpgrade(id).name;
		},
		
		getEnemyText: function (enemyList, sectorControlComponent) {
			let result = "";
			var enemyActiveV = this.getEnemyActiveVerb(enemyList);
			var enemyNounSector = this.getEnemyNoun(enemyList, true, true);
			result += enemyActiveV + " " + enemyNounSector;
			return result;
		},
		
		getEnemyNoun: function (enemyList, detailed, pluralify) {
			var baseNoun = this.getCommonText(enemyList, "nouns", detailed ? "name" : "", "someone or something", true, pluralify);
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
				let item = ItemConstants.getItemDefinitionByID(id);
				if (!item) continue;
				let itemName = ItemConstants.getItemDisplayName(item);
				validItems.push(itemName);
			}
			
			if (validItems.length == 0) {
				if (itemsScavengeable.length > 0) {
					return "Some ingredient";
				} else {
					return "None";
				}
			}
			
			return validItems.join(", ");
		},
		
		getMovementBlockerName: function (blockerVO, gangComponent) {
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
					return "Fight " + this.getEnemyNoun(enemies, false, true);
				case MovementConstants.BLOCKER_TYPE_TOLL_GATE: return "Pay toll";
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
		
		getUnblockedVerb: function (blockerType, isDisabled) {
			if (isDisabled) return "disabled";
			
			switch (blockerType) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "bridged";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "cleared";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "cleared";
				case MovementConstants.BLOCKER_TYPE_GANG: return "defeated";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return "cleared";
				case MovementConstants.BLOCKER_TYPE_EXPLOSIVES: return "cleared";
				case MovementConstants.BLOCKER_TYPE_TOLL_GATE: return "paid";
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

		getAmountLabel: function (value, maxDisplayValue) {
			if (value <= maxDisplayValue) {
				return Text.t("ui.common.amount_simple_template", value);
			} else {
				return Text.t("ui.common.amount_many_label");
			}
		},
		
		getListText: function (list, max) {
			let textPieceVO = this.getListTextVO(list, max);
			return Text.compose(textPieceVO);
		},

		getListTextVO: function (list, max) {
			let fragments = [];

			if (!list || list.length == 0) {
				fragments.push( { textKey: "ui.common.list_template_zero", textParams: {} } );
			} else if (list.length == 1) {
				fragments.push( { textKey: "ui.common.list_template_one", textParams: { value: list[0] } } );
			} else if (list.length == 2) {
				fragments.push( { textKey: "ui.common.list_template_two", textParams: { value1: list[0], value2: list[1] }});
			} else if (max && list.length > max) {
				// cropped list
				let displayedList = list.slice(0, max);
				let numHiddenItems = list.length - displayedList.length;
				fragments.push( { textKey: "ui.common.list_template_cropped_start" });
				for (let i = 0; i < displayedList.length; i++) {
					if (i > 0) fragments.push( { textKey: "ui.common.list_template_cropped_delimiter" } );
					fragments.push( { textKey: "ui.common.value_simple_template", textParams: { value: displayedList[i] } } );
				}
				fragments.push( { textKey: "ui.common.list_template_cropped_end", textParams: { numCropped: numHiddenItems } })
			} else {
				// regular list
				fragments.push( { textKey: "ui.common.list_template_many_start" });
				for (let i = 0; i < list.length; i++) {
					if (i > 0) fragments.push( { textKey: "ui.common.list_template_many_delimiter" } );
					fragments.push( { textKey: "ui.common.value_simple_template", textParams: { value: list[i] } } );
				}
				fragments.push( { textKey: "ui.common.list_template_many_end" });
			}

			return { textFragments: fragments };
		},

		selectTextParam: function (rand, key, num, options, isOptional) {
			let selection = [];

			for (let i = 0; i < num; i++) {
				let sel = TextConstants.pickRandomParam(rand, options, selection);
				if (sel) {
					selection.push(sel);
				} else if (!isOptional) {
					log.w("could not select valid [" + key + "] " + (i+1) + "/" + num);
					log.w(options);
				}
			}
			return selection;
		},

		pickRandomParam: function (rand, options, excluded) {
			if (!options || options.length <= 0) return "";
			let validOptions = options.filter(option => !excluded.includes(option));
			if (validOptions.length == 0) return "";
			let i = rand % validOptions.length;
			return validOptions[i];
		},
	};
	
	function initWaymarkTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		var t_R = SectorConstants.SECTOR_TYPE_RESIDENTIAL;
		var t_I = SectorConstants.SECTOR_TYPE_INDUSTRIAL;
		var t_M = SectorConstants.SECTOR_TYPE_MAINTENANCE;
		var t_C = SectorConstants.SECTOR_TYPE_COMMERCIAL;
		var t_P = SectorConstants.SECTOR_TYPE_PUBLIC;
		
		let wt_CL = SectorConstants.WAYMARK_TYPE_CLINIC;
		let wt_CM = SectorConstants.WAYMARK_TYPE_CAMP;
		let wt_DS = SectorConstants.WAYMARK_TYPE_DISTRICT;
		let wt_PO = SectorConstants.WAYMARK_TYPE_POLLUTION;
		let wt_PS = SectorConstants.WAYMARK_TYPE_PASSAGE;
		let wt_RD = SectorConstants.WAYMARK_TYPE_RADIATION;
		let wt_SS = SectorConstants.WAYMARK_TYPE_SETTLEMENT;
		let wt_WW = SectorConstants.WAYMARK_TYPE_SPRING;
		
		// brackets for values like building density, wear, damage
		let b0 = [0, 1];
		let b12 = [0, 6];
		let b22 = [5, -1];
		
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "A wall by a corridor leading {direction} has been painted with a big {n-target} symbol");
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "There is a graffiti with the word {n-target} and an arrow pointing {direction}");
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "There is a small sign for a {n-target} pointing {direction}");
		DescriptionMapper.add("waymark", { sectorType: wildcard }, "There are a few worn posters indicating there is {n-target} to the {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_CL }, "Someone has put up a sign pointing to {a} {n-target} to the {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_CM }, "You spot a few graffiti with arrows pointing {direction} and words like 'safe' and 'shelter'");
		DescriptionMapper.add("waymark", { waymarkType: wt_CM }, "Graffiti pointing towards {direction} promises shelter");
		DescriptionMapper.add("waymark", { waymarkType: wt_DS }, "An old sign points to {a} {n-district-type} district to the {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_DS }, "Official signage points to a {n-district-type} district to the {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_PO }, "There are multiple skull signs on walls when heading towards {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_PS }, "An orange emergency exit sign points {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_RD }, "There are multiple skull signs on walls when heading towards {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_SS }, "There is a metal plaque on a wall by a passage leading {direction} with the name '{n-settlement-name}'");
		DescriptionMapper.add("waymark", { waymarkType: wt_WW }, "A blue arrow painted on the street is pointing {direction}");
		DescriptionMapper.add("waymark", { waymarkType: wt_WW }, "Helpful graffiti is pointing {direction} for water");
		DescriptionMapper.add("waymark", { waymarkType: wt_WW }, "Some bricks have been arranged in the shape of an arrow pointing {direction} and a crude symbol that might mean {n-target}");
		DescriptionMapper.add("waymark", { sectorType: t_C }, "A store billboard has been painted over with the an arrow pointing {direction} and the word {n-target}");
		DescriptionMapper.add("waymark", { sectorType: t_I }, "A street sign with directions has been painted over. Towards {direction} it says {n-target}");
		DescriptionMapper.add("waymark", { sectorType: t_M }, "Pipes near the ceiling have arrows painted on them. One pointing {direction} is next to a symbol for {n-target}");
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
		
		DescriptionMapper.add("book-description", { bookType: wildcard }, "A passage describing {n-topic} catches your eye.");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "A section describing {n-topic} seems interesting.");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "You learn something about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: wildcard }, "It's rather {a-bad}, but you learn something anyway.");
		
		DescriptionMapper.add("book-description", { bookLevel: l_1 }, "It gives you some insights into {n-topic}.");
		DescriptionMapper.add("book-description", { bookLevel: l_2 }, "It seems like a good source on {n-topic}.");
		DescriptionMapper.add("book-description", { bookLevel: l_3 }, "It is not easy to follow, but teaches you a lot about {n-topic}.");
		DescriptionMapper.add("book-description", { bookLevel: l_3 }, "It describes in great detail how {c-fact}");
		DescriptionMapper.add("book-description", { bookLevel: l_3 }, "It describes in great detail {n-topic}");
		
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a cook book, not much of it relevant to the ingredients available today.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is {a} {a-level} textbook on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is {a} {a-style} textbook on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is {a} {a-good} textbook on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is {a} {a-bad} textbook on {n-topic}, but you learn something new anyway.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It describes {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "There are several interesting passages about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a rather dry text on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It contains a description of {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "You learn that {c-fact}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "You find out that {c-fact}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a grammar book for the Kievan language.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "It is a grammar book for the Hansa language and its many dialects.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It is an introductory text on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It is {a} {a-bad} book on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It is a scout's handbook.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It contains some basic information about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "A description of a refining process offers clues to the kind of building materials used commonly before the Fall.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_1 }, "It contains a catalog of known animal life in the 'Dark Levels'. You recognize several.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "You notice old census data about people who are exposed daily to sunlight versus those who are not.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It contains a detailed description of a sun-based calendar system you are unfamiliar with.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "You find details about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It contains detailed information about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It is a survivor's cookbook, and contains a few useful tips.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_2 }, "It is an old book exploring the possibility of extending the City to cover oceans.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "You are spell-bound by a description of abundant plant-life on the Ground.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "There is a wealth of information about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It contains a dissertation on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It contains in-depth information about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It is an ethical inquiry into lab grown meat versus keeping animals.");
		DescriptionMapper.add("book-description", { bookType: t_S, bookLevel: l_3 }, "It explores the theoretical possibility of restarting human life outside the City, and concludes that it would be nearly impossible.");
		
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is {a} {a-level} textbook on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is {a} {a-style} textbook on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is {a} {a-good} textbook on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is {a} {a-bad} textbook on {n-topic}, but you learn something new anyway.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "There are abandoned plans of {n-object}.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It contains a detailed description of {n-object}.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "There is diagram explaining in detail how {n-object} worked.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "It is an operation manual for {n-object}.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "You learn a lot about how the {n-object}.");
		DescriptionMapper.add("book-description", { bookType: t_E }, "You learn that {c-fact}.");
		DescriptionMapper.add("book-description", { bookType: t_S }, "You find out that {c-fact}.");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_1 }, "There is an interesting diagram of {n-object}.");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_1 }, "It contains some basic information about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_2 }, "It contains many useful bits of information on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_2 }, "It contains detailed information about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_3 }, "There are technical drawings of {n-object}");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_3 }, "It contains in-depth information about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_E, bookLevel: l_3 }, "It is a legal book about the rights and obligations of robots and rules for programming their behaviour.");
		
		DescriptionMapper.add("book-description", { bookType: t_H }, "You find details about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is a rather dry text on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is {a} {a-style} overview of {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is very {a-level} introduction {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "You learn that {c-fact}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It seems that {c-fact}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "You learn about {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes the explosive urbanization that led to the formation of the City.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "There is {a} {a-style} chapter on {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "A section on {c-event} catches your eye.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "There are several references to {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is {a} very {a-good} explanation of {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is otherwise dull, but there is {a} {a-good} chapter on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is a history of Donbalism, a monotheistic religion that has been popular in the City throughout its history.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is a history of Ugurism, a fairly new religion combining bleak apocalyptic spiritualism and a worship of the City as a sentient entity.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "A reference to the \"currently uninhabited levels\" of the City offers a perspective on the pre-Fall City.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It is an old book predicting a huge population explosion in the City, driven by immigration and medical breakthroughs.");
		DescriptionMapper.add("book-description", { bookType: t_H }, "It describes the Dictatorship era, how it rose to power from the Utopia, waged war against the Western Government, and finally collapsed to rebellion.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an introductory text on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is the autobiography of a famous athlete.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It mentions {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It discusses {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It discusses the utopistic roots of the City and how it was first built and imagined.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is a biased exposition of the charitable work of a religious group.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is a Government-produced text book in the history of the City, stressing class differences and the importance of unity.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an art book featuring architecture from the earliest levels of the City, quiant with windows and ventilation and greenery.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an overview of the Karboque architecture which the author believes is unjustly unpopular because of its associations with the Dictatorship era.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_1 }, "It is an ode to the architecture of the City States.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "There is a long section about {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It is a history of the use of nuclear weapons, describing the first use by the City against a civilization outside, and then second use within the City by one City state against another.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It is a detailed exploration of {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It discusses the splintering of the original City Government into multiple City States within the City, their flourishing, war and collapse.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_2 }, "It discusses the gradual depopulation of the planet outside the City, first driven by economy, then pollution, and finally floods.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_3 }, "You a wealth of information {c-event}.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_3 }, "You a wealth of information {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_H, bookLevel: l_3 }, "You find a detailed timeline of {c-event}.");
		
		DescriptionMapper.add("book-description", { bookType: t_F }, "There is {a} {a-good} story about {c-theme}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is a tale about {c-theme}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is about {c-theme}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is story about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "A story about {c-theme} stays with you.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "You are touched by a poem about {c-theme}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It contains {a} {a-good} description of {c-theme}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is {a} {a-style} novel dealing with {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is {a} {a-style} tale about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is a very {a-style} portrayal of {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is {a} {a-style} story about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It a collection of {a-style} short stories about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F }, "It is {a} {a-style} and {a-good} story about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_1 }, "It is a children's book featuring {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_1 }, "It's a simple story about {c-theme}.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_1 }, "It seems to be aimed at school children.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_2 }, "It is a classic novel about {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_2 }, "It is a {a-style} novel about {c-theme}.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_2 }, "It is a {a-style} story set in the time of the great Rebellion.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_3 }, "It is quite a heavy book on {n-topic}.");
		DescriptionMapper.add("book-description", { bookType: t_F, bookLevel: l_3 }, "It is a {a-good} story about {c-theme}.");
	}
	
	function initNewspaperTexts() {
		var wildcard = DescriptionMapper.WILDCARD;
		
		let l_1 = 1;
		let l_2 = 2;
		let l_3 = 3;
		
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "There is an editorial about {n-topic}.");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "There is an opinion piece about {n-topic}.");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "There is a big story about {c-event}.");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "The issue revolves around {c-event}.");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "According to it, {c-fact}.");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "Contrary to rumours, {c-fact}.");
		DescriptionMapper.add("newspaper-description", { itemLevel: wildcard }, "It is a story about a settlement plagued by swarms of mechanical locusts, destroying all its stores including building materials whenever they appeared.");
		DescriptionMapper.add("newspaper-description", { itemLevel: l_2 }, "It contains supposed stories of survivors who saw the Fall, all very different.");
		DescriptionMapper.add("newspaper-description", { itemLevel: l_3 }, "There is an investigative story about {n-topic}.");
	}

    TextConstants.loadData(TextData);
	
	initWaymarkTexts();
	initBookTexts();
	initNewspaperTexts();
	
	return TextConstants;
	
});
