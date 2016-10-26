// Singleton with helper methods for level entities
define([
    'ash',
    'game/constants/LocaleConstants',
    'game/constants/PositionConstants',
    'game/constants/MovementConstants',
    'game/constants/SectorConstants',
    'game/nodes/LevelNode',
    'game/nodes/sector/SectorNode',
    'game/components/common/PositionComponent',
    'game/components/common/RevealedComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/components/level/LevelPassagesComponent',
    'game/vos/LevelProjectVO',
    'game/vos/ImprovementVO',
], function (
	Ash,
	LocaleConstants,
	PositionConstants,
	MovementConstants,
	SectorConstants,
	LevelNode, SectorNode,
	PositionComponent,
    RevealedComponent,
	SectorStatusComponent,
	SectorLocalesComponent,
	SectorFeaturesComponent,
	SectorControlComponent,
	PassagesComponent,
	WorkshopComponent,
	LevelPassagesComponent,
	LevelProjectVO,
	ImprovementVO
) {
    var LevelHelper = Ash.Class.extend({
        
		engine: null,
		levelNodes: null,
		sectorNodes: null,
        
        sectorEntitiesByPosition: {}, // int (level) -> int (x) -> int (y) -> entity
        sectorEntitiesByLevel: {}, // int (level) -> []
		
		playerActionsHelper: null,
		
		constructor: function (engine, gameState, playerActionsHelper) {
			this.engine = engine;
			this.gameState = gameState;
			this.playerActionsHelper = playerActionsHelper;
			this.levelNodes = engine.getNodeList(LevelNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
		},
		
		getLevelEntityForSector: function (sectorEntity) {
			var levelPosition;
			var sectorPosition = sectorEntity.get(PositionComponent);
			for (var node = this.levelNodes.head; node; node = node.next) {
				levelPosition = node.entity.get(PositionComponent);
				if (levelPosition.level === sectorPosition.level) return node.entity;
			}
			console.log("WARN: No level entity found for sector with position " + sectorPosition);
			return null;
		},
		
		getLevelEntityForPosition: function (level) {
			var levelPosition;
			for (var node = this.levelNodes.head; node; node = node.next) {
				levelPosition = node.entity.get(PositionComponent);
				if (levelPosition.level === level) return node.entity;
			}
			return null;
		},
		
		getSectorByPosition: function (level, sectorX, sectorY) {
			var sectorPosition;
            
            // TODO check if saving uses up too much memory / this is the neatest way, speeds up fps a lot (esp for map)
            
            if (!this.sectorEntitiesByPosition[level]) this.sectorEntitiesByPosition[level] = {};
            if (!this.sectorEntitiesByPosition[level][sectorX]) this.sectorEntitiesByPosition[level][sectorX] = {};
            
            if (this.sectorEntitiesByPosition[level][sectorX][sectorY]) return this.sectorEntitiesByPosition[level][sectorX][sectorY];
            
            if (this.sectorEntitiesByPosition[level][sectorX][sectorY] === null) return null;
            
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level === level && sectorPosition.sectorX === sectorX && sectorPosition.sectorY === sectorY) {
                    this.sectorEntitiesByPosition[level][sectorX][sectorY] = node.entity;
                    return node.entity;
                }
			}
            
            this.sectorEntitiesByPosition[level][sectorX][sectorY] = null;
            
			return null;
		},
		
		getAvailableProjectsForCamp: function (sectorEntity, playerActions) {
			var projects = [];
			
			// use to get projects only for that level: (now displaying all available projects in all camps)
			// var campLevelEntity = this.getLevelEntityForSector(sectorEntity);
			
			// get all levels
			for (var node = this.levelNodes.head; node; node = node.next) {
				projects = projects.concat(this.getAvailableProjectsForLevel(node.entity));
			}
			
			// sort by level ordinal
			var gameState = this.gameState;
			projects.sort(function (a, b) {
				var levelOrdinalA = gameState.getLevelOrdinal(a.level);
				var levelOrdinalB = gameState.getLevelOrdinal(b.level);
				return levelOrdinalA - levelOrdinalB;
			});
			
			// filter duplicates (corresponding up and down)
			var projectsFiltered = [];
			var project;
			var projectExists;
			var existingProject;
			for (var i = 0; i < projects.length; i++) {
				project = projects[i];
				projectExists = false;
				for (var j = 0; j < projectsFiltered.length; j++) {
					existingProject = projectsFiltered[j];
					if (existingProject.sector === project.sector && (existingProject.level - 1 === project.level || existingProject.level + 1 === project.level)) {
						projectExists = true;
						break;
					}
				}
				if (!projectExists) projectsFiltered.push(project);
			}
			
			return projectsFiltered;
		},
        
        getLevelStats: function (level) {
            var levelStats = {};
            levelStats.totalSectors = 0;
            levelStats.countClearedSectors = 0;
            levelStats.countScoutedSectors = 0;
            levelStats.countRevealedSectors = 0;
            
            var sectorPosition;
            var statusComponent;
            var sectorStatus;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
                sectorStatus = SectorConstants.getSectorStatus(node.entity, this);
				if (sectorPosition.level !== level) continue;
                levelStats.totalSectors++;
                
                statusComponent = node.entity.get(SectorStatusComponent);
                if (sectorStatus === SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED) levelStats.countClearedSectors++;
                if (statusComponent.scouted) levelStats.countScoutedSectors++;
                if (node.entity.has(RevealedComponent)) levelStats.countRevealedSectors++;
            }
            
            levelStats.percentClearedSectors = levelStats.countClearedSectors / levelStats.totalSectors;
            levelStats.percentScoutedSectors = levelStats.countScoutedSectors / levelStats.totalSectors;
            levelStats.percentRevealedSectors = levelStats.countRevealedSectors / levelStats.totalSectors;
            
            return levelStats;
        },
		
		getAvailableProjectsForLevel: function (levelEntity) {
			var projects = [];
			var level = levelEntity.get(PositionComponent).level;
			var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
            
            this.saveSectorsForLevel(level);
            
            var sectorPosition;
			for (var i = 0; i < this.sectorEntitiesByLevel[level].length; i++) {
				sectorPosition = this.sectorEntitiesByLevel[level][i].get(PositionComponent);
				if (sectorPosition.level !== level) continue;
				projects = projects.concat(this.getAvailableProjectsForSector(this.sectorEntitiesByLevel[level][i], levelPassagesComponent));
			}
			
			return projects;
		},
        
        getAvailableProjectsForSector: function (sectorEntity, levelPassagesComponent) {
            var projects = [];
			var sectorPosition = sectorEntity.get(PositionComponent);
            var statusComponent = sectorEntity.get(SectorStatusComponent);
            var sectorPassagesComponent = sectorEntity.get(PassagesComponent);
            var levelOrdinal = this.gameState.getLevelOrdinal(sectorPosition.level);
            
            var scouted = statusComponent && statusComponent.scouted;
            if (!scouted) return projects;
            
            levelPassagesComponent = levelPassagesComponent || this.getLevelEntityForPosition(sectorPosition.level).get(LevelPassagesComponent);
            
            var improvementName = "";
            var actionName = "";
            
            // passages
            if (levelPassagesComponent.passagesUp[sectorPosition.sectorId()] && !levelPassagesComponent.passagesUpBuilt[sectorPosition.sectorId()]) {
                switch (levelPassagesComponent.passagesUp[sectorPosition.sectorId()].type) {
                    case 1:
                        improvementName = improvementNames.passageUpHole;
                        actionName = "build_out_passage_up_hole";
                        break;
                    case 2:
                        improvementName = improvementNames.passageUpElevator;
                        actionName = "build_out_passage_up_elevator";
                        break;
                    case 3:
                        improvementName = improvementNames.passageUpStairs;
                        actionName = "build_out_passage_up_stairs";
                        break;
                }
                if (this.playerActionsHelper.checkRequirements(actionName, false, sectorEntity).value > 0) {
                    actionName = actionName + "_" + levelOrdinal;
                    projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, sectorPosition, PositionConstants.DIRECTION_UP));
                }
            }
            if (levelPassagesComponent.passagesDown[sectorPosition.sectorId()] && !levelPassagesComponent.passagesDownBuilt[sectorPosition.sectorId()]) {
                switch (levelPassagesComponent.passagesDown[sectorPosition.sectorId()].type) {
                case MovementConstants.PASSAGE_TYPE_HOLE:
                    improvementName = improvementNames.passageDownHole;
                    actionName = "build_out_passage_down_hole";
                    break;
                case MovementConstants.PASSAGE_TYPE_ELEVATOR:
                    improvementName = improvementNames.passageDownElevator;
                    actionName = "build_out_passage_down_elevator";
                    break;
                case MovementConstants.PASSAGE_TYPE_STAIRWELL:
                    improvementName = improvementNames.passageDownStairs;
                    actionName = "build_out_passage_down_stairs";
                    break;
                }
                
                if (this.playerActionsHelper.checkRequirements(actionName, false, sectorEntity).value > 0) {
                    actionName = actionName + "_" + levelOrdinal;
                    projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, sectorPosition, PositionConstants.DIRECTION_DOWN));
                }
            }
            
            // bridges
            for (var i in PositionConstants.getLevelDirections()) {
                var direction = PositionConstants.getLevelDirections()[i];
                var directionBlocker = sectorPassagesComponent.getBlocker(direction);
                if (directionBlocker && directionBlocker.bridgeable) {
                    actionName = actionName + "_" + levelOrdinal;
                    projects.push(new LevelProjectVO(new ImprovementVO(improvementNames.bridge), "build_out_bridge", sectorPosition, direction));
                }
            }
            
            return projects;
        },
		
        getLevelClearedWorkshopCount: function (level, resourceName) {
			var count = 0;
            var featuresComponent;
            var sectorControlComponent;
			var workshopComponent;
            for (var node = this.sectorNodes.head; node; node = node.next) {
                if (node.entity.get(PositionComponent).level === level) {
                    featuresComponent = node.entity.get(SectorFeaturesComponent);
                    sectorControlComponent = node.entity.get(SectorControlComponent);
					workshopComponent = node.entity.get(WorkshopComponent);
                    if (workshopComponent && workshopComponent.resource === resourceName) {
                        if (sectorControlComponent && sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
                            count++;
                        }
                    }
                }
            }
            return count;
        },
		
		getSectorUnclearedWorkshopCount: function (sectorEntity) {
			var count = 0;
            var featuresComponent;
            var sectorControlComponent;
			featuresComponent = sectorEntity.get(SectorFeaturesComponent);
			sectorControlComponent = sectorEntity.get(SectorControlComponent);
			if (sectorEntity.has(WorkshopComponent)) {
				if (!sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)) {
					count++;
				}
			}
            return count;
		},
		
		isLevelUnlocked: function (level) {
			if (level === 13) return true;
			
			var levelEntity = this.getLevelEntityForPosition(level);
			if (levelEntity) {
				var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
				var passageSectors;
				if (level < 13) {
					passageSectors = Object.keys(levelPassagesComponent.passagesUpBuilt);
					for (var iu = 0; iu < passageSectors.length; iu++) {
						if (levelPassagesComponent.passagesUpBuilt[passageSectors[iu]]) return true;
					}
				}
				
				if (level > 13) {
					passageSectors = Object.keys(levelPassagesComponent.passagesDownBuilt);
					for (var id = 0; id < passageSectors.length; id++) {
						if (levelPassagesComponent.passagesDownBuilt[passageSectors[id]]) return true;
					}
				}
			}
			
			return false;
		},
		
		getLevelLocales: function (level, includeScouted, includeHard, excludeLocaleVO) {
			var locales = [];
			var sectorPosition;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level === level) {
					locales = locales.concat(this.getSectorLocales(node.entity, includeScouted, includeHard, excludeLocaleVO));
				}
			}
			return locales;
		},
		
		getSectorLocales: function (sectorEntity, includeScouted, includeHard, excludeLocaleVO) {
			var locales = [];
			var sectorLocalesComponent = sectorEntity.get(SectorLocalesComponent);
			var sectorStatus = sectorEntity.get(SectorStatusComponent);
			var locale;
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				locale = sectorLocalesComponent.locales[i];
				if (locale !== excludeLocaleVO && (includeScouted || !sectorStatus.isLocaleScouted(i)) && (includeHard || locale.isEasy))
					locales.push(locale);
			}
			return locales;
		},
		
		getSectorLocalesForPlayer: function (sectorEntity) {
			var locales = [];
			var sectorLocalesComponent = sectorEntity.get(SectorLocalesComponent);
			var sectorStatus = sectorEntity.get(SectorStatusComponent);
			var locale;
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				locale = sectorLocalesComponent.locales[i];
				var action = "scout_locale_" + locale.getCategory() + "_" + i;
				if (!sectorStatus.isLocaleScouted(i))
					if (this.playerActionsHelper.checkRequirements(action, false, sectorEntity).value >= 1)
						locales.push(locale);
			}
			return locales;
		},
		
        saveSectorsForLevel: function (level) {
            if (this.sectorEntitiesByLevel[level] && this.sectorEntitiesByLevel[level] !== null && this.sectorEntitiesByLevel[level].length > 0) {
                return;
            }            
            
            this.sectorEntitiesByLevel[level] = [];
            
            var sectorPosition;
            for (var node = this.sectorNodes.head; node; node = node.next) {
                sectorPosition = node.entity.get(PositionComponent);
                if (sectorPosition.level !== level)
                    continue;
                this.sectorEntitiesByLevel[level].push(node.entity);
            }
        }
        
    });
    
    return LevelHelper;
});