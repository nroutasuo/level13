// Creates and updates maps (mini-map and main)
define(['ash',
    'game/constants/UIConstants',
    'game/constants/PositionConstants',
    'game/nodes/PlayerPositionNode',
    'game/components/type/LevelComponent',
    'game/components/common/CampComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/improvements/WorkshopComponent',
    'game/vos/PositionVO'],
function (Ash,
    UIConstants, PositionConstants,
    PlayerPositionNode,
    LevelComponent, CampComponent, SectorStatusComponent, SectorLocalesComponent, PassagesComponent, WorkshopComponent,
    PositionVO) {
    
    var UIMapHelper = Ash.Class.extend({
        
        levelHelper: null,
        sectorHelper: null,
        playerPosNodes: null,
        
        icons: [],
        
        constructor: function (engine, levelHelper, sectorHelper) {
            this.levelHelper = levelHelper;
            this.sectorHelper = sectorHelper;
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
            
            this.icons["camp"] = new Image();
            this.icons["camp"].src = "img/map-camp.png";
            this.icons["passage-up"] = new Image();
            this.icons["passage-up"].src = "img/map-passage-up.png";
            this.icons["passage-down"] = new Image();
            this.icons["passage-down"].src = "img/map-passage-down.png";
            this.icons["interest"] = new Image();
            this.icons["interest"].src = "img/map-interest.png";
            this.icons["unknown"] = new Image();
            this.icons["unknown"].src = "img/map-unvisited.png";
            this.icons["workshop"] = new Image();
            this.icons["workshop"].src = "img/map-workshop.png";
        },
        
        rebuildMap: function (canvasId, fallbackTableId, mapSize, centered) {
            var canvas = $("#" + canvasId)[0];
            var ctx = canvas.getContext && canvas.getContext('2d');
            
			var playerPosition = this.playerPosNodes.head.position;
            var level = playerPosition.level;
            var levelVO = this.levelHelper.getLevelEntityForPosition(level).get(LevelComponent).levelVO;
            
            var mapMinX = levelVO.minX;
            var mapMaxX = levelVO.maxX;
            var mapMinY = levelVO.minY;
            var mapMaxY = levelVO.maxY;
            
            if (centered) {
                var levelSize = Math.max(Math.abs(levelVO.minX - levelVO.maxX), Math.abs(levelVO.minY - levelVO.maxY));
                mapSize = mapSize && mapSize > 0 ? mapSize : levelSize;
                if (mapSize % 2 === 0) mapSize = mapSize + 1;
                var mapDiameter = (mapSize - 1) / 2;
                mapMinX = playerPosition.sectorX - mapDiameter;
                mapMaxX = playerPosition.sectorX + mapDiameter;
                mapMinY = playerPosition.sectorY - mapDiameter;
                mapMaxY = playerPosition.sectorY + mapDiameter;
            }

            var sector;
            var sectorStatus;
            var minVisibleX = mapMaxX + 1;
            var maxVisibleX = mapMinX - 1;
            var minVisibleY = mapMaxY + 1;
            var maxVisibleY = mapMinY - 1;
            var visibleSectors = {};
            for (var y = mapMinY; y <= mapMaxY; y++) {
                for (var x = mapMinX; x <= mapMaxX; x++) {
                    sector = this.levelHelper.getSectorByPosition(playerPosition.level, x, y);
                    sectorStatus = UIConstants.getSectorStatus(playerPosition, sector);
                    // if map is centered, make a tr+td for empty sectors too
                    if (centered || this.showSectorOnMap(centered, sector, sectorStatus)) {
                        visibleSectors[x + "." + y] = sector;
                        minVisibleX = Math.min(minVisibleX, x);
                        maxVisibleX = Math.max(maxVisibleX, x);
                        minVisibleY = Math.min(minVisibleY, y);
                        maxVisibleY = Math.max(maxVisibleY, y);
                    }
                }
            }
            
            if (ctx) {
                this.rebuildMapWithCanvas(canvas, ctx, centered, visibleSectors, minVisibleX, maxVisibleX, minVisibleY, maxVisibleY);
            } else {
                this.rebuildMapWithFallback(fallbackTableId, centered, visibleSectors, minVisibleX, maxVisibleX, minVisibleY, maxVisibleY);
            }
        },
        
        rebuildMapWithCanvas: function (canvas, ctx, centered, visibleSectors, minVisibleX, maxVisibleX, minVisibleY, maxVisibleY) {
			var playerPosition = this.playerPosNodes.head.position;
			var playerPositionVO = this.playerPosNodes.head.position.getPosition();
            
            // TODO adjust canvas size to available space
            var canvasSize = canvas.scrollWidth;
            var sectorSize = centered ? 18 : 10;
            
            ctx.clearRect(0, 0, canvas.scrollWidth, canvas.scrollWidth);
            
            var sector;
            var sectorStatus;
            var sectorXpx;
            var sectorYpx;
            var sectorPos;
            for (var y = minVisibleY; y <= maxVisibleY; y++) {
                for (var x = minVisibleX; x <= maxVisibleX; x++) {
                    sector = visibleSectors[x + "." + y];
                    sectorStatus = UIConstants.getSectorStatus(playerPosition, sector);
                    sectorXpx = sectorSize + (x - minVisibleX) * sectorSize * 2;
                    sectorYpx = sectorSize + (y - minVisibleY) * sectorSize * 2;
                    
                    if (this.showSectorOnMap(centered, sector, sectorStatus)) {
                        sectorPos = new PositionVO(playerPosition.level, x, y);
                        
                        // sector itself
                        ctx.fillStyle = this.getSectorFill(sectorStatus);
                        ctx.fillRect(sectorXpx, sectorYpx, sectorSize, sectorSize);
                        
                        // sector contents: points of interest
                        var sectorPassages = sector.get(PassagesComponent);
                        var statusComponent = sector.get(SectorStatusComponent);
                        var statusComponent = sector.get(SectorStatusComponent);
                        var localesComponent = sector.get(SectorLocalesComponent);
                        var isScouted = statusComponent.scouted;
                        var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
                        var iconPosX = centered ? sectorXpx + 4 : sectorXpx;
                        var iconPosY = centered ? sectorYpx + 1 : sectorYpx;
                        if (!isScouted)
                            ctx.drawImage(this.icons["unknown"], iconPosX, iconPosY);
                        else if (unScoutedLocales > 0)
                            ctx.drawImage(this.icons["interest"], iconPosX, iconPosY);
                        else if (sector.has(WorkshopComponent))
                            ctx.drawImage(this.icons["workshop"], iconPosX, iconPosY);
                        else if (sector.has(CampComponent))
                            ctx.drawImage(this.icons["camp"], iconPosX, iconPosY);
                        else if (sectorPassages.passageUp)
                            ctx.drawImage(this.icons["passage-up"], iconPosX, iconPosY);
                        else if (sectorPassages.passageDown)
                            ctx.drawImage(this.icons["passage-down"], iconPosX, iconPosY);
                            
                        // sector contents: resources
                        if (centered) {
                            var discoveredResources = this.sectorHelper.getLocationDiscoveredResources(sector);
                            for (var r = 0; r < discoveredResources.length; r++) {
                                ctx.fillStyle = this.getResourceFill(discoveredResources[r]);
                                ctx.fillRect(sectorXpx + 2 + r * 4, sectorYpx + sectorSize - 5, 3, 3);
                            }
                        }

                        // lines to neighbours
                        ctx.strokeStyle = "#3a3a3a";
                        ctx.lineWidth = centered ? 3 : 2;
                        for (var i in PositionConstants.getLevelDirections()) {
                            var direction = PositionConstants.getLevelDirections()[i];
                            var neighbourPos = PositionConstants.getPositionOnPath(sectorPos, direction, 1);
                            var neighbour = this.levelHelper.getSectorByPosition(playerPosition.level, neighbourPos.sectorX, neighbourPos.sectorY);
                            if (neighbour) {
                                var distX = neighbourPos.sectorX - sectorPos.sectorX;
                                var distY = neighbourPos.sectorY - sectorPos.sectorY;
                                ctx.beginPath();
                                ctx.moveTo(sectorXpx + sectorSize * 0.5 + 0.5 * sectorSize * distX, sectorYpx + sectorSize * 0.5 + 0.5 * sectorSize * distY);
                                ctx.lineTo(sectorXpx + sectorSize * 0.5 + 1.5 * sectorSize * distX, sectorYpx + sectorSize * 0.5 + 1.5 * sectorSize * distY);
                                ctx.stroke();
                            }
                        }
                    }
                }
            }
                        
            // border on current
            var playerPosVO = playerPosition.getPosition();
            var borderOffset = centered ? 5 : 3;
            sectorXpx = sectorSize + (playerPosVO.sectorX - minVisibleX) * sectorSize * 2;
            sectorYpx = sectorSize + (playerPosVO.sectorY - minVisibleY) * sectorSize * 2;
            ctx.strokeStyle = "#3a3a3a";
            ctx.lineWidth = centered ? 2 : 1;
            ctx.beginPath();
            ctx.arc(sectorXpx + sectorSize * 0.5, sectorYpx + 0.5 * sectorSize, sectorSize, 0, 2 * Math.PI);
            ctx.stroke();
            
            // border on map itself
            if (centered) {
                ctx.strokeStyle = "#3a3a3a";
                ctx.beginPath();
                ctx.arc(
                        canvas.scrollWidth * 0.5,
                        canvas.scrollHeight * 0.5,
                        Math.min(canvas.scrollWidth, canvas.scrollHeight) * 0.5 + sectorSize - 2,
                        0,
                        2 * Math.PI);
                ctx.stroke();
            }
        },
        
        rebuildMapWithFallback: function (fallbackTableId, centered, visibleSectors, minVisibleX, maxVisibleX, minVisibleY, maxVisibleY) {
			var playerPosition = this.playerPosNodes.head.position;
            
            $("#" + fallbackTableId).empty();
            
            var sector;
            var sectorStatus;
            for (var y = minVisibleY; y <= maxVisibleY; y++) {
                var trID = "minimap-fallback-tr-" + y;
                $("#" + fallbackTableId).append("<tr id=" + trID + "></tr>");
                for (var x = minVisibleX; x <= maxVisibleX; x++) {
                    sector = visibleSectors[x + "." + y];
                    $("#" + fallbackTableId + " tr#" + trID).append(UIConstants.getSectorTD(playerPosition, sector));
                }
            }
        },
        
        showSectorOnMap: function (centered, sector, sectorStatus) {
            return sector && sectorStatus !== UIConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
        },
        
        getSectorFill: function (sectorStatus) {
            switch (sectorStatus) {
                case UIConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE:
                    return "#3a3a3a";
                
                case UIConstants.MAP_SECTOR_STATUS_UNVISITED_VISITED:
                    return "#666";
                
                case UIConstants.MAP_SECTOR_STATUS_UNVISITED_SCOUTED:
                    return "#999";
                
                case UIConstants.MAP_SECTOR_STATUS_UNVISITED_CLEARED:
                    return "#ccc";
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
