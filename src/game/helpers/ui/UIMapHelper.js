// Creates and updates maps (mini-map and main)
define(['ash',
    'game/GameGlobals',
    'game/constants/UIConstants',
    'game/constants/CanvasConstants',
    'game/constants/MovementConstants',
    'game/constants/PositionConstants',
    'game/constants/SectorConstants',
    'game/constants/WorldCreatorConstants',
    'game/nodes/PlayerPositionNode',
    'game/components/type/LevelComponent',
    'game/components/common/CampComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/components/type/SectorComponent',
    'game/vos/PositionVO'],
function (Ash,
    GameGlobals, UIConstants, CanvasConstants, MovementConstants, PositionConstants, SectorConstants, WorldCreatorConstants,
    PlayerPositionNode,
    LevelComponent, CampComponent, SectorStatusComponent, SectorLocalesComponent, SectorFeaturesComponent, PassagesComponent, WorkshopComponent, SectorComponent,
    PositionVO) {

    var UIMapHelper = Ash.Class.extend({

        playerPosNodes: null,

        icons: [],

        isMapRevealed: false,

        constructor: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            this.isMapRevealed = false;

            this.initIcon("camp", "map-camp");
            this.initIcon("campable", "map-campable");
            this.initIcon("passage-up", "map-passage-up");
            this.initIcon("passage-down", "map-passage-down");
            this.initIcon("interest", "map-interest");
            this.initIcon("unknown", "map-unvisited");
            this.initIcon("workshop", "map-workshop");
            this.initIcon("water", "map-water");
        },

        initIcon: function(key, name) {
            this.icons[key] = new Image();
            this.icons[key].src = "img/" + name + ".png";
            this.icons[key + "-sunlit"] = new Image();
            this.icons[key + "-sunlit"].src = "img/" + name + "-sunlit.png";
        },

        enableScrollingForMap: function (canvasId) {
            CanvasConstants.makeCanvasScrollable(canvasId);
            CanvasConstants.updateScrollEnable(canvasId);
        },

        disableScrollingForMap: function (canvasId) {
            // TODO check if this works
            $("#" + canvasId).off("mousedown", this.onScrollableMapMouseDown);
            $("#" + canvasId).off("mouseup", this.onScrollableMapMouseUp);
            $("#" + canvasId).off("mouseleave", this.onScrollableMapMouseLeave);
            $("#" + canvasId).off("mousemove", this.onScrollableMapMouseMove);
            $("#" + canvasId).removeClass("scrollable");
            $("#" + canvasId).parent().unwrap();
        },

        centerMapToPlayer: function (canvasId, mapPosition, centered) {
            var sectorSize = this.getSectorSize(false);
            var mapDimensions = this.getMapSectorDimensions(canvasId, -1, false, mapPosition);
            var playerPosX = sectorSize + (mapPosition.sectorX - mapDimensions.minVisibleX) * sectorSize * (1 + this.getSectorPadding(centered));
            var playerPosY = sectorSize + (mapPosition.sectorY - mapDimensions.minVisibleY) * sectorSize * (1 + this.getSectorPadding(centered));
            $("#" + canvasId).parent().scrollLeft(playerPosX - $("#" + canvasId).parent().width() * 0.5);
            $("#" + canvasId).parent().scrollTop(playerPosY - $("#" + canvasId).parent().height() * 0.5);
            CanvasConstants.snapScrollPositionToGrid(canvasId);
            CanvasConstants.updateScrollIndicators(canvasId);
        },

        rebuildMap: function (canvasId, overlayId, mapPosition, mapSize, centered, sectorSelectedCallback) {
            var canvas = $("#" + canvasId)[0];
            var ctx = canvas ? canvas.getContext && canvas.getContext('2d') : null;

            var visibleSectors = {};
            var allSectors = {};
            var mapDimensions = this.getMapSectorDimensions(canvasId, mapSize, centered, mapPosition, visibleSectors, allSectors);

            if (ctx) {
                this.rebuildMapWithCanvas(mapPosition, canvas, ctx, centered, visibleSectors, allSectors, mapDimensions);
            }

            if (overlayId) {
                this.rebuildOverlay(mapPosition, overlayId, centered, visibleSectors, mapDimensions, sectorSelectedCallback);
            }
        },

        rebuildMapWithCanvas: function (mapPosition, canvas, ctx, centered, visibleSectors, allSectors, dimensions) {
            var sectorSize = this.getSectorSize(centered);
            var sunlit = $("body").hasClass("sunlit");
            var levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(mapPosition.level);
            var levelVO = levelEntity.get(LevelComponent).levelVO;

            ctx.canvas.width = dimensions.canvasWidth;
            ctx.canvas.height = dimensions.canvasHeight;
            ctx.clearRect(0, 0, canvas.scrollWidth, canvas.scrollWidth);
            ctx.fillStyle = CanvasConstants.getBackgroundColor(sunlit);
            ctx.fillRect(0, 0, canvas.scrollWidth, canvas.scrollHeight);

            var sector;
            var sectorStatus;
            var sectorXpx;
            var sectorYpx;
            var sectorPos;
            var sectorPadding = this.getSectorPadding(centered);
            
            // background
            var bgPadding;
            var radius;
            ctx.fillStyle = sunlit ? "#efefef" : "#282a28";
            ctx.strokeStyle = sunlit ? "#efefef" : "#282a28";
            for (var y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
                for (var x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
                    sector = visibleSectors[x + "." + y];
                    sectorStatus = SectorConstants.getSectorStatus(sector);
                    if (this.showSectorOnMap(centered, sector, sectorStatus)) {
                        bgPadding = sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE ? sectorSize * 0.35 : sectorSize * 2.15;
                        radius = sectorStatus == SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE ? sectorSize * 0.75 : sectorSize * 2.5;
                        sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).x;
                        sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).y;
                        sectorPos = new PositionVO(mapPosition.level, x, y);
                        this.fillRoundedRect(ctx, sectorXpx - bgPadding, sectorYpx - bgPadding, sectorSize + bgPadding * 2, sectorSize + bgPadding * 2, radius);
                    }
                }
            }
            
            this.drawGridOnCanvas(ctx, sectorSize, dimensions, centered);

            // sectors and paths
            for (var y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
                for (var x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
                    sector = visibleSectors[x + "." + y];
                    sectorStatus = SectorConstants.getSectorStatus(sector);
                    if (this.showSectorOnMap(centered, sector, sectorStatus)) {
                        sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).x;
                        sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).y;
                        sectorPos = new PositionVO(mapPosition.level, x, y);
                        this.drawSectorOnCanvas(ctx, x, y, sector, levelEntity, sectorStatus, sectorXpx, sectorYpx, sectorSize);
                        if (sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE) {
                            this.drawMovementLinesOnCanvas(ctx, mapPosition, sector, sectorPos, sectorXpx, sectorYpx, sectorSize, sectorPadding);
                        }
                    }
                }
            }

            // border on current
            var playerPosVO = this.playerPosNodes.head.position.getPosition();
            if (playerPosVO.level == levelVO.level) {
                sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, playerPosVO.sectorX, playerPosVO.sectorY).x;
                sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, playerPosVO.sectorX, playerPosVO.sectorY).y;
                ctx.strokeStyle = sunlit ? "#bbb" : "#666";
                ctx.lineWidth = centered ? 3 : 2;
                ctx.beginPath();
                ctx.arc(sectorXpx + sectorSize * 0.5, sectorYpx + 0.5 * sectorSize, sectorSize, 0, 2 * Math.PI);
                ctx.stroke();
            }

            CanvasConstants.updateScrollEnable($(canvas).attr("id"));
        },

        rebuildOverlay: function (mapPosition, overlayId, centered, visibleSectors, dimensions, sectorSelectedCallback) {
            var $overlay = $("#" + overlayId);
            $overlay.empty();
            $overlay.css("width", dimensions.canvasWidth + "px");
            $overlay.css("height", dimensions.canvasHeight + "px");

            var sectorSize = this.getSectorSize(centered);

            var sector;
            var sectorStatus;
            var sectorXpx;
            var sectorYpx;
            var sectorPos;
            for (var y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
                for (var x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
                    sector = visibleSectors[x + "." + y];
                    sectorStatus = SectorConstants.getSectorStatus(sector);
                    if (this.showSectorOnMap(centered, sector, sectorStatus)) {
                        sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).x;
                        sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).y;
                        sectorPos = new PositionVO(mapPosition.level, x, y);
                        var data = "data-level='" + sectorPos.level + "' data-x='" + sectorPos.sectorX + "' data-y='" + sectorPos.sectorY + "'";
                        var $div = $("<div class='map-overlay-cell' style='top: " + sectorYpx + "px; left: " + sectorXpx + "px' " + data +"></div>");
                        if (sectorSelectedCallback) {
                            $div.click(function (e) {
                                var $target = $(e.target);
                                var level = $target.attr("data-level");
                                var x = $target.attr("data-x");
                                var y = $target.attr("data-y");
                                sectorSelectedCallback(level, x, y);
                            });
                        }
                        $overlay.append($div);
                    }
                }
            }
        },

        getSectorPixelPos: function (dimensions, centered, sectorSize, x, y) {
            var smallMapOffsetX = Math.max(0, (dimensions.canvasWidth - dimensions.mapWidth) / 2);
            var padding = this.getSectorPadding(centered);
            var margin = this.getSectorMargin(centered);
            return {
                x: sectorSize * margin + sectorSize * padding + (x - dimensions.minVisibleX) * sectorSize * (1 + padding) + smallMapOffsetX,
                y: sectorSize * margin + sectorSize * padding + (y - dimensions.minVisibleY) * sectorSize * (1 + padding)
            };
        },

        drawGridOnCanvas: function (ctx, sectorSize, dimensions, centered) {
            var gridSize = this.getGridSize();
            var sunlit = $("body").hasClass("sunlit");
            ctx.strokeStyle = sunlit ? "#d9d9d9" : "#343434";
            ctx.lineWidth = 1;
            var startGridX = (Math.floor(dimensions.mapMinX / gridSize) - 1) * gridSize;
            var endGridX = (Math.ceil(dimensions.mapMaxX / gridSize) + 2) * gridSize;
            var startGridY = (Math.floor(dimensions.mapMinY / gridSize) - 1) * gridSize;
            var endGridY = (Math.ceil(dimensions.mapMaxY / gridSize) + 1) * gridSize;
            for (var y = startGridY; y <= endGridY; y += gridSize) {
                for (var x = startGridX; x <= endGridX; x += gridSize) {
                    var gridX = x - (gridSize - 1 / 2);
                    var gridY = y - (gridSize - 1 / 2);
                    ctx.strokeRect(
                        this.getSectorPixelPos(dimensions, centered, sectorSize, gridX, gridY).x - sectorSize * 0.5 + 2,
                        this.getSectorPixelPos(dimensions, centered, sectorSize, gridX, gridY).y - sectorSize * 0.5 + 2,
                        sectorSize * (gridSize - 1) * 2 - sectorSize * 0.5,
                         sectorSize * (gridSize - 1) * 2 - sectorSize * 0.5);
                }
            }
        },

        drawSectorOnCanvas: function (ctx, x, y, sector, levelEntity, sectorStatus, sectorXpx, sectorYpx, sectorSize) {
            var isLocationSunlit = $("body").hasClass("sunlit");
            ctx.fillStyle = this.getSectorFill(sectorStatus);
            ctx.fillRect(sectorXpx, sectorYpx, sectorSize, sectorSize);

            var iconSize = 10;
            var statusComponent = sector.get(SectorStatusComponent);
            var isScouted = statusComponent.scouted;

            // border for sectors with hazards or sunlight
            var isVisited = sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE && sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE;
            if (isVisited) {
                var isSectorSunlit = sector.get(SectorFeaturesComponent).sunlit;
                var hasSectorHazard = sector.get(SectorFeaturesComponent).hazards.hasHazards();
                if (isSectorSunlit || hasSectorHazard) {
                    ctx.strokeStyle = hasSectorHazard ? "#ee4444" : isLocationSunlit ? "#ffee11" : "#ddee66";
                    ctx.lineWidth = Math.ceil(sectorSize / 8);
                    ctx.beginPath();
                    ctx.moveTo(sectorXpx - 1, sectorYpx - 1);
                    ctx.lineTo(sectorXpx + sectorSize + 1, sectorYpx - 1);
                    ctx.lineTo(sectorXpx + sectorSize + 1, sectorYpx + sectorSize + 1);
                    ctx.lineTo(sectorXpx - 1, sectorYpx + sectorSize + 1);
                    ctx.lineTo(sectorXpx - 1, sectorYpx - 1);
                    ctx.stroke();
                }
            }

            // sector contents: resources
            var hasWater = false;
            var discoveredResources = GameGlobals.sectorHelper.getLocationDiscoveredResources(sector);
            var resourcesCollectable = sector.get(SectorFeaturesComponent).resourcesCollectable;
            var r = 0;
            for (var key in resourceNames) {
                var name = resourceNames[key];
                var colAmount = resourcesCollectable.getResource(name);
                if (colAmount > 0 || discoveredResources.indexOf(name) >= 0) {
                    if (name === "water") hasWater = true;
                    if (sectorSize > iconSize && isScouted) {
                        ctx.fillStyle = this.getResourceFill(name);
                        ctx.fillRect(sectorXpx + 2 + r * 4, sectorYpx + sectorSize - 5, 3, 3);
                        r++;
                    }
                }
            }

            // sector contents: points of interest
            var sectorFeatures = sector.get(SectorFeaturesComponent);
            var sectorPassages = sector.get(PassagesComponent);
            var localesComponent = sector.get(SectorLocalesComponent);
            var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
            var hasCampOnLevel = levelEntity.get(CampComponent) !== null;
            var iconPosX = sectorXpx + (sectorSize - iconSize) / 2;
            var iconPosY = sectorSize > iconSize ? sectorYpx + 1 : sectorYpx;

            var useSunlitImage = isLocationSunlit || (!isScouted && this.isMapRevealed);

            if (!isScouted && !this.isMapRevealed)
                ctx.drawImage(this.icons["unknown" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sector.has(WorkshopComponent))
                ctx.drawImage(this.icons["workshop" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sector.has(CampComponent))
                ctx.drawImage(this.icons["camp" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (!hasCampOnLevel && sectorFeatures.canHaveCamp())
                ctx.drawImage(this.icons["campable" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sectorPassages.passageUp)
                ctx.drawImage(this.icons["passage-up" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sectorPassages.passageDown)
                ctx.drawImage(this.icons["passage-down" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (unScoutedLocales > 0)
                ctx.drawImage(this.icons["interest" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (hasWater)
                ctx.drawImage(this.icons["water" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
        },

        drawMovementLinesOnCanvas: function (ctx, mapPosition, sector, sectorPos, sectorXpx, sectorYpx, sectorSize, sectorPadding) {
            var sunlit = $("body").hasClass("sunlit");
            var sectorPassages = sector.get(PassagesComponent);
            var sectorMiddleX = sectorXpx + sectorSize * 0.5;
            var sectorMiddleY = sectorYpx + sectorSize * 0.5;
            for (var i in PositionConstants.getLevelDirections()) {
                var direction = PositionConstants.getLevelDirections()[i];
                var neighbourPos = PositionConstants.getPositionOnPath(sectorPos, direction, 1);
                var neighbour = GameGlobals.levelHelper.getSectorByPosition(mapPosition.level, neighbourPos.sectorX, neighbourPos.sectorY);
                if (neighbour) {
                    var distX = neighbourPos.sectorX - sectorPos.sectorX;
                    var distY = neighbourPos.sectorY - sectorPos.sectorY;
                    ctx.strokeStyle = sunlit ? "#b0b0b0" : "#3a3a3a";
                    ctx.lineWidth = Math.ceil(sectorSize / 6);
                    ctx.beginPath();
                    ctx.moveTo(sectorMiddleX + 0.5 * sectorSize * distX, sectorMiddleY + 0.5 * sectorSize * distY);
                    ctx.lineTo(sectorMiddleX + (0.5 + sectorPadding) * sectorSize * distX, sectorMiddleY + (0.5 + sectorPadding) * sectorSize * distY);

                    ctx.stroke();

                    var blocker = sectorPassages.getBlocker(direction);
                    var blockerType = blocker ? blocker.type : "null";
                    if (blocker) {
                        var isBlocked = GameGlobals.movementHelper.isBlocked(sector, direction);
                        var isGang = blockerType === MovementConstants.BLOCKER_TYPE_GANG;
                        ctx.strokeStyle = !isGang ? "#dd0000" : (sunlit ? "#b0b0b0" : "#3a3a3a");
                        ctx.lineWidth = Math.ceil(sectorSize / 9);
                        ctx.beginPath();
                        ctx.arc(
                            sectorMiddleX + sectorSize * (1 + sectorPadding)/2 * distX,
                            sectorMiddleY + sectorSize * (1 + sectorPadding)/2 * distY,
                            sectorSize * 0.2,
                            0,
                            2 * Math.PI);
                        ctx.stroke();
                    }
                }
            }
        },

        showSectorOnMap: function (centered, sector, sectorStatus) {
            return this.isMapRevealed ? sector : sector  && sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
        },

        getCanvasMinimumWidth: function (canvas) {
            switch ($(canvas).attr("id")) {
                case "mainmap": return $(canvas).parent().width();
                case "minimap": return 208;
                default: return 0;
            }
        },

        getCanvasMinimumHeight: function (canvas) {
            switch ($(canvas).attr("id")) {
                case "mainmap": return 10;
                case "minimap": return 208;
                default: return 0;
            }
        },

        getMapSectorDimensions: function (canvasId, mapSize, centered, mapPosition, visibleSectors, allSectors) {
            var level = mapPosition.level;
            var levelVO = GameGlobals.levelHelper.getLevelEntityForPosition(level).get(LevelComponent).levelVO;
            var sectorSize = this.getSectorSize(centered);

            var dimensions = {};
            dimensions.mapMinX = levelVO.minX;
            dimensions.mapMaxX = levelVO.maxX;
            dimensions.mapMinY = levelVO.minY;
            dimensions.mapMaxY = levelVO.maxY;

            dimensions.canvasMinX = levelVO.minX;
            dimensions.canvasMaxX = levelVO.maxX;
            dimensions.canvasMinY = levelVO.minY;
            dimensions.canvasMaxY = levelVO.maxY;

            if (centered) {
                var levelSize = Math.max(Math.abs(levelVO.minX - levelVO.maxX), Math.abs(levelVO.minY - levelVO.maxY));
                mapSize = mapSize && mapSize > 0 ? mapSize : levelSize;
                if (mapSize % 2 === 0) mapSize = mapSize + 1;
                var mapDiameter = (mapSize - 1) / 2;
                dimensions.canvasMinX = mapPosition.sectorX - mapDiameter;
                dimensions.canvasMaxX = mapPosition.sectorX + mapDiameter;
                dimensions.canvasMinY = mapPosition.sectorY - mapDiameter;
                dimensions.canvasMaxY = mapPosition.sectorY + mapDiameter;
            }

            var sector;
            var sectorStatus;
            dimensions.minVisibleX = dimensions.mapMaxX + 1;
            dimensions.maxVisibleX = dimensions.mapMinX - 1;
            dimensions.minVisibleY = dimensions.mapMaxY + 1;
            dimensions.maxVisibleY = dimensions.mapMinY - 1;
            dimensions.maxVisibleY = dimensions.mapMinY - 1;
            for (var y = dimensions.mapMinY; y <= dimensions.mapMaxY; y++) {
                for (var x = dimensions.mapMinX; x <= dimensions.mapMaxX; x++) {
                    sector = GameGlobals.levelHelper.getSectorByPosition(mapPosition.level, x, y);
                    sectorStatus = SectorConstants.getSectorStatus(sector);
                    if (allSectors && sector) allSectors[x + "." + y] = sector;
                    // if map is centered, make a tr+td / node for empty sectors too
                    if (centered || this.showSectorOnMap(centered, sector, sectorStatus)) {
                        if (visibleSectors) visibleSectors[x + "." + y] = sector;
                        dimensions.minVisibleX = Math.min(dimensions.minVisibleX, x);
                        dimensions.maxVisibleX = Math.max(dimensions.maxVisibleX, x);
                        dimensions.minVisibleY = Math.min(dimensions.minVisibleY, y);
                        dimensions.maxVisibleY = Math.max(dimensions.maxVisibleY, y);
                    }
                }
            }

            dimensions.minVisibleX = Math.max(dimensions.minVisibleX, dimensions.canvasMinX);
            dimensions.maxVisibleX = Math.min(dimensions.maxVisibleX, dimensions.canvasMaxX);
            dimensions.minVisibleY = Math.max(dimensions.minVisibleY, dimensions.canvasMinY);
            dimensions.maxVisibleY = Math.min(dimensions.maxVisibleY, dimensions.canvasMaxY);

            var canvas = $("#" + canvasId);
            dimensions.mapWidth = (dimensions.maxVisibleX - dimensions.minVisibleX + (centered ? 1.5 : 1.5)) * sectorSize * (1 + this.getSectorPadding(centered)) + sectorSize * this.getSectorMargin(centered) * 2;
            dimensions.mapHeight = (dimensions.maxVisibleY - dimensions.minVisibleY + (centered ? 1.5 : 1.5)) * sectorSize * (1 + this.getSectorPadding(centered)) + sectorSize * this.getSectorMargin(centered) * 2;
            dimensions.canvasWidth = Math.max(dimensions.mapWidth, this.getCanvasMinimumWidth(canvas));
            dimensions.canvasHeight = Math.max(dimensions.mapHeight, this.getCanvasMinimumHeight(canvas));
            dimensions.sectorSize = sectorSize;

            return dimensions;
        },

        getSectorSize: function (centered) {
            return centered ? 16 : 10;
        },

        getGridSize: function () {
            return 10;
        },

        getSectorPadding: function (centered) {
            return 0.75;
        },
        
        getSectorMargin: function (centered) {
            return centered ? 0 : 2;
        },

        getSectorFill: function (sectorStatus) {
            var sunlit = $("body").hasClass("sunlit");
            switch (sectorStatus) {
                case SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE:
                case SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE:
                    return sunlit ? "#d0d0d0" : "#3a3a3a";

                case SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED:
                    return sunlit ? "#bbb" : "#666";

                case SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED:
                    return sunlit ? "#999" : "#999";

                case SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED:
                    return sunlit ? "#333" : "#ccc";
            }
        },

        getResourceFill: function (resourceName) {
            switch (resourceName) {
                case resourceNames.metal: return "#202020";
                case resourceNames.water: return "#2299ff";
                case resourceNames.food: return "#ff6622";
                case resourceNames.fuel: return "#dd66cc";
            }
        },
        
        fillRoundedRect: function (ctx, x, y, w, h, radius) {
            ctx.lineJoin = "round";
            ctx.lineWidth = radius;
            ctx.strokeRect(x+(radius/2), y+(radius/2), w-radius, h-radius);
            ctx.fillRect(x+(radius/2), y+(radius/2), w-radius, h-radius);
        }

    });

    return UIMapHelper;
});
