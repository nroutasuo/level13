define([
    'ash',
    'utils/MathUtils',
    'utils/UIState',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/nodes/PlayerLocationNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/worldcreator/WorldCreatorRandom',
], function (
    Ash, MathUtils, UIState, GameGlobals, GlobalSignals, PlayerLocationNode, SectorImprovementsComponent, WorldCreatorRandom
) {

    var UIOutCampVisSystem = Ash.System.extend({
        
        playerLocationNodes: null,
        
        elements: {},
        
        constructor: function () {
            this.elements.container = $("#tab-vis-in-container");
            this.elements.layerGrid = $("#vis-camp-layer-grid");
            this.elements.layerSpots = $("#vis-camp-layer-spots");
            this.elements.layerBuildings = $("#vis-camp-layer-buildings");
            
            this.containerDefaultHeight = 80;
            this.buildingContainerSizeX = 14;
            this.floorPos = 12;
            this.floorThickness = 12;
            this.zStep = 0;
            
            return this;
        },

        addToEngine: function (engine) {
            this.engine  = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.refresh);
            GlobalSignals.add(this, GlobalSignals.windowResizedSignal, this.onResize);
            GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onResize);
            
            this.refreshGrid();
            this.refreshFloor();
            this.refresh();
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            GlobalSignals.removeAll(this);
        },
        
        update: function (time) { },
        
        onResize: function () {
            this.previousContainerWidth = this.containerWidth;
            this.previousContainerHeight = this.containerHeight;
            this.refreshGrid();
            this.refreshFloor();
            var diffWidth = Math.abs(this.containerWidth - this.previousContainerWidth);
            var diffHeight = Math.abs(this.containerHeight - this.previousContainerHeight);
            if (diffWidth > 10 || diffHeight > 10) {
                this.refreshBuildings();
            }
        },
        
        refresh: function () {
            if (!this.playerLocationNodes.head) return;
            if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.in) return;
            
            this.refreshGrid();
            this.refreshFloor();
            this.refreshBuildings();
        },
        
        refreshGrid: function () {
            var parentWidth = this.elements.container.parent().width();
            this.containerWidth = Math.max(100, parentWidth);
            this.containerHeight = this.containerDefaultHeight;
            this.elements.container.css("width", this.containerWidth + "px");
            this.elements.container.css("height", this.containerHeight + "px");
        },
        
        refreshFloor: function () {
            if (!this.elements.floor) {
                this.elements.floor = $(this.getFloorDiv());
                this.elements.layerBuildings.append(this.elements.floor);
            }
            this.elements.floor.css("width", this.containerWidth + "px");
            this.elements.floor.css("top", (this.containerHeight - this.floorPos) + "px");
        },
        
        refreshBuildings: function () {
            if (!this.playerLocationNodes.head) return;
            var level = this.playerLocationNodes.head.position.level;
            var reset = this.buildingsLevel !== level;
            
            if (reset) {
                if (this.elements.buildings) {
                    for (var name in this.elements.buildings) {
                        for (var n = 0; n < this.elements.buildings[name].length; n++) {
                            for (var j = 0; j < this.elements.buildings[name][n].length; j++) {
                                this.elements.buildings[name][n][j].remove();
                            }
                        }
                    }
                }
                this.elements.buildings = {};
            }
            
            var buildingCoords = [];
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var all = improvements.getAll(improvementTypes.camp);
            
            var building;
            for (var i = 0; i < all.length; i++) {
                building = all[i];
                var size = this.getBuildingSize(building);
                var count = building.count;
                var visualCount = building.getVisCount();
                if (!this.elements.buildings[building.name]) this.elements.buildings[building.name] = [];
                for (var n = 0; n < count; n++) {
                    if (!this.elements.buildings[building.name][n]) this.elements.buildings[building.name][n] = [];
                    for (var j = 0; j < visualCount; j++) {
                        // get coords
                        var coords = this.getBuildingCoords(improvements, building, n, j);
                        if (!coords) {
                            console.log("WARN: No coordinates found for building " + building.name + " " + n + " " + j);
                            continue;
                        }

                        // add missing buildings
                        var $elem = this.elements.buildings[building.name][n][j];
                        if (!$elem) {
                            $elem = $(this.getBuildingDiv(i, building, n, j, coords));
                            this.elements.layerBuildings.append($elem);
                            this.elements.buildings[building.name][n][j] = $elem;
                            if (!reset) {
                                // animate newly built buildings
                                $elem.hide();
                                $elem.show("scale");
                            }
                        }
                        
                        buildingCoords.push({ building: building, n: n, j: j, coords: coords });

                        // position all buildings
                        $elem.css("left", this.getXpx(coords.x, coords.z, size) + "px");
                        $elem.css("top", this.getYpx(coords.x, coords.z, size) + "px");
                    }
                }
            }
            
            this.checkOverlaps(buildingCoords);
            
            this.buildingsLevel = level;
        },
        
        checkOverlaps: function (buildingCoords) {
            for (var i = 0; i < buildingCoords.length; i++) {
                var coords1 = buildingCoords[i].coords;
                var buildingType1 = buildingCoords[i].building.name;
                for (var j = i + 1; j < buildingCoords.length; j++) {
                    var coords2 = buildingCoords[j].coords;
                    var buildingType2 = buildingCoords[j].building.name;
                    if (GameGlobals.campVisHelper.isConflict(coords1, coords2, buildingType1, buildingType2)) {
                        console.log("WARN: overlap " + buildingType1 + " and " + buildingType2);
                    }
                }
            }
        },
        
        getBuildingSpotCoords: function (i) {
            return GameGlobals.campVisHelper.getCoords(i);
        },
        
        getBuildingCoords: function (improvements, building, n, j) {
            var index = improvements.getSelectedCampBuildingSpot(building, n, j, true);
            if (index < 0) {
                console.log("WARN: No building spot defined for " + building.name + " " + n + " " + j + " | " + index);
                return null;
            }
            return this.getBuildingSpotCoords(index);
        },
        
        getFloorDiv: function () {
            return "<div id='vis-camp-floor' class='vis-camp-floor' style='height:" + this.floorThickness + "px;'></div>";
        },
                
        getBuildingDiv: function (i, building, n, j, coords) {
            var size = this.getBuildingSize(building);
            var style = "width: " + size.x + "px; height: " + size.y + "px;";
            var classes = "vis-camp-building " + this.getBuildingClasses(building, coords);
            var data = "data-building-name='" + building.name + "' data-building-index='" + n + "' data-building-vis-index='" + j + "'";
            var id = this.getBuildingDivID(building, n, j);
            return "<div class='" + classes + "' style='" + style + "' id='" + id + "' " + data + "'></div>";
        },
        
        getBuildingDivID: function (building, n, j) {
            return "vis-building-" + building.getKey() + "-" + n;
        },
        
        getBuildingSize: function (building) {
            return GameGlobals.campVisHelper.getBuildingSize(building.name);
        },
        
        getBuildingClasses: function (building, coords) {
            var result = [];
            result.push(this.getBuildingColorClass(building, coords));
            switch (building.name) {
                case improvementNames.home:
                case improvementNames.house:
                    result.push("vis-camp-building-rounded");
                    break;
                case improvementNames.campfire:
                case improvementNames.lights:
                    result.push("vis-camp-building-lit");
                    break;
            }
            return result.join(" ");
        },
        
        getBuildingColorClass: function (building, coords) {
            if (coords.z == 0) return "vis-camp-building-z0";
            if (coords.z == 1) return "vis-camp-building-z1";
            return "vis-camp-building-z2";
        },
        
        getXpx: function (x, z, size) {
            return Math.round((this.containerWidth / 2) + x * GameGlobals.campVisHelper.gridX + size.x / 2);
        },
        
        getYpx: function (x, z, size) {
            return Math.round(this.containerHeight - this.floorPos - z * this.zStep - size.y);
        }
        
    });

    return UIOutCampVisSystem;
});
