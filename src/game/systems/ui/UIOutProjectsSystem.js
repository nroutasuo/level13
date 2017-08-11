define([
    'ash',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/nodes/PlayerLocationNode',
], function (
    Ash, GlobalSignals, UIConstants, PlayerLocationNode
) {
    var UIOutProjectsSystem = Ash.System.extend({
        
        playerLocationNodes: null,

        bubbleNumber: -1,
        visibleBuildingCount: 0,
        availableBuildingCount: 0,
        lastShownVisibleBuildingCount: 0,
        lastShownAvailableBuildingCount: 0,
        
        constructor: function (uiFunctions, gameState, levelHelper) {
            this.uiFunctions = uiFunctions;
            this.gameState = gameState;
            this.levelHelper = levelHelper;
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
            
            this.updateBuiltProjects();
            
            $("#in-improvements-level-empty-message").toggle(this.visibleBuildingCount <= 0);
            $("#tab-header h2").text("Building projects");
        },
        
        updateBubble: function () {
            var newBubbleNumber = this.availableBuildingCount - this.lastShownAvailableBuildingCount + this.visibleBuildingCount - this.lastShownVisibleBuildingCount;
            if (this.bubbleNumber === newBubbleNumber)
                return;
            this.bubbleNumber = newBubbleNumber;
            $("#switch-projects .bubble").text(this.bubbleNumber);
            $("#switch-projects .bubble").toggle(this.bubbleNumber > 0);  
        },
        
        updateAvailableProjects: function () {
            var isActive = this.gameState.uiStatus.currentTab === this.uiFunctions.elementIDs.tabs.projects;
            var availableBuildingCount = 0;
            var visibleBuildingCount = 0;
            var playerActionsHelper = this.uiFunctions.playerActions.playerActionsHelper;
            
            var numProjectsTR = $("#in-improvements-level table tr").length;
            var projects = this.levelHelper.getAvailableProjectsForCamp(this.playerLocationNodes.head.entity, this.uiFunctions.playerActions);
            var showLevel = this.gameState.unlockedFeatures.level;
            var updateTable = isActive && numProjectsTR !== projects.length;
            if (updateTable) $("#in-improvements-level table").empty();
            for (var i = 0; i < projects.length; i++) {
                var project = projects[i];
                var action = project.action;
                var sectorEntity = this.levelHelper.getSectorByPosition(project.level, project.position.sectorX, project.position.sectorY);
                var actionAvailable = playerActionsHelper.checkAvailability(action, false, sectorEntity);
                if (updateTable) {
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
                    $("#in-improvements-level table").append(tr);
                }
                visibleBuildingCount++;
                if (actionAvailable) availableBuildingCount++;
            }
            if (updateTable) {
                this.uiFunctions.registerActionButtonListeners("#in-improvements-level");
                this.uiFunctions.generateButtonOverlays("#in-improvements-level");
                this.uiFunctions.generateCallouts("#in-improvements-level");
            }
            
            this.availableBuildingCount = availableBuildingCount;
            if (isActive) this.lastShownAvailableBuildingCount = this.availableBuildingCount;
            this.visibleBuildingCount = visibleBuildingCount;
            if (isActive) this.lastShownVisibleBuildingCount = this.visibleBuildingCount;
        },
        
        updateBuiltProjects: function() {
            var projects = this.levelHelper.getBuiltProjectsForCamp(this.playerLocationNodes.head.entity);
            var numProjectsTR = $("#in-improvements-level-built table tr").length;
            var updateTable = numProjectsTR !== projects.length;
            
            $("#header-in-improvements-level-built").toggle(projects.length > 0);
            
            if (!updateTable)
                return;            
            
            var showLevel = this.gameState.unlockedFeatures.level;
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