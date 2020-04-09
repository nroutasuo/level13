// debug helpers for the WorldCreator
define(['ash', 'worldcreator/WorldCreatorHelper'], function (Ash, WorldCreatorHelper) {

    var WorldCreatorDebug = {
        
        printWorldTemplate: function (worldVO) {
            var s = "";
			for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var campOrdinal = WorldCreatorHelper.getCampOrdinal(worldVO.seed, l);
                var r = 40;
                var pieces = [];
                for (var i = 0; i <= r * 2; i++) {
                    var x = i - r;
                    var piece = "-";
                    pieces[i] = piece;
                }
                for (var i = 0; i < worldVO.features.length; i++) {
                    var feature = worldVO.features[i];
                    if (!feature.spansLevel(l)) continue;
                    for (var x = feature.getMinX(); x <= feature.getMaxX(); x++) {
                        pieces[x + r] = feature.type.substring(0,1);
                    }
                }
                for (var i = 0; i < worldVO.campPositions[l].length; i++) {
                    var campPos = worldVO.campPositions[l][i];
                    pieces[campPos.sectorX + r] = campOrdinal;
                }
                s += "lvl " + l + "\t" + pieces.join("") +  "\n";
            }
            log.i(s);
        },
        
        printLevelTemplates: function (worldVO) {
            for (var i = 0; i < worldVO.levels; i++) {
                log.i(worldVO.levels[i]);
            }
        },
        
        printLevelStructure: function (worldVO) {
            for (var i = 0; i < worldVO.levels; i++) {
                log.i(worldVO, levels[i]);
            }
        },
        
        printSectorTemplates: function (worldVO) {
			for (var l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
                var levelVO = worldVO.getLevel(l);
                WorldCreatorDebug.printLevel(worldVO, levelVO);
            }
        },
		
		printWorld: function (worldVO, keys) {
			log.i("Print world, seed: " + worldVO.seed + ", attributes: " + keys)
			var print = "";
			var levelVO;
			var sectorVO;
			for (var i = worldVO.topLevel; i >= worldVO.bottomLevel; i--) {
				print += "Level " + i + "\n";
				levelVO = worldVO.levels[i];
		
				print += "\t  ";
				for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
					print += String(x).length > 1 ? String(x).substring(0, 2) : x + " ";
				}
                print += "\n";
                print += "central area: " + levelVO.centralAreaSize + ", bag size: " + levelVO.bagSize + "\n";
			
				for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
					print += y + "\t[ ";
					for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
						sectorVO = levelVO.getSector(x, y);
						if (sectorVO) {
							for (var k = 0; k < keys.length; k++) {
								var key = keys[k];
								var keySplit = key.split(".");
								if (keySplit.length === 1) {
									if (sectorVO[key] || sectorVO[key] === 0) print += sectorVO[key] + " ";
									else print += "[]";
								} else {
									if (sectorVO[keySplit[0]][keySplit[1]] || sectorVO[keySplit[0]][keySplit[1]] == 0) print += sectorVO[keySplit[0]][keySplit[1]] + " ";
									else print += "[]";
								}
							}
						} else if (levelVO.isCentral(x, y)) {
							print += ". ";
						} else {
							print += "  ";
						}
					}
					print += " ]\n";
				}
				print = print.substring(0, print.length - 1);
				print += "\n\n";
                log.i(print);
                print = "";
			}
			//log.i(print.trim());
		},
		
		printLevel: function (woldVO, levelVO) {
			log.i("Print level, seed: " + woldVO.seed + ", level: " + levelVO.level + ", total sectors: " + levelVO.sectors.length + ", bounds: " + levelVO.minX + "." + levelVO.minY + "-" + levelVO.maxX + "." + levelVO.maxY);
            log.i("central area: " + levelVO.centralAreaSize + ", bag size: " + levelVO.bagSize);
			var print = "\t";
		
			for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
				print += String(x).length > 1 ? String(x).substring(0, 2) : x + " ";
			}
		
			for (var y = levelVO.minY; y <= levelVO.maxY; y++) {
				print += "\n";
				print += y + "\t";
				for (var x = levelVO.minX; x <= levelVO.maxX; x++) {
                    var zonePoint = levelVO.getZonePoint(x, y);
					if (levelVO.hasSector(x, y)) {
                        var sectorVO = levelVO.getSector(x, y);
                        var criticalPath = sectorVO.getCriticalPathC();
                        var zone = sectorVO.getZoneC();
                        if (sectorVO.passageUp && sectorVO.passageDown)
                            print += "O ";
                        else if (sectorVO.passageUp)
                            print += "U ";
                        else if (sectorVO.passageDown)
                            print += "D ";
                        else if (sectorVO.camp)
                            print += "C ";
                        /*
                        else if (zonePoint)
                            print += "P ";
                        */
                        /*
                        else if (sectorVO.locales.length > 0)
                            print += "L ";
                        */
                        /*
                        else if (criticalPath >= 0)
                            print += criticalPath + " ";
                        */
                        else if (zone >= 0)
                            print += zone + " ";
                        else
                            print += "+ ";
					} else {
                        /*
                        if (zonePoint)
                            print += "P ";
                        else
                    */if (levelVO.isCentral(x, y))
                            print += "· ";
                       else
                            print += "  ";
                    }
				}
			}
			log.i(print);
		},
        
    };

    return WorldCreatorDebug;
});
