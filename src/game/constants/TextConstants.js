define(
['ash',
    'game/constants/GameConstants', 'game/constants/WorldCreatorConstants', 'game/constants/PositionConstants', 'game/constants/MovementConstants'],
function (Ash, GameConstants, WorldCreatorConstants, PositionConstants, MovementConstants) {

    SECTOR_TYPE_NOLIGHT = -1;
    
    var TextConstants = {
	
		densityBrackets: [
			[0, 0], [1, 4], [5, 8], [9, 10]
		],
		
		repairBrackets: [
			[0, 1], [2, 4], [5, 7], [8, 10]
		],
		
		sectorDescriptions: {
		},
        
        getActionName: function (baseActionID) {
            switch (baseActionID) {
                case "scout_locale_i":
                case "scout_locale_u":
                    return "Scout";
                default:
                    return baseActionID;
            }
        },
		
		getSectorDescription: function (hasLight, sunlit, sectorType, density, repair) {
			if (!hasLight && !sunlit) {
				sectorType = SECTOR_TYPE_NOLIGHT;
			}
			 
			var densityBracket = this.getDensityBracket(density);
			var repairBracket = this.getRepairBracket(repair);
			
			var description = this.sectorDescriptions[sectorType][densityBracket][repairBracket];
			if (description && sunlit) {
				description = description.replace("artificial light", "sunlight");
				description = description.replace("vast darkness", "vast brightness");
			}
			return description;
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
        
        /*
        There is a hole in the level ceiling here. An elevator has been built,
        /**/
        
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
				case MovementConstants.BLOCKER_TYPE_WASTE: return "Clear waste";
				case MovementConstants.BLOCKER_TYPE_GANG: return "Fight " + this.getEnemyNoun(enemiesComponent.possibleEnemies);
	 	 	}
        },
		
		getUnblockedVerb: function (blockerType) {
			switch (blockerType) {
				case MovementConstants.BLOCKER_TYPE_GAP: return "bridged";
				case MovementConstants.BLOCKER_TYPE_WASTE: return "cleared";
				case MovementConstants.BLOCKER_TYPE_GANG: return "defeated";
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return "cleared";
	 	 	}
		},
		
		getDensityBracket: function (density) {
			for (var d = 0; d < this.densityBrackets.length; d++) {
				var densityBracket = this.densityBrackets[d];
				if (density >= densityBracket[0] && density <= densityBracket[1]) {
					density = densityBracket[0];
					break;
				}
			}
			return density;
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
		var d1 = TextConstants.densityBrackets[0][0];
		var d2 = TextConstants.densityBrackets[1][0];
		var d3 = TextConstants.densityBrackets[2][0];
		var d4 = TextConstants.densityBrackets[3][0];
		var r1 = TextConstants.repairBrackets[0][0];
		var r2 = TextConstants.repairBrackets[1][0];
		var r3 = TextConstants.repairBrackets[2][0];
		var r4 = TextConstants.repairBrackets[3][0];
		
		var sectorDesc = TextConstants.sectorDescriptions;
		
		sectorDesc[SECTOR_TYPE_NOLIGHT] = {};
		sectorDesc[SECTOR_TYPE_NOLIGHT][d1] = {};
		sectorDesc[SECTOR_TYPE_NOLIGHT][d1][r1] = "A rare empty space inside the City; there is no floor or walls, no buildings, nothing. Only vast empty darkness.";
		sectorDesc[SECTOR_TYPE_NOLIGHT][d1][r2] = sectorDesc[SECTOR_TYPE_NOLIGHT][d1][r1];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d1][r3] = sectorDesc[SECTOR_TYPE_NOLIGHT][d1][r1];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d1][r4] = sectorDesc[SECTOR_TYPE_NOLIGHT][d1][r1];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d2] = {};
		sectorDesc[SECTOR_TYPE_NOLIGHT][d2][r1] = "A wide street or corridor that doesn't seem to be in very good repair. It's hard to find anything in the vast darkness.";
		sectorDesc[SECTOR_TYPE_NOLIGHT][d2][r2] = sectorDesc[SECTOR_TYPE_NOLIGHT][d2][r1];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d2][r3] = "A wide street or corridor. It's hard to find anything in the vast darkness.";
		sectorDesc[SECTOR_TYPE_NOLIGHT][d2][r4] = sectorDesc[SECTOR_TYPE_NOLIGHT][d2][r3];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d3] = {};
		sectorDesc[SECTOR_TYPE_NOLIGHT][d3][r1] = "A street or corridor with an abandoned air. Details fade in the darkness.";
		sectorDesc[SECTOR_TYPE_NOLIGHT][d3][r2] = sectorDesc[SECTOR_TYPE_NOLIGHT][d3][r1];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d3][r3] = "A street or corridor with several buildings. In the darkness it's hard to say what they are.";
		sectorDesc[SECTOR_TYPE_NOLIGHT][d3][r4] = sectorDesc[SECTOR_TYPE_NOLIGHT][d3][r3];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d4] = {};
		sectorDesc[SECTOR_TYPE_NOLIGHT][d4][r1] = "A dense corridor with barely enough space to walk and plenty of sharp edges, uneven paths and crumbled walls. You feel your way in the darkness.";
		sectorDesc[SECTOR_TYPE_NOLIGHT][d4][r2] = sectorDesc[SECTOR_TYPE_NOLIGHT][d4][r1];
		sectorDesc[SECTOR_TYPE_NOLIGHT][d4][r3] = "A dense corridor with barely enough space to walk. You feel your way in the darkness.";
		sectorDesc[SECTOR_TYPE_NOLIGHT][d4][r4] = sectorDesc[SECTOR_TYPE_NOLIGHT][d4][r3];
		
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1] = "A rare empty space inside the City; there is no floor or walls, no buildings, nothing.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r2] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r3] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r4] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d2] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d2][r1] = "There used to be homes here, but there isn't much left except for ruins.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d2][r2] = "There used to be a few homes here, but they have not been repaired in a long time.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d2][r3] = "A quiet square surrounded by abandoned apartments.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d2][r4] = "A square surrounded by nice-looking apartments that look almost like someone could still be living there.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d3] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d3][r1] = "There used to be homes here, but there isn't much left except for ruins.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d3][r2] = "A crumbling street lined with what were once some kind of apartments.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d3][r3] = "A quiet residential area lined with slowly decaying apartment towers.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d3][r4] = "A quiet street between tall apartment towers, lined with withered-looking trees that until recently thrived in artificial light.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d4] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d4][r1] = "A dense corridor lined so closely with crumling apartment towers that there is barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d4][r2] = "A narrow corridor running between two vast, crumbling residential towers, with barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d4][r3] = "A narrow, forgotten corridor running between two tall residential towers, with barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d4][r4] = "A narrow, possibly unintended corridor running between two huge apartment towers, with barely enough space to walk.";
		
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d1] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d1][r1] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d1][r2] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d1][r3] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d1][r4] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d2] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d2][r1] = "A few large unidentifiable ruins loom over a gloomy industrial square.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d2][r2] = "A wide square with a ruined factory on one side and what looks like the remains of an old storehouse on the other.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d2][r3] = "A wide square with a abandoned factory on one side and what looks like an old storehouse on the other.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d2][r4] = "A wide, spartan square with a quiet factory on one side and what looks like a storehouse on the other.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d3] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d3][r1] = "A former industrial sector where factories or workshops lie in ruins.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d3][r2] = "A street lined with ruined factories and rats dashing to avoid light.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d3][r3] = "A low street surrounded by old factories and industrial buildings.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d3][r4] = "An industrial street surrounded by factories and warehouses.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d4] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d4][r1] = "A dense corridor lined so closely with crumling industrial ruins that there is barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d4][r2] = "A narrow corridor between two vast decaying factories with barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d4][r3] = "Some sort of a maintenance corridor between two vast factories with barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL][d4][r4] = "A narrow industrial street with towering, high-security automated factory units on each side.";
		
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d1] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d1][r1] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d1][r2] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d1][r3] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d1][r4] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d2] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d2][r1] = "A mostly empty and desolate square with the remains of some broken cable systems criss-crossing the low ceiling.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d2][r2] = "A mostly empty square with of the remains of old cable systems criss-crossing the low ceiling.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d2][r3] = "A mostly empty square with a control room in the middle and old cable systems criss-crossing the low ceiling.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d2][r4] = "A transport hall dominated by well-maintained cable car lines and empty taxi lanes criss-crossing just above your head.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d3] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d3][r1] = "A desolate corridor criss-crossed with the remains of broken cable systems and maintenance ducts.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d3][r2] = "A crumbling street behind a maintenance center, the low ceiling criss-crossed by old wires and ducts.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d3][r3] = "A narrow street lined by decommissioned control units for City services like water, electricity, air filtering and robotics.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d3][r4] = "A well-maintained transport hall with a few elevators and an empty cable car station.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d4] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d4][r1] = "A dense corridor so full of broken maintenance ducts and cables that there is barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d4][r2] = "A dense corridor so full of maintenance ducts and broken cables that there is barely enough space to pass through.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d4][r3] = "A dense corridor so full of maintenance ducts and cables that there is barely enough space to pass through.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE][d4][r4] = "A narrow corridor connecting several maintenance units and control rooms so full of cables and wires that you can barely pass through.";
		
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d1] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d1][r1] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d1][r2] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d1][r3] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d1][r4] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d2] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d2][r1] = "It seems this used to be a market square of some sort, but there isn't much left except for ruins.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d2][r2] = "An abandoned market square lined with the remains of shops and empty, silent billboards.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d2][r3] = "An quiet market square lined with the deserted shops and empty, silent billboards.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d2][r4] = "A wide market square lined with commercial towers whose walls are covered in dead black screens.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d3] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d3][r1] = "It seems there used to be shops and markets here, but there isn't much left except for ruins.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d3][r2] = "An deserted corridor lined with the remains of shops and artisan's workshops.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d3][r3] = "A former shopping street lined with deserted shops and artisan's workshops.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d3][r4] = "A former shopping street lined with quiet shops and artisan's workshops.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d4] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d4][r1] = "A dense corridor lined so closely with crumling ruins that there is barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d4][r2] = "A narrow corridor between two vast and decaying shopping towers with barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d4][r3] = "A narrow corridor between two massive shopping towers with barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL][d4][r4] = "A narrow but well-maintained corridor between two massive shopping towers with barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d1] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d1][r1] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d1][r2] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d1][r3] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d1][r4] = sectorDesc[WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL][d1][r1];
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d2] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d2][r1] = "It seems like once people lived here, but there is nothing left but ruins.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d2][r2] = "There are some make-shift shacks against the walls here, but they have not been repaired in a long time.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d2][r3] = "A wide square surrounded by crumbling make-shift residential towers that don't seem to have ever been connected to the grid.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d2][r4] = "A wide square whose walls support a few make-shift shacks.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d3] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d3][r1] = "It seems like this place was last used as a make-shift residential area, but there is nothing left but ruins.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d3][r2] = "A narrow slum street surrounded (and in some parts, covered) by make-shift dwellings that have been adandoned for some time.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d3][r3] = "A narrow slum street surrounded (and in some parts, covered) by make-shift dwellings.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d3][r4] = "A narrow street that surrounded (and in some parts, covered) by recent slum-dwellings.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d4] = {};
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d4][r1] = "A corridor lined so closely with crumling, long abandoned shacks that there is barely enough space to walk.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d4][r2] = "A filthy corridor packed so full of long-abandoned dark-dweller shacks that there is barely enough space to pass through.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d4][r3] = "A filthy corridor packed so full of abandoned dark-dweller shacks that there is barely enough space to pass through.";
		sectorDesc[WorldCreatorConstants.SECTOR_TYPE_SLUM][d4][r4] = "A recently inhabited slum so packed with shacks that there is barely enough space to pass through.";
    }
    
    initSectorTexts();
    
    return TextConstants;
    
});
