define([
    'ash',
    'utils/MathUtils',
    'game/GlobalSignals',
    'game/nodes/PlayerLocationNode',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/worldcreator/WorldCreatorRandom',
], function (
    Ash, 
    MathUtils,
    GlobalSignals,
    PlayerLocationNode,
    SectorImprovementsComponent,
    WorldCreatorRandom
) {

    var UIOutCampVisSystem = Ash.System.extend({
        
        uiFunctions : null,
        gameState: null,
        
        playerLocationNodes: null,
        
        elements: {},
        
        constructor: function (uiFunctions, gameState) {
            this.uiFunctions = uiFunctions;    
            this.gameState = gameState;
            this.elements.container = $("#tab-vis-in-container");
            this.elements.layerGrid = $("#vis-camp-layer-grid");
            this.elements.layerSpots = $("#vis-camp-layer-spots");
            this.elements.layerBuildings = $("#vis-camp-layer-buildings");
            
            this.containerDefaultHeight = 100;
            
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
            this.refresh();
        },

        removeFromEngine: function (engine) {
            this.engine = null;
            GlobalSignals.removeAll(this);
        },
        
        update: function (time) {
        
        },
        
        onResize: function () {
            this.previousContainerWidth = this.containerWidth;
            this.refreshGrid();
            if (Math.abs(this.containerWidth - this.previousContainerWidth) > 10) {
                this.refreshBuildings();
            }
        },
        
        refresh: function () {
            if (!this.playerLocationNodes.head) return;
            if (this.uiFunctions.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.in) return;
            
            this.refreshBuildings();
        },
        
        refreshGrid: function () {
            this.elements.layerGrid.empty(); 
            
            var parentWidth = this.elements.container.parent().width();
            this.containerWidth = Math.min(500, parentWidth);
            this.containerHeight = this.containerDefaultHeight;
            this.elements.container.css("width", this.containerWidth + "px");
            this.elements.container.css("height", this.containerHeight + "px");
            
            this.pointDist = 6; // distance of points (possible positions) on the grid in px
            
            /*
            var html = "";
            var size = 2;
            for (var r = 0; r <= this.containerDefaultHeight; r += this.pointDist) {
                var dAngle = Math.max(360 / (r + 1), this.pointDist);
                for (var angle = 0; angle < 360; angle += dAngle) {
                    html += "<div class='vis-camp-point' style='left: " + this.getXpx(r, angle, size) + "px; top: " + this.getYpx(r, angle, size) +"px;'></div>";
                }
            }
            this.elements.layerGrid.append(html);
            */
        },
        
        refreshBuildings: function () {
            var level = this.playerLocationNodes.head.position.level;
            var reset = this.buildingsLevel !== level;
            
            console.log("refresh buildings: " + reset);
            
            if (reset) {
                this.elements.layerBuildings.empty(); 
                this.elements.buildings = {};
            }
            
            var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
            var all = improvements.getAll(improvementTypes.camp);
            all = all.sort(this.sortBuildings);
            
            this.occupiedPos = [];
            var pointDist = this.pointDist;
            
            var building;
            for (var i = 0; i < all.length; i++) { 
                building = all[i];
                var size = this.getBuildingSize(building);
                var count = building.count;
                if (!this.elements.buildings[building.name]) this.elements.buildings[building.name] = [];
                for (var n = 0; n < count; n++) {
                    var coords = this.getBuildingCoords(building, n, size);
                    if (!coords) {
                        console.log("WARN: No coordinates found for building " + building.name + " " + n);
                        continue;
                    }
                    // add missing buildings
                    var $elem = this.elements.buildings[building.name][n];
                    if (!$elem) {
                        $elem = $(this.getBuildingDiv(i, building, size, n));
                        this.elements.layerBuildings.append($elem);
                        this.elements.buildings[building.name][n] = $elem;
                        if (!reset) {
                            $elem.hide();
                            $elem.show("scale");
                        }
                    }
                    
                    // position all buildings
                    $elem.css("left", this.getXpx(coords.r, coords.angle, size) + "px");
                    $elem.css("top", this.getYpx(coords.r, coords.angle, size) + "px");
                }
            }
            
            this.buildingsLevel = level;
        },
        
        getBuildingCoords: function (building, n, size) {
            if (building.getCampCoords(n)) {
                console.log("found existing coords " + building.name + " " + n);
                return building.getCampCoords(n);
            }
            console.log("setting new coords " + building.name + " " + n);
            
            var level = this.playerLocationNodes.head.position.level;
            var seed = Math.round(this.gameState.worldSeed / 5 * (level + 10));
            var i = Object.values(improvementNames).sort().indexOf(building.name);
            var buildingSeed = seed * 11 / (i * 2 + 1) * (n + 1) + i * n;
            
            var minDist = this.getMinDist(building);
            var maxDist = this.getMaxDist(building);
            for (var j = 0; j < 100; j++ ) {
                var r = WorldCreatorRandom.randomInt(buildingSeed + j * 2, minDist, maxDist + 1, true) * this.pointDist;
                var angle = WorldCreatorRandom.randomInt(buildingSeed + j * 3 - 5000, 0, 360/this.pointDist, true) * this.pointDist;
                if (!this.isOccupied(r, angle, size)) break;
                switch (j % 2) {
                    case 0: minDist--; break;
                    case 1: maxDist++; break;
                }
            }
            if (this.isOccupied(r, angle, size)) return null;
            this.setOccupied(r, angle, size);
            
            var coords = { r: r, angle: angle };
            building.setCampCoords(n, coords);
            return coords;
        },
        
        getBuildingDiv: function (i, building, size, n) {
            var style = "width: " + size + "px; height: " + size + "px;";
            var classes = "vis-camp-building " + this.getBuildingColorClass(building) + " " + this.getBuildingShapeClass(building);
            return "<div class='" + classes + "' style='" + style + "' id='" + this.getBuildingDivID(building, n) + "'></div>";
        },
        
        getBuildingDivID: function (building, n) {
            return "vis-building-" + building.name.toLowerCase() + "-" + n;
        },
            
        isOccupied: function (r, angle, size) {
            var margin = 5;
            var x = this.getXpx(r, angle, size);
            var y = this.getYpx(r, angle, size);
            for (var rr in this.occupiedPos) {
                for (var aangle in this.occupiedPos[rr]) {
                    var ssize = this.occupiedPos[rr][aangle];
                    var xx = this.getXpx(rr, aangle, ssize);
                    var yy = this.getYpx(rr, aangle, ssize);
                    var dist = Math.ceil(MathUtils.dist(x, y, xx, yy));
                    if (dist < size / 2 + ssize / 2 + margin) {
                        return true;
                    }
                }
            }
            return false;
        },
        
        setOccupied: function (r, angle, size) {
            if (!this.occupiedPos[r]) this.occupiedPos[r] = [];
            this.occupiedPos[r][angle] = size;
        },
        
        sortBuildings: function (a, b) {
			var getSortVal = function (building) {
                return building.name.length + building.name.charCodeAt(0);
			};
			var aVal = getSortVal(a);
			var bVal = getSortVal(b);
			return aVal - bVal;
		},
        
        getBuildingSize: function (building) {
            switch (building.name) {
                case improvementNames.campfire:
                case improvementNames.home:
                    return 6;
                case improvementNames.lights: 
                    return 4;
                case improvementNames.storage:
                    return 12;
            }
            return 9;
        },
        
        getBuildingColorClass: function (building) {
            switch (building.name) {
                case improvementNames.campfire: 
                case improvementNames.lights: 
                    return "vis-camp-building-heavy";
                case improvementNames.fortification: 
                    return "vis-camp-building-thin";
            }
            return "vis-camp-building-medium";
        },
        
        getBuildingShapeClass: function (building) {
            switch (building.name) {
                case improvementNames.campfire: 
                case improvementNames.lights: 
                    return "vis-camp-building-star";

                case improvementNames.home: 
                case improvementNames.house: 
                    return "vis-camp-building-round";
            }
            return "vis-camp-building-square";
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
        
        getXpx: function (r, degrees, size) {
            return Math.round((this.containerWidth / 2) + (this.pointDist - size / 2) + r * Math.cos(degrees * Math.PI / 180));
        },
        
        getYpx: function (r, degrees, size) {
            return Math.round((this.containerHeight / 2) + (this.pointDist - size / 2) + r * Math.sin(degrees * Math.PI / 180));
        },
        
    });

    return UIOutCampVisSystem;
});
