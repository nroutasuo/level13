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
	'game/constants/PositionConstants',
	'game/constants/MovementConstants',
	'game/constants/UpgradeConstants',
	'game/constants/TradeConstants',
	'game/constants/WorldConstants',
],
function (Ash, TextData, ArrayUtils, MathUtils, ObjectUtils, DescriptionMapper, Text, TextBuilder, GameConstants, CampConstants, EnemyConstants, ItemConstants, SectorConstants, PositionConstants, MovementConstants, UpgradeConstants, TradeConstants, WorldConstants) {
	
	let TextConstants = {

		params: {},

		loadData: function (data) {
			this.loadDescriptionData("cache-evidence-intro", data["cache-evidence-intro"]);
			this.loadDescriptionData("cache-evidence-message", data["cache-evidence-message"]);
			this.loadDescriptionData("cache-insight-message", data["cache-insight-message"]);
			this.loadDescriptionData("cache-rumours-intro", data["cache-rumours-intro"]);
			this.loadDescriptionData("cache-rumours-message", data["cache-rumours-message"]);
			this.loadDescriptionData("sector-description", data["sector-description"]);
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

					let values = typeof entry.text === "string" ? [ entry.text ] : entry.text;

					for (let j in values) {
						let text = values[j];
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

		getTextKeyWithFallback: function (key, fallback) {
			if (Text.hasKey(key)) return key;
			if (fallback && Text.hasKey(fallback)) return fallback;
			let keyStripped = key.replace(/_\d+/, "")
			if (Text.hasKey(keyStripped)) return keyStripped;
			let fallbackStripped = fallback ? fallback.replace(/_\d+/, "") : null;
			if (fallbackStripped && Text.hasKey(fallbackStripped)) return fallbackStripped;
			return fallback || key;
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
			// - adjective like sectortype but type is from district
			result["a-districttype"] = selectFromOptions("a-districttype", 1);
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

			// a-districttype
			addOptions("a-districttype", true, [ features.districtType ]);

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
		
		getPassageFoundMessageKey: function (passageVO, direction, sunlit, isBuilt) {			
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
			
			let textFragments = [];
			textFragments.push({ rawText: TextBuilder.build(DescriptionMapper.get("cache-evidence-intro", features), params) });
			textFragments.push({ rawText: TextBuilder.build(DescriptionMapper.get("cache-evidence-message", features), params) });
			let textVO = { textFragments: textFragments, delimiter: "ui.common.sentence_separator" }
			return Text.compose(textVO);
		},
		
		getBookTextParams: function (features, storyFlags) {
			let names = [ "a-level", "a-style", "a-good", "a-bad", "n-topic" ];
			if (features.bookType == ItemConstants.bookTypes.engineering) names.push("n-object");
			if (features.bookType == ItemConstants.bookTypes.history) names.push("c-event");
			if (features.bookType == ItemConstants.bookTypes.fiction) names.push("a-genre");
			if (features.bookType == ItemConstants.bookTypes.fiction) names.push("c-theme");
			if (features.bookType == ItemConstants.bookTypes.fiction) names.push("c-setting");
			if (features.bookType != ItemConstants.bookTypes.fiction) names.push("c-fact");
			
			return this.getRandomDescriptionParams("cache-evidence-message", features, names);
		},
		
		getReadNewspaperMessage: function (itemVO) {
			let features = {};
			let itemName = ItemConstants.getItemDisplayName(itemVO);
			features.itemName = itemName;
			features.itemLevel = itemVO.level || 1;
			features.randomSeed = itemVO.itemID;

			let params = this.getNewspaperTextParams(features);
			
			let textFragments = [];
			textFragments.push({ rawText: TextBuilder.build(DescriptionMapper.get("cache-rumours-intro", features), params) });
			textFragments.push({ rawText: TextBuilder.build(DescriptionMapper.get("cache-rumours-message", features), params) });
			let textVO = { textFragments: textFragments, delimiter: "ui.common.sentence_separator" }
			return Text.compose(textVO);
		},
		
		getNewspaperTextParams: function (features) {
			return this.getRandomDescriptionParams("cache-rumours-message", features, [ "c-event", "n-topic", "c-fact" ]);
		},
		
		getDonateSeedsMessage: function (itemVO) {
			return "ui.inventory.donate_seed_message";
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
			return this.getRandomDescriptionParams("cache-insight-message", features, [ "n-topic", "a-area" ]);
		},

		getRandomDescriptionParams: function (type, features, params) {
			let options = this.getPossibleDescriptionParams(type, features);
			let rand = MathUtils.randomIntBetween(0, 100);
			
			let selectFromOptions = function (key, num) {
				return TextConstants.selectTextParam(rand, key, num, options[key]);
			};

			let result = {};
			for (let i = 0; i < params.length; i++) {
				let name = params[i];
				result[name] = selectFromOptions(name, 1);
			}
			
			return result;
		},

		getPossibleDescriptionParams: function (type, features) {
			let options = {}; // param (string) -> possible values (list of string)
			
			let addOptions = function (param, condition, values) {
				if (!condition) return;
				if (!options[param]) options[param] = [];
				for (let i = 0; i < values.length; i++) {
					options[param].push(values[i]);
				}
			};

			let params = this.params[type];

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

		getSectorStyleDisplayName: function (sectorStyle) {
			return Text.t("world.city.sector_style_" + sectorStyle.replace("-", "_") + "_name");
		},

		getSectorTypeDisplayName: function (sectorType) {
			return Text.t("world.city.sector_type_" + sectorType + "_name");
		},

		getHazrdDisplayNameNoun: function (hazardType) {
			return Text.t("game.hazards." + hazardType + "_name");
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

    TextConstants.loadData(TextData);
	
	initWaymarkTexts();
	
	return TextConstants;
	
});
