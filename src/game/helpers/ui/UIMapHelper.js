// Creates and updates maps (mini-map and main)
define(['ash',
    'game/constants/UIConstants',
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
    UIConstants, PositionConstants, SectorConstants,
    PlayerPositionNode,
    LevelComponent, CampComponent, SectorStatusComponent, SectorLocalesComponent, SectorFeaturesComponent, PassagesComponent, WorkshopComponent,
    PositionVO) {
    
    var UIMapHelper = Ash.Class.extend({
        
        levelHelper: null,
        sectorHelper: null,
        movementHelper: null,
        playerPosNodes: null,
        
        icons: [],
        
        SCROLL_INDICATOR_SIZE: 5,
        
        constructor: function (engine, levelHelper, sectorHelper, movementHelper) {
            this.levelHelper = levelHelper;
            this.sectorHelper = sectorHelper;
            this.movementHelper = movementHelper;
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            
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
        },
        
        enableScrollingForMap: function (canvasId) {
            $("#" + canvasId).mousedown({ helper: this }, this.onScrollableMapMouseDown);
            $("#" + canvasId).mouseup({ helper: this }, this.onScrollableMapMouseUp);
            $("#" + canvasId).mouseleave({ helper: this }, this.onScrollableMapMouseLeave);
            $("#" + canvasId).mousemove({ helper: this }, this.onScrollableMapMouseMove);
            
            $("#" + canvasId).addClass("scrollable");
            
            $("#" + canvasId).parent().wrap("<div class='scroll-position-container lvl13-box-2'></div>");
            $("#" + canvasId).parent().before("<div class='scroll-position-indicator scroll-position-indicator-vertical'/>");
            $("#" + canvasId).parent().before("<div class='scroll-position-indicator scroll-position-indicator-horizontal'/>");
            
            this.updateScrollEnable(canvasId);
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
        
        onScrollableMapMouseDown: function (e) {
            $(this).attr("scrolling", "true");
            $(this).attr("scrollStartX", Math.floor(e.pageX));
            $(this).attr("scrollStartY", Math.floor(e.pageY));
            $(this).attr("scrollStartXScrollLeft", Math.floor($(this).parent().scrollLeft()));
            $(this).attr("scrollStartXScrollTop", Math.floor($(this).parent().scrollTop()));
        },
        
        onScrollableMapMouseUp: function (e) {
            e.data.helper.snapScrollPositionToGrid($(this).attr("id"));
            $(this).attr("scrolling", "false");
        },
        
        onScrollableMapMouseLeave: function (e) {
            e.data.helper.snapScrollPositionToGrid($(this).attr("id"));
            $(this).attr("scrolling", "false");
        },
        
        onScrollableMapMouseMove: function (e) {
            var isScrolling = $(this).attr("scrolling") === "true";
            if (isScrolling) {
                var currentX = Math.floor(e.pageX);
                var currentY = Math.floor(e.pageY);
                var posX = currentX - parseInt($(this).attr("scrollStartX")) - parseInt($(this).attr("scrollStartXScrollLeft"));
                var posY = currentY - parseInt($(this).attr("scrollStartY")) - parseInt($(this).attr("scrollStartXScrollTop"));
                $(this).parent().scrollLeft(-posX);
                $(this).parent().scrollTop(-posY);
                e.data.helper.updateScrollIndicators($(this).attr("id"));
            }
        },
        
        snapScrollPositionToGrid: function (canvasId) {
            var scrollContainer = $("#" + canvasId).parent();
            scrollContainer.scrollLeft(Math.round(scrollContainer.scrollLeft() / 20) * 20);
            scrollContainer.scrollTop(Math.round(scrollContainer.scrollTop() / 20) * 20);
        },
        
        updateScrollIndicators: function (canvasId) {
            var scrollContainer = $("#" + canvasId).parent();
            var scrollIndicatorVertical = scrollContainer.siblings(".scroll-position-indicator-vertical")[0];
            var scrollIndicatorHorizontal = scrollContainer.siblings(".scroll-position-indicator-horizontal")[0];
            
            var verticalScrollHeight = Math.min(1, scrollContainer.height() / $("#" + canvasId).height());
            var verticalScrollWidth = Math.min(1, scrollContainer.width() / $("#" + canvasId).width());
            var scrollIndicatorVerticalHeight = $(scrollIndicatorVertical).parent().height() * verticalScrollHeight;
            var scrollIndicatorHorizontalWidth = $(scrollIndicatorHorizontal).parent().width() * verticalScrollWidth;
            $(scrollIndicatorVertical).css("height", scrollIndicatorVerticalHeight + "px");
            $(scrollIndicatorHorizontal).css("width", scrollIndicatorHorizontalWidth + "px");
            
            var scrollPosX = scrollContainer.scrollLeft();
            var maxScrollPosX = Math.max(0, -(scrollContainer.width() - $("#" + canvasId).width()));
            var scrollPosY = scrollContainer.scrollTop();
            var maxScrollPosY = Math.max(0, -(scrollContainer.height() - $("#" + canvasId).height()));
            var maxIndicatorTop = scrollContainer.height() - scrollIndicatorVerticalHeight;
            var maxIndicatorLeft = scrollContainer.width() - scrollIndicatorHorizontalWidth;
            $(scrollIndicatorVertical).css("top", this.SCROLL_INDICATOR_SIZE + (maxScrollPosY > 0 ? (scrollPosY / maxScrollPosY) * maxIndicatorTop : 0) + "px");
            $(scrollIndicatorHorizontal).css("left", this.SCROLL_INDICATOR_SIZE + (maxScrollPosX > 0 ? (scrollPosX / maxScrollPosX) * maxIndicatorLeft : 0) + "px");
        },
        
        updateScrollEnable: function (canvasId) {
            var scrollContainer = $("#" + canvasId).parent();
            var maxScrollPosX = Math.max(0, -(scrollContainer.width() - $("#" + canvasId).width()));
            var maxScrollPosY = Math.max(0, -(scrollContainer.height() - $("#" + canvasId).height()));
            var isScrollEnabled = maxScrollPosY > 0 || maxScrollPosX > 0;
            if (!isScrollEnabled && $("#" + canvasId).hasClass("scroll-enabled"))
                $("#" + canvasId).removeClass("scroll-enabled");
            if (isScrollEnabled && !$("#" + canvasId).hasClass("scroll-enabled"))
                $("#" + canvasId).addClass("scroll-enabled");
        },
        
        centerMapToPlayer: function (canvasId, mapPosition) {
            var sectorSize = this.getSectorSize(false);
            var mapDimensions = this.getMapSectorDimensions(canvasId, -1, false, mapPosition);
            var playerPosX = sectorSize + (mapPosition.sectorX - mapDimensions.minVisibleX) * sectorSize * 2;
            var playerPosY = sectorSize + (mapPosition.sectorY - mapDimensions.minVisibleY) * sectorSize * 2;
            $("#" + canvasId).parent().scrollLeft(playerPosX - $("#" + canvasId).parent().width() * 0.5);
            $("#" + canvasId).parent().scrollTop(playerPosY - $("#" + canvasId).parent().height() * 0.5);
            this.snapScrollPositionToGrid(canvasId);
            this.updateScrollIndicators(canvasId);
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
            ctx.fillStyle = sunlit ? "#fdfdfd" : "#202220";
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
            
            // sectors and paths
            for (var y = dimensions.minVisibleY; y <= dimensions.maxVisibleY; y++) {
                for (var x = dimensions.minVisibleX; x <= dimensions.maxVisibleX; x++) {
                    sector = visibleSectors[x + "." + y];
                    sectorStatus = SectorConstants.getSectorStatus(sector, this.levelHelper);
                    sectorXpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).x
                    sectorYpx = this.getSectorPixelPos(dimensions, centered, sectorSize, x, y).y;
                    
                    if (this.showSectorOnMap(centered, sector, sectorStatus)) {
                        sectorPos = new PositionVO(mapPosition.level, x, y);
                        this.drawSectorOnCanvas(ctx, sector, sectorStatus, sectorXpx, sectorYpx, sectorSize);
                        this.drawMovementLinesOnCanvas(ctx, mapPosition, sector, sectorPos, sectorXpx, sectorYpx, sectorSize);
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
            
            // border on map itself
            if (centered) {
                ctx.strokeStyle = sunlit ? "#aaa" : "#3a3a3a";
                ctx.beginPath();
                ctx.arc(
                        canvas.scrollWidth * 0.5,
                        canvas.scrollHeight * 0.5,
                        Math.min(canvas.scrollWidth, canvas.scrollHeight) * 0.5 + sectorSize - 2,
                        0,
                        2 * Math.PI);
                ctx.stroke();
            }
            
            this.updateScrollEnable($(canvas).attr("id"));
        },
            
        getSectorPixelPos: function (dimensions, centered, sectorSize, x, y) {
            var smallMapOffsetX = Math.max(0, (dimensions.canvasWidth - dimensions.mapWidth) / 2);
            return {
                x: sectorSize + (x - dimensions.minVisibleX) * sectorSize * 2 + smallMapOffsetX,
                y: sectorSize + (y - dimensions.minVisibleY) * sectorSize * 2
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
            ctx.fillStyle = this.getSectorFill(sectorStatus);
            ctx.fillRect(sectorXpx, sectorYpx, sectorSize, sectorSize);
            var sunlit = $("body").hasClass("sunlit");
            
            // border for sunlit sectors
            if (sector.get(SectorFeaturesComponent).sunlit) {
                ctx.strokeStyle = sunlit ? "#ffee11" : "#ddee66";
                ctx.lineWidth = Math.ceil(sectorSize / 8);
                ctx.beginPath();
                ctx.moveTo(sectorXpx - 1, sectorYpx - 1);
                ctx.lineTo(sectorXpx + sectorSize + 1, sectorYpx - 1);
                ctx.lineTo(sectorXpx + sectorSize + 1, sectorYpx + sectorSize + 1);
                ctx.lineTo(sectorXpx - 1, sectorYpx + sectorSize + 1);
                ctx.lineTo(sectorXpx - 1, sectorYpx - 1);
                ctx.stroke();
            }
            
            // sector contents: points of interest
            var sectorPassages = sector.get(PassagesComponent);
            var statusComponent = sector.get(SectorStatusComponent);
            var localesComponent = sector.get(SectorLocalesComponent);
            var isScouted = statusComponent.scouted;
            var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
            var iconSize = 10;
            var iconPosX = sectorXpx + (sectorSize - iconSize) / 2;
            var iconPosY = sectorSize > iconSize ? sectorYpx + 1 : sectorYpx;
            
            if (!isScouted)
                ctx.drawImage(this.icons["unknown" + (sunlit ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (unScoutedLocales > 0)
                ctx.drawImage(this.icons["interest" + (sunlit ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sector.has(WorkshopComponent))
                ctx.drawImage(this.icons["workshop" + (sunlit ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sector.has(CampComponent))
                ctx.drawImage(this.icons["camp" + (sunlit ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sectorPassages.passageUp)
                ctx.drawImage(this.icons["passage-up" + (sunlit ? "-sunlit" : "")], iconPosX, iconPosY);
            else if (sectorPassages.passageDown)
                ctx.drawImage(this.icons["passage-down" + (sunlit ? "-sunlit" : "")], iconPosX, iconPosY);
                
            // sector contents: resources
            if (sectorSize > iconSize) {
                var discoveredResources = this.sectorHelper.getLocationDiscoveredResources(sector);
                for (var r = 0; r < discoveredResources.length; r++) {
                    ctx.fillStyle = this.getResourceFill(discoveredResources[r]);
                    ctx.fillRect(sectorXpx + 2 + r * 4, sectorYpx + sectorSize - 5, 3, 3);
                }
            }
        },
        
        drawMovementLinesOnCanvas: function (ctx, mapPosition, sector, sectorPos, sectorXpx, sectorYpx, sectorSize) {
            var sunlit = $("body").hasClass("sunlit");
            var sectorPassages = sector.get(PassagesComponent);
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
                    ctx.moveTo(sectorXpx + sectorSize * 0.5 + 0.5 * sectorSize * distX, sectorYpx + sectorSize * 0.5 + 0.5 * sectorSize * distY);
                    ctx.lineTo(sectorXpx + sectorSize * 0.5 + 1.5 * sectorSize * distX, sectorYpx + sectorSize * 0.5 + 1.5 * sectorSize * distY);
                    ctx.stroke();
                    
                    
                    var blocker = sectorPassages.getBlocker(direction);
                    var blockerType = blocker ? blocker.type : "null";
                    if (blocker) {
                        var isBlocked = this.movementHelper.isBlocked(sector, direction);
                        ctx.strokeStyle = isBlocked ? "#dd0000" : (sunlit ? "#b0b0b0" : "#3a3a3a");
                        ctx.lineWidth = Math.ceil(sectorSize / 9);
                        ctx.beginPath();
                        ctx.arc(
                                sectorXpx + sectorSize * 0.5 + sectorSize * distX,
                                sectorYpx + sectorSize * 0.5 + sectorSize * distY,
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
                    $("#" + fallbackTableId + " tr#" + trID).append(UIConstants.getSectorTD(playerPosition, sector, this.levelHelper));
                }
            }
        },
        
        showSectorOnMap: function (centered, sector, sectorStatus) {
            return sector && sectorStatus !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
        },
        
        getCanvasMinimumWidth: function (canvas) {
            switch ($(canvas).attr("id")) {
                case "mainmap": return $(canvas).parent().width();
                case "minimap": return 198;
                default: return 0;
            }
        },
        
        getCanvasMinimumHeight: function (canvas) {
            switch ($(canvas).attr("id")) {
                case "mainmap": return 45;
                case "minimap": return 198;
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
            dimensions.mapWidth = (dimensions.maxVisibleX - dimensions.minVisibleX + (centered ? 1.5 : 1.5)) * sectorSize * 2;
            dimensions.mapHeight = (dimensions.maxVisibleY - dimensions.minVisibleY + (centered ? 1.5 : 1.5)) * sectorSize * 2;
            dimensions.canvasWidth = Math.max(dimensions.mapWidth, this.getCanvasMinimumWidth(canvas));
            dimensions.canvasHeight = Math.max(dimensions.mapHeight, this.getCanvasMinimumHeight(canvas));
            dimensions.sectorSize = sectorSize;
            
            return dimensions;
        },
        
        getSectorSize: function (centered) {
            return centered ? 18 : 10;
        },
        
        getSectorFill: function (sectorStatus) {
            var sunlit = $("body").hasClass("sunlit");
            switch (sectorStatus) {
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
