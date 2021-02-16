define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/PositionConstants',
    'game/nodes/PlayerLocationNode',
    'game/vos/TabCountsVO',
    'utils/StringUtils',
], function (Ash, GameGlobals, GlobalSignals, UIConstants, PositionConstants, PlayerLocationNode, TabCountsVO, StringUtils) {
    var UIOutProjectsSystem = Ash.System.extend({
        
        playerLocationNodes: null,

        bubbleNumber: -1,
        tabCounts: null,
        
        constructor: function () {
            this.tabCounts = new TabCountsVO();
            this.elements = {};
            this.elements.tabHeader = $("#tab-header h2");
            this.elements.bubble = $("#switch-projects .bubble");
            this.elements.hiddenImprovementsMsg = $("#in-improvements-hidden-message");
            
            var sys = this;
            $("#in-improvements-reset-hidden").click(function () {
                sys.resetHidden();
            });
            
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            
            GlobalSignals.add(this, GlobalSignals.upgradeUnlockedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.sectorScoutedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.movementBlockerClearedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
        },

        removeFromEngine: function (engine) {
            GlobalSignals.removeAll(this);
            this.engine = null;
            this.playerLocationNodes = null;
        },

        update: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
            var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.projects;
            if (!this.playerLocationNodes.head) return;
            
            this.updateBubble();
            
            if (!isActive) {
                return;
            }
            
            GameGlobals.uiFunctions.toggle("#container-in-improvements-colony", GameGlobals.endingHelper.hasUnlockedEndProject());
            
            GameGlobals.uiFunctions.toggle("#in-improvements-level-empty-message", this.tabCounts.lastShown.visible.regular <= 0);
            this.elements.tabHeader.text("Building projects");
        },
        
        slowUpdate: function () {
            this.updateAvailableProjects(false);
        },
        
        refresh: function () {
            if (GameGlobals.gameState.uiStatus.isHidden) return;
			var updateTables = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.projects;
            this.updateAvailableProjects(updateTables);
            this.updateBuiltProjects(updateTables);
        },
        
        updateBubble: function () {
            var newBubbleNumber =
                (this.tabCounts.current.available.regular - this.tabCounts.lastShown.available.regular) +
                (this.tabCounts.current.visible.regular - this.tabCounts.lastShown.visible.regular) +
                (this.tabCounts.current.available.colony - this.tabCounts.lastShown.available.colony) +
                (this.tabCounts.current.visible.colony - this.tabCounts.lastShown.visible.colony);
            if (GameGlobals.endingHelper.isReadyForLaunch())
                newBubbleNumber = 1;
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            this.elements.bubble.text(this.bubbleNumber);
            GameGlobals.uiFunctions.toggle("#switch-projects .bubble", this.bubbleNumber > 0);
        },
        
        updateAvailableProjects: function (updateTables) {
            if (!this.playerLocationNodes.head) return;
            var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.projects;
            var availableRegular = 0;
            var visibleRegular = 0;
            var hiddenRegular = 0;
            var availableColony = 0;
            var visibleColony = 0;
            var hiddenColony = 0;
            
            if (!GameGlobals.gameState.uiStatus.hiddenProjects)
                GameGlobals.gameState.uiStatus.hiddenProjects = [];
            
            this.elements.levelImprovementsTable = $("#in-improvements-level table");
            this.elements.colonyImprovementsTable = $("#in-improvements-colony table");
            
            var projects = GameGlobals.levelHelper.getAvailableProjectsForCamp(this.playerLocationNodes.head.entity);
            if (updateTables) this.elements.levelImprovementsTable.empty();
            if (updateTables) this.elements.colonyImprovementsTable.empty();
            
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                var action = project.action;
                var sectorEntity = GameGlobals.levelHelper.getSectorByPosition(project.level, project.position.sectorX, project.position.sectorY);
                var actionAvailable = GameGlobals.playerActionsHelper.checkAvailability(action, false, sectorEntity);
                var isColonyProject = project.isColonyProject();
                var projectID = project.getID();
                var isHidden = GameGlobals.gameState.uiStatus.hiddenProjects.indexOf(projectID) >= 0;
                
                if (updateTables && !isHidden) {
                    var tr = this.getProjectTR(project, true);
                    if (isColonyProject) {
                        this.elements.colonyImprovementsTable.append(tr);
                    } else {
                        this.elements.levelImprovementsTable.append(tr);
                    }
                }
                
                if (isColonyProject) {
                    if (isHidden) hiddenColony++;
                    if (!isHidden) visibleColony++;
                    if (!isHidden && actionAvailable) availableColony++;
                } else {
                    if (isHidden) hiddenRegular++;
                    if (!isHidden) visibleRegular++;
                    if (!isHidden && actionAvailable) availableRegular++;
                }
            }
            
            var sys = this;
            if (updateTables) {
                GameGlobals.uiFunctions.toggle("#container-in-improvements-level-hidden", hiddenRegular > 0);
                this.elements.hiddenImprovementsMsg.text(hiddenRegular + " projects hidden");
            
                GameGlobals.uiFunctions.registerActionButtonListeners("#in-improvements-level");
                GameGlobals.uiFunctions.registerCustomButtonListeners("#in-improvements-level", "navigation", function () {
                    var sector = $(this).attr("data-sector");
                    var position = StringUtils.getPosition(sector);
                    GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.map, position);
                });
                GameGlobals.uiFunctions.registerCustomButtonListeners("#in-improvements-level", "hide-project", function () {
                    var projectID = $(this).attr("data-project");
                    GameGlobals.gameState.uiStatus.hiddenProjects.push(projectID);
                    sys.refresh();
                });
                GameGlobals.uiFunctions.generateButtonOverlays("#in-improvements-level");
                GameGlobals.uiFunctions.generateCallouts("#in-improvements-level");
                GameGlobals.uiFunctions.registerActionButtonListeners("#in-improvements-colony");
                GameGlobals.uiFunctions.generateButtonOverlays("#in-improvements-colony");
                GameGlobals.uiFunctions.generateCallouts("#in-improvements-colony");
                GlobalSignals.elementCreatedSignal.dispatch();
            }
            
            this.tabCounts.updateCounts({ regular: visibleRegular, colony: visibleColony }, { regular: availableRegular, colony: availableColony }, isActive);
        },
        
        updateBuiltProjects: function (updateTables) {
            if (!this.playerLocationNodes.head) return;
            var projects = GameGlobals.levelHelper.getBuiltProjectsForCamp(this.playerLocationNodes.head.entity);
            
            GameGlobals.uiFunctions.toggle("#header-in-improvements-level-built", projects.length > 0);
            
            if (updateTables) $("#in-improvements-level-built table").empty();
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                if (updateTables) {
                    var tr = this.getProjectTR(project, false);
                    $("#in-improvements-level-built table").append(tr);
                }
            }
        },
        
        resetHidden: function () {
            GameGlobals.gameState.uiStatus.hiddenProjects = [];
            this.refresh();
        },
        
        getProjectTR: function (project, isAvailable) {
            var sector = project.level + "." + project.sector + "." + project.direction;
            var location = project.position.getPosition().getInGameFormat();
            var projectID = project.getID();
            
            var name = project.name;
            // TODO define building projects directions/links better and don't rely on improvement names
            name = name.replace(" Up", "");
            name = name.replace(" Down", "");
            
            var showLevel = GameGlobals.gameState.unlockedFeatures.levels;
            var info = "at " + location + " on level " + project.level;
            var isPassage = project.improvement && project.improvement.isPassage();
            if (isPassage) {
                var levels = this.getProjectLevels(project);
                info = "connecting levels <span class='hl-functionality'>" + levels[0] + "</span> and <span class='hl-functionality'>" + levels[1] + "</span> at " + location;
            }
            if (project.action == "clear_debris_e" || project.action == "clear_debris_l" || project.action == "bridge_gap") {
                var neighbourPosition = PositionConstants.getPositionOnPath(project.position.getPosition(), project.direction, 1);
                var neighbourLocation = neighbourPosition.getInGameFormat();
                info = "between " + location + " and " + neighbourLocation + " on level " + project.level;
            }
            
            var classes = this.isCurrentLevel(project) ? "current" : "";
            var mapID = "project-map-";
            var result = "<tr class='" + classes + "'>";
            result += "<td>" + name + "</td>";
            result += "<td class='list-description'>" + info + "</td>";
            if (isAvailable) {
                result += "<td class='minwidth'>";
                if (project.action == "clear_debris_e" || project.action == "clear_debris_l" || project.action == "bridge_gap") {
                    result += "<button class='btn-mini btn-meta hide-project' data-project='" + projectID + "'>hide</button>";
                }
                result += "</td>";
                result += "<td class='minwidth'><button class='btn-mini navigation' data-sector='" + sector + "'>map</button></td>";
                var classes = "action action-build action-level-project multiline";
                var actionLabel = project.actionLabel;
                var action = project.action;
                result += "<td style='width:138px;text-align:right;' class='bg-reset'><button class='" + classes + "' action='" + action + "' sector='" + sector + "' id='btn-" + action + "-" + sector + "'>" + actionLabel + "</button></td>";
            } else {
                result += "<td style='width:138px'></td>";
            }
            result += "</tr>";
            return result;
        },
        
        isCurrentLevel: function (project) {
            var levels = this.getProjectLevels(project);
            var currentLevel = this.playerLocationNodes.head.position.level;
            for (var i = 0; i < levels.length; i++) {
                if (levels[i] == currentLevel) return true;
            }
            return false;
        },
        
        getProjectLevels: function (project) {
            var isPassage = project.improvement && project.improvement.isPassage();
            var level = project.level;
            if (isPassage) {
                var otherLevel = project.level + 1;
                if (project.improvement.name.indexOf("Down") > 0) {
                    level = project.level - 1;
                    otherLevel = project.level;
                }
                return [ level, otherLevel ];
            } else {
                return [ level ];
            }
        },
        
    });

    return UIOutProjectsSystem;
});
