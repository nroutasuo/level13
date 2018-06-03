// Creates and updates maps (mini-map and main)
define(['ash',
    'game/constants/UIConstants',
    'game/constants/CanvasConstants',
    'game/constants/PositionConstants',
    'game/constants/SectorConstants',
    'game/nodes/PlayerPositionNode',
    'game/components/type/LevelComponent',
    'game/components/common/CampComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/vos/PositionVO'],
function (Ash,
    UIConstants, CanvasConstants, PositionConstants, SectorConstants,
    PlayerPositionNode,
    LevelComponent, CampComponent, SectorStatusComponent, SectorLocalesComponent, SectorFeaturesComponent, PassagesComponent, WorkshopComponent,
    PositionVO) {
    
    var UIMapHelper = Ash.Class.extend({
        
        levelHelper: null,
        sectorHelper: null,
        movementHelper: null,
        playerPosNodes: null,
        
        icons: [],
        
        isMapRevealed: false,
        
        constructor: function (engine, levelHelper, sectorHelper, movementHelper) {
            this.levelHelper = levelHelper;
            this.sectorHelper = sectorHelper;
            this.movementHelper = movementHelper;
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            this.isMapRevealed = false;
            
            this.icons["camp"] = new Image();
            this.icons["camp"].src = "img/map-camp.png";
            this.icons["camp-sunlit"] = new Image();
            this.icons["camp-sunlit"].src = "img/map-camp-sunlit.png";
            this.icons["passage-up"] = new Image();
            this.icons["passage-up"].src = "img/map-passage-up.png";
            this.icons["passage-up-sunlit"] = new Image();
            this.icons["passage-up-sunlit"].src = "img/map-passage-up-sunlit.png";
            this.icons["passage-down"] = new Image();
            this.icons["passage-down"].src = "img/map-passage-down.png";
            this.icons["passage-down-sunlit"] = new Image();
            this.icons["passage-down-sunlit"].src = "img/map-passage-down-sunlit.png";
            this.icons["interest"] = new Image();
            this.icons["interest"].src = "img/map-interest.png";
            this.icons["interest-sunlit"] = new Image();
            this.icons["interest-sunlit"].src = "img/map-interest-sunlit.png";
            this.icons["unknown"] = new Image();
            this.icons["unknown"].src = "img/map-unvisited.png";
            this.icons["unknown-sunlit"] = new Image();
            this.icons["unknown-sunlit"].src = "img/map-unvisited-sunlit.png";
            this.icons["workshop"] = new Image();
            this.icons["workshop"].src = "img/map-workshop.png";
            this.icons["workshop-sunlit"] = new Image();
            this.icons["workshop-sunlit"].src = "img/map-workshop-sunlit.png";
            this.icons["unknown-sunlit"].src = "img/map-unvisited-sunlit.png";
            this.icons["water"] = new Image();
            this.icons["water"].src = "img/map-water.png";
            this.icons["water-sunlit"] = new Image();
            this.icons["water-sunlit"].src = "img/map-water.png";
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
        
        rebuildMap: function (canvasId, fallbackTableId, mapPosition, mapSize, centered) {
            var canvas = $("#" + canvasId)[0];
            var ctx = canvas ? canvas.getContext && canvas.getContext('2d') : null;
            
            var visibleSectors = {};
            var allSectors = {};
            var mapDimensions = this.getMapSectorDimensions(canvasId, mapSize, centered, mapPosition, visibleSectors, allSectors);
            
            if (ctx) {
                this.rebuildMapWithCanvas(mapPosition, canvas, ctx, centered, visibleSectors, allSectors, mapDimensions);
            } else {
                this.rebuildMapWithFallback(fallbackTableId, centered, visibleSectors, mapDimensions);
            }
        },
        
        rebuildMapWithCanvas: function (mapPosition, canvas, ctx, centered, visibleSectors, allSectors, dimensions) {
            var sectorSize = this.getSectorSize(centered);
            var gridSize = 10;
            var sunlit = $("body").hasClass("sunlit");
            
            ctx.canvas.width = dimensions.canvasWidth;
            ctx.canvas.height = dimensions.canvasHeight;
            ctx.clearRect(0, 0, canvas.scrollWidth, canvas.scrollWidth);
            ctx.fillStyle = CanvasConstants.getBackgroundColor(sunlit);
            ctx.fillRect(0, 0, canvas.scrollWidth, canvas.scrollHeight);
            
            // city background
            var cityBackgroundMinX = this.getSectorPixelPos(dimensions, centered, sectorSize, dimensions.mapMinX, dimensions.mapMinY).x - (centered ? sectorSize : sectorSize / 2);
            var cityBackgroundMinY = this.getSectorPixelPos(dimensions, centered, sectorSize, dimensions.mapMinX, dimensions.mapMinY).y - (centered ? sectorSize : sectorSize / 2);
            var cityBackgroundMaxX = cityBackgroundMinX + (dimensions.mapMaxX - dimensions.mapMinX) * sectorSize * 2 + (centered ? sectorSize * 3 : sectorSize * 2);
            var cityBackgroundMaxY = cityBackgroundMinY + (dimensions.mapMaxY - dimensions.mapMinY) * sectorSize * 2 + (centered ? sectorSize * 3 : sectorSize * 2);
            ctx.fillStyle = sunlit ? "#efefef" : "#282a28";
            ctx.fillRect(
                cityBackgroundMinX,
                cityBackgroundMinY,
                cityBackgroundMaxX - cityBackgroundMinX,
                cityBackgroundMaxY - cityBackgroundMinY);
            
            this.drawGridOnCanvas(ctx, gridSize, sectorSize, dimensions, centered);
            
            var sector;
            var sectorStatus;
            var sectorXpx;
            var sectorYpx;
            var sectorPos;
            var sectorPadding = this.getSectorPadding(centered);
            
            // sectors and paths
            for (var y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
                for (var x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
                    sector = visibleSectors[x + "." + y];
                    sectorStatus = SectorConstants.getSectorStatus(sector, this.levelHelper);
                    sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).x;
                    sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).y;
                    
                    if (this.showSectorOnMap(centered, sector, sectorStatus)) {
                        sectorPos = new PositionVO(mapPosition.level, x, y);
                        this.drawSectorOnCanvas(ctx, sector, sectorStatus, sectorXpx, sectorYpx, sectorSize);
                        this.drawMovementLinesOnCanvas(ctx, mapPosition, sector, sectorPos, sectorXpx, sectorYpx, sectorSize, sectorPadding);
                    }
                }
            }
                        
            // border on current
            var playerPosVO = this.playerPosNodes.head.position.getPosition();
            sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, playerPosVO.sectorX, playerPosVO.sectorY).x;
            sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, playerPosVO.sectorX, playerPosVO.sectorY).y;
            ctx.strokeStyle = sunlit ? "#bbb" : "#666";
            ctx.lineWidth = centered ? 3 : 2;
            ctx.beginPath();
            ctx.arc(sectorXpx + sectorSize * 0.5, sectorYpx + 0.5 * sectorSize, sectorSize, 0, 2 * Math.PI);
            ctx.stroke();
            
            CanvasConstants.updateScrollEnable($(canvas).attr("id"));
        },
            
        getSectorPixelPos: function (dimensions, centered, sectorSize, x, y) {
            var smallMapOffsetX = Math.max(0, (dimensions.canvasWidth - dimensions.mapWidth) / 2);
            var padding = this.getSectorPadding(centered);
            return {
                x: sectorSize * padding + (x - dimensions.minVisibleX) * sectorSize * (1 + padding) + smallMapOffsetX,
                y: sectorSize * padding + (y - dimensions.minVisibleY) * sectorSize * (1 + padding)
            };
        },
        
        drawGridOnCanvas: function (ctx, gridSize, sectorSize, dimensions, centered) {
            var sunlit = $("body").hasClass("sunlit");
            ctx.strokeStyle = sunlit ? "#d9d9d9" : "#343434";
            ctx.lineWidth = 1;
            var startGridY = (Math.floor(dimensions.mapMinY / gridSize) - 1) * gridSize;
            var endGridY = (Math.ceil(dimensions.mapMaxY / gridSize) + 1) * gridSize;
            var startGridX = (Math.floor(dimensions.mapMinX / gridSize) - 1) * gridSize;
            var endGridX = (Math.ceil(dimensions.mapMaxX / gridSize) + 1) * gridSize;
            for (var y = startGridY; y <= endGridY; y += gridSize) {
                for (var x = startGridX; x <= endGridX; x += gridSize) {
                    ctx.strokeRect(
                        this.getSectorPixelPos(dimensions, centered, sectorSize, x - (gridSize - 1 / 2), y - (gridSize - 1 / 2)).x - sectorSize * 0.5,
                        this.getSectorPixelPos(dimensions, centered, sectorSize, x - (gridSize - 1 / 2), y - (gridSize - 1 / 2)).y - sectorSize * 0.5,
                        sectorSize * gridSize * 2,
                        sectorSize * gridSize * 2);
                }
            }
        },
        
        drawSectorOnCanvas: function (ctx, sector, sectorStatus, sectorXpx, sectorYpx, sectorSize) {
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
            var discoveredResources = this.sectorHelper.getLocationDiscoveredResources(sector);
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
            var sectorPassages = sector.get(PassagesComponent);
            var localesComponent = sector.get(SectorLocalesComponent);
            var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
            var iconPosX = sectorXpx + (sectorSize - iconSize) / 2;
            var iconPosY = sectorSize > iconSize ? sectorYpx + 1 : sectorYpx;
            
            var useSunlitImage = isLocationSunlit || (!isScouted && this.isMapRevealed);
            
            if (!isScouted && !this.isMapRevealed)
                ctx.drawImage(this.icons["unknown" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sector.has(WorkshopComponent))
                ctx.drawImage(this.icons["workshop" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sector.has(CampComponent))
                ctx.drawImage(this.icons["camp" + (useSunlitImage ? "-sunlit" : "")], iconPosX, iconPosY);
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
                var neighbour = this.levelHelper.getSectorByPosition(mapPosition.level, neighbourPos.sectorX, neighbourPos.sectorY);
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
                        var isBlocked = this.movementHelper.isBlocked(sector, direction);
                        ctx.strokeStyle = isBlocked ? "#dd0000" : (sunlit ? "#b0b0b0" : "#3a3a3a");
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
        
        rebuildMapWithFallback: function (fallbackTableId, centered, visibleSectors, dimensions) {
			var playerPosition = this.playerPosNodes.head.position;
            
            $("#" + fallbackTableId).empty();
            
            var minDrawY = Math.max(dimensions.minVisibleY, playerPosition.sectorY - 12);
            var maxDrawY = Math.min(dimensions.maxVisibleY, playerPosition.sectorY + 12);
            var minDrawX = Math.max(dimensions.minVisibleX, playerPosition.sectorX - 15);
            var maxDrawX = Math.min(dimensions.maxVisibleX, playerPosition.sectorX + 15);
            
            var sector;
            var sectorStatus;
            for (var y = minDrawY; y <= maxDrawY; y++) {
                var trID = "minimap-fallback-tr-" + y;
                $("#" + fallbackTableId).append("<tr id=" + trID + "></tr>");
                for (var x = minDrawX; x <= maxDrawX; x++) {
                    sector = visibleSectors[x + "." + y];
                    $("#" + fallbackTableId + " tr#" + trID).append(UIConstants.getSectorMapTD(playerPosition, sector, this.levelHelper));
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
                case "mainmap": return 45;
                case "minimap": return 208;
                default: return 0;
            }
        },
        
        getMapSectorDimensions: function (canvasId, mapSize, centered, mapPosition, visibleSectors, allSectors) {
            var level = mapPosition.level;
            var levelVO = this.levelHelper.getLevelEntityForPosition(level).get(LevelComponent).levelVO;
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
                    sector = this.levelHelper.getSectorByPosition(mapPosition.level, x, y);
                    sectorStatus = SectorConstants.getSectorStatus(sector, this.levelHelper);
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
            dimensions.mapWidth = (dimensions.maxVisibleX - dimensions.minVisibleX + (centered ? 1.5 : 1.5)) * sectorSize * (1 + this.getSectorPadding(centered));
            dimensions.mapHeight = (dimensions.maxVisibleY - dimensions.minVisibleY + (centered ? 1.5 : 1.5)) * sectorSize * (1 + this.getSectorPadding(centered));
            dimensions.canvasWidth = Math.max(dimensions.mapWidth, this.getCanvasMinimumWidth(canvas));
            dimensions.canvasHeight = Math.max(dimensions.mapHeight, this.getCanvasMinimumHeight(canvas));
            dimensions.sectorSize = sectorSize;
            
            return dimensions;
        },
        
        getSectorSize: function (centered) {
            return centered ? 16 : 10;
        },
        
        getSectorPadding: function (centered) {
            return 0.75;
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
        
    });

    return UIMapHelper;
});
