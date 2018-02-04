define([
    'ash',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/nodes/PlayerLocationNode',
    'game/vos/TabCountsVO',
], function (
    Ash, GlobalSignals, UIConstants, PlayerLocationNode, TabCountsVO
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
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            
            var sys = this;
            GlobalSignals.upgradeUnlockedSignal.add(function () { 
                sys.updateAvailableProjects(); 
            });
            GlobalSignals.sectorScoutedSignal.add(function () { 
                sys.updateAvailableProjects(); 
            });
            GlobalSignals.improvementBuiltSignal.add(function () { 
                sys.updateAvailableProjects(); 
            });
            GlobalSignals.playerMovedSignal.add(function () { 
                sys.updateAvailableProjects(); 
            });
        },

        removeFromEngine: function (engine) {
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
            this.updateBuiltProjects();
            
            this.uiFunctions.toggle("#in-improvements-level-empty-message", this.tabCounts.lastShown.visible.regular <= 0);
            $("#tab-header h2").text("Building projects");
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
            $("#switch-projects .bubble").text(this.bubbleNumber);
            this.uiFunctions.toggle("#switch-projects .bubble", this.bubbleNumber > 0);  
        },
        
        updateAvailableProjects: function () {
            var isActive = this.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.projects;
            var availableRegular = 0;
            var visibleRegular = 0;
            var availableColony = 0;
            var visibleColony = 0;
            var playerActionsHelper = this.uiFunctions.playerActions.playerActionsHelper;
            
            var projects = this.levelHelper.getAvailableProjectsForCamp(this.playerLocationNodes.head.entity);
            var numProjectsTR = $("#in-improvements-level table tr").length + $("#in-improvements-colony table tr");
            var updateTables = numProjectsTR !== projects.length;
            if (updateTables) $("#in-improvements-level table").empty();
            if (updateTables) $("#in-improvements-colony table").empty();
            
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
                    var classes = "action action-build action-level-project";
                    var tr = 
                        "<tr>" + 
                        "<td><button class='" + classes + "' action='" + action + "' sector='" + sector + "' + id='btn-" + action + "-" + sector + "'>build</button></td>" + 
                        "<td>" + name + "</td>" +
                        "<td class='list-description'>" + info + "</td>" + 
                        "</tr>";
                    if (isColonyProject)
                        $("#in-improvements-colony table").append(tr);
                    else
                        $("#in-improvements-level table").append(tr);
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
            }
            
            this.tabCounts.current.visible.regular = visibleRegular;
            if (isActive) this.tabCounts.lastShown.visible.regular = visibleRegular;
            this.tabCounts.current.available.regular = availableRegular;
            if (isActive) this.tabCounts.lastShown.available.regular = availableRegular;
            
            this.tabCounts.current.visible.regular = visibleColony;
            if (isActive) this.tabCounts.lastShown.visible.regular = visibleColony;
            this.tabCounts.current.available.regular = availableColony;
            if (isActive) this.tabCounts.lastShown.available.regular = availableColony;
        },
        
        updateBuiltProjects: function() {
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