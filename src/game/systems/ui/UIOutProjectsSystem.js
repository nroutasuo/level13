define([
    'ash',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/PositionConstants',
    'game/nodes/PlayerLocationNode',
    'game/vos/TabCountsVO',
], function (
    Ash, GlobalSignals, UIConstants, PositionConstants, PlayerLocationNode, TabCountsVO
) {
    var UIOutProjectsSystem = Ash.System.extend({
        
        playerLocationNodes: null,

        bubbleNumber: -1,
        tabCounts: null,
        
        constructor: function (uiFunctions, gameState, levelHelper, endingHelper) {
            this.uiFunctions = uiFunctions;
            this.gameState = gameState;
            this.levelHelper = levelHelper;
            this.endingHelper = endingHelper;
            this.tabCounts = new TabCountsVO();
            this.elements = {};
            this.elements.tabHeader = $("#tab-header h2");
            this.elements.bubble = $("#switch-projects .bubble");
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            
            GlobalSignals.add(this, GlobalSignals.upgradeUnlockedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.sectorScoutedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.refresh);
        },

        removeFromEngine: function (engine) {
            GlobalSignals.removeAll(this);
            this.engine = null;
            this.playerLocationNodes = null;
        },

        update: function (time) {
            var isActive = this.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.projects;
            if (!this.playerLocationNodes.head) return;
            
            this.updateBubble();
            
            if (!isActive) {
                return;
            }
            
            this.uiFunctions.toggle("#container-in-improvements-colony", this.endingHelper.hasUnlockedEndProject());
            
            this.uiFunctions.toggle("#in-improvements-level-empty-message", this.tabCounts.lastShown.visible.regular <= 0);
            this.elements.tabHeader.text("Building projects");
        },
        
        refresh: function () {
            this.updateAvailableProjects();
            this.updateBuiltProjects();
        },
        
        updateBubble: function () {
            var newBubbleNumber = 
                (this.tabCounts.current.available.regular - this.tabCounts.lastShown.available.regular) + 
                (this.tabCounts.current.visible.regular - this.tabCounts.lastShown.visible.regular) +
                (this.tabCounts.current.available.colony - this.tabCounts.lastShown.available.colony) + 
                (this.tabCounts.current.visible.colony - this.tabCounts.lastShown.visible.colony);
            if (this.endingHelper.isReadyForLaunch())
                newBubbleNumber = 1;
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            this.elements.bubble.text(this.bubbleNumber);
            this.uiFunctions.toggle("#switch-projects .bubble", this.bubbleNumber > 0);  
        },
        
        updateAvailableProjects: function () {
            if (!this.playerLocationNodes.head) return;
            var isActive = this.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.projects;
            var availableRegular = 0;
            var visibleRegular = 0;
            var availableColony = 0;
            var visibleColony = 0;
            var playerActionsHelper = this.uiFunctions.playerActions.playerActionsHelper;
            
            this.elements.levelImprovementsTable = $("#in-improvements-level table");
            this.elements.colonyImprovementsTable = $("#in-improvements-colony table");
            
            var projects = this.levelHelper.getAvailableProjectsForCamp(this.playerLocationNodes.head.entity);
            var numProjectsTR = $("tr", this.elements.levelImprovementsTable).length + $("tr", this.elements.colonyImprovementsTable);
            var updateTables = numProjectsTR !== projects.length;
            if (updateTables) this.elements.levelImprovementsTable.empty();
            if (updateTables) this.elements.colonyImprovementsTable.empty();
            
            var showLevel = this.gameState.unlockedFeatures.levels;
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                var action = project.action;
                var sectorEntity = this.levelHelper.getSectorByPosition(project.level, project.position.sectorX, project.position.sectorY);
                var actionAvailable = playerActionsHelper.checkAvailability(action, false, sectorEntity);
                var isColonyProject = project.isColonyProject();
                if (updateTables) {
                    var sector = project.level + "." + project.sector + "." + project.direction;
                    var name = project.name;
                    var info = "at " + project.position.getPosition().getInGameFormat() + (showLevel ? " level " + project.level : "");
                    var classes = "action action-build action-level-project multiline";
                    var actionLabel = project.actionLabel;
                    var tr = 
                        "<tr>" + 
                        "<td><button class='" + classes + "' action='" + action + "' sector='" + sector + "' + id='btn-" + action + "-" + sector + "'>" + actionLabel + "</button></td>" + 
                        "<td>" + name + "</td>" +
                        "<td class='list-description'>" + info + "</td>" + 
                        "</tr>";
                    if (isColonyProject)
                        this.elements.colonyImprovementsTable.append(tr);
                    else
                        this.elements.levelImprovementsTable.append(tr);
                }
                
                if (isColonyProject) {
                    visibleColony++;
                    if (actionAvailable) availableColony++;
                } else {
                    visibleRegular++;
                    if (actionAvailable) availableRegular++;
                }
            }
            
            if (updateTables) {
                this.uiFunctions.registerActionButtonListeners("#in-improvements-level");
                this.uiFunctions.generateButtonOverlays("#in-improvements-level");
                this.uiFunctions.generateCallouts("#in-improvements-level");
                this.uiFunctions.registerActionButtonListeners("#in-improvements-colony");
                this.uiFunctions.generateButtonOverlays("#in-improvements-colony");
                this.uiFunctions.generateCallouts("#in-improvements-colony");
                GlobalSignals.elementCreatedSignal.dispatch();
            }
            
            this.tabCounts.updateCounts({ regular: visibleRegular, colony: visibleColony }, { regular: availableRegular, colony: availableColony }, isActive);
        },
        
        updateBuiltProjects: function() {
            if (!this.playerLocationNodes.head) return;
            var projects = this.levelHelper.getBuiltProjectsForCamp(this.playerLocationNodes.head.entity);
            var numProjectsTR = $("#in-improvements-level-built table tr").length;
            var updateTable = numProjectsTR !== projects.length;
            
            this.uiFunctions.toggle("#header-in-improvements-level-built", projects.length > 0);
            
            if (!updateTable)
                return;
            
            var showLevel = this.gameState.unlockedFeatures.levels;
            if (updateTable) $("#in-improvements-level-built table").empty();
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                var sector = project.level + "." + project.sector + "." + project.direction;
                var name = project.name;
                var info = "at " + project.position.getPosition().getInGameFormat() + (showLevel ? " level " + project.level : "");
                var isPassage = project.improvement.isPassage();
                if (isPassage) {
                    // TODO define building projects directions/links better and don't rely on improvement names
                    name = name.replace(" Up", "");
                    name = name.replace(" Down", "");
                    var level = project.level;
                    var otherLevel = project.level + 1;
                    if (project.improvement.name.indexOf("Down") > 0) {
                        level = project.level - 1;
                        otherLevel = project.level;
                    }
                    info = " connecting levels " + level + " and " + otherLevel + " at " + project.position.getPosition().getInGameFormat();
                }
                var tr = 
                    "<tr>" +
                    "<td>" + name + "</td>" +
                    "<td class='list-description'>" + info + "</td>" + 
                    "</tr>";
                $("#in-improvements-level-built table").append(tr);
            }
        }
        
    });

    return UIOutProjectsSystem;
});