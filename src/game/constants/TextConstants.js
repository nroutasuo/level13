define(
['ash',
    'utils/DescriptionMapper', 'utils/TextBuilder',
    'game/constants/GameConstants', 'game/constants/WorldCreatorConstants', 'game/constants/PositionConstants', 'game/constants/MovementConstants'],
function (Ash, DescriptionMapper, TextBuilder, GameConstants, WorldCreatorConstants, PositionConstants, MovementConstants) {
    
    var TextConstants = {
        
		densityBrackets: [
			[0, 0], [1, 4], [5, 8], [9, 10]
		],
		
		repairBrackets: [
			[0, 1], [2, 4], [5, 7], [8, 10]
		],
		
        getActionName: function (baseActionID) {
            switch (baseActionID) {
                case "scout_locale_i":
                case "scout_locale_u":
                    return "Scout";
                default:
                    return baseActionID;
            }
        },
		
		getSectorDescription: function (hasVision, features) {
            var type = hasVision ? "sector-vision" : "sector-novision";
            var template = DescriptionMapper.get(type, features);
            var params = this.getSectorTextParams(features);
            return TextBuilder.build(template, params);
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
            addOptions("a-street-past", [ "well-maintained", "orderly" ]);
            addOptions("n-building", [ "building" ]);
            addOptions("n-buildings", [ "buildings" ]);
            addOptions("a-building", [ "towering", "tall", "gloomy", "abandoned", "nondescript" ]);
            addOptions("an-decos", [ "stranded benches", "broken elevators" ]);
            // - sector type: determines n-sector and affects many others
            switch (features.sectorType) {
                case WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL:
                    addOptions("n-sector", [ "apartment complex" ]);
                    addOptions("a-street-past", [ "beautiful", "calm" ]);
                    addOptions("n-building", [ "residential tower" ]);
                    addOptions("n-buildings", [ "residential towers", "apartments" ]);
                    addOptions("a-building", [ "silent" ]);
                    break;
                case WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL:
                    addOptions("n-sector", [ "industrial complex" ]);
                    addOptions("a-street-past", [ "high-security" ]);
                    addOptions("n-building", [ "power plant", "factory", "storehouse", "workshop" ]);
                    addOptions("n-buildings", [ "factories", "workshops", "storehouses" ]);
                    addOptions("a-building", [ "decommissioned" ]);
                    addOptions("an-items", [ "broken machinery" ]);
                    break;
                case WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE:
                    addOptions("n-sector", [ "transport hall", "maintenance area", "transport hub" ]);
                    addOptions("a-street-past", [ "efficient" ]);
                    addOptions("n-building", [ "maintenace hub", "cable car station", "utility building" ]);
                    addOptions("n-buildings", [ "utility buildings", "data centers", "control rooms" ]);
                    addOptions("a-building", [ "decommissioned", "inaccessible" ]);
                    addOptions("an-decos", [ "broken pipes", "broken trams" ]);
                    addOptions("an-items", [ "electrical wiring" ]);
                    break;
                case WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL:
                    addOptions("n-sector", [ "shopping mall", "shopping center", "office complex" ]);
                    addOptions("a-street-past", [ "glamorous", "buzzling" ]);
                    addOptions("n-building", [ "shopping center", "department store", "office building" ]);
                    addOptions("n-buildings", [ "shopping towers", "shopping malls", "shops", "stores", "offices" ]);
                    addOptions("a-building", [ "empty", "deserted" ]);
                    addOptions("an-decos", [ "empty fountains", "abandoned stalls" ]);
                    addOptions("an-items", [ "broken glass" ]);
                    break;
                case WorldCreatorConstants.SECTOR_TYPE_PUBLIC:
                    addOptions("n-sector", ["prison complex", "amusement park", "library"]);
                    addOptions("a-street-past", [ "leisurely" ]);
                    addOptions("n-building", [ "library", "prison", "school", "university", "park", "public square", "sports field", "metro station", "research laboratory", "government building" ]);
                    addOptions("n-buildings", [ "public buildings", "government buildings" ]);
                    addOptions("a-building", [ "empty", "inaccessible" ]);
                    addOptions("an-decos", [ "withered trees" ]);
                    addOptions("an-items", [ "research samples" ]);
                    break;
                case WorldCreatorConstants.SECTOR_TYPE_SLUM:
                    addOptions("n-sector", [ "shanty town", "landfill site" ]);
                    addOptions("a-street-past", [ "gloomy" ]);
                    addOptions("n-building", [ "apartment building" ]);
                    addOptions("a-building", [ "abandoned" ]);
                    addOptions("an-decos", [ "collapsed shacks", "garbage piles" ]);
                    addOptions("an-items", [ "rusted pipes" ]);
                    break;
            }
            // - building density: affects n-street and a-street
            if (features.buildingDensity < this.densityBrackets[0][1]) {
                addOptions("n-street", ["sector", "space", "square" ]);
                addOptions("a-street", ["wide", "spacious" ]);
            } else if (features.buildingDensity < this.densityBrackets[1][1]) {
                addOptions("n-street", [ "throughfare", "square", "boulevard", "space", "area", "hall" ]);
                addOptions("a-street", ["wide", "spacious" ]);
            } else if (features.buildingDensity < this.densityBrackets[2][1]) {
                addOptions("n-street", [ "street", "alley", "throughfare", "complex", "sector" ]);
                addOptions("a-street", ["wide", "narrow" ]);
            } else {
                addOptions("n-street", [ "corridor", "passage", "alley" ]);
                addOptions("a-street", ["narrow", "cramped", "dense", "low" ]);
            }
            
            // 2) Build final result by selecting from options
            var result = {};
            var rand = (features.buildingDensity + features.stateOfRepair) / 20;
            var pickRandom = function (options, excluded) {
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
                        log.w("could not select valid " + key + " " + (i+1) + "/" + num);
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
            
            log.i("text params:");
            log.i(result);
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
                            return "There is a massive sinkhole here. A street is visible below, dizzyingly far away.";
                        else
                            return "There is a massive sinkhole here. Only vast emptiness is visible below.";
                    }
                case MovementConstants.PASSAGE_TYPE_BLOCKED:
                    return "There seems to have been a staircase here once but it has been destroyed beyond repair.";
                default:
                    return "There used to be " + TextConstants.addArticle(passageVO.name.toLowerCase()) + " here.";
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
                            return "A brand new " + makeHighlight("elevator " + directionName) + " has been built here.";
                        } else {
                            return "There is a " + makeHighlight("hole") + " in the level " + (direction === PositionConstants.DIRECTION_UP ? "ceiling" : "floor") + " here.";
                        }
                    default:
                        var name = passageVO.name.toLowerCase() + " " + directionName;
                        var article = TextConstants.getArticle(name);
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
                        return "There is " + span + " here, " + state + ".";
                }
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
		
		getLocaleName: function (locale, sectorRepair, isShort) {
			var repairBracket = this.getRepairBracket(sectorRepair);
			switch (locale.type) {
			case localeTypes.factory:
                if (isShort) return "Factory";
				if (repairBracket === this.repairBrackets[0][0]) return "Ruined factory" ;
				if (repairBracket === this.repairBrackets[1][0]) return "Abandoned factory";
				if (repairBracket === this.repairBrackets[2][0]) return "Abandoned factory";
				return "Empty factory";
			case localeTypes.house:
                if (isShort) return "House";
				if (repairBracket === this.repairBrackets[0][0]) return "Ruined house";
				if (repairBracket === this.repairBrackets[1][0]) return "Decaying house";
				if (repairBracket === this.repairBrackets[2][0]) return "Neglected house";
				return "Empty house";
			case localeTypes.lab:
                if (isShort) return "Facility";
				if (repairBracket < this.repairBrackets[0][2]) return "Ruined Laborathory";
				return "Abandoned lab";
			case localeTypes.grove:
                if (isShort) return "Grove";
				return "Flourishing grove";
			case localeTypes.market:
                if (isShort) return "Building";
				if (repairBracket === this.repairBrackets[0][0]) return "Ruined market";
				if (repairBracket === this.repairBrackets[1][0]) return "Abandoned shop";
				if (repairBracket === this.repairBrackets[2][0]) return "Abandoned mall";
				return "Silent shopping tower";
			case localeTypes.maintenance:
                if (isShort) return "Facility";
				if (repairBracket === this.repairBrackets[0][0]) return "Old water tower";
				if (repairBracket === this.repairBrackets[1][0]) return "Defunct control unit";
				if (repairBracket === this.repairBrackets[2][0]) return "Ancient network switch";
				return "Electric box";
			case localeTypes.transport:
                if (isShort) return "Station";
				if (repairBracket === this.repairBrackets[0][0]) return "Ruined train depot";
				if (repairBracket === this.repairBrackets[1][0]) return "Rotting cable car station";
				if (repairBracket === this.repairBrackets[2][0]) return "Abandoned train station";
				return "Empty tram depot";
			case localeTypes.sewer:
                if (isShort) return "Sewer";
				if (repairBracket === this.repairBrackets[0][0]) return "Wrecked sewer";
				return "Quiet sewer";
			case localeTypes.warehouse:
                if (isShort) return "Warehouse";
				if (repairBracket === this.repairBrackets[0][0]) return "Warehouse ruin";
				if (repairBracket === this.repairBrackets[1][0]) return "Decaying warehouse";
				if (repairBracket === this.repairBrackets[2][0]) return "Abandoned warehouse";
				return "Sturdy warehouse";
			case localeTypes.camp:
            case localeTypes.tradingpartner:
                return isShort ? "Camp" : "Foreign camp";
			case localeTypes.hut:
			case localeTypes.hermit:
                return isShort ? "Hut" : "Lone hut";
			case localeTypes.caravan: return isShort ? "Caravan" : "Trade caravan";
			default: return "Building";
			}
		},
		
		getWorkshopName: function (resource) {
			switch (resource) {
                    case resourceNames.fuel: return "refinery";
                    case resourceNames.rubber: return "plantation";
                    default: return "workshop";
			}
		},
		
		getSpringName: function (featuresComponent) {
			if (featuresComponent.stateOfRepair < 4) {
				return "leaking water pipe";
			}
			switch (featuresComponent.sectorType) {
				case WorldCreatorConstants.SECTOR_TYPE_SLUM:
					return "well";
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
        
        getMovementBlockerName: function (blockerVO, enemiesComponent) {
			switch (blockerVO.type) {
                case MovementConstants.BLOCKER_TYPE_GANG:
                    var groupNoun = this.getEnemyGroupNoun(enemiesComponent.possibleEnemies);
                    var enemyNoun = this.getEnemyNoun(enemiesComponent.possibleEnemies);
                    return groupNoun + " of " + enemyNoun;
                default:
                    return blockerVO.name;
            }
            return "";
        },
        
        getMovementBlockerAction: function (blockerVO, enemiesComponent) {
			switch (blockerVO.type) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "Bridge gap";
				case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC: return "Clear waste";
				case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE: return "Clear waste";
				case MovementConstants.BLOCKER_TYPE_GANG: return "Fight " + this.getEnemyNoun(enemiesComponent.possibleEnemies);
	 	 	}
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

		getRepairBracket: function (repair) {
			for (var r = 0; r < this.repairBrackets.length; r++) {
				var repairBracket = this.repairBrackets[r];
				if (repair >= repairBracket[0] && repair <= repairBracket[1]) {
					repair = repairBracket[0];
					break;
				}
			}
			return repair;
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
				return this.pluralify(validDetail);
			} else if (validWords.length > 0) {
				return validWords[0];
			} else if (allowSeveral && minimumWords.length > 1) {
				return minimumWords[0] + " and " + minimumWords[1];
			} else {
				return defaultWord;
			}
		},
		
		pluralify: function (s) {
			if (s.endsWith("roach")) {
				return s + "es";
			} else if (s[s.length - 1] !== "s") {
				return s + "s";
			} else {
				return s;
			}
		},
		
		depluralify: function (s) {
			return s.substr(0, s.length - 1);
		},
		
		addArticle: function (s) {
            return this.getArticle(s) + " " + s;
		},
        
        getArticle: function (s) {
            switch (s.trim().charAt(0).toLowerCase()) {
                case "a":
                case "i":
                case "e":
                case "o":
                // u is often ambiguous use "a" until adding a fancier rule
                    return "an";
                default:
                    return "a";
            }
        },
		
		capitalize: function (string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		}
	};
		
	function initSectorTexts() {
        var wildcard = DescriptionMapper.WILDCARD;
        var d0 = TextConstants.densityBrackets[0];
        var d1 = TextConstants.densityBrackets[1];
        var d2 = TextConstants.densityBrackets[2];
        var d3 = TextConstants.densityBrackets[3];
        var r0 = TextConstants.repairBrackets[0];
        var r1 = TextConstants.repairBrackets[1];
        var r2 = TextConstants.repairBrackets[2];
        var r3 = TextConstants.repairBrackets[3];
        
        var t_R = WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL;
        var t_I = WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL;
        var t_M = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE;
        var t_C = WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL;
        var t_P = WorldCreatorConstants.SECTOR_TYPE_PUBLIC;
        var t_S = WorldCreatorConstants.SECTOR_TYPE_SLUM;
        
        // visible descriptions
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r0 }, "There used to be homes here, but there isn't much left except for ruins");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r1, buildingDensity: d1 }, "There used to be a few homes here, but they have not been repaired in a long time");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r1, buildingDensity: d2 }, "A crumbling street lined with what were once some kind of apartments");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r1, buildingDensity: d3 }, "A dense corridor lined so closely with crumling apartment towers that there is barely enough space to walk");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r2, buildingDensity: d1 }, "A quiet square surrounded by abandoned apartments");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r2, buildingDensity: d2 }, "A quiet residential area lined with slowly decaying apartment towers");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r2, buildingDensity: d3 }, "A narrow, forgotten corridor running between two tall residential towers, with barely enough space to walk");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r3, buildingDensity: d1 }, "A square surrounded by nice-looking apartments that look almost like someone could still be living there");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r3, buildingDensity: d2 }, "A quiet street between tall apartment towers, lined with withered-looking trees that until recently thrived in artificial light");
        DescriptionMapper.add("sector-vision", { sectorType: t_R, stateOfRepair: r3, buildingDensity: d3 }, "A narrow corridor running between two huge apartment towers, with barely enough space to walk");
        
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r0, buildingDensity: d1 }, "A few large unidentifiable ruins loom over a gloomy industrial square");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r0, buildingDensity: d2 }, "A former industrial sector where factories and workshops lie in ruins");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r0, buildingDensity: d3 }, "A dense corridor lined so closely with crumling industrial ruins that there is barely enough space to walk");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r1, buildingDensity: d1 }, "A wide square with a ruined factory on one side and what looks like the remains of an old storehouse on the other");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r1, buildingDensity: d2 }, "A wide square with a desolate factory on one side and what looks like the remains of an old storehouse on the other");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r1, buildingDensity: d3 }, "A narrow corridor between two vast decaying factories with barely enough space to fit through");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r2, buildingDensity: d1 }, "A wide square with a abandoned factory on one side and a few old storehouses on the other");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r2, buildingDensity: d2 }, "A low street surrounded by old factories and industrial buildings");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r2, buildingDensity: d3 }, "Some sort of a maintenance corridor between two vast manufacturing facilities with barely enough space to walk");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r3, buildingDensity: d1 }, "A wide square with quiet manufacturing facilities on each side");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r3, buildingDensity: d2 }, "An industrial street surrounded by factories and warehouses");
        DescriptionMapper.add("sector-vision", { sectorType: t_I, stateOfRepair: r3, buildingDensity: d3 }, "A narrow street with towering, high-security automated factory units on each side");
        
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r0, buildingDensity: d1 }, "A mostly empty and desolate square with the remains of some broken cable systems criss-crossing the low ceiling");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r0, buildingDensity: d2 }, "A desolate corridor criss-crossed with the remains of broken cable systems and maintenance ducts");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r0, buildingDensity: d3 }, "A dense corridor lined with broken maintenance ducts and cables");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r1, buildingDensity: d1 }, "A mostly empty square with of the remains of old cable systems hanging from the low ceiling");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r1, buildingDensity: d2 }, "A crumbling street behind a maintenance center, the low ceiling criss-crossed by old wires and ducts");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r1, buildingDensity: d3 }, "A dense corridor lined with broken maintenance ducts and cables");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r2, buildingDensity: d1 }, "A spacious square with a control room in the middle and old cable system lines disappearing in every direction");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r2, buildingDensity: d2 }, "A narrow street lined by decommissioned control units for City services like water, electricity, air filtering and robotics");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r2, buildingDensity: d3 }, "A dense corridor lined with broken maintenance ducts and cables");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r3, buildingDensity: d1 }, "A transport hall dominated by well-maintained cable car lines and empty taxi lanes criss-crossing just above your head");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r3, buildingDensity: d2 }, "Once well-maintained transport hall with a few broken elevators and an empty cable car station");
        DescriptionMapper.add("sector-vision", { sectorType: t_M, stateOfRepair: r3, buildingDensity: d3 }, "A dense corridor lined with maintenance ducts and cables");
        
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r0, buildingDensity: d1 }, "It seems this used to be a market square of some sort, but there isn't much left except for ruins");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r0, buildingDensity: d2 }, "It seems there used to be shops and markets here, but there isn't much left except for ruins");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r0, buildingDensity: d3 }, "An deserted corridor lined with the remains of shops and workshops");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r1, buildingDensity: d1 }, "An abandoned market square lined with the remains of shops and empty, silent billboards");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r1, buildingDensity: d2 }, "A desolate shopping street with remains of various shops and cafés");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r1, buildingDensity: d3 }, "A tight corridor between two vast and decaying shopping towers");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r2, buildingDensity: d1 }, "A quiet market square lined with the deserted shops and empty, silent billboards");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r2, buildingDensity: d2 }, "A street lined with abandoned shops");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r2, buildingDensity: d3 }, "A narrow passage between two shopping malls");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r3, buildingDensity: d1 }, "A wide market square lined with commercial towers whose walls are covered in dead black screens");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r3, buildingDensity: d2 }, "Old shopping street, long-since abandoned, but still retaining an atmosphere of abundance");
        DescriptionMapper.add("sector-vision", { sectorType: t_C, stateOfRepair: r3, buildingDensity: d3 }, "A narrow passage between two shopping malls");
        
        DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: d1 }, "An open space that looks like it might have once been dedicated to a sport of some kind.");
        DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: d2 }, "A street with some stranded benches and nondescript buildings.");
        DescriptionMapper.add("sector-vision", { sectorType: t_P, buildingDensity: d3 }, "A street dominated by huge building that looks like it was once a public facility of some kind.");
        
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r0, buildingDensity: d1 }, "It seems like once a few people lived here, but there is nothing left but ruins");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r0, buildingDensity: d2 }, "It seems like this place was last used as a make-shift residential area, but there is nothing left but ruins");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r0, buildingDensity: d3 }, "A corridor lined so closely with crumling, long abandoned shacks that there is barely enough space to walk");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r1, buildingDensity: d1 }, "There are some make-shift shacks against the walls here, but they have not been inhabited in a long time");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r1, buildingDensity: d2 }, "A narrow slum street surrounded (and in some parts, covered) by make-shift dwellings that have been adandoned for some time");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r1, buildingDensity: d3 }, "A filthy corridor packed so full of long-abandoned dark-dweller shacks that there is barely enough space to pass through");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r2, buildingDensity: d1 }, "A wide square surrounded by desolate make-shift residential towers that don't seem to have ever been connected to the grid");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r2, buildingDensity: d2 }, "A narrow slum street surrounded (and in some parts, covered) by make-shift dwellings");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r2, buildingDensity: d3 }, "A filthy corridor packed so full of abandoned dark-dweller shacks that there is barely enough space to pass through");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r3, buildingDensity: d1 }, "A wide square whose walls support a few make-shift shacks");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r3, buildingDensity: d2 }, "A recently inhabited slum so packed with shacks that there is barely enough space to pass through");
        DescriptionMapper.add("sector-vision", { sectorType: t_S, stateOfRepair: r3, buildingDensity: d3 }, "A narrow street that surrounded (and in some parts, covered) by recent slum-dwellings");
        
        DescriptionMapper.add("sector-vision", { sectorType: wildcard, stateOfRepair: r0, buildingDensity: d3 }, "A dense corridor lined so closely with crumbling ruins that there is barely enough space to walk");
        DescriptionMapper.add("sector-vision", { sectorType: wildcard, stateOfRepair: r0, buildingDensity: wildcard }, "Nothing but ruins and debris here. It's hard to say what this area used to be for");
        DescriptionMapper.add("sector-vision", { sectorType: wildcard, stateOfRepair: wildcard, buildingDensity: d0 }, "A rare empty space inside the City; there is no floor or walls, no buildings, nothing");
        DescriptionMapper.add("sector-vision", {}, "");
        
        // descriptions when player has no vision (lamp/sunglasses)
        DescriptionMapper.add("sector-novision", { buildingDensity: d0 }, "A rare empty space inside the City; there is no floor or walls, no buildings, nothing. Only vast empty darkness");
        DescriptionMapper.add("sector-novision", { buildingDensity: d1 }, "A wide street or corridor. It's hard to find anything in the vast darkness");
        DescriptionMapper.add("sector-novision", { buildingDensity: d1, stateOfRepair: r0 }, "A wide street or corridor that doesn't seem to be in very good repair. It's hard to find anything in the vast darkness");
        DescriptionMapper.add("sector-novision", { buildingDensity: d1, stateOfRepair: r1 }, "A wide street or corridor that doesn't seem to be in very good repair. It's hard to find anything in the vast darkness");
        DescriptionMapper.add("sector-novision", { buildingDensity: d2}, "A street or corridor with an abandoned air. Details fade in the darkness");
        DescriptionMapper.add("sector-novision", { buildingDensity: d2, stateOfRepair: r0 }, "A street or corridor with several buildings. In the darkness it's hard to say what they are");
        DescriptionMapper.add("sector-novision", { buildingDensity: d2, stateOfRepair: r1 }, "A street or corridor with several buildings. In the darkness it's hard to say what they are");
        DescriptionMapper.add("sector-novision", { buildingDensity: d3}, "A dense corridor with barely enough space to walk. You feel your way in the darkness");
        DescriptionMapper.add("sector-novision", { buildingDensity: d3, stateOfRepair: r0 }, "A dense corridor with barely enough space to walk and plenty of sharp edges, uneven paths and crumbled walls. You feel your way in the darkness");
        DescriptionMapper.add("sector-novision", { buildingDensity: d3, stateOfRepair: r1 }, "A dense corridor with barely enough space to walk and plenty of sharp edges, uneven paths and crumbled walls. You feel your way in the darkness");
        DescriptionMapper.add("sector-novision", {}, "A space inside the city, hidden in the darkness");
    }
    
    initSectorTexts();
    
    return TextConstants;
    
});
