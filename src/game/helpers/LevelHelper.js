// Singleton with helper methods for level entities
define([
    'ash',
    'game/constants/WorldCreatorConstants',
    'game/constants/LocaleConstants',
    'game/constants/PositionConstants',
    'game/nodes/LevelNode',
    'game/nodes/sector/SectorNode',
    'game/components/common/PositionComponent',
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
	WorldCreatorConstants,
	LocaleConstants,
	PositionConstants,
	LevelNode, SectorNode,
	PositionComponent,
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
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level === level && sectorPosition.sectorX === sectorX && sectorPosition.sectorY === sectorY) return node.entity;
			}
			return null;
		},
		
		getAvailableProjectsForCamp: function (sectorEntity, playerActions) {
			var projects = [];
			
			// use to get projects only for that level: (now displaying all available projects in all camps)
			// var campLevelEntity = this.getLevelEntityForSector(sectorEntity);
			
			// get all levels
			for (var node = this.levelNodes.head; node; node = node.next) {
				projects = projects.concat(this.getAvailableProjectsForLevel(node.entity, playerActions));
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
		
		getAvailableProjectsForLevel: function (levelEntity, playerActions) {
			var projects = [];
			var level = levelEntity.get(PositionComponent).level;
			var levelPassagesComponent = levelEntity.get(LevelPassagesComponent);
			var sectorPassagesComponent;
			var statusComponent;
			var scouted;
			var passage;
			var sectorPosition;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level !== level) continue;
				
				statusComponent = node.entity.get(SectorStatusComponent);
				sectorPassagesComponent = node.entity.get(PassagesComponent);
				scouted = statusComponent && statusComponent.scouted;
				if (scouted) {
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
						if (this.playerActionsHelper.checkRequirements(actionName, false, node.entity).value > 0)
							projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, level, sectorPosition.sectorId(), PositionConstants.DIRECTION_UP));
					}
					if (levelPassagesComponent.passagesDown[sectorPosition.sectorId()] && !levelPassagesComponent.passagesDownBuilt[sectorPosition.sectorId()]) {
						switch (levelPassagesComponent.passagesDown[sectorPosition.sectorId()].type) {
							case 1:
								improvementName = improvementNames.passageDownHole;
								actionName = "build_out_passage_down_hole";
								break;
							case 2:
								improvementName = improvementNames.passageDownElevator;
								actionName = "build_out_passage_down_elevator";
								break;
							case 3:
								improvementName = improvementNames.passageDownStairs;
								actionName = "build_out_passage_down_stairs";
								break;
						}
						if (this.playerActionsHelper.checkRequirements(actionName, false, node.entity).value > 0)
							projects.push(new LevelProjectVO(new ImprovementVO(improvementName), actionName, level, sectorPosition.sectorId(), PositionConstants.DIRECTION_DOWN));
					}
					
					// bridges
					for (var i in PositionConstants.getLevelDirections()) {
						var direction = PositionConstants.getLevelDirections()[i];
						var directionBlocker = sectorPassagesComponent.getBlocker(direction);
						if (directionBlocker && directionBlocker.bridgeable) {
							projects.push(new LevelProjectVO(new ImprovementVO(improvementNames.bridge), "build_out_bridge", level, sectorPosition.sectorId(), direction));
						}
					}
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
				
				if (level < 13) {
					for (var iu = 0; iu < levelPassagesComponent.passagesUpBuilt.length; iu++) {
						if (levelPassagesComponent.passagesUpBuilt[iu]) return true;
					}
				}
				
				if (level > 13) {
					for (var id = 0; id < levelPassagesComponent.passagesDownBuilt.length; id++) {
						if (levelPassagesComponent.passagesDownBuilt[id]) return true;
					}
				}
			}
			
			return false;
		},
		
		getLevelLocales: function (level, includeScouted, excludeLocaleVO) {
			var locales = [];
			var sectorPosition;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				sectorPosition = node.entity.get(PositionComponent);
				if (sectorPosition.level === level) {
					locales.concat(this.getSectorLocales(node.entity, includeScouted, excludeLocaleVO));
				}
			}
			return locales;
		},
		
		getSectorLocales: function (sectorEntity, includeScouted, excludeLocaleVO) {
			var locales = [];
			var sectorLocalesComponent = sectorEntity.get(SectorLocalesComponent);
			var sectorStatus = sectorEntity.get(SectorStatusComponent);
			var locale;
			for (var i = 0; i < sectorLocalesComponent.locales.length; i++) {
				locale = sectorLocalesComponent.locales[i];
				if (locale !== excludeLocaleVO && (includeScouted || !sectorStatus.isLocaleScouted(i)))
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
		}
		
    });
    
    return LevelHelper;
});