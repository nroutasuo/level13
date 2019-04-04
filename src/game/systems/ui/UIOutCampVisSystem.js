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
            
            this.containerDefaultHeight = 100;
            this.buildingContainerSizeX = 14;
            this.floorHeight = 15;
            this.floorThickness = 6; // match css
            this.zStep = 8;
            
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
                this.refreshBuildingSpots();
                this.refreshBuildings();
            }
        },
        
        refresh: function () {
            if (!this.playerLocationNodes.head) return;
            if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.in) return;
            
            this.refreshBuildingSpots();
            this.refreshBuildings();
        },
        
        refreshGrid: function () {
            var parentWidth = this.elements.container.parent().width();
            this.containerWidth = Math.max(100, parentWidth);
            this.containerHeight = this.containerDefaultHeight;
            this.elements.container.css("width", this.containerWidth + "px");
        },
        
        refreshFloor: function () {
            if (!this.elements.floor) {
                this.elements.floor = $(this.getFloorDiv());
                this.elements.layerBuildings.append(this.elements.floor);
            }
            
            this.elements.floor.css("width", this.containerWidth + "px");
            this.elements.floor.css("top", (this.containerHeight - this.floorHeight + this.floorThickness / 2) + "px");
        },
        
        refreshBuildingSpots: function () {
            if (!this.playerLocationNodes.head) return;
            var level = this.playerLocationNodes.head.position.level;
            
            UIState.refreshState(this, "building-spots-level", level, function () {
                if (this.elements.buildingSpots) {
                    for (var i = 0; i < this.elements.buildingSpots.length; i++) {
                        this.elements.buildingSpots[i].remove();
                    }
                }
                this.elements.buildingSpots = {};
            });
            
            this.reservedPos = [];
            this.buildingSpots = [];

            var numSpots = this.getNumCampBuildingSpots();
            for (var i = 0; i < numSpots; i++) {
                var coords = this.getBuildingSpotCoords(i);
                var $elem = this.elements.buildingSpots[i];
                if (!$elem) {
                    $elem = $(this.getBuildingSpotDiv(i));
                    this.registerBuildingSpotDivListeners($elem);
                    this.elements.layerSpots.append($elem);
                    this.elements.buildingSpots[i] = $elem;
                }
                $elem.removeClass("filled");
                this.buildingSpots.push({ coords: coords, building: null });
                $elem.css("left", this.getXpx(coords.x, coords.z, this.buildingContainerSizeX) + "px");
                $elem.css("top", this.getYpx(coords.x, coords.z, this.buildingContainerSizeX) + "px");
            }
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
                            $elem = $(this.getBuildingDiv(i, building, size, n, j));
                            this.registerBuildingDivListeners($elem);
                            this.elements.layerBuildings.append($elem);
                            this.elements.buildings[building.name][n][j] = $elem;
                            if (!reset) {
                                // animate newly built buildings
                                $elem.hide();
                                $elem.show("scale");
                            }
                        }

                        // position all buildings
                        $elem.css("left", this.getXpx(coords.x, coords.z, size) + "px");
                        $elem.css("top", this.getYpx(coords.x, coords.z, size) + "px");
                    }
                }
            }
            
            this.buildingsLevel = level;
        },
        
        registerBuildingSpotDivListeners: function ($elem) {
            var sys = this;
            $elem.on('dragenter', function (e) {
                $(this).addClass("drag-over");
            });
            $elem.on('dragover', function (e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
            });
            $elem.on('dragleave', function (e) {
                $(this).removeClass("drag-over");
            });
            $elem.on('drop', function (e) {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }
                if (sys.draggedBuilding) {
                    var spotIndex = $(e.target).attr("data-spot-index");
                    var buildingName = sys.draggedBuilding.attr("data-building-name");
                    var buildingIndex = sys.draggedBuilding.attr("data-building-index");
                    var buildingVisIndex = sys.draggedBuilding.attr("data-building-vis-index");
                    var improvements = sys.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
                    var vo = improvements.getVO(buildingName);
                    improvements.setSelectedCampBuildingSpot(vo, buildingIndex, buildingVisIndex, spotIndex);
                    sys.refreshBuildingSpots();
                    sys.refreshBuildings();
                }
                return false;
            });
            $elem.on('dragend', function (e) {
                $(this).removeClass("drag-over");
            });
        },
        
        registerBuildingDivListeners: function ($elem) {
            var sys = this;
            $elem.on('dragstart', function (e) {
                sys.draggedBuilding = $elem;
                $(".vis-camp-building-container").addClass("drag-active");
            });
            $elem.on('dragend', function (e) {
                sys.draggedBuilding = null;
                $(".vis-camp-building-container").removeClass("drag-over");
                $(".vis-camp-building-container").removeClass("drag-active");
            });
        },
        
        // camp vis coords: x (0 in the middle, infinite), z (0 in the front, 1, 2 in the background)
        getBuildingSpotCoords: function (i) {
            var level = this.playerLocationNodes.head.position.level;
            var seed = Math.round(GameGlobals.gameState.worldSeed / 3 * (level + 10) + i * i * level / 7);
            var sizeX = this.buildingContainerSizeX;
            
            // TODO randomize with seed to make different camps look different
            var mod2 = i % 2;
            var mod9 = i % 9;
            var x = mod2 == 0 ? i : -i;
            var z = mod9 < 6 ? 1 : mod9 < 8 ? 2 : 3;
            
            /*
            if (this.isReserved(r, angle, size)) {
                console.log("WARN: Overlapping building spots");
            }
            this.setReserved(r, angle, size);
            */
            
            var coords = { x: x, z: z };
            return coords;
        },
        
        getBuildingCoords: function (improvements, building, n, j) {
            var index = improvements.getSelectedCampBuildingSpot(building, n, j, true);
            
            if (index < 0 || !this.buildingSpots[index]) {
                console.log("WARN: No building spot defined for " + building.name + " " + n + " " + j);
                return null;
            }

            this.buildingSpots[index].building = building;
            $("#vis-camp-building-container-" + index).addClass("filled");
            return this.buildingSpots[index].coords;
        },
        
        getFloorDiv: function () {
            return "<div id='vis-camp-floor' class='vis-camp-floor'></div>";
        },
        
        getBuildingSpotDiv: function (i) {
            return "<div id='vis-camp-building-container-" + i + "' class='vis-camp-building-container' draggable='true' data-spot-index='" + i + "'></div>";
        },
        
        getBuildingDiv: function (i, building, size, n, j) {
            var style = "width: " + size + "px; height: " + size + "px;";
            var classes = "vis-camp-building " + this.getBuildingColorClass(building);
            var data = "data-building-name='" + building.name + "' data-building-index='" + n + "' data-building-vis-index='" + j + "'";
            var id = this.getBuildingDivID(building, n, j);
            return "<div class='" + classes + "' style='" + style + "' id='" + id + "' " + data + " draggable='true'></div>";
        },
        
        getBuildingDivID: function (building, n, j) {
            return "vis-building-" + building.getKey() + "-" + n;
        },
            
        isReserved: function (x, z, size) {
            var margin = 5;
            var x = this.getXpx(x, z, size);
            var y = this.getYpx(x, z, size);
            for (var rr in this.reservedPos) {
                for (var aangle in this.reservedPos[rr]) {
                    var ssize = this.reservedPos[rr][aangle];
                    var xx = this.getXpx(xx, zz, ssize);
                    var yy = this.getYpx(xx, zz, ssize);
                    var dist = Math.ceil(MathUtils.dist(x, y, xx, yy));
                    if (dist < size / 2 + ssize / 2 + margin) {
                        return true;
                    }
                }
            }
            return false;
        },
        
        setReserved: function (r, angle, size) {
            if (!this.reservedPos[r]) this.reservedPos[r] = [];
            this.reservedPos[r][angle] = size;
        },
        
        getBuildingSize: function (building) {
            switch (building.name) {
                case improvementNames.campfire:
                case improvementNames.home:
                    return 10;
                case improvementNames.lights:
                    return 8;
                case improvementNames.storage:
                    return 20;
            }
            return 12;
        },
        
        getBuildingColorClass: function (building) {
            switch (building.name) {
                case improvementNames.campfire:
                case improvementNames.lights:
                    return "vis-camp-building-heavy";
                case improvementNames.fortification:
                case improvementNames.fortification2:
                    return "vis-camp-building-thin";
            }
            return "vis-camp-building-medium";
        },

        getNumCampBuildingSpots: function () {
            if (!this.playerLocationNodes.head) return 0;
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var numBuildings = improvements.getTotal(improvementTypes.camp);
            var maxSelected = improvements.getMaxSelectedCampBuildingSpot();
            return Math.min(1000, Math.max(maxSelected, Math.max(20, numBuildings * 3) + 5));
        },
        
        getMinDist: function (building) {
            return 0;
        },
        
        getMaxDist: function (building) {
            switch (building.name) {
                case improvementNames.campfire:
                case improvementNames.home:
                    return 1;
                case improvementNames.tradepost:
                    return 3;
            }
            return Math.floor(this.containerDefaultHeight / this.pointDist / 2);
        },
        
        getXpx: function (x, z, size) {
            return Math.round((this.containerWidth / 2) + x * size);
        },
        
        getYpx: function (x, z, size) {
            return Math.round(this.containerHeight - this.floorHeight - z * this.zStep - size / 2);
        }
        
    });

    return UIOutCampVisSystem;
});
