define([
	'utils/MapUtils',
	'utils/CanvasUtils',
	'game/constants/ColorConstants',
	'game/constants/MovementConstants',
	'game/constants/SectorConstants',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
], function (
	MapUtils, CanvasUtils, ColorConstants, MovementConstants, SectorConstants, PositionConstants, WorldConstants
) {
	
	let MapElements = {
		
		icons: [],

		initIcons: function () {
			this.initIcon("beacon", "map-beacon");
			this.initIcon("building", "map-building");
			this.initIcon("camp", "map-camp");
			this.initIcon("campable", "map-campable");
			this.initIcon("graffiti", "map-graffiti");
			this.initIcon("ingredient", "map-ingredient");
			this.initIcon("interest", "map-interest");
			this.initIcon("investigate", "map-investigate");
			this.initIcon("passage-down", "map-passage-down");
			this.initIcon("passage-up-disabled", "map-passage-up-disabled");
			this.initIcon("passage-up", "map-passage-up");
			this.initIcon("track", "map-train-track");
			this.initIcon("unknown", "map-unvisited");
			this.initIcon("water", "map-water");
			this.initIcon("workshop", "map-workshop");
		},
		
		initIcon: function(key, name) {
			this.icons[key] = new Image();
			this.icons[key].src = location.origin + "/img/map/" + name + ".png";
			this.icons[key + "-sunlit"] = new Image();
			this.icons[key + "-sunlit"].src = location.origin + "/img/map/" + name + "-sunlit.png";
		},

		drawSectorShape: function (ctx, sectorXpx, sectorYpx, sectorSize, size, color, isKeySector) {
			ctx.fillStyle = color;
			
			let centerX = sectorXpx + sectorSize / 2;
			let centerY = sectorYpx + sectorSize / 2;
				
			if (isKeySector) {
				let r = size / 2 + 1;
				ctx.beginPath();
				ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
				ctx.fill();
			} else {
				let sizeOffset = size - sectorSize;
				let p = sizeOffset / 2;
				ctx.fillRect(sectorXpx - p, sectorYpx - p, size, size);
			}
		},

		drawSectorBorder: function (ctx, sectorXpx, sectorYpx, sectorSize, color, isHigh, isPartial, isKeySector, shadowBlur) {
			shadowBlur = shadowBlur || 0;
			
			if (shadowBlur) {
				ctx.shadowColor = color;
				ctx.shadowBlur = shadowBlur;
			}

			ctx.fillStyle = color;

			let isBigSectorSize = sectorSize >= MapUtils.getSectorSize(MapUtils.MAP_ZOOM_MINIMAP);
			let p = isBigSectorSize ? (isHigh ? 4 : 2) : (isHigh ? 2 : 1);

			if (isPartial) {
				ctx.fillRect(sectorXpx  + sectorSize / 2, sectorYpx - p, sectorSize / 2 + p, sectorSize / 2 + p);
				ctx.fillRect(sectorXpx - p, sectorYpx + sectorSize / 2, sectorSize / 2 + p, sectorSize / 2 + p);
			} else {
				MapElements.drawSectorShape(ctx, sectorXpx, sectorYpx, sectorSize, sectorSize + p * 2, color, isKeySector);
			}
			
			if (shadowBlur) {					
				ctx.shadowColor = undefined;
				ctx.shadowBlur = 0;
			}
		},

		drawSectorIcon: function (ctx, sectorXpx, sectorYpx, sectorSize, features, options) {
			let useSunlitIcon = options.useSunlitIcon;
			let showPOIs = options.showPOIs;

			let disabledAlpha = 0.4;
			let iconSize = 10;

			let isBigSectorSize = sectorSize >= MapUtils.getSectorSize(MapUtils.MAP_ZOOM_MINIMAP);
			
			let iconPosX = Math.round(sectorXpx + (sectorSize - iconSize) / 2);
			let iconPosYCentered = Math.round(sectorYpx + sectorSize / 2 - iconSize / 2);
			let iconPosY = Math.round(isBigSectorSize ? sectorYpx : iconPosYCentered);

			if (showPOIs && features.isInvestigatable) {
				ctx.drawImage(this.icons["investigate" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosYCentered);
				return true;
			} else if (showPOIs && features.hasClearableWorkshop) {
				ctx.drawImage(this.icons["workshop" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && features.hasGreenhouse) {
				ctx.drawImage(this.icons["workshop" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && features.hasCampOnSector) {
				ctx.drawImage(this.icons["camp" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && !features.hasCampOnLevel && features.canHaveCampOnSector) {
				ctx.drawImage(this.icons["campable" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && (features.hasUnscoutedLocales || features.hasUnexaminedSpots)) {
				ctx.drawImage(this.icons["interest" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && options.showStashes && features.hasStashOnSector) {
				ctx.drawImage(this.icons["interest" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (showPOIs && features.hasPassageUp) {
				if (features.isPassageTypeAvailable) {
					ctx.drawImage(this.icons["passage-up" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				} else {
					ctx.drawImage(this.icons["passage-up-disabled" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				}
				return true;
			} else if (showPOIs && features.hasPassageDown) {
				if (!features.isPassageTypeAvailable) {
					ctx.globalAlpha = disabledAlpha;
				}
				ctx.drawImage(this.icons["passage-down" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				ctx.globalAlpha = 1;
				return true;
			} else if (showPOIs && features.hasBeacon) {
				ctx.drawImage(this.icons["beacon" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (options.showIngredientIcons && features.hasIngredients) {
				if (features.hasKnownIngredients) {
					ctx.globalAlpha = disabledAlpha;
				}
				ctx.drawImage(this.icons["ingredient" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				ctx.globalAlpha = 1;
				return true;
			} else if (features.isRevealed && features.hasGraffiti) {
				ctx.drawImage(this.icons["graffiti" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (features.isRevealed && features.hasTrainTracks) {
				ctx.drawImage(this.icons["track" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosY);
				return true;
			} else if (!features.isRevealed && !features.isPartiallyRevealed && !options.hideUnknownIcon) {
				ctx.drawImage(this.icons["unknown" + (useSunlitIcon ? "-sunlit" : "")], iconPosX, iconPosYCentered);
				return true;
			}
			
			return false;
		},

		drawResourcesOnSector: function (ctx, sectorXpx, sectorYpx, sectorSize, features, options) {			
			let allResources = [ resourceNames.water, resourceNames.food, resourceNames.metal, resourceNames.rope, resourceNames.herbs, resourceNames.fuel, resourceNames.rubber, resourceNames.medicine, resourceNames.tools, resourceNames.concrete, resourceNames.robots ];
			let defaultResources = [ resourceNames.water, resourceNames.food ];
			let mapResources = options.mapMode == MapUtils.MAP_MODE_SCAVENGING ? allResources : defaultResources;
				
			let directResources = {};
			directResources[resourceNames.water] = features.hasCollectorWater || features.hasSpring;
			directResources[resourceNames.food] = features.hasCollectorFood;

			if (features.hasHeap) {
				directResources[resourceNames.metal] = true;
				defaultResources.push(resourceNames.metal);
			}
			
			let potentialResources = {};
			
			let totalWidth = 0;
			let bigResSize = 5;
			let smallResSize = 3;
			let padding = 1;
			let isBigSectorSize = options.isBigSectorSize;

			for (let i in mapResources) {
				let name = mapResources[i];
				let colAmount = features.resourcesCollectable.getResource(name);
				if (colAmount > 0) {
					potentialResources[name] = true;
				} else if (!features.knownResources || features.knownResources.indexOf(name) >= 0) {
					let minAmountToShow = name == resourceNames.metal ? WorldConstants.resourcePrevalence.COMMON : 1;
					if (features.resourcesScavengable.getResource(name) >= minAmountToShow) {
						potentialResources[name] = true;
					}
				} else if (name == resourceNames.metal && features.hasHeap) {
					potentialResources[name] = true;
				}
				
				if (directResources[name]) totalWidth += bigResSize + padding;
				else if(potentialResources[name]) totalWidth += smallResSize + padding;
			}
			
			if (totalWidth > 0) {
				totalWidth -= padding;
				let x = sectorXpx + sectorSize / 2 - totalWidth / 2;
				let y = isBigSectorSize ? sectorYpx + sectorSize - 5 : sectorYpx + sectorSize / 2 - 1;
				for (let i in mapResources) {
					let name = mapResources[i];
					let drawSize = 0;
					let yOffset;
					
					if (directResources[name]) {
						drawSize = bigResSize;
						yOffset = -1;
					} else if(potentialResources[name]) {
						drawSize = smallResSize;
						yOffset = 0;
					} else {
						drawSize = 0;
					}
					
					if (drawSize > 0) {
						ctx.fillStyle = MapUtils.getResourceFill(name);
						ctx.fillRect(Math.round(x), Math.round(y + yOffset), drawSize, drawSize);
						x = x + drawSize + padding;
					}
				}
			}
		},

		drawMovementLine: function (ctx, sectorMiddleX, sectorMiddleY, sectorSize, distX, distY, sectorPadding) {
			ctx.beginPath();
			ctx.moveTo(sectorMiddleX + 0.5 * sectorSize * distX, sectorMiddleY + 0.5 * sectorSize * distY);
			ctx.lineTo(sectorMiddleX + (0.5 + sectorPadding) * sectorSize * distX, sectorMiddleY + (0.5 + sectorPadding) * sectorSize * distY);
			ctx.stroke();
		},

		drawMovementBlocker: function (ctx, sunlit, sectorSize, x, y, blockerType, isBlocked) {
			if (blockerType === MovementConstants.BLOCKER_TYPE_GANG) {
				if (isBlocked) {
					ctx.strokeStyle = ColorConstants.getColor(sunlit, "map_stroke_gang");
					ctx.lineWidth = Math.ceil(sectorSize / 9);
					ctx.beginPath();
					ctx.arc(x, y, sectorSize * 0.2, 0, 2 * Math.PI);
					ctx.stroke();
				}
			} else if (blockerType === MovementConstants.BLOCKER_TYPE_TOLL_GATE) {
				let squareSize = Math.max(sectorSize / 5, 4);
				ctx.strokeStyle = isBlocked ? ColorConstants.getColor(sunlit, "map_stroke_blocker") : ColorConstants.getColor(sunlit, "map_fill_sector_unscouted");
				ctx.lineWidth = 2;
				ctx.strokeRect(x - squareSize / 2, y - squareSize / 2, squareSize, squareSize);
			} else {
				let crossSize = Math.max(sectorSize / 5, 3);
				ctx.strokeStyle = isBlocked ? ColorConstants.getColor(sunlit, "map_stroke_blocker") : ColorConstants.getColor(sunlit, "map_fill_sector_unscouted");
				ctx.lineWidth = Math.ceil(sectorSize / 9);
				ctx.beginPath();
				ctx.moveTo(x - crossSize, y - crossSize);
				ctx.lineTo(x + crossSize, y + crossSize);
				ctx.moveTo(x + crossSize, y - crossSize);
				ctx.lineTo(x - crossSize, y + crossSize);
				ctx.stroke();
			}
		},

		getOverlaySectorDiv: function (sectorPos, sectorXpx, sectorYpx) {
			let data = "data-level='" + sectorPos.level + "' data-x='" + sectorPos.sectorX + "' data-y='" + sectorPos.sectorY + "'";
			let $div = $("<div class='canvas-overlay-cell map-overlay-cell' style='top: " + sectorYpx + "px; left: " + sectorXpx + "px' " + data +"></div>");
			return $div;
		},

		selectCell: function ($element) {
			$element.toggleClass("selected", true);
		},

		deselectAllCells: function () {
			$.each($(".map-overlay-cell"), function () {
				$(this).toggleClass("selected", false);
			});
		},

		// districts

		drawDistrict: function (ctx, shapes, shapeDef, getSectorPos) {
			if (shapes.length == 0) return;

			let isStroke = shapeDef.strokeStyle;

			if (isStroke) {
				ctx.lineWidth = shapeDef.lineWidth || 1;
				ctx.strokeStyle = shapeDef.strokeStyle;
			} else {
				ctx.fillStyle = shapeDef.fillStyle;
			}

			for (let s = 0; s < shapes.length; s++) {
				let points = shapes[s];
				if (points.length == 0) continue;

				let coordinates = points.filter(p => p.isEnabled).map(p => getSectorPos(p.pos.sectorX, p.pos.sectorY));

				ctx.beginPath();

				CanvasUtils.tracePolygon(ctx, coordinates);

				if (isStroke) ctx.stroke();
				else ctx.fill();

				ctx.closePath();
			}
		},

		getPolygonPointsByDistrict: function (levelDimensions, levelHelper, districts, allSectors, gridSize) {
			gridSize = gridSize || 1;
			let betweenGridStep = gridSize / 2;
			let padding = 4;

			let pointsByDistrict = {}; // districtIndex -> shapes
			let pointsByPosition = []; // array of arrays, each array has points belonging to the same position

			for (let i = 0; i < districts.length; i++) {
				pointsByDistrict[i] = [];
			}

			// find district index for each position in grid
			let districtsByPosition = this.getDistrictByPositionMap(levelDimensions, levelHelper, gridSize);

			// helpers
			let getDistrictIndex = function (x, y) {
				if (!districtsByPosition[x]) return -1;
				if (districtsByPosition[x][y] === undefined) return -1;
				return districtsByPosition[x][y];
			};
			let hasSector = function (x, y) {
				if (x + 0.5 % 1 == 0 || y + 0.5 % 1 == 0) return false;

				let sectorX = Math.floor(x);
				let sectorY = Math.floor(y);
				return levelHelper.hasSector(sectorX, sectorY);
			}

			// find edge points between districts (points between points in grid that have a different district index)
			let getGridNeighbours = function (x, y) {
				let result = [];

				let possibleX = x % 1 == 0 ? [ x ] : [ x - betweenGridStep, x + betweenGridStep ];
				let possibleY = y % 1 == 0 ? [ y ] : [ y - betweenGridStep, y + betweenGridStep ];

				for (let i = 0; i < possibleX.length; i++) {
					for (let j = 0; j < possibleY.length; j++) {
						let pos = { sectorX: possibleX[i], sectorY: possibleY[j]};
						let districtIndex = getDistrictIndex(pos.sectorX, pos.sectorY);
						result.push({ pos: pos, districtIndex: districtIndex });
					}
				}

				return result;
			};
			for (let x = levelDimensions.minX - padding - betweenGridStep; x <= levelDimensions.maxX + padding + betweenGridStep; x += betweenGridStep) {
				for (let y = levelDimensions.minY - padding - betweenGridStep; y <= levelDimensions.maxY + padding + betweenGridStep; y += betweenGridStep) {
					let neighbours = getGridNeighbours(x, y);
					if (neighbours.length == 0) continue;
					
					let districtIndices = neighbours.map(s => s.districtIndex);
					let uniqueDistrictIndices = districtIndices.filter((item, i) => districtIndices.indexOf(item) === i);

					let isBetweenToDistricts = uniqueDistrictIndices.length > 1;
					if (!isBetweenToDistricts) continue;

					let neighboursWithSector = neighbours.filter(s => hasSector(s.pos.sectorX, s.pos.sectorY));
					let isFixed = neighboursWithSector.length > 1;
					let hasSectors = neighboursWithSector.length > 0;

					let pos = { sectorX: x, sectorY: y };
					let points = [];

					for (let d = 0; d < uniqueDistrictIndices.length; d++) {
						let districtIndex = uniqueDistrictIndices[d];
						if (districtIndex < 0) continue;

						let point = { pos: pos, isFixed: isFixed, hasSector: hasSectors, isEnabled: true, districtIndex: districtIndex };
						pointsByDistrict[districtIndex].push(point);
						points.push(point);
					}

					pointsByPosition.push(points);
				}
			}

			let pointsByDistrictSummary = [];
			let pointsByDistrictTotal = 0;
			for (let districtIndex in pointsByDistrict) {
				pointsByDistrictSummary.push(districtIndex + ":" + pointsByDistrict[districtIndex].length);
				pointsByDistrictTotal += pointsByDistrict[districtIndex].length;
			}

			// sort edge points into continuous shapes by distance and angle (one district can consist of multiple polygons)
			let shapesByDistrict = {};

			let sortByAngle = (a, b, c) => {
				let angleA = Math.atan2(a.pos.sectorY - c.sectorY, a.pos.sectorX - c.sectorX);
				let angleB = Math.atan2(b.pos.sectorY - c.sectorY, b.pos.sectorX - c.sectorX);
				return angleA - angleB;
			};

			let sortByDistance = (a, b, p) => {
				let da = PositionConstants.getDistanceTo(p.pos, a.pos);
				let db = PositionConstants.getDistanceTo(p.pos, b.pos);
				return da - db;
			};

			for (let i = 0; i < districts.length; i++) {
				let districtVO = districts[i];
				let c = districtVO.adjustedPosition;

				let shapes = [];

				let unsortedPoints = pointsByDistrict[i].concat();

				while (unsortedPoints.length > 3) {
					let shape = [];
					let currentPoint = unsortedPoints[0];

					while (currentPoint && unsortedPoints.length > 1) {
						let currentPointIndex = unsortedPoints.indexOf(currentPoint);
						unsortedPoints.splice(currentPointIndex, 1);
						shape.push(currentPoint);

						let sortedPoints = unsortedPoints.sort((a, b) => sortByDistance(a, b, currentPoint));
						let closestPoint = sortedPoints[0];
						let closestDistance = PositionConstants.getDistanceTo(currentPoint.pos, closestPoint.pos);
						
						if (closestDistance > 1) {
							currentPoint = null;
							break;
						}

						let neighbours = unsortedPoints.filter(p => PositionConstants.getDistanceTo(currentPoint.pos, p.pos) == closestDistance);
						let sortedNeighbours = neighbours.sort((a, b) => sortByAngle(a, b, c));
						let nextPoint = sortedNeighbours[0];
						currentPoint = nextPoint;
					}

					if (currentPoint) shape.push(currentPoint);
					shapes.push(shape);
				}

				shapesByDistrict[i] = shapes;
			};

			// filter/disable edge points to simplify shapes (should be after sorting because sorting relies on proximity to detect neighbours)
			let filterRounds = 1;
			let getNextPointInShape = function (startPoint, steps) {	
				let districtIndex = startPoint.districtIndex;
				let shapes = shapesByDistrict[districtIndex];
				let shape = null;
				let pointIndex = null;
				for (let i = 0; i < shapes.length; i++) {
					let pointIndexInShape = shapes[i].indexOf(startPoint);
					if (pointIndexInShape >= 0) {
						shape = shapes[i];
						pointIndex = pointIndexInShape;
						break;
					}
				}

				if (!shape) return null;

				let index = pointIndex + steps;
				if (index < 0) index = shape.length + index;
				if (index >= shape.length) index -= shape.length;

				return shape[index];
			};
			let findNextEnabledPoint = function (shape, pointIndex, step) {
				let maxDistance = Math.min(10, shape.length / 2);
				let distance = 1;
				while (distance < maxDistance) {
					let index = pointIndex + distance * step;
					if (index < 0) index = shape.length + index;
					if (index >= shape.length) index -= shape.length;
					let candidate = shape[index];
					if (candidate.isEnabled) return candidate;
					distance++;
				}
				return null;
			};
			let canDisablePoint = function (point) {
				if (point.isFixed) return false;
				if (point.hasSector) return false;
				if (!point.isEnabled) return true;

				let districtIndex = point.districtIndex;
				let shapes = shapesByDistrict[districtIndex];
				let shape = null;
				let pointIndex = null;
				for (let i = 0; i < shapes.length; i++) {
					let pointIndexInShape = shapes[i].indexOf(point);
					if (pointIndexInShape >= 0) {
						shape = shapes[i];
						pointIndex = pointIndexInShape;
						break;
					}
				}

				if (!shape) return true;

				let previousPoint = findNextEnabledPoint(shape, pointIndex, -1);
				let nextPoint = findNextEnabledPoint(shape, pointIndex, +1);

				if (!previousPoint || !nextPoint) return false;

				let angle = Math.round(PositionConstants.getAngleBetweenPositions(previousPoint.pos, nextPoint.pos) / 5) * 5;
				let isValidAngle = angle % 45 == 0;
				if (!isValidAngle) return false;
				
				let crossedSectors = allSectors.filter(s => PositionConstants.isBetween(previousPoint.pos, nextPoint.pos, s.position));
				if (crossedSectors.length > 0) return false;

				return true;
			};
			for (j = 0; j < filterRounds; j++) {
				for (let i = 0; i < pointsByPosition.length; i++) {
					let positionPoints = pointsByPosition[i];

					let canDisable = true;

					for (let j = 0; j < positionPoints.length; j++) {
						if (!canDisablePoint(positionPoints[j])) {
							canDisable = false;
							break;
						}
					}

					if (!canDisable) continue;

					for (let j = 0; j < positionPoints.length; j++) {
						positionPoints[j].isEnabled = false;
					}
				}
			}

			let canAdjustPoint = function (point) {
				if (point.isFixed) return false;
				return true;
			};

			// adjust points positions to simplify shapes
			let adjustRounds = 1;
			for (let round = 0; round < adjustRounds; round++) {
				for (let i = 0; i < pointsByPosition.length; i++) {
					let positionPoints = pointsByPosition[i];

					let canAdjust = true;

					let neighbourPositions = [];

					for (let j = 0; j < positionPoints.length; j++) {
						let startPoint = positionPoints[j];
						if (!canAdjustPoint(startPoint)) {
							canAdjust = false;
							break;
						}

						neighbourPositions.push(getNextPointInShape(startPoint, 1)?.pos);
						neighbourPositions.push(getNextPointInShape(startPoint, -1)?.pos);
					}

					if (!canAdjust) continue;

					let newPosition = PositionConstants.getMiddlePoint(neighbourPositions);

					for (let j = 0; j < positionPoints.length; j++) {
						positionPoints[j].pos = newPosition;
					}
				}
			}

			return shapesByDistrict;
		},

		getDistrictByPositionMap: function (levelDimensions, levelHelper, gridSize) {
			gridSize = gridSize || 1;
			let padding = 2;
			let maxSectorDistance = 4;

			let settings = {
				padding: padding,
				minX: levelDimensions.minX,
				maxX: levelDimensions.maxX,
				minY: levelDimensions.minY,
				maxY: levelDimensions.maxY,
				gridSize: gridSize,
			};

			// first pass: assign district index to each position based on sector district assignment and district positions
			let getDistrictByPosition = function (x, y) {
				let sectorX = Math.floor(x);
				let sectorY = Math.floor(y);
				let hasSector = levelHelper.hasSector(sectorX, sectorY);

				if (hasSector) {
					return levelHelper.getSector(sectorX, sectorY).districtIndex;
				} else {
					return levelHelper.getDistrictIndexByPosition({ sectorX: sectorX, sectorY: sectorY });
				}
			};
			let districtsByPosition = MapUtils.getGridPositionMap(settings, getDistrictByPosition);

			// rounding passes: adjust assignment of empty spaces based on neighbours
			let getRoundedDistrictIndex = function (x, y) {
				let neighbours = [];
				neighbours.push({ sectorX: x - gridSize, sectorY: y - gridSize });
				neighbours.push({ sectorX: x, sectorY: y - gridSize });
				neighbours.push({ sectorX: x + gridSize, sectorY: y - gridSize });
				neighbours.push({ sectorX: x - gridSize, sectorY: y });
				neighbours.push({ sectorX: x, sectorY: y });
				neighbours.push({ sectorX: x + gridSize, sectorY: y });
				neighbours.push({ sectorX: x - gridSize, sectorY: y + gridSize });
				neighbours.push({ sectorX: x, sectorY: y + gridSize });
				neighbours.push({ sectorX: x + gridSize, sectorY: y + gridSize });

				let possibleIndices = [];
				let scoreByIndex = {};
				for (let i = 0; i < neighbours.length; i++) {
					let neighbour = neighbours[i];
					if (!districtsByPosition[neighbour.sectorX]) continue;
					let neighbourDistrictIndex = districtsByPosition[neighbour.sectorX][neighbour.sectorY];
					if (!neighbourDistrictIndex && neighbourDistrictIndex !== 0) neighbourDistrictIndex = -1;

					if (!scoreByIndex[neighbourDistrictIndex]) {
						possibleIndices.push(neighbourDistrictIndex);
						scoreByIndex[neighbourDistrictIndex] = 0;
					}

					let hasSector = levelHelper.hasSector(Math.floor(neighbour.sectorX), Math.floor(neighbour.sectorY));
					let score = hasSector ? 3 : 1;

					scoreByIndex[neighbourDistrictIndex] += score;
				}

				let bestIndex = -1;
				let bestIndexScore = 0;
				for (let i = 0; i < possibleIndices.length; i++) {
					let districtIndex = possibleIndices[i];
					let score = scoreByIndex[districtIndex];
					if (score > bestIndexScore) {
						bestIndex = districtIndex;
						bestIndexScore = score;
					}
				}
				return bestIndex;
			};
			let roundDistricts = function (numPasses) {
				for (let i = 0; i < numPasses; i++) {
					for (let x = levelDimensions.minX - padding; x <= levelDimensions.maxX + padding; x+= gridSize) {
						for (let y = levelDimensions.minY - padding; y <= levelDimensions.maxY + padding; y += gridSize) {
							let hasSector = levelHelper.hasSector(Math.floor(x), Math.floor(y));
							if (hasSector) continue;

							let districtIndex = getRoundedDistrictIndex(x, y);
							districtsByPosition[x][y] = districtIndex;
						}
					}
				}
			};
			roundDistricts(3);

			// reset positions too far from sectors
			for (let x = levelDimensions.minX - padding; x <= levelDimensions.maxX + padding; x += gridSize) {
				for (let y = levelDimensions.minY - padding; y <= levelDimensions.maxY + padding; y += gridSize) {
					let districtIndex = districtsByPosition[x][y];
					if (levelHelper.hasSector(x, y)) continue;

					if (levelHelper.isPositionSurroundedBySectors(x, y)) continue;

					let nearestDistrictSector = levelHelper.getNearestSector(x, y, maxSectorDistance, s => s.districtIndex == districtIndex);
					if (!nearestDistrictSector) {
						districtsByPosition[x][y] = -1;
						continue;
					}
				}
			}

			// round once more to smooth outer edges
			roundDistricts(1);

			return districtsByPosition;
		},
		
	};

	MapElements.initIcons();

	return MapElements;
});
