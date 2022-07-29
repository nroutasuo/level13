define([
	'ash',
	'utils/MathUtils',
	'utils/CanvasUtils',
	'utils/UIState',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/ColorConstants',
	'game/nodes/PlayerLocationNode',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/type/LevelComponent',
], function (
	Ash, MathUtils, CanvasUtils, UIState, GameGlobals, GlobalSignals, ColorConstants, PlayerLocationNode, SectorImprovementsComponent, LevelComponent
) {

	var UIOutCampVisSystem = Ash.System.extend({
		
		playerLocationNodes: null,
		
		elements: {},
		
		constructor: function () {
			this.elements.container = $("#tab-vis-in-container");
			this.elements.canvas = $("#campvis");
			this.elements.layerBuildings = $("#vis-camp-layer-buildings");
			this.elements.infoOverlay = $("#vis-camp-info-overlay");
			this.elements.infoText = $("#vis-camp-info-overlay span");
			this.ctx = CanvasUtils.getCTX(this.elements.canvas);
			
			this.containerDefaultHeight = 96;
			this.buildingContainerSizeX = 14;
			this.floorPos = 20;
			this.floorThickness = 20;
			this.zStep = 4;
			
			return this;
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.windowResizedSignal, this.onResize);
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.onResize);
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onResize);
			
			this.refresh();
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			GlobalSignals.removeAll(this);
		},
		
		update: function () { },
		
		onResize: function () {
			this.previousContainerWidth = this.containerWidth;
			this.previousContainerHeight = this.containerHeight;
			var diffWidth = Math.abs(this.containerWidth - this.previousContainerWidth);
			var diffHeight = Math.abs(this.containerHeight - this.previousContainerHeight);
			this.refresh();
		},
		
		refresh: function () {
			if (!this.playerLocationNodes.head) return;
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.in) return;
			
			this.refreshSettings();
			this.refreshGrid();
			this.refreshFloor();
			this.refreshBuildings();
			this.updateInfoOverlay();
		},
		
		refreshSettings: function () {
			var level = this.playerLocationNodes.head.position.level;
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
			var levelEntity = GameGlobals.levelHelper.getLevelEntityForPosition(level);
			var levelComponent = levelEntity.get(LevelComponent);
			// TODO add more detail depending on world structure (what kind of sector/level the camp is actually located on)
			// TODO define constants someplace neater
			var settings = Object.assign({}, this.campSettings[campOrdinal] || {});
			settings.populationFactor = levelComponent.populationFactor;
			settings.raidDangerFactor = levelComponent.raidDangerFactor;
			GameGlobals.campVisHelper.initCampSettings(campOrdinal, settings);
		},
		
		refreshGrid: function () {
			var parentWidth = this.elements.container.parent().width();
			this.containerWidth = Math.max(100, parentWidth);
			this.containerHeight = this.containerDefaultHeight;
			this.elements.container.css("width", this.containerWidth + "px");
			this.elements.container.css("height", this.containerHeight + "px");
			this.elements.canvas.attr("width", this.containerWidth);
			this.elements.canvas.attr("height", this.containerHeight);
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
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
			var reset = this.buildingsLevel !== level;
			
			// update divs
			if (reset) {
				if (this.elements.buildings) {
					for (var name in this.elements.buildings) {
						for (var n = 0; n < this.elements.buildings[name].length; n++) {
							for (let j = 0; j < this.elements.buildings[name][n].length; j++) {
								if (this.elements.buildings[name][n][j]) {
									this.elements.buildings[name][n][j].remove();
								}
							}
						}
					}
				}
				this.elements.buildings = {};
			}
			
			var buildingCoords = [];
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var all = improvements.getAll(improvementTypes.camp);
			var sundome = improvements.getVO(improvementNames.sundome);
			if (sundome) all.push(sundome);
			
			var building;
			var buildingsToDraw = [[],[],[],[],[]];
			for (let i = 0; i < all.length; i++) {
				building = all[i];
				var size = this.getBuildingSize(building);
				var count = building.count;
				var visualCount = building.getVisCount();
				if (!this.elements.buildings[building.name]) this.elements.buildings[building.name] = [];
				for (var n = 0; n < count; n++) {
					if (!this.elements.buildings[building.name][n]) this.elements.buildings[building.name][n] = [];
					for (let j = 0; j < visualCount; j++) {
						// get coords
						var coords = this.getBuildingCoords(campOrdinal, improvements, building, n, j);
						if (!coords) {
							log.w("No coordinates found for building " + building.name + " " + n + " " + j);
							continue;
						}

						// add missing buildings
						var $elem = this.elements.buildings[building.name][n][j];
						if (!$elem) {
							$elem = $(this.getBuildingDiv(i, building, n, j, coords));
							this.elements.layerBuildings.append($elem);
							this.elements.buildings[building.name][n][j] = $elem;
							if (this.isHoverable(building.name)) {
								$elem.mouseleave({ system: this, building: building.name }, this.onMouseLeaveBuilding);
								$elem.mouseenter({ system: this, building: building.name }, this.onMouseEnterBuilding);
							}
						}
						
						buildingCoords.push({ building: building, n: n, j: j, coords: coords });

						// position building
						var xpx = this.getXpx(coords.x, coords.z, size);
						var ypx = this.getYpx(coords.x, coords.z, size);
						$elem.css("left", xpx + "px");
						$elem.css("top", ypx + "px");
						buildingsToDraw[coords.z].push({building: building, coords: coords, n: n});
					}
				}
			}
			
			// update canvas
			if (this.ctx) {
				this.ctx.clearRect(0, 0, this.containerWidth, this.containerHeight);
				for (var z = buildingsToDraw.length - 1; z >= 0; z--) {
					for (let i = 0; i < buildingsToDraw[z].length; i++) {
						var vo = buildingsToDraw[z][i];
						this.drawBuildingOnCanvas(vo.building, vo.coords, vo.n);
					}
				}
			}
			
			this.checkOverlaps(buildingCoords);
			
			this.buildingsLevel = level;
		},
		
		drawBuildingOnCanvas: function (building, coords, n) {
			var size = this.getBuildingSize(building);
			var xpx = this.getXpx(coords.x, coords.z, size);
			var ypx = this.getYpx(coords.x, coords.z, size);
			var tipx = xpx + size.x / 2;
			var tipy = ypx;
			var basex = xpx + size.x / 2;
			var basey = ypx + size.y;
			var middlex = xpx + size.x / 2;
			var middley = ypx + size.y / 2;
			var xleft = xpx;
			var xright = xpx + size.x;
			var ytop = ypx;
			var ybottom = ypx + size.y;
			let defaultAnglePadding = Math.PI / 6;
			
			// glass / see-through shape
			var color = this.getBuildingColor(building, coords);
			this.ctx.fillStyle = color;
			this.ctx.strokeStyle = color;
			this.ctx.globalAlpha = 0.5;
			switch (building.name) {
				case improvementNames.darkfarm:
					var triangleH = size.y / 3;
					CanvasUtils.drawTriangle(this.ctx, color, size.x, triangleH, tipx, tipy, -90 * Math.PI / 180);
					this.ctx.fillRect(xpx, ypx + triangleH, size.x, size.y - triangleH);
					break;
				case improvementNames.market:
					this.ctx.fillRect(xpx+2, ypx + roofh + 2, size.x-4, size.y-roofh-2);
					break;
				case improvementNames.tradepost:
					var arcr = size.x / 2;
					CanvasUtils.drawCircle(this.ctx, color, middlex, ypx + arcr, arcr);
					break;
				case improvementNames.temple:
					var arcr = Math.min(size.x / 2, size.y / 2);
					CanvasUtils.drawArc(this.ctx, color, middlex, middley, arcr, Math.PI - defaultAnglePadding, defaultAnglePadding);
					break;
				case improvementNames.sundome:
					let rX = this.containerWidth / 2 - size.x * 3;
					let rY = size.y * 6;
					this.ctx.lineWidth = 5;
					CanvasUtils.drawEllipse(this.ctx, color, middlex, basey, rX, rY, Math.PI - defaultAnglePadding, 0 + defaultAnglePadding, true);
					break;
			}
			
			// main structure
			var color = this.getBuildingColor(building, coords);
			this.ctx.fillStyle = color;
			this.ctx.strokeStyle = color;
			this.ctx.globalAlpha = 1;
			this.ctx.lineWidth = 1;
			switch (building.name) {
				case improvementNames.campfire:
					CanvasUtils.drawTriangle(this.ctx, color, size.x, size.y, tipx, tipy, -90 * Math.PI / 180);
					break;
				case improvementNames.cementmill:
					this.ctx.fillRect(xpx, middley, size.x, size.y/2);
					CanvasUtils.drawTriangle(this.ctx, color, size.x, size.y, xright, ypx, -60 * Math.PI / 180);
					break;
				case improvementNames.darkfarm:
					var triangleH = size.y / 3;
					var xw = size.x / 3;
					var yh = (size.y - triangleH) / 2;
					CanvasUtils.drawTriangle(this.ctx, color, size.x, triangleH, tipx, tipy, -90 * Math.PI / 180, true);
					for (var y = triangleH; y < size.y; y += yh) {
						this.ctx.strokeRect(xpx, ypx+y, size.x, yh);
					}
					CanvasUtils.drawLine(this.ctx, xpx + xw, ypx + 2, xpx + xw, ybottom);
					CanvasUtils.drawLine(this.ctx, xpx + xw*2, ypx + 2, xpx + xw*2, ybottom);
					break;
				case improvementNames.fortification:
					var logw = 3;
					var logh = n == 0 ? size.y : n >= 4 ? size.y * 2 : size.y * 1.5;
					var logd = 18;
					var startx = n == 0 ? 0 : logd / 2;
					switch (n) {
						case 0:
						case 1:
							this.ctx.fillRect(xpx, middley, size.x, 2);
							for (var x = startx; x < size.x ; x += logd) {
								this.ctx.fillRect(middlex + x, ybottom - logh, logw, logh);
								this.ctx.fillRect(middlex - x, ybottom - logh, logw, logh);
							}
							break;
						case 2:
							this.ctx.fillRect(xpx, middley - 9, size.x, 4);
							break;
						case 3:
							var h = size.y * 0.75;
							this.ctx.fillRect(xpx, ybottom - h - 4, size.x, h);
							break;
						case 4:
							var h = size.y * 1;
							this.ctx.fillRect(xpx, ybottom - h - 3, size.x, h);
							break;
						default:
							var w = logd;
							var h = size.y * 2.5;
							var d = 2 + (n-4)*4;
							this.ctx.fillRect(middlex - logd * d, ybottom - h, w, h);
							this.ctx.fillRect(middlex + logd * d, ybottom - h, w, h);
							break;
					}
					break;
				case improvementNames.generator:
					var legh = 2;
					var legw = 2;
					this.ctx.fillRect(xpx, ypx, size.x, size.y - legh);
					this.ctx.fillRect(xleft, ypx, legw, size.y);
					this.ctx.fillRect(xright - legw, ypx, legw, size.y);
					break;
				case improvementNames.home:
					CanvasUtils.drawTriangle(this.ctx, color, size.x, size.y/2+1, tipx, tipy, -90 * Math.PI / 180);
					this.ctx.fillRect(xpx, middley-1, size.x, size.y/2+1);
					break;
				case improvementNames.hospital:
					var legh = 5;
					var legw = 3;
					this.ctx.fillRect(xpx, ypx, size.x, size.y - legh);
					this.ctx.fillRect(xpx-1, ybottom-legh, size.x+2, 2);
					this.ctx.fillRect(xleft + 2, ypx, legw, size.y);
					this.ctx.fillRect(xright - legw -2, ypx, legw, size.y);
					break;
				case improvementNames.house:
					this.ctx.beginPath();
					this.ctx.arc(middlex, middley, size.y/2, 0, 2 * Math.PI);
					this.ctx.fill();
					this.ctx.fillRect(xpx, middley, size.x, size.y/2);
					break;
				case improvementNames.house2:
					var antennah = 6;
					var antennaw = 2;
					var roofh = 3;
					var roofpaddingx = 2;
					this.ctx.fillRect(xpx, ypx + roofh + antennah, size.x, size.y - roofh - antennah);
					this.ctx.fillRect(xpx + roofpaddingx, ypx + antennah, size.x - roofpaddingx*2, roofh);
					this.ctx.fillRect(middlex - antennaw/2, ypx, antennaw, antennah);
					break;
				case improvementNames.library:
					this.ctx.fillRect(xpx, middley, size.x, size.y/2);
					this.ctx.fillRect(xpx, ypx, size.x, size.y/3);
					this.ctx.fillRect(xpx + 3, ypx, size.x - 6, size.y);
					break;
				case improvementNames.market:
					var roofh = 6;
					this.ctx.fillRect(xpx, ypx, size.x, roofh);
					this.ctx.fillRect(xpx, ybottom - 2, size.x, 2);
					this.ctx.fillRect(xpx+2, ypx + roofh + 2, size.x-4, size.y-roofh-2);
					break;
				case improvementNames.smithy:
					this.ctx.fillRect(xpx, middley, size.x, size.y/2);
					CanvasUtils.drawTriangle(this.ctx, color, size.x, size.y, xpx, ypx, -120 * Math.PI / 180);
					break;
				case improvementNames.stable:
					var paddingx = 2;
					this.ctx.fillRect(xpx + paddingx, ypx + size.y/3, size.x - paddingx*2, size.y/3*2);
					CanvasUtils.drawHexagon(this.ctx, color, size.x, middlex, ypx + size.x / 2);
					break;
				case improvementNames.storage:
					var triangleH = size.y / 5;
					CanvasUtils.drawTriangle(this.ctx, color, size.x, triangleH+2, tipx, tipy, -90 * Math.PI / 180);
					CanvasUtils.drawTriangle(this.ctx, color, size.x, triangleH+2, basex, basey, 90 * Math.PI / 180);
					this.ctx.fillRect(xpx, ypx + triangleH, size.x, size.y - triangleH * 2);
					this.ctx.fillRect(xleft, middley, 3, size.y / 2);
					this.ctx.fillRect(xright - 3, middley, 3, size.y / 2);
					break;
				case improvementNames.square:
					var h = 3;
					var h2 = size.y;
					var w = 3;
					this.ctx.fillRect(xpx, ybottom - h, size.x, h);
					this.ctx.fillRect(middlex - w/2, ybottom - 1 - h2, w, h2);
					this.ctx.fillRect(middlex - w, ybottom - 1 - h*2, w*2, h*2);
					break;
				case improvementNames.tradepost:
					var w = 4;
					var arcr = size.x / 2;
					this.ctx.fillRect(middlex - w/2, ypx + arcr * 2, w, size.y - arcr * 2);
					this.ctx.fillRect(xpx-1, ypx + arcr, size.x+2, 4);
					this.ctx.fillRect(xpx + 2, ypx + arcr + 4, size.x - 4, 6);
					this.ctx.fillRect(xpx, ypx + arcr + 4 + 6 - 1, size.x, 2);
					var basew = size.x / 3 * 2;
					CanvasUtils.drawTriangle(this.ctx, color, basew, basew, middlex, ybottom - basew + 1, -90 * Math.PI / 180);
					break;
				case improvementNames.shrine:
					var baseH = 4;
					this.ctx.fillRect(xpx, basey - baseH, size.x, baseH);
					this.ctx.fillRect(xpx - 1, basey - baseH - 2, size.x + 2, 3);
					CanvasUtils.drawTriangle(this.ctx, color, size.x - 2, size.y, tipx, tipy, -90 * Math.PI / 180);
					break;
				case improvementNames.temple:
					var baseH = size.y / 3;
					var towerW = 2;
					var towerH = size.y / 2;
					this.ctx.fillRect(xpx, basey - baseH, size.x, baseH);
					this.ctx.fillRect(xleft, ypx + size.y - towerH, towerW, towerH);
					this.ctx.fillRect(xright - towerW, ypx + size.y - towerH, towerW, towerH);
					break;
				case improvementNames.sundome:
					break;
				default:
					this.ctx.fillRect(xpx, ypx, size.x, size.y);
					break;
			}
			
			// details
			var detailcolor = this.getBuildingDetailColor(building, coords);
			this.ctx.fillStyle = detailcolor;
			this.ctx.strokeStyle = detailcolor;
			this.ctx.lineWidth = 2;
			switch (building.name) {
				case improvementNames.hospital:
					CanvasUtils.fillWithRectangles(this.ctx, detailcolor, xpx, ypx, size.x, size.y - 8, 2, 2, 2, 2, 3, 1);
					break;
				case improvementNames.house2:
					var antennah = 6;
					var roofh = 3;
					var bottomh = 2;
					CanvasUtils.fillWithRectangles(this.ctx, detailcolor, xpx, ypx + antennah + roofh, size.x, size.y - antennah - roofh - bottomh, 2, 4, 2, 2, 2, 4);
					break;
				case improvementNames.inn:
					CanvasUtils.fillWithRectangles(this.ctx, detailcolor, xpx, ypx, size.x, size.y/3*2, 2, 2, 2, 2, 1, 2);
					break;
				case improvementNames.library:
					this.ctx.fillRect(xpx + 3, ypx + size.y/3, size.x - 6, size.y - size.y/3 - size.y/2);
					CanvasUtils.fillWithRectangles(this.ctx, detailcolor, xpx, ypx, size.x, size.y/3, 2, 2, 2, 2, 1, 3);
					CanvasUtils.fillWithRectangles(this.ctx, detailcolor, xpx, middley, size.x, size.y/2-2, 2, 2, 2, 2, 2, 3);
					break;
				case improvementNames.smithy:
				case improvementNames.apothecary:
				case improvementNames.cementmill:
				case improvementNames.robotFactory:
					// this.ctx.fillRect(xpx + 2, ypx + 4, size.x - 4, size.y / 3);
					break;
				case improvementNames.stable:
					this.ctx.fillRect(middlex - 3, ypx + 3, 6, 2);
					this.ctx.fillRect(middlex - 3, ypx + 8, 6, 2);
					break;
				case improvementNames.storage:
					this.ctx.fillRect(xpx+1, middley-6, size.x-2, 2);
					this.ctx.fillRect(xpx+1, middley, size.x-2, 2);
					this.ctx.fillRect(xpx+1, middley+6, size.x-2, 2);
					break;
				case improvementNames.square:
					var h = 3;
					var w = 2;
					this.ctx.fillRect(middlex - w, ybottom - 1 - h*2, w*2, h*2);
					break;
				case improvementNames.tradepost:
					break;
				default:
					break;
			}
			
		},
		
		updateInfoOverlay: function () {
			if (this.hoveredBuilding) {
				var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
				var buildingLevel = improvements.getLevel(this.hoveredBuilding);
				this.elements.infoText.text(this.hoveredBuilding + " (Level " + buildingLevel + ")");
				this.elements.infoOverlay.show();
			} else {
				this.elements.infoOverlay.hide();
				
			}
		},
		
		checkOverlaps: function (buildingCoords) {
			for (let i = 0; i < buildingCoords.length; i++) {
				var coords1 = buildingCoords[i].coords;
				var buildingType1 = buildingCoords[i].building.name;
				for (let j = i + 1; j < buildingCoords.length; j++) {
					var coords2 = buildingCoords[j].coords;
					var buildingType2 = buildingCoords[j].building.name;
					if (GameGlobals.campVisHelper.isConflict(coords1, coords2, buildingType1, buildingType2)) {
						log.w("overlap " + buildingType1 + " and " + buildingType2);
					}
				}
			}
		},
		
		onMouseEnterBuilding: function (e) {
			e.data.system.hoveredBuilding = e.data.building;
			e.data.system.updateInfoOverlay();
		},
		
		onMouseLeaveBuilding: function (e) {
			e.data.system.hoveredBuilding = null;
			e.data.system.updateInfoOverlay();
		},
		
		getBuildingSpotCoords: function (i) {
			return GameGlobals.campVisHelper.getCoords(i);
		},
		
		getBuildingCoords: function (campOrdinal, improvements, building, n, j) {
			if (building.name == improvementNames.fortification) {
				return GameGlobals.campVisHelper.getFortificationCoords(n);
			}
			if (building.name === improvementNames.sundome) {
				return GameGlobals.campVisHelper.getSundomeCoords();
			}
			var index = improvements.getSelectedCampBuildingSpot(building, n, j);
			if (index < 0) {
				index = improvements.assignSelectedCampBuildingSpot(campOrdinal, building, n, j);
			}
			if (index < 0) {
				log.w("No building spot defined for " + building.name + " " + n + " " + j + " | " + index);
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
			var classes = "vis-camp-building " + this.getBuildingZClass(building, coords);
			var data = "data-building-name='" + building.name + "' data-building-index='" + n + "' data-building-vis-index='" + j + "'";
			var id = this.getBuildingDivID(building, n, j);
			var desc = building.name;
			return "<div class='" + classes + "' style='" + style + "' id='" + id + "' " + data + "' description='" + desc + "'></div>";
		},
		
		getBuildingDivID: function (building, n, j) {
			return "vis-building-" + building.getKey() + "-" + n;
		},
		
		getBuildingSize: function (building) {
			return GameGlobals.campVisHelper.getBuildingSize(building.name);
		},
		
		getBuildingZClass: function (building, coords) {
			if (coords.z == 0) return "vis-camp-building-z0";
			if (coords.z == 1) return "vis-camp-building-z1";
			if (coords.z == 2) return "vis-camp-building-z2";
			if (coords.z == 3) return "vis-camp-building-z3";
			return "vis-camp-building-z4";
		},
		
		getBuildingColor: function (building, coords) {
			var sunlit = $("body").hasClass("sunlit");
			switch (building.name) {
				case improvementNames.campfire:
				case improvementNames.lights:
				case improvementNames.sundome:
					return ColorConstants.getColor(sunlit, "campvis_building_lit_bg");
					break;
				default:
					return ColorConstants.getColor(sunlit, "campvis_building_z" + coords.z + "_bg");
			}
		},
		
		getBuildingDetailColor: function (building, coords) {
			var sunlit = $("body").hasClass("sunlit");
			return ColorConstants.getColor(sunlit, "campvis_building_z" + coords.z + "_detail");
		},
		
		getXpx: function (x, z, size) {
			return Math.round((this.containerWidth / 2) + x * GameGlobals.campVisHelper.gridX - size.x / 2);
		},
		
		getYpx: function (x, z, size) {
			return Math.round(this.containerHeight -this.floorPos - z * this.zStep - size.y - 1);
		},
		
		isHoverable: function (buildingName) {
			switch (buildingName) {
				case improvementNames.fortification:
				case improvementNames.sundome:
					return false;
				default:
					return true;
			}
		},
		
		// TODO move to some constants?
		campSettings: {
			1: {
				blockedAreas: [ { minx: -5, maxx: 5, z: 1 } ],
				predefinedPositions: {
				1: improvementNames.campfire,
					13: improvementNames.home,
					80: improvementNames.storage,
					25: improvementNames.house,
					41: improvementNames.house,
					45: improvementNames.house,
					28: improvementNames.square,
				}
			},
			2: {
				blockedAreas: [ { minx: 5, maxx: 8}, { minx: -500, maxx: -15, z: 2 } ],
				predefinedPositions: {
					2: improvementNames.market,
					100: improvementNames.campfire,
					145: improvementNames.darkfarm,
					169: improvementNames.darkfarm,
					193: improvementNames.darkfarm,
				}
			},
			3: {},
			4: {
				predefinedPositions: {
					1: improvementNames.square,
				}
			},
			5: {
				predefinedPositions: {
					88: improvementNames.hospital,
				}
			},
			6: {},
			7: {},
			8: {
				predefinedPositions: {
					0: improvementNames.shrine,
				}
			},
			9: {},
			10: {},
			11: {},
			12: {},
			13: {},
			14: {},
			15: {},
		},
		
	});

	return UIOutCampVisSystem;
});
