// generates the structure of levels and creates (mostly empty) SectorVOs
define([
	'ash',
	'utils/ObjectUtils',
	'utils/MathUtils',
	'game/constants/SectorConstants',
	'game/constants/PositionConstants',
	'game/constants/WorldConstants',
	'game/vos/PositionVO',
	'worldcreator/WorldCreatorConstants',
	'worldcreator/WorldCreatorHelper',
	'worldcreator/WorldCreatorRandom',
	'worldcreator/WorldCreatorLogger',
	'worldcreator/SectorVO',
	'worldcreator/CriticalPathVO',
], function (Ash, ObjectUtils, MathUtils, SectorConstants, PositionConstants, WorldConstants, PositionVO, WorldCreatorConstants, WorldCreatorHelper, WorldCreatorRandom, WorldCreatorLogger, SectorVO, CriticalPathVO) {
	
	let LevelStructureGenerator = {
		
		generate: function (seed, worldVO, worldTemplateVO, levels) {
			this.currentFeatures = worldVO.features;

			for (let i = 0; i < levels.length; i++) {
				let l = levels[i];
				let levelVO = worldVO.levels[l];
				let levelTemplateVO = worldTemplateVO.levels[l] || {};

				if (levelTemplateVO && levelTemplateVO.sectors && levelTemplateVO.sectors.length > 0) {
					levelVO.version = levelTemplateVO.version;
					this.replicateLevelStructure(seed, worldVO, levelTemplateVO, levelVO);
				} else {
					levelVO.version = WorldConstants.version;
					this.createLevelStructure(seed, worldVO, levelVO);
				}
				
				this.markRequiredPaths(seed, worldVO, levelVO);
			}
			
			this.currentFeatures = null;
		},

		// CREATE FROM TEMPLATE

		replicateLevelStructure: function (seed, worldVO, levelTemplateVO, levelVO) {
			levelVO.minX = levelTemplateVO.minX;
			levelVO.maxX = levelTemplateVO.maxX;
			levelVO.minY = levelTemplateVO.minY;
			levelVO.maxY = levelTemplateVO.maxY;
			
			for (let i = 0; i < levelTemplateVO.sectors.length; i++) {
				let sectorTemplateVO = levelTemplateVO.sectors[i];
				let sectorPos = sectorTemplateVO.position;
				let stage = sectorTemplateVO.stage;
				let sectorVO = this.makeSector(levelVO, sectorPos, stage);
				levelVO.addSector(sectorVO);
			}
		},

		markRequiredPaths: function (seed, worldVO, levelVO) {
			let requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);
			
			for (let i = 0; i < requiredPaths.length; i++) {
				let path = requiredPaths[i];
				let startPos = path.start.clone();
				let endPos = path.end.clone();
				let sectorPath = WorldCreatorRandom.findPath(worldVO, startPos, endPos, false, true, path.stage);
				if (!sectorPath) {
					WorldCreatorLogger.e("could not make required path");
					continue;
				}
				for (let j = 0; j < sectorPath.length; j++) {
					let sectorVO = levelVO.getSectorByPos(sectorPath[j]);
					sectorVO.addToCriticalPath(path);
				}
			}

		},

		// CREATE NEW LEVEL
		
		createLevelStructure: function(seed, worldVO, levelVO) {
			let l = levelVO.level;

			// setup
			levelVO.requiredPaths = WorldCreatorHelper.getRequiredPaths(worldVO, levelVO);
			levelVO.structureSettings = this.getLevelStructureSettings(levelVO);
			
			// create central structure
			levelVO.currentShapeID = "x";
			this.createCentralStructure(seed, worldVO, levelVO);

			// create a loop around camp sectors if not already in central structure
			levelVO.currentShapeID = "c";
			this.createCampLoop(seed, worldVO, levelVO);
			
			// ensure early stage is connected
			levelVO.currentShapeID = 0;
			this.connectLevelSectors(worldVO, levelVO, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY, false);
			
			// create required paths
			levelVO.currentShapeID = 0;
			this.createRequiredPaths(seed, worldVO, levelVO);

			// create random shapes to fill the level
			levelVO.currentShapeID = 1;
			let stages = worldVO.getStages(l);
			for (let i = 0; i < stages.length; i++) {
				let stageVO = stages[i];
				this.generateLevelStage(seed, worldVO, levelVO, stageVO, 250);
			}
			
			// fill in annoying gaps (connect sectors that are close by direct distance but far by path length)
			levelVO.currentShapeID = "f";
			this.createGapFills(worldVO, levelVO);
			
			// ensure whole level is connected
			levelVO.currentShapeID = "f";
			this.connectLevelSectors(worldVO, levelVO, levelVO.getSectorsByStage(WorldConstants.CAMP_STAGE_EARLY), WorldConstants.CAMP_STAGE_EARLY, true);
			this.connectLevelSectors(worldVO, levelVO, levelVO.sectors, null, true);

			// cleanup
			levelVO.structureSettings = null;
		},

		getLevelStructureSettings: function (levelVO) {
			let result = {};

			// defaults
			result.minPathLength = 5;
			result.maxPathLength = 24;
			result.density = 0.5;
			result.symmetry = 0.5;
			result.diagonalRateRect = 0;
			result.diagonalRateLine = 0.5;
			result.shapeOblongness = 0;
			result.shapeWeights = {};
			result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_ANY] = 0;
			result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_CONNECTION] = 0;
			result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CORNER] = 0;
			result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CENTER] = 0;
			result.shapeWeights[WorldCreatorConstants.SHAPE_CIRCLE] = 0;
			result.shapeWeights[WorldCreatorConstants.SHAPE_TRIANGLE] = 0;

			switch (levelVO.levelStyle) {
				case SectorConstants.STYLE_HUMANIST:
					// lines and straight rectangles
					result.diagonalRateLine = 0.75;
					result.diagonalRateRect = 0;
					result.density = 0.3;
					result.symmetry = 0.25;
					result.shapeOblongness = 0.25;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_ANY] = 1;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_CONNECTION] = 0.5;
					result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CORNER] = 1;
					result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CENTER] = 0.5;
					break;
				case SectorConstants.STYLE_INDUSTRIAL:
					// only lines
					result.diagonalRateLine = 0.35;
					result.maxPathLength = 20;
					result.density = 0.5;
					result.symmetry = 0.5;
					result.shapeOblongness = 0.5;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_ANY] = 1;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_CONNECTION] = 0.5;
					break;
				case SectorConstants.STYLE_KARBOQUE:
					// only rectangles, very symmetrical
					result.diagonalRateLine = 0;
					result.diagonalRateRect = 0;
					result.density = 0.75;
					result.symmetry = 1;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_CONNECTION] = 0.5;
					result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CORNER] = 1;
					break;
				case SectorConstants.STYLE_MODERN:
					// lines with mostly diagonal rectangles
					result.diagonalRateLine = 0;
					result.diagonalRateRect = 0.75;
					result.minPathLength = 5;
					result.maxPathLength = 23;
					result.density = 0.3;
					result.symmetry = 0.25;
					result.shapeOblongness = 0;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_ANY] = 1;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_CONNECTION] = 0.5;
					result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CENTER] = 1;
					result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CORNER] = 0.5;
					break;
				case SectorConstants.STYLE_NEOWESTERN:
					// lines with cirlces
					result.diagonalRateLine = 0.5;
					result.minPathLength = 4;
					result.maxPathLength = 18;
					result.density = 0.4;
					result.symmetry = 0.3;
					result.shapeOblongness = 0;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_ANY] = 1;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_CONNECTION] = 0.5;
					result.shapeWeights[WorldCreatorConstants.SHAPE_CIRCLE] = 0.75;
					break;
				case SectorConstants.STYLE_WESTERN:
					// a bit of everything
					result.diagonalRateLine = 0.35;
					result.diagonalRateRect = 0.35;
					result.density = 0.6;
					result.symmetry = 0.25;
					result.shapeOblongness = 0.5;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_ANY] = 0.25;
					result.shapeWeights[WorldCreatorConstants.SHAPE_LINE_CONNECTION] = 0.5;
					result.shapeWeights[WorldCreatorConstants.SHAPE_RECTANGLE_CORNER] = 1;
					break;
			}

			return result;
		},
		
		createRequiredPaths: function (seed, worldVO, levelVO) {
			if (levelVO.requiredPaths.length === 0) return;

			for (let i = 0; i < levelVO.requiredPaths.length; i++) {
				let path = levelVO.requiredPaths[i];
				let startPos = path.start.clone();
				let endPos = path.end.clone();
				let criticalPathVO = new CriticalPathVO(path.type, path.start, path.end);
				let existingSectors = levelVO.sectors.concat();
				let options = this.getDefaultOptions({ stage: path.stage, criticalPath: criticalPathVO });
				let currentDistance = this.getCurrentSectorDistance(worldVO, startPos, endPos, path.stage);
				if (currentDistance > 0 && currentDistance <= path.maxlen) continue;

				let pathResult = this.createPathBetween(worldVO, levelVO, startPos, endPos, path.maxlen, options, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
				
				if (!pathResult.isComplete) {
					WorldCreatorLogger.w("failed to create required path on level " + levelVO.level);
					WorldCreatorLogger.i(path);
					WorldCreatorLogger.i(pathResult);
					throw new Error("failed to creare required path on level " + levelVO.level);
				}
				
				this.connectNewPath(worldVO, levelVO, existingSectors, pathResult.path);
			}
		},
		
		createCampLoop: function (seed, worldVO, levelVO) {
			if (levelVO.campPosition == null) return;

			let pos = levelVO.campPosition;

			let hasExistingCampSector = levelVO.hasSector(pos.sectorX, pos.sectorY);
			let existingCampSectorNeighbourCount = levelVO.getNeighbourCount(pos.sectorX, pos.sectorY);

			if (hasExistingCampSector && existingCampSectorNeighbourCount > 1) return;

			let closest = WorldCreatorHelper.getClosestSector(levelVO.sectors, pos);
			if (closest) {
				let distance = PositionConstants.getDistanceTo(pos, closest.position);

				if (distance < 2) {
					this.createPathBetween(worldVO, levelVO, pos, closest.position);
					return;
				}

				if (distance < 3) {
					this.createPathBetween(worldVO, levelVO, pos, closest.position, null, {}, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
					return;
				}
			}

			let pois = [ pos ];
			let l = levelVO.level;

			let s1 = (seed % 8 + 1) * 16 + (l + 11) * 76;
			let s2 = (seed % 11 + 1) * 12 + (l + 4) * 199;
			let s3 = (seed % 15 + 1) * 8 + (l + 7) * 444;

			let minSize = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 6, 3));
			let maxSize = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 9, 6));
				
			let w = l == 13 ? WorldCreatorConstants.START_RECT_SIZE : WorldCreatorRandom.randomInt(s2, minSize, maxSize + 1);
			let h = l == 13 ? WorldCreatorConstants.START_RECT_SIZE : WorldCreatorRandom.randomInt(s3, minSize, maxSize + 1);

			let isCircle = levelVO.structureSettings.shapeWeights[WorldCreatorConstants.SHAPE_CIRCLE] > 0;

			let getPaths = function (ox, oy, params) {
				let center = new PositionVO(pos.level, pos.sectorX + ox, pos.sectorY + oy);
				
				if (isCircle) {
					return LevelStructureGenerator.getCircle(levelVO, center, params.s1, params.s2, {});
				} else {
					let isDiagonal = params.isDiagonal;
					let width = MathUtils.clamp(params.w, minSize, maxSize);
					let height = MathUtils.clamp(params.h, minSize, maxSize);
					return LevelStructureGenerator.getRectangleFromCenter(levelVO, center, width, height, true, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS);
				}
			};

			let existingSectors = levelVO.sectors.concat();
			
			let params = { isDiagonal: [ true, false ], w: [ w - 1, w, w + 1 ], h: [ h - 1, h, h + 1 ] };
			if (isCircle) params = { s1: [ 3, 5, 7 ], s2: [ 3, 5 ] };

			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params );
			let result = this.createPaths(levelVO, paths, true);

			this.connectNewPath(worldVO, levelVO, existingSectors, result);

			levelVO.currentShapeID++;
		},

		createGapFills: function (worldVO, levelVO) {
			let failedPairs = [];
			let isFailed = function (sector1, sector2) {
				for (let i = 0; i < failedPairs.length; i++) {
					if (failedPairs[i].sectors[0].position.equals(sector1.position) && failedPairs[i].sectors[1].position.equals(sector2.position)) return true;
					if (failedPairs[i].sectors[0].position.equals(sector2.position) && failedPairs[i].sectors[1].position.equals(sector1.position)) return true;
				}
				return false;
			}

			let getFurthestPair = function () {
				let furthestPathScore = 0;
				let furthestPathDist = 0;
				let furthestPair = [null, null];
				
				for (let i = 0; i < levelVO.sectors.length; i++) {
					let sector1 = levelVO.sectors[i];
					for (let j = i; j < levelVO.sectors.length; j++) {
						let sector2 = levelVO.sectors[j];
						if (isFailed(sector1, sector2)) continue;
						let dist = PositionConstants.getDistanceTo(sector1.position, sector2.position);
						if (dist >= 1 && dist < 3) {
							let path = WorldCreatorRandom.findPath(worldVO, sector1.position, sector2.position, false, true);
							if (!path) continue;
							let pathDist = path.length;
							let pathScore = pathDist - dist * 2;
							if (sector1.stage != sector2.stage) pathScore /= 2;
							if (pathScore > furthestPathScore) {
								furthestPathScore = pathScore;
								furthestPathDist = pathDist;
								furthestPair = [sector1, sector2];
							}
						}
					}
				}

				if (furthestPathScore == 0) return null;
				
				return { sectors: furthestPair, pathDist: furthestPathDist, stage: furthestPair[0].stage == furthestPair[1].stage ? furthestPair[0].stage : null };
			}
			
			let currentPair = getFurthestPair();
			let i = 0;
			while (currentPair && currentPair.pathDist > 15 && i < 10) {
				let options = this.getDefaultOptions({ stage: currentPair.stage });
				let pathResult = this.createPathBetween(worldVO, levelVO, currentPair.sectors[0].position, currentPair.sectors[1].position, currentPair.pathDist - 1, options);
				if (pathResult.isComplete) {
					for (let j = 0; j < pathResult.path.length; j++) {
						pathResult.path[j].isFill = true;
					}
				} else {
					failedPairs.push(currentPair);
				}
				currentPair = getFurthestPair();
				i++;
				if (levelVO.sectors.length >= levelVO.maxSectors) break;
			}
		},
		
		connectLevelSectors: function (worldVO, levelVO, sectors, stage, errorOnFail) {
			var center = levelVO.campPosition != null ? levelVO.campPosition : levelVO.getExcursionStartPosition();
			var getConnectedSectors = function () {
				let res = LevelStructureGenerator.getConnectedSectors(worldVO, center, sectors, stage, 0);
				return res;
			};
			var stageName = (stage ? stage : "all");
			var division = getConnectedSectors();
			var attempts = 0;
			var options = this.getDefaultOptions({ stage: stage });
			var skip = 0;
			while (division.disconnected.length > 0 && division.connected.length > 0) {
				if (attempts > 99) {
					WorldCreatorLogger.i("disconnected sectors:");
					WorldCreatorLogger.i(division.disconnected.map(sector => sector.position))
					if (errorOnFail) {
						throw new Error("couldn't connect disconnected parts of level " + levelVO.level + " stage " + stageName);
					}
					break;
				}
			
				WorldCreatorLogger.i("connecting disconnected parts of level " + levelVO.level + " stage " + stageName + ", division " + division.connected.length + "-" + division.disconnected.length + ", center: " + center + ", skip: " + skip);
				var pair = WorldCreatorHelper.getClosestPair(division.connected, division.disconnected, skip);
				var pairDist = PositionConstants.getDistanceTo(pair[0].position, pair[1].position);
				let result = this.createPathBetween(worldVO, levelVO, pair[0].position, pair[1].position, -1, options);
				if (result.path && result.path.length > 0) {
					division = getConnectedSectors();
					skip = 0;
				} else {
					skip++;
				}
				attempts++;
			}
		},

		// CENTRAL STRUCTURE
		
		createCentralStructure: function (seed, worldVO, levelVO) {
			let l = levelVO.level;
			let position = levelVO.levelCenterPosition;

			if (l == worldVO.bottomLevel) position = new PositionVO(l, 0, 0);
			
			let s1 = (seed % 4 + 1) * 11 + (l + 9) * 666;
			let s2 = (seed % 6 + 1) * 9 + (l + 7) * 331;
			let s3 = (seed % 3 + 1) * 5 + (l + 11) * 561;
			let s4 = 1000 + (seed % 7 + 1) * 185 + (l + 3) * 121 + Math.abs(levelVO.levelCenterPosition.sectorX + 1) * 585;

			let pois = [];
			if (levelVO.passageUpPosition) pois.push(levelVO.passageUpPosition);
			if (levelVO.passageDownPosition) pois.push(levelVO.passageDownPosition);
			if (levelVO.campPosition) pois.push(levelVO.campPosition);
			
			let possibleShapes = this.getPossibleCentralStructureShapes(seed, worldVO, levelVO);

			if (possibleShapes.length == 0) {
				return;
			}

			let index = WorldCreatorRandom.randomInt(s4, 0, possibleShapes.length);
			let shape = possibleShapes[index];

			shape.apply(this, [s1, s2, s3, worldVO, levelVO, position, pois]);

			levelVO.centralStructureType = shape.name.replace("createCentral", "");
			levelVO.currentShapeID++;
		},

		getPossibleCentralStructureShapes: function (seed, worldVO, levelVO) {
			if (levelVO.level == 14) return [ this.createCentralStructureL14 ];
			if (levelVO.level == worldVO.bottomLevel) return [ this.createCentralRectanglesNested, this.createCentralCircle ];

			let shapeSettings = [];
			shapeSettings.push({ shape: this.createCentralArc, minSectors: 100, invalidStyles: [ SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_NEOWESTERN, SectorConstants.STYLE_MODERN ] });
			shapeSettings.push({ shape: this.createCentralAvenue, minSectors: 60, invalidStyles: [ SectorConstants.STYLE_INDUSTRIAL ] });
			shapeSettings.push({ shape: this.createCentralCircle, minSectors: 80, validStyles: [ SectorConstants.STYLE_WESTERN, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralCourt, minSectors: 80, invalidStyles: [ SectorConstants.STYLE_HUMANIST, SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralCrossings, invalidStyles: [ SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralGrid, minSectors: 90, invalidStyles: [ SectorConstants.STYLE_MODERN, SectorConstants.STYLE_NEOWESTERN, SectorConstants.STYLE_WESTERN ] });
			shapeSettings.push({ shape: this.createCentralJunction, minSectors: 80, invalidStyles: [ SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_MODERN, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralLine, maxSectors: 100, invalidStyles: [ SectorConstants.STYLE_KARBOQUE ] });
			shapeSettings.push({ shape: this.createCentralParallels, minSectors: 100, invalidStyles: [ SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralPlaza, maxSectors: 120, invalidStyles: [ SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_INDUSTRIAL ] });
			shapeSettings.push({ shape: this.createCentralRectanglesNested, minSectors: 80, invalidStyles: [ SectorConstants.STYLE_INDUSTRIAL, SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralRectanglesOverlapping, minSectors: 100, invalidStyles: [ SectorConstants.STYLE_MODERN, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralRectanglesSide, invalidStyles: [ SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralRectanglesSimple, invalidStyles: [ SectorConstants.STYLE_NEOWESTERN ] });
			shapeSettings.push({ shape: this.createCentralTriangle, minSectors: 80, invalidStyles: [ SectorConstants.STYLE_HUMANIST, SectorConstants.STYLE_KARBOQUE, SectorConstants.STYLE_NEOWESTERN ] });

			let possibleShapes = [];

			for (let i = 0; i < shapeSettings.length; i++) {
				let settings = shapeSettings[i];
				if (settings.minSectors && levelVO.numSectors < settings.minSectors) continue;
				if (settings.maxSectors && levelVO.numSectors > settings.maxSectors) continue;
				if (settings.invalidStyles && settings.invalidStyles.indexOf(levelVO.levelStyle) >= 0) continue;
				if (settings.validStyles && settings.validStyles.indexOf(levelVO.levelStyle) < 0) continue;
				possibleShapes.push(settings.shape);
			}

			return possibleShapes;
		},

		createCentralLine: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			// choose length
			let minlen = levelVO.structureSettings.minPathLength * 2;
			let maxlen = levelVO.structureSettings.maxPathLength + 2;
			let len = Math.floor(WorldCreatorRandom.randomInt(s1, minlen, maxlen + 1) / 2) * 2 + 1;

			let getPaths = function (ox, oy, params) {
				let result = [];
				let pos = new PositionVO(levelVO.level, position.sectorX + ox, position.sectorY + oy);
				result.push({ startPos: pos, dir: params.dir, len: len, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA });
				return result;
			};
			
			// check for offset to align to poi
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, { dir: PositionConstants.getLevelDirections() }, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
		},

		createCentralJunction: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			// to lines, one straight one diagonal, to serve as a simple basis for levels that should have a bit of both / simulate city layouts where two grids meet

			let minlen = MathUtils.clamp(Math.floor(levelVO.numSectors/16), 7, 11);
			let maxlen = MathUtils.clamp(Math.floor(levelVO.numSectors/8), 9, levelVO.structureSettings.maxPathLength);
			
			let lens = [];
			for (let len = minlen; len <= maxlen; len += 2) lens.push(len);

			let getPaths = function (ox, oy, params) {
				let result = [];
				let dir2 = PositionConstants.getNextClockWise(PositionConstants.getNextClockWise(params.dir), true);
				let pos = new PositionVO(levelVO.level, position.sectorX + ox, position.sectorY + oy);
				result.push({ startPos: pos, dir: params.dir, len: params.len1, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA });
				result.push({ startPos: pos, dir: dir2, len: params.len2, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA });
				return result;
			};
			
			// check for offset to align to poi
			let params = { dir: PositionConstants.getLevelDirections(), len1: lens, len2: lens };
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, params, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
		},
		
		createCentralParallels: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			// choose number of streets 2-4 (fewer on levels with few sectors overall)
			let max = Math.min(4, Math.round(levelVO.numSectors/24));
			let num = WorldCreatorRandom.randomInt(s1, 2, max + 1);
			
			// choose length
			let minlen = Math.min(7 + (max - num) * 2, Math.round(levelVO.numSectors / 10));
			let maxlenstep = Math.min(5, Math.round(levelVO.numSectors / 20));
			let len = minlen + WorldCreatorRandom.randomInt(s2, 0, maxlenstep) * 2;
			
			// choose direction
			let dir = WorldCreatorRandom.randomDirection(s2 / 2, false);
			let oppositeDir = PositionConstants.getOppositeDirection(dir);
			let perpendicularDir = PositionConstants.getNextClockWise(PositionConstants.getNextClockWise(dir, true), true);
			
			// choose distance between streets
			let minDistance = Math.round(MathUtils.clamp(levelVO.structureSettings.density, 0, 1, 2, 4));
			let maxDistance = Math.round(MathUtils.clamp(levelVO.structureSettings.density, 0, 1, 8, 4));
			let dist = minDistance + WorldCreatorRandom.randomInt(s1, 0, maxDistance - minDistance + 1);
			
			// define paths
			let getStreetCenter = function (i, ox, oy, d) {
				let streetDist = -(num-1)*d/2 + i*d;
				let base = PositionConstants.getPositionOnPath(position, perpendicularDir, streetDist, true);
				return new PositionVO(base.level, base.sectorX + ox, base.sectorY + oy);
			};

			let getPaths = function (ox, oy, params) {
				let d = params.d;
				let result = [];
				for (let i = 0; i < num; i++) {
					let streetCenter = getStreetCenter(i, ox, oy, d);
					let startPos = PositionConstants.getPositionOnPath(streetCenter, oppositeDir, Math.floor(len / 2));
					result.push({ startPos: startPos, dir: dir, len: len, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA });
				}
				if (num > 1) {
					let street1Center = getStreetCenter(0, ox, oy, d);
					let connectionPoint1 = PositionConstants.getPositionOnPath(street1Center, oppositeDir, 0);
					result.push({ startPos: connectionPoint1, dir: perpendicularDir, len: d * (num-1) + 1 });
				}
				return result;
			};
			
			// check for offset to align to poi
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, { d: [ dist - 1, dist, dist + 1 ] }, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
		},

		createCentralAvenue: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			// settings
			let allowDiagonal = levelVO.structureSettings.diagonalRateLine > 0.25;
			let forceDiagonal = levelVO.structureSettings.diagonalRateLine > 0.75;
			let num = 2;
			
			// choose length
			let minlen = Math.min(Math.round(levelVO.numSectors / 10), 13);
			let maxlen = Math.min(Math.round(levelVO.numSectors / 9), levelVO.structureSettings.maxPathLength * 2);
			let len = Math.floor(WorldCreatorRandom.randomInt(s1, minlen, maxlen + 1) / 2) * 2 + 1;
			
			// choose direction
			let dir = WorldCreatorRandom.randomDirection(s2, allowDiagonal);
			if (forceDiagonal && !PositionConstants.isDiagonal(dir)) dir = PositionConstants.getNextClockWise(dir, true);
			let oppositeDir = PositionConstants.getOppositeDirection(dir);
			let perpendicularDir = PositionConstants.getNextClockWise(PositionConstants.getNextClockWise(dir, true), true);
			let isDiagonal = PositionConstants.isDiagonal(dir);
			
			// choose distance between streets
			let minDist = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 3, isDiagonal ? 1 : 2));
			let maxDist = Math.round(MathUtils.map(levelVO.structureSettings.density, 0, 1, 4, 3));
			let dist = WorldCreatorRandom.randomInt(s3, minDist, maxDist + 1);

			let trailingEndsProbability = MathUtils.map(levelVO.structureSettings.shapeWeights[WorldCreatorConstants.SHAPE_LINE_ANY], 0, 2, 0, 1);
			
			// define paths
			let getStreetCenter = function (i, ox, oy) {
				let streetDist = dist/2 + i*dist;
				let base = PositionConstants.getPositionOnPath(position, perpendicularDir, streetDist, true);
				return new PositionVO(base.level, base.sectorX + ox, base.sectorY + oy);
			};

			let getPaths = function (ox, oy) {
				let result = [];
				// two streets
				for (let i = 0; i < num; i++) {
					let streetCenter = getStreetCenter(i, ox, oy);
					let startPos = PositionConstants.getPositionOnPath(streetCenter, oppositeDir, Math.floor(len / 2));
					result.push({ startPos: startPos, dir: dir, len: len, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA });
				}
				// connections
				if (dist > 1) {
					let connectionOffsets = [];
					if (len >= 10) connectionOffsets.push(0);
					let trailingEnds = len > 12 && WorldCreatorRandom.randomBool(s1, trailingEndsProbability);
					let endsOffset = Math.floor(trailingEnds ? len/2 - 3 : len/2);
					connectionOffsets.push(Math.floor(-endsOffset));
					connectionOffsets.push(Math.floor(endsOffset));
					for (let i = 0; i < connectionOffsets.length; i++) {
						let street1Center = getStreetCenter(0, ox, oy);
						let offset1 = connectionOffsets[i];
						let connectionPoint1 = PositionConstants.getPositionOnPath(street1Center, oppositeDir, offset1);
						result.push({ startPos: connectionPoint1, dir: perpendicularDir, len: dist * (num-1) + 1, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE });
					}
				}
				return result;
			};
			
			// check for offset to align to poi
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, {}, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
		},
		
		createCentralCrossings: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;
			
			// choose number of streets
			let maxNum = 2;
			let numx = WorldCreatorRandom.randomInt(s1, 1, maxNum + 1);
			let numy = WorldCreatorRandom.randomInt(s2, 1, maxNum + 1);
			if (levelVO.numSectors < 80 && numx > 1) numy = 1;
			
			// choose length and direction
			let maxlen = Math.round(levelVO.numSectors / (numx + numy) / 1.75 / 2) * 2;
			let xlen = Math.min(9 + WorldCreatorRandom.randomInt(s2, 0, 7) * 2, maxlen);
			let xdist = l == 13 ? WorldCreatorConstants.START_RECT_SIZE - 1 : WorldCreatorRandom.randomInt(s1, 2, 6);
			let xdir = PositionConstants.DIRECTION_EAST;
			let ylen = Math.min(9 + WorldCreatorRandom.randomInt(s1, 0, 7) * 2, maxlen);
			let ydist = l == 13 ? WorldCreatorConstants.START_RECT_SIZE - 1 : WorldCreatorRandom.randomInt(s2, 2, 6);
			let ydir = PositionConstants.DIRECTION_SOUTH;
			
			// define paths
			let getPaths = function (ox, oy) {
				let result = [];
				for (let i = 0; i < numx; i++) {
					var startPos = new PositionVO(l, position.sectorX + ox - xlen/2, position.sectorY + oy - (numx-1)*xdist/2+i*xdist);
					startPos.normalize();
					result.push({ startPos: startPos, dir: xdir, len: xlen });
				}
				for (let j = 0; j < numy; j++) {
					var startPos = new PositionVO(l, position.sectorX + ox - (numy-1)*ydist/2 +j*ydist, position.sectorY + oy - ylen/2);
					startPos.normalize();
					result.push({ startPos: startPos, dir: ydir, len: ylen });
				}
				return result;
			};
			
			// check for offset to align to poi
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, {}, getPaths);
			
			// create sectors
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL);
		},
		
		createCentralRectanglesSide: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;
			let sizeFactor = Math.round(levelVO.numSectors / 50);
			let connectedProbability = MathUtils.map(levelVO.structureSettings.symmetry, 0, 1, 0.25, 0.75);
			let connected = WorldCreatorRandom.randomBool(s1, connectedProbability);
			let size = 5 + WorldCreatorRandom.randomInt(s2, 0, Math.min(sizeFactor, 5)) * 2;

			let mindist = Math.max(3, Math.floor(size / 3));
			let dist = mindist + (connected ? 0 : WorldCreatorRandom.randomInt(s2, 1, sizeFactor) * 2);
			if (dist > size) dist = size;

			let horizontal = WorldCreatorRandom.randomBool(s2);
			let x = horizontal ? dist : 0;
			let y = horizontal ? 0 : dist;
			
			var getPaths = function (ox, oy) {
				let result = [];
				var pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
				var connectionPointType = size <= 5 ? WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER : LevelStructureGenerator.getDefaultRectangleConnectionPointType(levelVO, size);
				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, new PositionVO(l, pos.sectorX+x, pos.sectorY+y), size, size, true, false, connectionPointType));
				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, new PositionVO(l, pos.sectorX-x, pos.sectorY-y), size, size, true, false, connectionPointType));
				
				if (!connected) {
					var pathpos = WorldCreatorRandom.randomInt(s1, Math.ceil(-dist/2), Math.floor(dist/2));
					var pathdist = Math.round(-dist + size/2) - 1;
					var pathx = horizontal ? pathdist : pathpos;
					var pathy = horizontal ? pathpos : pathdist;
					var pathdir = horizontal ? PositionConstants.DIRECTION_EAST : PositionConstants.DIRECTION_SOUTH;
					var len = (dist - mindist) * 2;
					result.push(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, pos.sectorX + pathx, pos.sectorY + pathy), pathdir, len, true));
				}
				
				return result;
			};
			
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralRectanglesOverlapping: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;

			let directions = [ PositionConstants.DIRECTION_NE, PositionConstants.DIRECTION_SE, PositionConstants.DIRECTION_SW, PositionConstants.DIRECTION_NW ];
			
			let minSize = levelVO.numSectors > 80 ? 9 : 7;
			let maxSize = MathUtils.clamp(levelVO.numSectors / 10, minSize, levelVO.structureSettings.maxPathLength);
			let maxRandom = Math.floor((maxSize - minSize) / 2);
			let size = minSize + WorldCreatorRandom.randomInt(s1, 0, maxRandom) * 2;
			
			let getPaths = function (ox, oy, params) {
				let result = [];

				let s = params.size;
				s = MathUtils.clamp(s, minSize, maxSize);
				if (s % 2 == 0) s--;

				let offset = PositionConstants.getOffsetByDirection(params.dir);
				let offsetLen = Math.floor(size/2);

				let pos1 = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				let pos2 = new PositionVO(position.level, position.sectorX + ox + offset.x * offsetLen, position.sectorY + oy + offset.y * offsetLen);

				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, pos1, size, size, true, false));
				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, pos2, size, size, true, false));

				return result;
			};
			
			let params = { size: [ size, size - 2, size + 2, size - 4, size + 4 ], dir: directions };
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralRectanglesNested: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let diagonalProbability = levelVO.structureSettings.diagonalRateRect;
			let isDiagonal = WorldCreatorRandom.randomBool(s1, diagonalProbability);

			let minDiff = 4;
			let minSize = 3;
			let maxSize = Math.min(levelVO.numSectors / 12, 21);
			let outerS = WorldCreatorRandom.randomInt(s2, minSize + minDiff, maxSize + 1);
			if (outerS % 2 == 0) outerS--;
			if (levelVO.structureSettings.density >= 0.75) outerS += 2;
			let possibleOuterRectSizes = [ outerS, outerS - 2, outerS + 2 ];

			let innerS = WorldCreatorRandom.randomInt(s1, minSize, outerS - minDiff + 1);
			if (innerS % 2 == 0) innerS--;
			if (innerS > outerS - minDiff || innerS < minSize) innerS = outerS;

			let minConnections = 2;
			if (isDiagonal) minConnections = 3;
			if (levelVO.structureSettings.density <= 0.25) minConnections--;
			if (levelVO.structureSettings.density >= 0.75) minConnections++;
			let maxConnections = outerS > 7 ? 5 : 2;
			let numConnections = WorldCreatorRandom.randomInt(s3, minConnections, maxConnections + 1);

			let getPaths = function (ox, oy, params) {
				let outerSize = params.outerSize;
				let result = [];
				let pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				pos.normalize();
				if (innerS != outerSize) {
					result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, innerS, innerS, false, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER));
				}
				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, outerSize, outerSize, false, isDiagonal, WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER));
				
				var includeDiagonals = outerSize - innerS > 4;
				var connectionDirs = WorldCreatorRandom.randomDirections(s3 + 1001, numConnections, includeDiagonals);
				for (let i = 0; i < numConnections; i ++) {
					var connectionDir = connectionDirs[i];
					var connectionStartPos = PositionConstants.getPositionOnPath(pos, connectionDir, Math.round(innerS/2));
					var connectionLen = outerSize / 2 - innerS / 2;
					if (isDiagonal && !PositionConstants.isDiagonal(connectionDir)) connectionLen = outerSize - innerS;
					let connectionPointType = connectionLen > 6 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE : null;
					var connectionPathVO = LevelStructureGenerator.getPathVO(levelVO, connectionStartPos, connectionDir, connectionLen, false, null, connectionPointType);
					result.push(connectionPathVO);
				}
				return result;
			};

			let params = { outerSize: possibleOuterRectSizes };
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS);
		},
		
		createCentralRectanglesSimple: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let isDiagonal = WorldCreatorRandom.randomBool(s1, levelVO.structureSettings.diagonalRateRect * 0.75);

			let minSize = isDiagonal ? 5 : 9;
			let maxSize = Math.round(Math.min(levelVO.numSectors / 9, levelVO.structureSettings.maxPathLength * 1.5));
			if (isDiagonal) maxSize = Math.min(maxSize, 12);

			let maxRandom = Math.floor((maxSize - minSize) / 2);
			let size = minSize + WorldCreatorRandom.randomInt(s1, 0, maxRandom) * 2;

			let getPaths = function (ox, oy, params) {
				let s = params.size;
				s = MathUtils.clamp(s, minSize, maxSize);
				let pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)
				let connectionPointType = LevelStructureGenerator.getDefaultRectangleConnectionPointType(levelVO, s);
				let result = LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, s, s, true, isDiagonal, connectionPointType);
				return result;
			};
			
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, { size: [ size, size - 2, size + 2, size - 4, size + 4 ] }, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralCourt: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let size = 1 + WorldCreatorRandom.randomInt(s1, 2, 6) * 2;
			if (size > levelVO.numSectors / 16) size = size - 2;
			if (size > 5 && size > levelVO.numSectors / 16) size = size - 2;
			let diagonalSize = size > 5 ? size - 2 : 5;

			// direction of center rectangle's bottom side to which the other two connect
			let direction = WorldCreatorRandom.randomDirection(s2, false); 
			let isDiagonal = PositionConstants.isDiagonal(direction);

			let centerSize = isDiagonal ? diagonalSize : size;
			let sideSize = isDiagonal ? size : diagonalSize;

			let getPaths = function (ox, oy, params) {
				let pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				let hasExtensions = params.hasExtensions;
				
				let centerConnectionPointType = centerSize > 5 ? WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL : WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER;
				let sideConnectionPointType = centerSize > 5 ? WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL : WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER;

				let half = Math.floor(centerSize/2);
				let cornerDistance = isDiagonal ? half * 2 : half;

				let result = [];

				let center1 = new PositionVO(pos.level, pos.sectorX, pos.sectorY);
				let rectangle1 = LevelStructureGenerator.getRectangleFromCenter(levelVO, center1, centerSize, centerSize, true, isDiagonal, centerConnectionPointType);

				let options = {};
				let dir2 = PositionConstants.getNextCounterClockWise(direction, true);
				let pos2 = PositionConstants.getPositionOnPath(center1, dir2, cornerDistance);
				options.isCounterClockwise = false;
				let rectangle2 = LevelStructureGenerator.getRectangle(levelVO, pos2, sideSize, sideSize, dir2, options, true, sideConnectionPointType);

				let dir3 = PositionConstants.getOppositeDirection(PositionConstants.getNextClockWise(direction, true));
				let pos3 = PositionConstants.getPositionOnPath(center1, dir3, cornerDistance);
				options.isCounterClockwise = true;
				let rectangle3 = LevelStructureGenerator.getRectangle(levelVO, pos3, sideSize, sideSize, dir3, options, true, sideConnectionPointType);

				result = result.concat(rectangle1);
				result = result.concat(rectangle2);
				result = result.concat(rectangle3);

				if (hasExtensions) {
					let extensionConnectionPointType = WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL;

					let extension1pos = PositionConstants.getPositionOnPath(pos2, dir2, sideSize - 1);
					let extension1dir = PositionConstants.getNextCounterClockWise(dir2, true);
					let extension1 = LevelStructureGenerator.getPathVO(levelVO, extension1pos, extension1dir, centerSize, false, null, extensionConnectionPointType);

					let extension2pos = PositionConstants.getPositionOnPath(pos3, dir3, sideSize - 1);
					let extension2dir = PositionConstants.getNextClockWise(dir3, true);
					let extension2 = LevelStructureGenerator.getPathVO(levelVO, extension2pos, extension2dir, centerSize, false, null, extensionConnectionPointType);

					result = result.concat(extension1);
					result = result.concat(extension2);
				}

				return result;
			};
			
			let params = { hasExtensions: [ true, false ] };
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);

			this.createPaths(levelVO, paths, true);
		},
		
		createCentralCircle: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;
			
			let maxEdgeLen = MathUtils.clamp(Math.floor(levelVO.numSectors / 20), 5, 11);
			let maxDiagonalEdgeLen = MathUtils.clamp(Math.floor(levelVO.numSectors / 20), 3, 11);

			let straightEdgeLength = 1 + WorldCreatorRandom.randomInt(s1, 1, 5) * 2;
			let diagonalEdgeLength = 1 + WorldCreatorRandom.randomInt(s2, 1, 4) * 2;
			let crossingsHorizontal = WorldCreatorRandom.randomBool(s3);
			let crossingsBoth = WorldCreatorRandom.randomBool(s1/2);

			let crossingsSingleProbability = 0.2;
			if (straightEdgeLength + diagonalEdgeLength < 9) crossingsSingleProbability += 0.1;
			if (levelVO.numSectors < 80) crossingsSingleProbability += 0.8;
			let crossingsSingleHorizontal = WorldCreatorRandom.randomBool(s1/3, crossingsSingleProbability);
			let crossingsSingleVertical = WorldCreatorRandom.randomBool(s1/4, crossingsSingleProbability);

			let getPaths = function (ox, oy, params) {
				let straightLen = MathUtils.clamp(params.len1, 3, maxEdgeLen);
				let diagonalLen = MathUtils.clamp(params.len2, 3, maxDiagonalEdgeLen);

				let centerX = position.sectorX + ox;
				let centerY = position.sectorY + oy;
				let radius = Math.floor(straightLen / 2) + diagonalLen;

				let cornerNNWX = Math.ceil(centerX - straightLen/2);
				let cornerNNEX = Math.ceil(centerX + straightLen/2) - 1;
				let cornerENEX = Math.ceil(centerX + straightLen/2) - 1;
				let cornerENEY = Math.ceil(centerY - straightLen/2);
				let cornerESEY = Math.ceil(centerY + straightLen/2) - 1;
				let sideWX = centerX - radius + 1;
				let sideEX = centerX + radius - 1;
				let sideNY = centerY - radius + 1;
				let sideSY = centerY + radius - 1;

				let result = [];

				// - straight edges 
				let sideConnectionPointType = straightLen > 7 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL : WorldCreatorConstants.CONNECTION_POINTS_PATH_T;
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideNY ), PositionConstants.DIRECTION_EAST, straightLen, true, {}, sideConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideSY ), PositionConstants.DIRECTION_EAST, straightLen, true, {}, sideConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, cornerENEY ), PositionConstants.DIRECTION_SOUTH, straightLen, true, {}, sideConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideEX, cornerENEY ), PositionConstants.DIRECTION_SOUTH, straightLen, true, {}, sideConnectionPointType));

				// - diagonals
				let diagonalConnectionPointType = diagonalLen > 7 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE : WorldCreatorConstants.CONNECTION_POINTS_PATH_NONE;
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideNY ), PositionConstants.DIRECTION_SW, diagonalLen, true, {}, diagonalConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerENEX, sideNY ), PositionConstants.DIRECTION_SE, diagonalLen, true, {}, diagonalConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideSY ), PositionConstants.DIRECTION_NW, diagonalLen, true, {}, diagonalConnectionPointType));
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerENEX, sideSY ), PositionConstants.DIRECTION_NE, diagonalLen, true, {}, diagonalConnectionPointType));

				// - crossings
				let crossingLen = radius * 2 - 1;
				let forceBoth = crossingLen > 13;
				let blockBoth = crossingLen <= 7;
				let hasCrossingsHorizontal = crossingsHorizontal || (crossingsBoth && !blockBoth) || forceBoth;
				let hasCrossingsVertical = !crossingsHorizontal || (crossingsBoth && !blockBoth) || forceBoth;
				let crossingsConnectionPointType = hasCrossingsHorizontal && hasCrossingsVertical && straightLen < 11 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_NONE : WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE;

				if (hasCrossingsHorizontal) {
					if (crossingsSingleHorizontal) {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, centerY ), PositionConstants.DIRECTION_EAST, crossingLen, true, {}, WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE));
					} else {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, cornerENEY ), PositionConstants.DIRECTION_EAST, crossingLen, true, {}, crossingsConnectionPointType));
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, sideWX, cornerESEY ), PositionConstants.DIRECTION_EAST, crossingLen, true, {}, crossingsConnectionPointType));
					}
				}

				if (hasCrossingsVertical) {
					if (crossingsSingleVertical) {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, centerX, sideNY ), PositionConstants.DIRECTION_SOUTH, crossingLen, true, {}, WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE));
					} else {
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNWX, sideNY ), PositionConstants.DIRECTION_SOUTH, crossingLen, true, {}, crossingsConnectionPointType));
						result = result.concat(LevelStructureGenerator.getPathVO(levelVO, new PositionVO(l, cornerNNEX, sideNY ), PositionConstants.DIRECTION_SOUTH, crossingLen, true, {}, crossingsConnectionPointType));
					}
				}

				return result;
			};
			
			let params = { len1: [ straightEdgeLength - 2, straightEdgeLength, straightEdgeLength + 2 ], len2: [ diagonalEdgeLength - 2, diagonalEdgeLength, diagonalEdgeLength + 2 ] };
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true);
		},

		createCentralArc: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;

			let minlen = MathUtils.clamp(Math.floor(levelVO.numSectors/14), 5, 9);
			if (minlen % 2 == 0) minlen--;
			let maxlen = MathUtils.clamp(Math.floor(levelVO.numSectors/10), 9, levelVO.structureSettings.maxPathLength - 4);
			if (maxlen % 2 == 0) maxlen++;
			
			let lens = [];
			for (let len = minlen; len <= maxlen; len += 2) lens.push(len);

			let options = {};

			let getPaths = function (ox, oy, params) {
				let result = [];

				let len1 = params.len1;
				let len2 = params.len2;
				let startDir = params.startDir;

				let centerPos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);

				let sideStartPos = PositionConstants.getPositionOnPath(centerPos, PositionConstants.getNextCounterClockWise(startDir), Math.floor(len1/2));
				let sideDirection = startDir;
				let sideLen = len1;
				for (let i = 0; i < params.numPaths; i++) {
					result = result.concat(LevelStructureGenerator.getPathVO(levelVO, sideStartPos, sideDirection, sideLen, true, options, WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA));

					sideStartPos = PositionConstants.getPositionOnPath(sideStartPos, sideDirection, sideLen - 1);
					sideDirection = PositionConstants.getNextClockWise(sideDirection, true);
					sideLen = i % 2 == 0 ? len1 : len2;
				}

				return result;

			};
			
			let params = { startDir: PositionConstants.getLevelDirections(), numPaths: [ 3, 4 ], len1: lens, len2: lens };
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, params, getPaths);
			let paths = getPaths(offset.x, offset.y, offset.params);
			this.createPaths(levelVO, paths, true);
		},

		createCentralTriangle: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let diagonalDirections = [ PositionConstants.DIRECTION_NE, PositionConstants.DIRECTION_SE, PositionConstants.DIRECTION_SW, PositionConstants.DIRECTION_NW ];
			let diagonalDirection = WorldCreatorRandom.randomItemFromArray(levelVO.level, diagonalDirections);

			let diagonalLength = 1 + WorldCreatorRandom.randomInt(s1, 3, 6) * 2;
			if (levelVO.numSectors > 100) diagonalLength += 1;
			
			let hasBottomOvershoot = WorldCreatorRandom.randomBool(s3, 0.75);
			let bottomOvershoot = 3 + WorldCreatorRandom.randomInt(s2, 0, 4);

			let sideConnectionPointType = diagonalLength > 7 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL : WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;

			let getPaths = function (ox, oy) {
				let pos = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy);
				let result = [];

				let diagonalDirection2 = PositionConstants.getNextClockWise(diagonalDirection);
				let middleDirection = PositionConstants.getNextClockWise(diagonalDirection, true);
				let bottomDirection = PositionConstants.getNextClockWise(middleDirection);
				let bottomDirectionOpposite = PositionConstants.getOppositeDirection(bottomDirection);

				let cornerPos = PositionConstants.getPositionOnPath(pos, diagonalDirection, diagonalLength - 1);
				let bottomLength = diagonalLength * 2 - 1 * 2;
				let bottomStartPos = PositionConstants.getPositionOnPath(cornerPos, bottomDirection, 0);
				let bottomEndPos = PositionConstants.getPositionOnPath(cornerPos, bottomDirection, bottomLength);

				result.push({ startPos: pos, dir: middleDirection, len: diagonalLength, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL });
				result.push({ startPos: pos, dir: diagonalDirection, len: diagonalLength, connectionPointType: sideConnectionPointType });
				result.push({ startPos: pos, dir: diagonalDirection2, len: diagonalLength, connectionPointType: sideConnectionPointType });

				result.push({ startPos: bottomStartPos, dir: bottomDirection, len: bottomLength, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL });

				if (hasBottomOvershoot) {
					result.push({ startPos: bottomStartPos, dir: bottomDirectionOpposite, len: bottomOvershoot, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS });
					result.push({ startPos: bottomEndPos, dir: bottomDirection, len: bottomOvershoot, connectionPointType: WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS });
				}

				return result;
			};
			
			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralPlaza: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let options = this.getDefaultOptions();
			let size = 3 + WorldCreatorRandom.randomInt(s3, 0, 2) * 2;
			let minCornerLen = MathUtils.clamp(Math.floor(levelVO.numSectors / 20), 4, 8);
			let cornerlen = minCornerLen + WorldCreatorRandom.randomInt(s1, 0, 4) * 2;
			let isDiagonal = WorldCreatorRandom.randomBool(s2, levelVO.structureSettings.diagonalRateRect);
			
			let getCorner = function (center, dir) {
				let startPos = PositionConstants.getPositionOnPath(center, dir, 2);
				let connectingType = cornerlen > 6 ? WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL : WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;
				return LevelStructureGenerator.getPathVO(levelVO, startPos, dir, cornerlen, true, options, connectingType);
			};

			let getPaths = function (ox, oy) {
				let result = [];

				let center = new PositionVO(position.level, position.sectorX + ox, position.sectorY + oy)

				result = result.concat(LevelStructureGenerator.getRectangleFromCenter(levelVO, center, size, size, true));

				if (isDiagonal) {
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_NE));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_NW));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_SE));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_SW));
				} else {
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_NORTH));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_WEST));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_SOUTH));
					result = result.concat(getCorner(center, PositionConstants.DIRECTION_EAST));
				}

				return result;
			};

			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},
		
		createCentralGrid: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let numMax = MathUtils.clamp(Math.round(levelVO.numSectors / 32), 2, 4);
			let isSymmetricalCount = WorldCreatorRandom.randomBool(s1);
			let numX = WorldCreatorRandom.randomInt(s2 / 2, 2, numMax + 1);
			if (isSymmetricalCount) numX = Math.min(numX, 3);
			let numY = isSymmetricalCount ? numX : WorldCreatorRandom.randomInt(s3 / 2, 2, numMax + 1);
			let isSymmetricalSmallRects = WorldCreatorRandom.randomBool(s2, levelVO.structureSettings.symmetry * 0.4);
			let maxSize = numX > 2 || numY > 2 ? 5 : 7;
			let w = WorldCreatorRandom.randomInt(s1 * 2, 4, maxSize + 1);
			let h = isSymmetricalSmallRects ? w : WorldCreatorRandom.randomInt(s3 * 2, 4, maxSize + 1);
			
			let totalWidth = numX * w - (numX - 1);
			let totalHeight = numY * h - (numY - 1);
			
			let startX = Math.round(position.sectorX + w/2 - totalWidth / 2);
			let startY = Math.round(position.sectorY + h/2 - totalHeight / 2);

			let forceSkipSomeEdges = numX > 2 && numY > 2;
			let skipSomeEdgesProbability = (numX + numY) / 10;
			let skipSomeEdges = forceSkipSomeEdges || WorldCreatorRandom.randomBool(worldVO.seed, skipSomeEdgesProbability);

			let getPaths = function (ox, oy) {
				let result = [];
				let skipEdgeProbability = forceSkipSomeEdges ? 0.85 : 0.2;
				for (let x = 0; x < numX; x++) {
					let isEdgex = x === 0 || x === numX - 1;
					for (let y = 0; y < numY; y++) {
						let isEdgeY = y === 0 || y === numY - 1;
						let isCorner = isEdgex && isEdgeY;
						let skipPath = !isCorner && skipSomeEdges && WorldCreatorRandom.randomBool(levelVO.level + x + y, skipEdgeProbability);

						if (skipPath) {
							skipEdgeProbability = MathUtils.clamp(skipEdgeProbability - 0.1, 0, 1);
							continue;
						} else {
							skipEdgeProbability = MathUtils.clamp(skipEdgeProbability + (forceSkipSomeEdges ? 0.1 : 0.05), 0, 1);
						}

						let connectionPointType = WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
						let pos = new PositionVO(position.level, startX + x*w - x + ox, startY + y*h - y + oy)
						let pathResult = LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, w, h, true, false, connectionPointType);
						result = result.concat(pathResult);
					}
				}
				return result;
			};

			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},

		createCentralStructureL14: function (s1, s2, s3, worldVO, levelVO, position, pois) {
			let l = levelVO.level;

			let num = WorldCreatorRandom.randomInt(s1, 3, 5);
			let s = 3;
			let d = 1;

			let offsetCenterToEdge = (s - 1) / 2;

			let getPaths = function (ox, oy) {
				let result = [];

				let center = new PositionVO(l, position.sectorX + ox, position.sectorY + oy);
				let startX = center.sectorX - Math.floor(num/2) * s - Math.floor((num-1)/2)* d;

				let isLineOnTop = center.sectorY >= 0;
				let offsetLineY = isLineOnTop ? - offsetCenterToEdge : offsetCenterToEdge;
				let lineStartPosition = new PositionVO(levelVO.level, startX - offsetCenterToEdge, center.sectorY + offsetLineY);
				let linewidth = s * num + d * (num - 1);
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, lineStartPosition, PositionConstants.DIRECTION_EAST, linewidth, true, null, WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS));

				for (let i = 0; i < num; i++) {
					let x = startX + i * s + i * d;
					let pos = new PositionVO(l, x, center.sectorY);
					let pathResult = LevelStructureGenerator.getRectangleFromCenter(levelVO, pos, s, s, true, false, WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS);
					result = result.concat(pathResult);
				}

				return result;
			}

			let offset = this.getCentralStructureOffset(worldVO, levelVO, pois, {}, getPaths);
			let paths = getPaths(offset.x, offset.y);
			this.createPaths(levelVO, paths, true);
		},

		// RANDOM SHAPES TO FILL THE LEVEL
		
		generateLevelStage: function (seed, worldVO, levelVO, stageVO, maxAttempts) {
			let stage = stageVO.stage;
			let stages = worldVO.getStages(levelVO.level);

			let numGoal = WorldCreatorHelper.getNumSectorsForLevelStage(worldVO.seed, levelVO.campOrdinal, levelVO.level, stageVO.stage);
			let maxOverflow = Math.ceil(WorldCreatorConstants.getMaxSectorOverflow(levelVO.levelOrdinal) / stages.length);

			let attempts = 0;
			let failures = 0;
			let numCurrent = levelVO.getNumSectorsByStage(stage);

			while (numCurrent < numGoal && attempts < maxAttempts) {
				attempts++;

				let numRemaining = numGoal - numCurrent;

				let isSuccess = this.createRandomShape(seed, worldVO, levelVO, stageVO, attempts, numRemaining, maxOverflow);

				numCurrent = levelVO.getNumSectorsByStage(stage);

				if (isSuccess) {
					failures = 0;
				} else {
					failures++;
				}

				if (failures > 25) {
					log.w("problems generating level stage " + levelVO.level + " " + stageVO.stage);
				}
			}

			let numFinal = levelVO.getNumSectorsByStage(stage);

			if (numFinal < numGoal) {
				log.w("level " + levelVO.level + " " + stageVO.stage + " could not be completed in " + attempts + " attempts (created " + numFinal + "sectors)");
			}
		},

		createRandomShape: function (seed, worldVO, levelVO, stageVO, attempt, numRemaining, maxOverflow) {
			let stage = stageVO.stage;
			
			let isFirstAttempt = attempt === 1;
			let isLateAttempt = (attempt > 10 && attempt % 3 == 0) || attempt > 50;
			let canConnectToDifferentStage = (isFirstAttempt || isLateAttempt) && stage != WorldConstants.CAMP_STAGE_EARLY;

			let options = this.getDefaultOptions({ stage: stage, canConnectToDifferentStage: canConnectToDifferentStage });

			let maxShapeSize = numRemaining + maxOverflow;
			
			//if (attempt == 3) debugger

			this.updateLevelConnectionPoints(worldVO, levelVO, options.stage);
			let connectionPoint = this.getShapeConnectionPoint(seed, attempt, worldVO, levelVO, options);
			let connectionPointOriginal = levelVO.allConnectionPoints.find(p => p.position.equals(connectionPoint.position));
			let shape = this.pickRandomShape(seed, attempt, levelVO, connectionPointOriginal, numRemaining);

			if (!shape) return false;

			options.shape = shape;

			levelVO.currentShapeID++;
			
			// if (levelVO.currentShapeID == 3) debugger

			// if (attempt > 50) debugger
			
			let numBefore = levelVO.sectors.length;

			switch (shape) {
				case WorldCreatorConstants.SHAPE_LINE_ANY:
					options.requireSecondConnectionPoint = false;
					this.createRandomLines(seed, attempt, levelVO, options, maxShapeSize, connectionPoint);
					break;
				case WorldCreatorConstants.SHAPE_LINE_CONNECTION:
					options.requireSecondConnectionPoint = true;
					this.createRandomLines(seed, attempt, levelVO, options, maxShapeSize, connectionPoint);
					break;
				case WorldCreatorConstants.SHAPE_RECTANGLE_CORNER:
					options.requireSecondConnectionPoint = false;
					this.createRandomCornerRectangles(seed, attempt, levelVO, options, maxShapeSize, connectionPoint);
					break;
				case WorldCreatorConstants.SHAPE_RECTANGLE_CENTER:
					options.requireSecondConnectionPoint = false;
					this.createRandomSideRectangles(seed, attempt, levelVO, options, maxShapeSize, connectionPoint);
					break;
				case WorldCreatorConstants.SHAPE_CIRCLE:
					options.requireSecondConnectionPoint = false;
					this.createRandomCircles(seed, attempt, levelVO, options, maxShapeSize, connectionPoint);
					break;
				case WorldCreatorConstants.SHAPE_TRIANGLE:
					// currently not used, doesn't create very nice maps
					options.requireSecondConnectionPoint = false;
					this.createRandomTriangles(seed, attempt, levelVO, options, maxShapeSize, connectionPoint);
					break;
			}

			let numAfter = levelVO.sectors.length;
			let numCreated = numAfter - numBefore;
			let isSuccess = numCreated > 1;

			log.i("try #" + attempt + ": from " + connectionPoint.position + " (score: " + connectionPointOriginal.connectionPointScore + ") " + shape + " - > " + isSuccess + " | " + canConnectToDifferentStage);

			if (!isSuccess) {
				if (!connectionPointOriginal.numFailures) connectionPointOriginal.numFailures = 0;
				if (!connectionPointOriginal.numFailuresByShape) connectionPointOriginal.numFailuresByShape = {};
				if (!connectionPointOriginal.numFailuresByShape[shape]) connectionPointOriginal.numFailuresByShape[shape] = 0;
				connectionPointOriginal.numFailures++;
				connectionPointOriginal.numFailuresByShape[shape]++;
			}

			return isSuccess;
		},

		pickRandomShape: function (seed, attempt, levelVO, connectionPoint, numRemaining) {
			let options = [];

			let neighbours = levelVO.getNeighbourList(connectionPoint.position.sectorX, connectionPoint.position.sectorY);
			let numNeighbours = levelVO.getNeighbourCount(connectionPoint.position.sectorX, connectionPoint.position.sectorY);

			let outwardsDirection = PositionConstants.getDirectionFrom(neighbours[0].position, connectionPoint.position);
			let isPathOutwardsClear = this.isPathClear(levelVO, connectionPoint.position, outwardsDirection, 3);

			let levelAverageDensity = levelVO.sectors.reduce((accumulator, s) => accumulator + levelVO.getAreaDensity(s.position.sectorX, s.position.sectorY, 2), 0) / levelVO.sectors.length;

			if (numNeighbours > 1) options.push(WorldCreatorConstants.SHAPE_LINE_ANY);
			if (numNeighbours < 4 && this.hasConnectionPointPotentialConnectionLine(levelVO, connectionPoint)) options.push(WorldCreatorConstants.SHAPE_LINE_CONNECTION);
			if (numNeighbours == 1 && isPathOutwardsClear && numRemaining >= 8) options.push(WorldCreatorConstants.SHAPE_RECTANGLE_CENTER);
			if (numNeighbours == 1 && isPathOutwardsClear && numRemaining >= 16) options.push(WorldCreatorConstants.SHAPE_CIRCLE);
			if (numNeighbours < 3 && numRemaining >= 8) options.push(WorldCreatorConstants.SHAPE_RECTANGLE_CORNER);

			options = options.filter(shape => levelVO.structureSettings.shapeWeights[shape] > 0);

			// if struggling to generate, enable some random lines
			if (attempt > 50 && options.indexOf(WorldCreatorConstants.SHAPE_LINE_ANY) < 0) options.push(WorldCreatorConstants.SHAPE_LINE_ANY);

			if (options.length == 0) return WorldCreatorConstants.SHAPE_LINE_ANY;
			if (options.length == 1) return options[0];

			let getShapeScore = function (shape) {
				let score = 0;

				if (shape == WorldCreatorConstants.SHAPE_LINE_ANY) score -= 0.01;
				if (shape == WorldCreatorConstants.SHAPE_LINE_ANY && levelAverageDensity < 0.3) score -= 1;
				if (shape == WorldCreatorConstants.SHAPE_LINE_ANY && numRemaining < 12) score++;
				if (shape == WorldCreatorConstants.SHAPE_LINE_CONNECTION && numRemaining < 14) score++;

				if (shape == WorldCreatorConstants.SHAPE_RECTANGLE_CENTER && levelAverageDensity > 0.35) score -= 1;
				
				if (attempt % options.length === options.indexOf(shape)) score++;

				if (connectionPoint.numFailuresByShape && connectionPoint.numFailuresByShape[shape] > 0) score -= connectionPoint.numFailuresByShape[shape];

				score *= (levelVO.structureSettings.shapeWeights[shape] || 1);

				return score;
			};

			options = options.sort((a, b) => getShapeScore(b) - getShapeScore(a));

			return options[0];
		},

		createRandomCornerRectangles: function (seed, pathSeed, levelVO, options, maxlen, connectionPoint) {
			let l = levelVO.levelOrdinal;
			let pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
			let s1 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
			let s2 = seed + (l * 44) * pathRandomSeed + pathSeed;
			
			let pathStartPoint = connectionPoint;
			let pathStartPos = pathStartPoint.position.clone();

			let stage = levelVO.getSector(pathStartPos.sectorX, pathStartPos.sectorY).stage;
			if (!options.stage) options.stage = pathStartPos.stage || stage;

			let possibleDirections = this.getPossiblePathDirections(s1, s2, levelVO, pathStartPoint, options.shape);
			let minRectangleSize = 4;
			let maxRectangleSize = this.getMaximumRectangleSize(levelVO, maxlen);

			let range = [ minRectangleSize, maxRectangleSize ]
			let reduceRange = function () {
				let min = range[0];
				let max = range[1];
				let density = levelVO.structureSettings.density;
				let preferredMin = MathUtils.map(density, 0, 1, 7, 3);
				let preferredMax = MathUtils.map(density, 0, 1, 15, 11);

				let increaseMinScore = preferredMin - min;
				let decreaseMaxScore = max - preferredMax;

				if (increaseMinScore > decreaseMaxScore) {
					range[0] = min + 1;
				} else {
					range[1] = max - 1;
				}
			};
			while (range[1] - range[0] > 8) reduceRange();
			let sizes = [];
			for (let s = range[0]; s <= range[1]; s++) sizes.push(s);

			if (maxRectangleSize < minRectangleSize) return;

			let canDuplicateProbability = levelVO.structureSettings.symmetry;
			let canDuplicate = levelVO.structureSettings.shapeOblongness < 0.75 && WorldCreatorRandom.randomBool(pathSeed, canDuplicateProbability);

			let getPaths = function (params) {
				let width = MathUtils.clamp(params.w, minRectangleSize, maxRectangleSize);
				let height = MathUtils.clamp(params.h, minRectangleSize, maxRectangleSize);
				let startDirection = params.dir;
				let isClockwise = params.isClockwise;

				let duplicate = canDuplicate && params.duplicate && width < maxRectangleSize * 0.7 && height < maxRectangleSize * 0.7;

				let connectionPointsType = WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL;
				
				if (width < 6 && height < 6) {
					connectionPointsType = WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
					options.allowNoOverlaps = true;
				} else {
					options.allowNoOverlaps = false;
				}
			
				let result = [];

				options.isCounterClockwise = !isClockwise;
				let rectangle1 = LevelStructureGenerator.getRectangle(levelVO, pathStartPos, width, height, startDirection, options, false, connectionPointsType);
				result = result.concat(rectangle1);

				if (duplicate) {
					options.isCounterClockwise = isClockwise;
					let rectangle2 = LevelStructureGenerator.getRectangle(levelVO, pathStartPos, width, height, startDirection, options, false, connectionPointsType);
					result = result.concat(rectangle2);
				}

				return result;
			};

			let params = { w: sizes, h: sizes, dir: possibleDirections, isClockwise: [ true, false ] };
			if (canDuplicate) params.duplicate = [ true, false ];

			let offset = this.getRandomPathsOffset(levelVO, params, getPaths, options);

			if (offset.score < 0) return;

			let paths = getPaths(offset);

			this.createPaths(levelVO, paths, false, options);
		},

		createRandomSideRectangles: function (seed, pathSeed, levelVO, options, maxlen, connectionPoint) {
			let l = levelVO.levelOrdinal;
			
			let pathStartPoint = connectionPoint;
			let pathStartPos = pathStartPoint.position.clone();

			let neighbours = levelVO.getNeighbourList(pathStartPos.sectorX, pathStartPos.sectorY);

			if (neighbours.length != 1) return;

			let direction = PositionConstants.getDirectionFrom(neighbours[0].position, pathStartPos);

			let stage = levelVO.getSector(pathStartPos.sectorX, pathStartPos.sectorY).stage;
			if (!options.stage) options.stage = pathStartPos.stage || stage;

			let minRectangleSize = 3;
			let maxRectangleSize = this.getMaximumRectangleSize(levelVO, maxlen);
			
			let size = minRectangleSize + WorldCreatorRandom.randomInt(pathSeed, 0, Math.floor((maxRectangleSize - minRectangleSize) / 2) + 1) * 2;
			
			options.numAllowedCrossings = 2;

			let getPaths = function (params) {
				let s = params.s;
			
				let result = [];

				let offsetDirection = PositionConstants.getNextCounterClockWise(direction);

				let startPos = pathStartPos.clone();
				let directionOffset = PositionConstants.getOffsetByDirection(offsetDirection);
				startPos.sectorX += directionOffset.x * Math.floor(s/2);
				startPos.sectorY += directionOffset.y * Math.floor(s/2);

				options.allowedCrossings = [ pathStartPos ];
				
				result = result.concat(LevelStructureGenerator.getRectangle(levelVO, startPos, s, s, direction, options));

				return result;
			};

			let params = { s: [ size, size + 2, size - 2 ] };
			let offset = this.getRandomPathsOffset(levelVO, params, getPaths, options);

			if (offset.score < 0) return;

			let paths = getPaths(offset);
			this.createPaths(levelVO, paths, false, options);
		},

		createRandomCircles: function (seed, pathSeed, levelVO, options, maxlen, connectionPoint) {			
			let pathStartPoint = connectionPoint;
			let pathStartPos = pathStartPoint.position.clone();

			let neighbours = levelVO.getNeighbourList(pathStartPos.sectorX, pathStartPos.sectorY);

			if (neighbours.length != 1) return;

			let direction = PositionConstants.getDirectionFrom(neighbours[0].position, pathStartPos);

			let stage = levelVO.getSector(pathStartPos.sectorX, pathStartPos.sectorY).stage;
			if (!options.stage) options.stage = pathStartPos.stage || stage;

			let maxSize = MathUtils.clamp(Math.round(maxlen / 12), 3, 5);
			if (maxSize % 2 == 0) maxSize--;
			let size = 5;

			let getPaths = function (params) {
				let straightSideLen = Math.min(params.s, maxSize);
				let diagonalSideLen = straightSideLen > 3 ? straightSideLen - 2 : straightSideLen;

				let centerOffset = Math.floor(straightSideLen/2) + diagonalSideLen - 1;
				if (PositionConstants.isDiagonal(direction)) centerOffset -= 1;
				let centerPos = PositionConstants.getPositionOnPath(pathStartPos, direction, centerOffset);

				return LevelStructureGenerator.getCircle(levelVO, centerPos, straightSideLen, diagonalSideLen, options, true);
			};

			let params = { s: [ size, size + 2, size - 2 ] };
			let offset = this.getRandomPathsOffset(levelVO, params, getPaths, options);

			if (offset.score < 0) return;

			let paths = getPaths(offset);

			this.createPaths(levelVO, paths, false, options);
		},

		getCircle: function (levelVO, centerPos, straightSideLen, diagonalSideLen, options, forceComplete) {
			if (straightSideLen % 2 == 0) straightSideLen--;

			straightSideLen = MathUtils.clamp(straightSideLen, 3, 21);
			diagonalSideLen = MathUtils.clamp(diagonalSideLen, 1, 21);

			let directions = PositionConstants.getLevelDirections();
		
			let result = [];

			options.numAllowedCrossings = 1;

			let r = Math.floor(straightSideLen / 2) + diagonalSideLen - 1;
			let sideStartPos = new PositionVO(centerPos.level, centerPos.sectorX - r, centerPos.sectorY + Math.floor(straightSideLen/2));

			for (let i = 0; i < directions.length; i++) {
				let sideDir = directions[i];
				let sideLen = straightSideLen;
				let isDiagonal = PositionConstants.isDiagonal(sideDir);

				if (isDiagonal) sideLen = diagonalSideLen;

				let connectionPointType = null;
				if (sideLen <= 5) connectionPointType = WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE;
				result = result.concat(LevelStructureGenerator.getPathVO(levelVO, sideStartPos, sideDir, sideLen, forceComplete, options, connectionPointType));

				sideStartPos = PositionConstants.getPositionOnPath(sideStartPos, sideDir, sideLen - 1);
			}

			return result;
		},

		createRandomTriangles: function (seed, pathSeed, levelVO, options, maxlen, connectionPoint) {

			let stage = options.stage;

			let maxSideLen = Math.round(Math.min(levelVO.structureSettings.maxPathLength, maxlen / 3));

			if (maxSideLen < 5) return;

			let TYPE_PYRAMID = "pyramid"; // long edge is between the two connection points (p1 and p2)
			let TYPE_ARROW = "arrow"; // long edge is between p2 and p3
			let TYPE_WING = "wing"; // long edge is between p1 and p3

			let getPaths = function (params) {
				let p1 = params.p1;
				let p2 = params.p2;
				let type = params.type;

				let distance = PositionConstants.getDistanceTo(p1.position, p2.position);
				let straightDistance = PositionConstants.getDistanceInDirection(p1.position, p2.position, PositionConstants.DIRECTION_NORTH);
				let defaultSideLen = Math.round(straightDistance + 1);

				if (distance <= 5) return [];
				if (distance > maxSideLen) return [];
				if (PositionConstants.getPositionAlignment(p1.position, p2.position) <= 0) return [];

				let direction = PositionConstants.getDirectionFrom(p1.position, p2.position);
				let isDiagonal = PositionConstants.isDiagonal(direction);

				if (!isDiagonal && defaultSideLen <= 5) return [];

				let shortSideLen = Math.round(defaultSideLen / 2);
				let longSideLen = defaultSideLen;
				
				let p1_to_p3_dir;
				let p2_to_p3_dir;
				let p1_to_p3_len;
				let p2_to_p3_len;

				if (!isDiagonal && type == TYPE_PYRAMID) {
					if (distance % 2 == 1) return [];

					p1_to_p3_len = shortSideLen;
					p2_to_p3_len = shortSideLen;
					p1_to_p3_dir = PositionConstants.getNextClockWise(direction, true);
					p2_to_p3_dir = PositionConstants.getNextCounterClockWise(PositionConstants.getOppositeDirection(direction), true);
				} else if (!isDiagonal && type == TYPE_ARROW) {
					if (distance % 2 == 0) return [];
					p1_to_p3_len = defaultSideLen;
					p2_to_p3_len = defaultSideLen;
					p1_to_p3_dir = PositionConstants.getNextClockWise(direction, false);
					p2_to_p3_dir = PositionConstants.getNextCounterClockWise(PositionConstants.getOppositeDirection(direction), true);
				} else if (!isDiagonal && type == TYPE_WING) {
					if (distance % 2 == 0) return [];
					p1_to_p3_len = defaultSideLen;
					p2_to_p3_len = defaultSideLen;
					p1_to_p3_dir = PositionConstants.getNextClockWise(direction, true);
					p2_to_p3_dir = PositionConstants.getNextCounterClockWise(PositionConstants.getOppositeDirection(direction), false);
				} else if (isDiagonal && type == TYPE_PYRAMID) {
					if (defaultSideLen % 2 == 0) return[];
					p1_to_p3_len = defaultSideLen;
					p2_to_p3_len = defaultSideLen;
					p1_to_p3_dir = PositionConstants.getNextClockWise(direction, true);
					p2_to_p3_dir = PositionConstants.getNextCounterClockWise(PositionConstants.getOppositeDirection(direction), true);
				} else {
					return [];
				}

				if (!p1_to_p3_dir || !p2_to_p3_dir || !p1_to_p3_len || !p2_to_p3_len) return [];
				
				let result = [];
				result.push({ startPos: p1.position, dir: direction, len: defaultSideLen }); // p1->p2
				result.push({ startPos: p1.position, dir: p1_to_p3_dir, len: p1_to_p3_len }); // p1->p3
				result.push({ startPos: p2.position, dir: p2_to_p3_dir, len: p2_to_p3_len }); // p2->p3

				let p3 = PositionConstants.getPositionOnPath(p1.position, p1_to_p3_dir, p1_to_p3_len);
				if (levelVO.hasSector(p3.sectorX, p3.sectory)) return [];
				
				return result;
			};

			let connectionPoints = levelVO.pendingConnectionPoints;

			connectionPoints = connectionPoints.filter(c => levelVO.getNeighbourCount(c.position.sectorX, c.position.sectorY) <= 3);

			if (!connectionPoints || connectionPoints.length < 2) return;

			let params = { p1: connectionPoints, p2: connectionPoints, type: [ TYPE_PYRAMID, TYPE_ARROW, TYPE_WING ] };
			let offset = this.getRandomPathsOffset(levelVO, params, getPaths, options);

			let paths = getPaths(offset);

			this.createPaths(levelVO, paths, false, options);
		},

		createRandomLines: function (seed, pathSeed, levelVO, options, maxlen, connectionPoint) {
			let l = levelVO.levelOrdinal;
			let pathRandomSeed = levelVO.sectors.length * 4 + l + pathSeed * 5;
			let s1 = seed + (l + 70) * pathRandomSeed;
			let s2 = seed * levelVO.levelOrdinal + 28381 + pathRandomSeed;
			let s3 = seed * 3 * pathRandomSeed * l + 55;
			
			let pathStartPoint = connectionPoint;
			let pathStartPos = pathStartPoint.position.clone();

			let possibleDirections = this.getPossiblePathDirections(s1, s2, levelVO, pathStartPoint, options.shape);

			if (possibleDirections.length == 0) return;

			let stage = options.stage;
			let stageGoal = WorldCreatorHelper.getNumSectorsForLevelStage(seed, levelVO.campOrdinal, levelVO.level, stage);
			let stageCompletion = levelVO.getSectorsByStage(options.stage).length / stageGoal;
			
			let minPathLength = levelVO.structureSettings.minPathLength;
			let maxPathLength = levelVO.structureSettings.maxPathLength;
			if (stageCompletion > 0.5) maxPathLength = Math.min(maxPathLength, WorldConstants.MAX_PATH_NO_CROSSINGS_LENGTH);
			let maxLength = MathUtils.clamp(Math.round(maxlen / 2), minPathLength, maxPathLength);

			let pathLength = WorldCreatorRandom.randomInt(s3, minPathLength, maxLength + 1);

			let getPath = function (params) {
				let len = MathUtils.clamp(params.len, minPathLength, maxLength);
				let dir = params.dir;
				let connectionPointType = LevelStructureGenerator.getDefaultPathConnectionPointType(levelVO, len);
				return LevelStructureGenerator.getPathVO(levelVO, pathStartPos, dir, len, false, options, connectionPointType);
			};

			let getPaths = function (params) {
				return [ getPath(params) ];
			};

			let lenParams = [ pathLength, pathLength - 1, pathLength - 2, pathLength - 3, pathLength - 4, pathLength + 1, pathLength + 2, pathLength + 3, pathLength + 4 ];
			let params = this.getRandomPathsOffset(levelVO, { len: lenParams, dir: possibleDirections }, getPaths, options);

			if (params.score < 0) return;

			let path = getPath(params);
			
			let connectionPointType = LevelStructureGenerator.getDefaultPathConnectionPointType(levelVO, path.len);
			return this.createPath(levelVO, path.startPos, path.dir, path.len, false, options, connectionPointType, 0, 1);
		},

		getMaximumRectangleSize: function (levelVO, maxShapeSize) {
			let maxFromMaxPathLen = Math.floor(levelVO.structureSettings.maxPathLength / 2);
			let maxFromLevelSize = Math.ceil(levelVO.numSectors / 1);
			let maxFromMaxShapeSize = Math.ceil(maxShapeSize/6);
			return Math.min(maxFromMaxPathLen, maxFromLevelSize, maxFromMaxShapeSize);
		},

		// UTILS FOR CONNECTION POINTS
		
		addConnectionPoint: function (levelVO, pos, point) {
			if (!point) return;
			if (!levelVO.hasSector(pos.sectorX, pos.sectorY)) return;

			// remove directions away from level middle if already too far
			let excursionStartPosition = levelVO.getExcursionStartPosition();
			let maxdist = Math.min(this.getMaxExcursionDistance(levelVO) - 5, 30);

			let dist = PositionConstants.getDistanceTo(pos, excursionStartPosition);
			if (dist > maxdist) {
				let directionToStart = PositionConstants.getDirectionFrom(pos, excursionStartPosition);
				let allowedDirections = [ 
					directionToStart, 
					PositionConstants.getNextClockWise(directionToStart, true), 
					PositionConstants.getNextCounterClockWise(directionToStart, true)
				];
				
				let directionArrays = [ point.dirs, point.dirs2 ];
				for (let a = 0; a < directionArrays.length; a++) {
					let array = directionArrays[a];
					let indicesToRemove = [];
					for (let i = 0; i < array.length; i++) {
						let direction = array[i];
						let isAllowed = allowedDirections.indexOf(direction) >= 0;
						if (!isAllowed) indicesToRemove.push(i);
					}

					for (let i = indicesToRemove.length - 1; i >= 0; i--) {
						array.splice(indicesToRemove[i], 1);
					}
				}
			}

			if (point.dirs.length == 0 && point.dirs2.length == 0) return;

			// skip if neighbours have connection points
			for (let i = 0; i < levelVO.allConnectionPoints.length; i++) {
				let existingPoint = levelVO.allConnectionPoints[i];
				if (PositionConstants.getDistanceTo(pos, existingPoint.position) < 2) return;
			}

			point.stage = levelVO.getSector(pos.sectorX, pos.sectorY).stage;
			
			levelVO.addPendingConnectionPoint(point);
		},

		updateLevelConnectionPoints: function (worldVO, levelVO, stage) {
			// TODO remove invalid connection points
			// TODO remove invalid connection point directions

			for (let i = 0; i < levelVO.allConnectionPoints.length; i++) {
				let point = levelVO.allConnectionPoints[i];
				point.connectionPointScore = LevelStructureGenerator.getConnectionPointScore(worldVO, levelVO, point, stage);
			}
		},

		// options: stage, canConnectToDifferentStage
		getShapeConnectionPoint: function (seed, i, worldVO, levelVO, options) {
			let s1 = seed % 5 + i;
			let s2 = seed - i * 2;

			let filterResult = function (arr) {
				let result = arr;
				let maxNeighbourCount = 4;
				result = LevelStructureGenerator.filterIfSomethingLeft(result, (point) => levelVO.getNeighbourCount(point.position.sectorX, point.position.sectorY) <= maxNeighbourCount);
				result = LevelStructureGenerator.filterIfSomethingLeft(result, (point) => levelVO.getAreaDensity(point.position.sectorX, point.position.sectorY, 2) < 0.55);
				result = LevelStructureGenerator.filterIfSomethingLeft(result, (point) => levelVO.getAreaDensity(point.position.sectorX, point.position.sectorY, 3) < 0.5);
				return result;
			};

			let filterSortedResult = function (arr) {
				let result = arr;
				let maxScore = getCandidateScore(arr[0]);
				result = LevelStructureGenerator.filterIfSomethingLeft(result, (point) => getCandidateScore(point) >= maxScore / 4);
				result = LevelStructureGenerator.filterIfSomethingLeft(result, (point) => getCandidateScore(point) >= maxScore / 2);
				return result;
			};

			let getCandidateScore = function (point) {
				return point.connectionPointScore || LevelStructureGenerator.getConnectionPointScore(worldVO, levelVO, point, options.stage);
			};

			let sortCandidates = function (arr) {
				return arr.sort((a, b) => getCandidateScore(b) - getCandidateScore(a));
			};

			let selectCandidate = function (arr) {
				let maxi = WorldCreatorRandom.randomInt(s1, 0, Math.floor(arr.length / 2) + 1);
				let i = WorldCreatorRandom.randomInt(s2, 0, maxi + 1);
				let result = arr[i];
				return { position: result.position, dirs: result.dirs || [], dirs2: result.dirs2 || PositionConstants.getLevelDirections(), stage: result.stage, type: result.type || "fallback" };
			};
			
			let candidates = [];

			if (options.stage && !options.canConnectToDifferentStage) {
				candidates = levelVO.pendingConnectionPoints.filter(p => options.stage ? p.stage == options.stage : true);
			}

			if (candidates.length < 3) {
				candidates = levelVO.pendingConnectionPoints.concat();
			}

			if (candidates.length < 2 && options.stage) {
				log.w("ran out of valid connection points, falling back to all sectors", "world");
				candidates = candidates.concat(levelVO.getSectorsByStage(options.stage));
			}

			if (candidates.length < 2) {
				log.w("ran out of valid connection points, falling back to stage sectors", "world");
				candidates = candidates.concat(levelVO.sectors);
			}

			candidates = filterResult(candidates);
			candidates = sortCandidates(candidates);
			candidates = filterSortedResult(candidates);

			let point = selectCandidate(candidates);

			return point;
		},

		getConnectionPointScore: function (worldVO, levelVO, point, stage) {
			// point can be a real connection point or a fallback sector

			let possibleShapes = Object.keys(levelVO.structureSettings.shapeWeights).filter(shape => levelVO.structureSettings.shapeWeights[shape] > 0);
			let densityScoreModifier = 1 - levelVO.structureSettings.density;
			let isLevelOnlyLines = possibleShapes.indexOf(WorldCreatorConstants.SHAPE_CIRCLE) < 0 && possibleShapes.indexOf(WorldCreatorConstants.SHAPE_RECTANGLE_CENTER) < 0 && possibleShapes.indexOf(WorldCreatorConstants.SHAPE_RECTANGLE_CORNER) < 0;

			let score = 0;

			let sectorStage = levelVO.getSector(point.position.sectorX, point.position.sectorY).stage;
			if (sectorStage == stage) score += 2;

			let defaultStage = LevelStructureGenerator.getDefaultStage(levelVO, point.position);
			if (defaultStage == stage) score += 2;

			let neighbourCount = levelVO.getNeighbourCount(point.position.sectorX, point.position.sectorY);
			if (neighbourCount == 1 && !isLevelOnlyLines) score += 10;
			if (neighbourCount == 2) score++;
			if (neighbourCount < 5) score += densityScoreModifier;
			if (neighbourCount < 4) score += densityScoreModifier;

			let areaDensity = levelVO.getAreaDensity(point.position.sectorX, point.position.sectorY, 4);
			if (areaDensity < 0.2) score += densityScoreModifier;
			if (areaDensity < 0.3) score += densityScoreModifier;
			if (areaDensity < 0.4) score += densityScoreModifier;
			if (areaDensity < 0.5) score += densityScoreModifier;

			let localDensity = levelVO.getAreaDensity(point.position.sectorX, point.position.sectorY, 3);
			if (localDensity < 0.3) score += densityScoreModifier;

			let immediateDensity = levelVO.getAreaDensity(point.position.sectorX, point.position.sectorY, 2);
			if (immediateDensity < 0.4) score += densityScoreModifier;

			let origo = new PositionVO(levelVO.level, 0, 0);
			if (PositionConstants.getDistanceTo(point.position, origo) < 25) score++;
			if (PositionConstants.getDistanceTo(point.position, origo) < 30) score++;
			if (PositionConstants.getDistanceTo(point.position, origo) < 35) score++;
			if (PositionConstants.getDistanceTo(point.position, levelVO.getExcursionStartPosition()) < 20) score++;
			if (PositionConstants.getDistanceTo(point.position, levelVO.getExcursionStartPosition()) < 30) score++;

			let pathToCrossing = WorldCreatorHelper.getShortestPathToMatchingSector(worldVO, levelVO, point.position, pos => levelVO.isCrossing(pos.sectorX, pos.sectorY));
			let distanceToCrossing = pathToCrossing ? pathToCrossing.length : 999;
			if (distanceToCrossing < 2) score -= 3;
			if (distanceToCrossing > 8) score++;
			if (distanceToCrossing > 10) score++;
			if (distanceToCrossing >= WorldConstants.MAX_PATH_NO_CROSSINGS_LENGTH) score += 3;

			let pathToExcursionStart = WorldCreatorRandom.findPath(worldVO, point.position, levelVO.getExcursionStartPosition(), false, true);
			let distanceToExcursionStart = pathToExcursionStart ? pathToExcursionStart.length : 999;
			let maxExcursionLength = this.getMaxExcursionDistance(levelVO);
			if (distanceToExcursionStart >= maxExcursionLength) score -= 100;
			if (distanceToExcursionStart >= maxExcursionLength - 3) score -= 3;
			if (distanceToExcursionStart >= maxExcursionLength - 5) score -= 3;
			if (distanceToExcursionStart >= maxExcursionLength - 7) score -= 1;

			if (!LevelStructureGenerator.isPreferredSectorPosition(levelVO, point.position)) score -= 2;

			if (this.hasConnectionPointPotentialConnectionLine(levelVO, point)) score += 1;
			
			score += LevelStructureGenerator.getPositionStageSuitabilityScore(levelVO, point.position, stage);

			if (point.numFailures) score -= point.numFailures * 0.5;

			return score;
		},
		
		getConnectionPoint: function (type, pathi, pathlen, sectorPos, pathdir, isDerived) {
			if (!type) return null;
			let dirs = [];
			let dirs2 = [];
			let oppositeDir = PositionConstants.getOppositeDirection(pathdir);

			if (pathlen > 14 && type == WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL) type = WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA;

			let isPositiveDirection = PositionConstants.isPositiveDirection(pathdir);

			// round in in the same direction even when path direction is different to get matching connection points on opposite sides of even-sided rectangles
			let roundMiddle = (i) => isPositiveDirection ? Math.floor(i) : Math.ceil(i);
			let roundSecondaryMiddle = (i, isFirst) => isFirst ? Math.ceil(i) : Math.floor(i); 

			let maxIndex = pathlen - 1;

			let isStart = pathi == 0;
			let isEnd = pathi == maxIndex;
			let isMiddle = pathi == roundMiddle(maxIndex / 2);

			let isSecondaryMiddle = pathi == roundSecondaryMiddle(maxIndex / 4, true) || pathi == roundSecondaryMiddle(maxIndex / 4 * 3, false);

			switch (type) {
				case WorldCreatorConstants.CONNECTION_POINTS_PATH_END:
					if (isEnd) {
						dirs.push(pathdir);
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						dirs2.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_START:
					if (isStart) {
						dirs.push(oppositeDir);
						dirs.push(PositionConstants.getNextClockWise(oppositeDir));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir));
						dirs2.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS:
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_END, pathi, pathlen, sectorPos, pathdir, true)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_START, pathi, pathlen, sectorPos, pathdir, true);

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE:
					if ((isMiddle && (!isDerived || pathlen >= 5))) {
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						if (pathlen > 3) {
							dirs2.push(PositionConstants.getNextClockWise(pathdir, true));
							dirs2.push(PositionConstants.getNextCounterClockWise(pathdir, true));
							dirs2.push(PositionConstants.getNextClockWise(oppositeDir, true));
							dirs2.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						}
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE2:
					if (isSecondaryMiddle && (!isDerived || pathlen >= 9)) {
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;


				case WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL:
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir, true)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS, pathi, pathlen, sectorPos, pathdir, true);

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA:
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir, true)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE2, pathi, pathlen, sectorPos, pathdir, true)
						|| this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS, pathi, pathlen, sectorPos, pathdir, true);

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_CW:
					var cw = PositionConstants.getNextClockWise(pathdir);
					if (isEnd) {
						dirs.push(pathdir);
						dirs.push(cw);
						dirs2.push(PositionConstants.getNextClockWise(cw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(cw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isMiddle) {
						dirs.push(cw);
						dirs2.push(PositionConstants.getNextClockWise(cw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(cw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_CCW:
					var ccw = PositionConstants.getNextCounterClockWise(pathdir);
					if (isEnd) {
						dirs.push(pathdir);
						dirs.push(ccw);
						dirs2.push(PositionConstants.getNextClockWise(ccw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(ccw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isMiddle) {
						dirs.push(ccw);
						dirs2.push(PositionConstants.getNextClockWise(ccw, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(ccw, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_CONTINUE:
					if (isEnd) {
						dirs.push(pathdir);
						dirs2.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(oppositeDir);
						dirs2.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs2.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_T:
					if (isEnd) {
						dirs.push(PositionConstants.getNextClockWise(pathdir));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(PositionConstants.getNextClockWise(oppositeDir));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					break;

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_Y:
					if (isEnd) {
						dirs.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir, true);

				case WorldCreatorConstants.CONNECTION_POINTS_PATH_X:
					if (isEnd) {
						dirs.push(PositionConstants.getNextClockWise(pathdir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(pathdir, true));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextClockWise(pathdir, true)));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextCounterClockWise(pathdir, true)));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					if (isStart) {
						dirs.push(PositionConstants.getNextClockWise(oppositeDir, true));
						dirs.push(PositionConstants.getNextCounterClockWise(oppositeDir, true));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextClockWise(oppositeDir, true)));
						dirs.push(PositionConstants.getOppositeDirection(PositionConstants.getNextCounterClockWise(oppositeDir, true)));
						return { position: sectorPos, dirs: dirs, dirs2: dirs2, type: type };
					}
					return this.getConnectionPoint(WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE, pathi, pathlen, sectorPos, pathdir, true);

				default:
					WorldCreatorLogger.w("unknown path connection point type: " + type);
					return null;
			}
		},
		
		getPathConnectionPointType: function (rectConnectionPointType) {
			if (!rectConnectionPointType) return null;
			switch (rectConnectionPointType) {
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_MIDDLE:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_MIDDLE;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_OUTER:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_CCW;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_INNER:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_CW;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL;
					
				case WorldCreatorConstants.CONNECTION_POINTS_RECT_EXTRA:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA;

				case WorldCreatorConstants.CONNECTION_POINTS_RECT_DIAGONAL:
					return WorldCreatorConstants.CONNECTION_POINTS_PATH_X;

				default:
					WorldCreatorLogger.w("unknown rectangle connection point type: " + rectConnectionPointType);
					return null;
			}
		},

		getDefaultPathConnectionPointType: function (levelVO, len) {
			let density = levelVO.structureSettings.density;

			let extraPointsThreshold = MathUtils.map(density, 0, 1, 25, 9);
			if (len >= extraPointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_PATH_EXTRA;

			let middlePointsThreshold = MathUtils.map(density, 0, 1, 11, 5);
			if (len >= middlePointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_PATH_ALL;

			return WorldCreatorConstants.CONNECTION_POINTS_PATH_ENDS;
		},

		getDefaultRectangleConnectionPointType: function (levelVO, sideLen) {
			let density = levelVO.structureSettings.density;

			let extraPointsThreshold = MathUtils.map(density, 0, 1, 29, 9);
			if (sideLen >= extraPointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_RECT_EXTRA;

			let middlePointsThreshold = MathUtils.map(density, 0, 1, 13, 5);
			if (sideLen >= middlePointsThreshold) return WorldCreatorConstants.CONNECTION_POINTS_RECT_ALL;

			return WorldCreatorConstants.CONNECTION_POINTS_RECT_CORNERS;
		},

		hasConnectionPointPotentialConnectionLine: function (levelVO, point) {
			for (let i = 0; i < levelVO.allConnectionPoints.length; i++) {
				let point2 = levelVO.allConnectionPoints[i];
				let distance = PositionConstants.getDistanceTo(point.position, point2.position);
				if (distance < 3 || distance > levelVO.structureSettings.maxPathLength) continue;
				let alignment = PositionConstants.getPositionAlignment(point.position, point2.position);
				if (alignment <= 0) continue;
				let direction = PositionConstants.getDirectionFrom(point.position, point2.position);
				let pathPos1 = PositionConstants.getPositionOnPath(point.position, direction, 1);
				let isBlocked = levelVO.hasSector(pathPos1.sectorX, pathPos1.sectorY);
				if (isBlocked) continue;
				return true;
			}
			return false;
		},

		isConnectionPointUsable: function (levelVO, point) {
			let numNeighbours = WorldCreatorHelper.getNeighbourCount(levelVO, point.position);
			if (numNeighbours > 4) return false;
			return true;
		},

		// UTILS (General)

		getRectangleFromCenter: function (levelVO, center, w, h, forceComplete, isDiagonal, connectionPointsType) {
			if (isDiagonal) {
				var corner = new PositionVO(center.level, center.sectorX, center.sectorY - h + 1);
				return this.getRectangle(levelVO, corner, w, h, PositionConstants.DIRECTION_SE, null, forceComplete, connectionPointsType);
			} else {
				var corner = new PositionVO(center.level, Math.round(center.sectorX - w / 2), Math.round(center.sectorY - h / 2));
				return this.getRectangle(levelVO, corner, w, h, PositionConstants.DIRECTION_EAST, null, forceComplete, connectionPointsType);
			}
		},
		
		getRectangle: function (levelVO, startPos, w, h, startDirection, options, forceComplete, connectionPointsType) {
			options = options || {};
			let result = [];
			let sideStartPos = startPos;
			let currentDirection = startDirection;
			for (let j = 0; j < 4; j++) {
				let sideLength = PositionConstants.isHorizontalDirection(currentDirection) ? w : h;
				let connectionPointType = this.getPathConnectionPointType(connectionPointsType);
				let path = this.getPathVO(levelVO, sideStartPos, currentDirection, sideLength, forceComplete, options, connectionPointType);
				
				result.push(path);

				sideStartPos = PositionConstants.getPositionOnPath(sideStartPos, currentDirection, sideLength - 1);
				currentDirection = options.isCounterClockwise ? 
					PositionConstants.getNextCounterClockWise(currentDirection, false) :
					PositionConstants.getNextClockWise(currentDirection, false);
			}
			return result;
		},
		
		createPathBetween: function (worldVO, levelVO, startPos, endPos, maxlen, options, connectionPointType) {
			options = options || {};

			let dist = Math.ceil(PositionConstants.getDistanceTo(startPos, endPos));
			let result = { path: [], isComplete: true };
			
			let startPosExists = levelVO.hasSector(startPos.sectorX, startPos.sectorY);
			let endPosExists = levelVO.hasSector(endPos.sectorX, endPos.sectorY);

			// WorldCreatorLogger.i("createPathBetween " + startPos + " " + endPos + " " + options.stage + " " + options.criticalPath + " / " + maxlen + ", dist: " + dist);

			let isComplete = function () {
				if (!startPosExists) return false;
				if (!endPosExists) return false;
				let stage = options.stage == WorldConstants.CAMP_STAGE_EARLY ? options.stage : null;
				let currentDistance = LevelStructureGenerator.getCurrentSectorDistance(worldVO, startPos, endPos, stage);
				return currentDistance > 0 && (maxlen < 0 || currentDistance <= maxlen)
			}
			
			if (isComplete()) {
				return { path: [], isComplete: true };
			}
			
			let validSectors = options.stage ? levelVO.getSectorsByStage(options.stage) : levelVO.sectors;
			
			let getConnectionPaths = function (s1, s2, allowDiagonals) {
				if (!s1 || !s2)
					return { paths: [], isValid: false, reason: "invalid positions" };
				if (s1.equals(s2))
					return { paths: [], isValid: true };
				var startDirections = PositionConstants.getDirectionsFrom(s1, s2, allowDiagonals);
				if (startDirections.length == 0) {
					return { paths: [], isValid: false, reason: "no directions" };
				}
				
				var frontier = [];
				var validPaths = [];
				var invalidPathReasons = [];
				var invalidPaths = [];
				for (let i = 0; i < startDirections.length; i++) {
					frontier.push({ currentPos: s1, currentDirection: startDirections[i], paths: [], len: 0 });
				}
				
				while (frontier.length > 0) {
					var current = frontier.shift();
					var currentPos = current.currentPos;
					var direction = current.currentDirection;
					var pathLength = PositionConstants.getDistanceInDirection(currentPos, s2, direction) + 1;
					var pathCandidate = { startPos: currentPos, dir: direction, len: pathLength };
					var validCheck = LevelStructureGenerator.isValidPath(levelVO, pathCandidate, null, options);
					if (validCheck.isValid) {
						var newPos = PositionConstants.getPositionOnPath(currentPos, direction, pathLength - 1);
						current.paths.push(pathCandidate);
						current.len += pathCandidate.len;
						if (newPos.equals(s2)) {
							validPaths.push(current);
						} else {
							var nextDirections = PositionConstants.getDirectionsFrom(currentPos, s2, allowDiagonals);
							for (let i = 0; i < nextDirections.length; i++) {
								frontier.push({ currentPos: newPos, currentDirection: nextDirections[i], paths: current.paths.slice(), len: current.len });
							}
						}
					} else {
						invalidPaths.push(pathCandidate);
						invalidPathReasons.push(pathCandidate.startPos + " " + PositionConstants.getDirectionName(pathCandidate.dir) + " " + pathCandidate.len + " " + validCheck.reason);
					}
				}
				
				if (validPaths.length == 0) {
					return { paths: [], isValid: false, reason: "no valid paths | invalid paths: " + invalidPathReasons.join(",") };
				}

				let getPathScore = function (p) { 
					let score = 1000;
					score -= p.len * 3;
					
					for (let i = 0; i < p.paths.length; i++) {
						let path = p.paths[i];
						score -= path.len * 3;

						let numExisiting = LevelStructureGenerator.getExistingPositionsOnPath(levelVO, path.startPos, path.dir, path.len).length;
						let percentExisting = numExisiting / path.len;
						if (percentExisting > 0.5) score += path.len;
					}

					return score;
				}
				
				validPaths.sort((a, b) => getPathScore(b) - getPathScore(a));
				
				return { paths: validPaths[0].paths, isValid: true };
			};
			
			let createConnectionPath = function (s1, s2, allowDiagonals) {
				let pathsResult = getConnectionPaths(s1, s2, allowDiagonals);
				
				if (pathsResult.isValid) {
					for (let i = 0; i < pathsResult.paths.length; i++) {
						// exit early if connection completed with partial path
						if (i > 0 && isComplete()) {
							break;
						}

						let path = pathsResult.paths[i];
						let pathResult = LevelStructureGenerator.createPath(levelVO, path.startPos, path.dir, path.len, true, options, connectionPointType);
						result.path = result.path.concat(pathResult.path);
					}
				} else {
					WorldCreatorLogger.w("couldn't create path between " + s1 + " and " + s2 + ", reason: " + pathsResult.reason);
					result.isComplete = false;
				}
			};
			
			let getClosestValid = function (validSectors, sector, allowDiagonals) {
				let result = null;
				var connectionPaths = null;
				var pathsResult = null;
				let i = 0;
				do {
					result = WorldCreatorHelper.getClosestSector(validSectors, sector, i);
					if (result) {
						pathsResult = getConnectionPaths(sector, result.position, allowDiagonals);
						connectionPaths = pathsResult.paths;
					}
					i++;
				} while (!connectionPaths && i < validSectors.length);
				return result;
			};
			
			let getNearestConnected = function (validSectors, position, targetSector, maxdist) {
				if (!levelVO.hasSector(position.sectorX, position.sectorY)) {
					return { position: position };
				}
				var connectedSectors = LevelStructureGenerator.getConnectedSectors(worldVO, position, validSectors, options.stage, maxdist);
				return WorldCreatorHelper.getClosestSector(connectedSectors.connected, targetSector);
			};
			
			let getPointData = function (validSectors, point, otherPoint, allowDiagonals, maxNearestConnectedDist) {
				let data = {};
				data.pos = point;
				if (validSectors.length > 0) {
					data.closestExisting = getClosestValid(validSectors, point, allowDiagonals);
					data.connectionPathsToCE = getConnectionPaths(point, data.closestExisting.position, allowDiagonals).paths;
					data.nearestConnected = getNearestConnected(validSectors, point, otherPoint, maxNearestConnectedDist);
					data.isExisting = levelVO.hasSector(point.sectorX, point.sectorY);
				}
				return data;
			};
			
			let getTotalLength = function (paths) {
				if (!paths || paths.length <= 0) return 0;
				// several paths
				if (paths[0].len) return paths.reduce((sum, current) => sum + current.len, 0);
				// single path (array of sectors)
				return paths.length;
			};
			
			let getPathLength = function (path) {
				return path ? path.length : 0;
			};
			
			options = options || this.getDefaultOptions();
			if (dist == 0) {
				this.createAddSector(result.path, levelVO, startPos, options);
				this.createAddSector(result.path, levelVO, endPos, options);
			} else if (dist == 1) {
				this.createAddSector(result.path, levelVO, startPos, options);
				this.createAddSector(result.path, levelVO, endPos, options);
			} else {
				var allowDiagonals = dist > maxlen / 2 || levelVO.structureSettings.diagonalRateLine >= 0.25;
				
				// find important points and paths for both startPos and endPos (S)
				// - closest existing point (sector in validSectors closest to S, can be S itself)
				// - nearest connected (sector in validSectors that is connected to S, but closest to the other end point, can be null if S doesn't exist or is unconnected to anything else)
				var startPosData = getPointData(validSectors, startPos, endPos, allowDiagonals, dist);
				var endPosData = getPointData(validSectors, endPos, startPos, allowDiagonals, dist);
				
				// consider 3 alternative paths:
				// - direct
				var pathsDirect = getConnectionPaths(startPos, endPos, allowDiagonals).paths;
				var lenDirect = getTotalLength(pathsDirect);
				let maxIndirectLen = Math.max(lenDirect, maxlen);

				// - via existing: startPos -> startPosData.closestExisting (already created ->) endPosData.closestExisting -> endPos
				var pathBetweenExisting = startPosData.closestExisting && endPosData.closestExisting ?
					WorldCreatorRandom.findPath(worldVO, startPosData.closestExisting.position, endPosData.closestExisting.position, false, true, options.stage) : null;
				var pathsWithExisting = null;
				if (startPosData.connectionPathsToCE && endPosData.connectionPathsToCE) {
					pathsWithExisting = startPosData.connectionPathsToCE.concat(endPosData.connectionPathsToCE);
				}
				var isValidViaExisting = pathBetweenExisting && pathBetweenExisting.length > 0 && pathsWithExisting && pathsWithExisting.length > 0;
				var lenViaExisting = getTotalLength(pathsWithExisting) + getTotalLength(pathBetweenExisting);

				// - via nearest: startPos (already created ->) startPosData.nearestConnected -> endPosData.nearestConnected (already created- >) endPos
				var pathsBetweenNearest = null;
				if (startPosData.nearestConnected && endPosData.nearestConnected) {
					pathsBetweenNearest = getConnectionPaths(startPosData.nearestConnected.position, endPosData.nearestConnected.position, allowDiagonals).paths;
				}
				var pathFromStart = startPosExists && startPosData.nearestConnected ? WorldCreatorRandom.findPath(worldVO, startPos, startPosData.nearestConnected.position, false, true, options.stage) : [];
				var pathFromEnd = endPosExists && endPosData.nearestConnected ? WorldCreatorRandom.findPath(worldVO, endPos, endPosData.nearestConnected.position, false, true, options.stage) : [];
				var isValidBetweenNearest = startPosExists && endPosExists && startPosData.nearestConnected && endPosData.nearestConnected && pathsBetweenNearest && pathsBetweenNearest.length > 0;
				var lenBetweenNearest = getTotalLength(pathsBetweenNearest) + getPathLength(pathFromStart) + getPathLength(pathFromEnd);
				
				// make path via existing or nearest if they exist and are short enough, otherwise direct (direct is often ugly)
				// WorldCreatorLogger.i("- lenDirect: " + lenDirect + ", lenViaExisting: " + lenViaExisting + ", lenBetweenNearest: " + lenBetweenNearest + ", max alternative len: " + maxIndirectLen + ", allowDiagonals: " + allowDiagonals);
				if (isValidBetweenNearest && lenBetweenNearest <= maxIndirectLen) {
					// WorldCreatorLogger.i("- use nearest: " + startPosData.nearestConnected.position + " - " + endPosData.nearestConnected.position);
					// WorldCreatorLogger.i(startPosData)
					// WorldCreatorLogger.i(pathFromStart)
					createConnectionPath(startPosData.nearestConnected.position, endPosData.nearestConnected.position, allowDiagonals);
				} else if (isValidViaExisting && lenViaExisting <= maxIndirectLen) {
					// WorldCreatorLogger.i("- use existing " + startPosData.closestExisting + " " + endPosData.closestExisting);
					createConnectionPath(startPos, startPosData.closestExisting.position, true);
					createConnectionPath(endPosData.closestExisting.position, endPos, true);
				} else {
					createConnectionPath(startPos, endPos, allowDiagonals);
				}
			}
			
			return result;
		},
		
		getPathVO: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType) {
			return { startPos: startPos, dir: direction, len: len, forceComplete: forceComplete, connectionPointType: connectionPointType };
		},
		
		getPathVOPositions: function (pathVO) {
			let result = [];
			for (var si = 0; si < pathVO.len; si++) {
				result.push(PositionConstants.getPositionOnPath(pathVO.startPos, pathVO.dir, si));
			}
			return result;
		},
		
		getPath: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength) {
			if (len < 1) return { path: [], completed: false, isValid: false, reason: "too short" };

			let result = [];
			options = options || this.getDefaultOptions();
			let completed = true;
			let isValid = true;
			let reason = "";

			let isShapeEnd = !shapeLength || shapeIndex === 0 || shapeIndex === shapeLength - 1;

			let existingPositions = this.getExistingPositionsOnPath(levelVO, startPos, direction, len);

			if (existingPositions.length == len) {
				return { path: existingPositions, completed: true, isValid: true, reason: "already exists" };
			}

			let crossings = 0;
			
			for (let si = 0; si < len; si++) {
				let sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
				sectorPos.level = levelVO.level;
				let completedLen = si + 1;
				let completedPercent = completedLen / len;
				
				// cancel path if invalid position
				let positionCheck = this.isValidSectorPosition(levelVO, sectorPos, options.stage, options, result);
				if (!positionCheck.isValid) {
					return { path: result, completed: false, isValid: false, reason: positionCheck.reason };
				}
				
				let sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);

				let isAllowedCrossing = false;
				if (options.allowedCrossings) {
					for (let i = 0; i < options.allowedCrossings.length; i++) {
						let allowedCrossing = options.allowedCrossings[i];
						if (allowedCrossing.sectorX == sectorPos.sectorX && allowedCrossing.sectorY == sectorPos.sectorY) {
							isAllowedCrossing = true;
							break;
						}
					}
				}

				if (sectorExists) {
					let isPathEnd = si == 0 || si == len - 1;

					if (isPathEnd) {
						result.push(sectorPos);
						continue;
					}

					crossings++;

					if (options.numAllowedCrossings > 0 && options.numAllowedCrossings >= crossings) {
						result.push(sectorPos);
						continue;
					}

					if (forceComplete) {
						result.push(sectorPos);
						continue;
					}

					if (isAllowedCrossing) {
						result.push(sectorPos);
						continue;
					}
						
					let existingSector = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);

					if (!(isShapeEnd && isPathEnd) && options.allowNoOverlaps) {
						return { path: result, completed: false, isValid: false, reason: "allow no overlaps" };
					}

					if (!isShapeEnd && options.stage && existingSector.stage != options.stage && !options.canConnectToDifferentStage) {
						return { path: result, completed: false, isValid: false, reason: "existing sector has wrong stage" };
					}

					if (completedLen < 4 || completedPercent < 0.6) {
						return { path: result, completed: false, isValid: false, reason: "existing sector interrupts path too early" };
					}
					
					result.push(sectorPos);
					completed = false;
					break;
				}

				let sectorResult = this.canCreateSector(levelVO, sectorPos, options);
				
				if (sectorResult.result || sectorResult.exists) {
					result.push(sectorPos);
				} else {
					if (!sectorResult.result) {
						isValid = false;
						reason = "couldn't create sector " + sectorResult.reason;
					}
					completed = false;
					break;
				}
			}
			
			// check paths don't have too high average neighbour count (excluding start and end pos) (blocks parallel diagonals and some really crowded cross-paths)
			if (isValid && !forceComplete) {
				let totalNeighbours = 0;
				for (let i = 1; i < result.length - 1; i++) {
					totalNeighbours += WorldCreatorHelper.getNeighbourCount(levelVO, result[i], result);
				}
				let averageNeighbours = totalNeighbours / (result.length - 2);
				if (result.length > 5 && averageNeighbours > 3.5) {
					isValid = false;
					reason = "path has too many neighbours";
				}
				if (result.length > 3 && averageNeighbours > 4.5) {
					isValid = false;
					reason = "path has too many neighbours";
				}
			}
			
			return { path: result, completed: completed, isValid: isValid, reason: reason };
		},

		isPathClear: function (levelVO, startPos, direction, len) {
			let nextPos = PositionConstants.getPositionOnPath(startPos, direction, 1);
			return this.getExistingPositionsOnPath(levelVO, nextPos, direction, len).length == 0;
		},

		getExistingPositionsOnPath: function (levelVO, startPos, direction, len) {
			let result = [];
			
			for (let si = 0; si < len; si++) {
				let sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
				let sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);
				if (sectorExists) result.push(sectorPos);
			}

			return result;
		},

		createPath: function (levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength) {
			if (len < 1) return { path: [], completed: false, reason: "too short" };

			options = options || this.getDefaultOptions();

			if (len != Math.round(len)) {
				debugger
				WorldCreatorLogger.w("non-integer length for path");
			}

			if (!connectionPointType) {
				WorldCreatorLogger.w("no connection point type defined for path");
			}
			
			let path = this.getPath(levelVO, startPos, direction, len, forceComplete, options, connectionPointType, shapeIndex, shapeLength);
			
			return this.createPathFromPath(levelVO, path, options, connectionPointType);
		},

		createPathFromPath: function (levelVO, path, options, connectionPointType) {
			if (!path.isValid) {
				return { path: [], completed: false, reason: "get path: " + path.reason };
			}

			let result = [];
			let completed = path.completed;

			let startPos = path.path[0];
			let len = path.path.length;

			for (let i = 0; i < path.path.length; i++) {
				let sectorPos = path.path[i];
				let sectorExists = levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY);

				if (sectorExists) {
					result.push(levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY));
				} else {
					var sectorResult = this.createSector(levelVO, sectorPos, options);
					result.push(sectorResult.vo);
				}
			}

			if (path.path.length > 1) {
				let direction = PositionConstants.getDirectionFrom(startPos, path.path[1]);
				
				// add connection points
				for (var si = 0; si < path.path.length; si++) {
					let sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
					sectorPos.level = levelVO.level;
					let connectionPoint = this.getConnectionPoint(connectionPointType, si, len, sectorPos, direction);
					this.addConnectionPoint(levelVO, sectorPos, connectionPoint);
				}
			}
			
			return { path: result, completed: completed };
		},
		
		connectNewPath: function (worldVO, levelVO, existingSectors, newSectors) {
			if (existingSectors.length < 1) return;
			if (newSectors.length < 1) return;
			let pathToCenter = WorldCreatorRandom.findPath(worldVO, newSectors[0].position, existingSectors[0].position, false, true);
			if (!pathToCenter) {
				let options = this.getDefaultOptions();
				let skip = 0;
				let attempts = 0;
				while (attempts < 10) {
					let pair = WorldCreatorHelper.getClosestPair(existingSectors, newSectors, skip);
					this.createPathBetween(worldVO, levelVO, pair[0].position, pair[1].position, -1, options);
					if (result.path && result.path.length > 0) {
						return;
					}
					skip++;
					attempts++;
				}
			}
		},
		
		createAddSector: function (arr, levelVO, sectorPos, options) {
			var sectorResult = this.createSector(levelVO, sectorPos, options);
			if (sectorResult.vo) {
				arr.push(sectorResult.vo);
			}
		},
		
		canCreateSector: function (levelVO, sectorPos, options) {
			sectorPos.normalize();
			options = options || this.getDefaultOptions();
			let stage = options.stage;
			let sectorVO = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
			
			let exists = sectorVO != null;
			let result = false;
			
			if (!exists) {
				let validResult = this.isValidSectorPosition(levelVO, sectorPos, stage, options);
				if (validResult.isValid) {
					result = true;
				} else {
					result = false;
					levelVO.invalidPositions.push(sectorPos);
				}
			}
			
			return { result: result, exists: exists, vo: sectorVO };
		},

		createSector: function (levelVO, sectorPos, options) {
			sectorPos.normalize();
			options = options || this.getDefaultOptions();
			let stage = options.stage || this.getDefaultStage(levelVO, sectorPos);
			let created = false;
			
			let check = this.canCreateSector(levelVO, sectorPos, options);
			let sectorVO = check.vo;
			if (check.result) {
				let vo = this.makeSector(levelVO, sectorPos, stage);
				created = levelVO.addSector(vo);
				if (created) {
					sectorVO = vo;
					levelVO.resetPaths();
				}
			}
			
			return { isNew: created, vo: sectorVO };
		},

		makeSector: function (levelVO, sectorPos, stage) {
			let vo = new SectorVO(sectorPos);
			// if (sectorPos.sectorX == -4 && sectorPos.sectorY == -15) debugger
			vo.stage = stage;
			vo.isCamp = levelVO.isCampPosition(sectorPos);
			vo.isPassageUp = levelVO.isPassageUpPosition(sectorPos);
			vo.passageUpType = levelVO.getPassageUpType(sectorPos);
			vo.isPassageDown = levelVO.isPassageDownPosition(sectorPos);
			vo.passageDownType = levelVO.getPassageDownType(sectorPos);
			vo.shapeID = levelVO.currentShapeID;
			return vo;
		},

		isValidPaths: function (levelVO, paths, stage, options) {
			for (let i = 0; i < paths.length; i++) {
				if (!this.isValidPath(levelVO, paths[i], stage, options)) return false;
			}
			return true;
		},
		
		isValidPath: function (levelVO, path, stage, options) {
			options = options || {};

			var startPos = path.startPos;
			var direction = path.dir;
			var pathPositions = this.getPathVOPositions(path);
			for (var si = 0; si < path.len; si++) {
				let sectorPos = PositionConstants.getPositionOnPath(startPos, direction, si);
				sectorPos.level = levelVO.level;
				if (levelVO.hasSector(sectorPos.sectorX, sectorPos.sectorY)) {
					var sector = levelVO.getSector(sectorPos.sectorX, sectorPos.sectorY);
					if (options.stage && sector.stage != options.stage && !options.canConnectToDifferentStage) {
						return { isValid: false, reason: "contains sector of wrong stage: " + sector.stage + " " + sector.position };
					}
				}
				var validCheck = this.isValidSectorPosition(levelVO, sectorPos, stage, options, pathPositions);
				if (validCheck.isBlocked) {
					return { isValid: false, reason: validCheck.reason };
				}
			}
			return { isValid: true };
		},
		
		isValidSectorPosition: function (levelVO, sectorPos, stage, options, pendingSectors) {
			// exception for critical paths
			if (options.criticalPath) return { isValid: true, isBlocked: false };
			
			// blocking features
			if (WorldCreatorHelper.containsBlockingFeature(sectorPos, this.currentFeatures, true)) {
				return { isValid: false, isBlocked: true, reason: "feature" };
			}
			
			pendingSectors = pendingSectors || [];
				
			// blocking stage elements
			if (stage) {
				for (let levelStage in levelVO.stageCenterPositions) {
					if (levelStage == stage) continue;
					let positions = levelVO.stageCenterPositions[levelStage];
					for (let i = 0; i < positions.length; i++) {
						var pos = positions[i];
						let dist = PositionConstants.getDistanceTo(pos, sectorPos);
						if (dist < 2) {
							return { isValid: false, isBlocked: true, reason: "stage" };
						}
					}
				}
			}
			
			// too many neighbours for this position or neighbouring position
			var directions = PositionConstants.getLevelDirections();
			var getNumSharedNeighbours = function (pos, neighbours) {
				var sum = 0;
				for (var d in directions) {
					var direction = directions[d];
					var n = neighbours[direction];
					if (n && !n.position.equals(pos)) {
						if (PositionConstants.getDistanceTo(pos, n.position) <= 1) {
							sum++;
						}
					}
				}
				return sum;
			};
			var checkNeighbours = function (pos) {
				var posneighbours = WorldCreatorHelper.getNeighbours(levelVO, pos, pendingSectors);
				var numNeighbours = WorldCreatorHelper.getNeighbourCount(levelVO, pos, pendingSectors);
				if (!pos.equals(sectorPos)) {
					var dir = PositionConstants.getDirectionFrom(pos, sectorPos);
					if (!posneighbours[dir]) {
						numNeighbours++;
						posneighbours[dir] = { position: sectorPos };
					}
				}
				if (numNeighbours <= 4) return { isValid: true, pos: pos, numNeighbours: numNeighbours, neighbours: posneighbours };
				if (numNeighbours >= 7) return { isValid: false, pos: pos, numNeighbours: numNeighbours, neighbours: posneighbours };
				// count the number of "ends" aka neighbours n of pos (INCLUDING sectorPos) that are also neighbours with MAX 1 of the neighbours of n (no path around pos to them)
				// if numends is > 2, pos is ok, otherwise too crowded
				var numends = 0;
				for (var d in directions) {
					var direction = directions[d];
					var n = posneighbours[direction];
					if (n) {
						var overlap = getNumSharedNeighbours(n.position, posneighbours);
						if (overlap < 2) {
							numends++;
						}
					}
				}
				if (pos.equals(sectorPos)) numends += getNumSharedNeighbours(sectorPos, posneighbours);
				var isValid = numends > 2;
				return { isValid: isValid, pos: pos, neighbours: posneighbours, numNeighbours: numNeighbours, numends: numends };
			};
			var ncheck = checkNeighbours(sectorPos);
			if (!ncheck.isValid) {
				return { isValid: false, isBlocked: true, reason: "blocking neighbours " + ncheck.numNeighbours + " " + ncheck.numends };
			}
			
			var neighbours = WorldCreatorHelper.getNeighbours(levelVO, sectorPos, pendingSectors);
			for (var d in directions) {
				var direction = directions[d];
				var neighbour = neighbours[direction];
				if (neighbour) {
					var ncheck = checkNeighbours(neighbour.position);
					if (!ncheck.isValid) {
						return { isValid: false, isBlocked: true, reason: "neighbour has blocking neighbours " + neighbour.position + " " + ncheck.numNeighbours + " " + ncheck.numends + " | " + pendingSectors.join(",") };
					}
				}
			}
			
			// too far from entrance
			let maxdist = Math.floor(this.getMaxExcursionDistance(levelVO) * 0.95);
			let dist = Math.round(PositionConstants.getDistanceTo(sectorPos, levelVO.getExcursionStartPosition()));
			if (dist > maxdist) return { isValid: false, isBlocked: false, reason: "excursion length " + dist + "/" + maxdist };
			
			return { isValid: true, isBlocked: false };
		},
		
		isPreferredSectorPosition: function (levelVO, sectorPos) {
			let sectorVO = levelVO.getSectorByPos(sectorPos);
			
			if (levelVO.campPosition) {
				// non-preferred: sectors that are between entrance passage and camp position (keep path from entrance to camp simple)
				let passage1Position = levelVO.getEntrancePassagePosition();
				if (passage1Position) {
					let distanceToCamp = PositionConstants.getDistanceTo(levelVO.campPosition, sectorPos);
					let distanceToEntrance = PositionConstants.getDistanceTo(passage1Position, sectorPos);
					let distanceEntranceToCamp = PositionConstants.getDistanceTo(passage1Position, levelVO.campPosition);
					let distanceToEntranceThreshold = Math.max(distanceEntranceToCamp, 3);
					let distanceToCampThreshold = Math.max(distanceEntranceToCamp * 1.25, 3);
					if (distanceToEntrance < distanceToEntranceThreshold && distanceToCamp < distanceToCampThreshold) {
						return false;
					}
				}
			}
			
			return true;
		},
		
		getConnectedSectors: function (worldVO, point, sectors, stage, maxdist) {
			let result = { connected: [], disconnected: [] };
			if (!point || !worldVO.getLevel(point.level).hasSector(point.sectorX, point.sectorY)) return result;
			var knownConnectedPos = [];
			var savedByDist = 0;
			var savedByKnown = 0;
			// NOTE: WorldCreatorRandom.findPath can utilize caching more efficiently when starting from long paths, and sectors added late are more likely to be far from things
			for (let i = sectors.length - 1; i >= 0; i--) {
				var sector = sectors[i];
				var dist = PositionConstants.getDistanceTo(sector.position, point);
				if (dist <= 1) {
					result.connected.push(sector);
					savedByDist++;
					continue;
				}
				if (maxdist && dist > maxdist) {
					savedByDist++;
					continue;
				}
				if (knownConnectedPos.indexOf(sector.position) >= 0) {
					result.connected.push(sector);
					savedByKnown++;
					continue;
				}
				let path = WorldCreatorRandom.findPath(worldVO, sector.position, point, false, true, stage, true);
				if (path && path.length > 0) {
					result.connected.push(sector);
					for (var p = 0; p < path.length; p++) {
						if (knownConnectedPos.indexOf(path[p]) < 0) {
							knownConnectedPos.push(path[p]);
						}
					}
					continue;
				}
				result.disconnected.push(sector);
			}
			return result;
		},

		getCurrentSectorDistance: function (worldVO, pos1, pos2, stage) {
			let path = WorldCreatorRandom.findPath(worldVO, pos1, pos2, false, true, stage);
			if (!path || path.length == 0) return -1;
			return path.length;
		},

		getPossiblePathDirections: function (s1, s2, levelVO, startPoint, shape) {
			let possibleDirections = [];

			if (startPoint.dirs) {
				possibleDirections = this.getPossiblePathDirectionsFromConnectionPoint(s1, s2, startPoint, levelVO, shape);
			} else {
				let isDiagonal = WorldCreatorRandom.randomBool(s2, levelVO.structureSettings.diagonalRateLine);
				possibleDirections = PositionConstants.getLevelDirections(!isDiagonal);
			}

			return possibleDirections;
		},

		getPossiblePathDirectionsFromConnectionPoint: function (s1, s2, connectionPoint, levelVO, shape) {
			let secondaryModifier = 1;
			let diagonalModifier = 1;
			let orthogonalModifier = 1;

			switch (shape) {
				case WorldCreatorConstants.SHAPE_LINE_ANY:
				case WorldCreatorConstants.SHAPE_LINE_CONNECTION:
					diagonalModifier = levelVO.structureSettings.diagonalRateLine;
					orthogonalModifier = 1 - levelVO.structureSettings.diagonalRateLine;
					secondaryModifier = 1;
					break;

				case WorldCreatorConstants.SHAPE_RECTANGLE_CORNER:
				case WorldCreatorConstants.SHAPE_RECTANGLE_CENTER:
					diagonalModifier = levelVO.structureSettings.diagonalRateRect;
					orthogonalModifier = 1 - levelVO.structureSettings.diagonalRateRect;
					secondaryModifier = 0.5;
					break;
			}

			let result = [];

			let bestProbability = -1;
			let bestProbabilityDirection = PositionConstants.DIRECTION_NONE;

			let neighbours = WorldCreatorHelper.getNeighbours(levelVO, connectionPoint.position);

			let checkDirections = function (dirs, randomSeed, baseProbability, contextDiagonalModifier, contextModifier) {
				for (let i = 0; i < dirs.length; i++) {
					let dir = dirs[i];
					let isDiagonal = PositionConstants.isDiagonal(dir);
					let levelDirectionModifier = isDiagonal ? diagonalModifier : orthogonalModifier;
					let contextDirectionlModifier = isDiagonal ? contextDiagonalModifier : 1;

					let probability = baseProbability * levelDirectionModifier * contextDirectionlModifier * contextModifier;

					let neighbourExists = neighbours[dir]
					if (neighbourExists) probability /= 2;

					let includeDirection = WorldCreatorRandom.randomBool(randomSeed + i, probability);
					if (includeDirection) result.push(dir);

					if (probability > bestProbability) {
						bestProbability = probability;
						bestProbabilityDirection = dir;
					}
				}
			}

			checkDirections(connectionPoint.dirs, s1, 1, 1, 1);

			let secondaryBaseProbability = MathUtils.map(levelVO.structureSettings.symmetry, 0, 1, 0.5, 0);
			if (result.length === 0) secondaryBaseProbability += 0.25;
			checkDirections(connectionPoint.dirs2, s2, secondaryBaseProbability, 0.5, secondaryModifier);

			if (result.length == 0) {
				result.push(bestProbabilityDirection);
			}

			return result;
		},
		
		getCentralStructureOffset: function (worldVO, levelVO, pois, params, getPathsFunc) {
			maxOffset = 10;

			// force centered on bottom level
			if (levelVO.level == worldVO.bottomLevel) maxOffset = 0;

			pois = pois || [];
			
			let scoreOptions = { pois: pois };

			let scoreOffset = function (x, y, p) {
				let paths = getPathsFunc(x, y, p);
				let score = LevelStructureGenerator.getCentralStructurePathsScore(levelVO, paths, scoreOptions);
				if (x === 0 && y === 0) score += 1;
				return score;
			};

			let positions = PositionConstants.getAllPositionsInArea(null, maxOffset);

			let paramCombinations = this.getParamCombinations(params);

			let candidates = [];

			for (let i = 0; i < positions.length; i++) {
				let pos = positions[i];
				for (let j = 0; j < paramCombinations.length; j++) {
					candidates.push({ sectorX: pos.sectorX, sectorY: pos.sectorY, params: paramCombinations[j] })
				}
			}

			let bestScore = -99;
			let result = { x: 0, y: 0, params: {} };

			for (let i = 0; i < candidates.length; i++) {
				let candidate = candidates[i];
				let score = scoreOffset(candidate.sectorX, candidate.sectorY, candidate.params);
				if (score > bestScore) {
					result.x = candidate.sectorX;
					result.y = candidate.sectorY;
					result.params = candidate.params;
					bestScore = score;
				}
			}

			return result;
		},

		// options:
		// - stage, shape, requireSecondConnectionPoint
		getRandomPathsOffset: function (levelVO, params, getPathsFunc, options) {
			let candidates = this.getParamCombinations(params);

			let scoreCandidate = function (params) {
				let paths = getPathsFunc(params);
				if (paths == null || paths.length == 0) return -999;
				return LevelStructureGenerator.getRandomPathsScore(levelVO, paths, options);
			};

			let bestScore = -99;
			let result = candidates[0];

			for (let i = 0; i < candidates.length; i++) {
				let candidate = candidates[i];
				let score = scoreCandidate(candidate);
				if (score > bestScore) {
					result = candidate;
					bestScore = score;
				}
			}

			result.score = bestScore;

			return result;
		},

		getParamCombinations: function (params) {
			params = params || {};

			let paramCombinations = [ {} ];

			let paramNames = Object.keys(params);
			for (let paramName of paramNames) {
				let newResult = [];
				for (let paramCombination of paramCombinations) {
					for (let value of params[paramName]) {
						let newCombination = { ...paramCombination, [paramName]: value };
						newResult.push(newCombination);
					}
				}

				paramCombinations = newResult; 
			}

			return paramCombinations;
		},

		// calculates a score for a set of potential paths (sectors) to add to the level, used for comparing alternatives (highest score is best)
		// paths: array of PathVO
		// options:
		// - pois: array of PositionVO that the paths should overlap (if any defined, at least one is required)
		getCentralStructurePathsScore: function (levelVO, paths, options) {
			let pois = options.pois || [];

			let countPoisOnPaths = function (paths) {
				let count = 0;
				for (let p = 0; p < pois.length; p++) {
					let poi = pois[p];
					
					let maxPOIScore = 0;
					for (let i = 0; i < paths.length; i++) {
						let path = paths[i];
						if (PositionConstants.isOnPath(poi, path.startPos, path.dir, path.len)) {
							// in on path, count one
							maxPOIScore = Math.max(maxPOIScore, 1);
						} else if (PositionConstants.getIndexOnPath(poi, path.startPos, path.dir, path.len) !== undefined) {
							// if on extended path, count half
							maxPOIScore = Math.max(maxPOIScore, 0.5);
						}
					}

					count += maxPOIScore;
				}

				return count || 0;
			};

			let scoreForExistingStructure = function (paths) {
				let score = 0;

				if (levelVO.sectors.length === 0) return score;

				let numExistingSectors = 0;
				let numAlignedSectors = 0;
				let numCrossings = 0; 

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					let continuousOverlap = 0;
					let maxContinuousOverlap = 0;

					let crossingsTracker = [ ];
					let numExistingSectorsOnExtendedPath  = 0;

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						let hasSector = levelVO.hasSector(pos.sectorX, pos.sectorY);
						
						if (hasSector) {
							numExistingSectors++;
							continuousOverlap++;
							if (continuousOverlap > maxContinuousOverlap) maxContinuousOverlap = continuousOverlap;
						} else {
							score -= LevelStructureGenerator.getPositionAwkwardnessScore(levelVO, pos);
						}

						let existingConnectionPoints = levelVO.pendingConnectionPoints;
						for (let c = 0; c < existingConnectionPoints.length; c++) {
							if (PositionConstants.getPositionAlignment(pos, existingConnectionPoints[c].position)) {
								numAlignedSectors++;
								break;
							}
						}

						crossingsTracker.push(hasSector);
						if (crossingsTracker.length > 3) crossingsTracker.shift();

						if (crossingsTracker.length == 3 && !crossingsTracker[0] && crossingsTracker[1] && !crossingsTracker[2]) {
							numCrossings++;
						}
					}

					for (let j = -20; j < path.len + 20; j++) {
						if (j >= 0 && j < path.len) continue;
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);
						let hasSector = levelVO.hasSector(pos.sectorX, pos.sectorY);
						if (hasSector) numExistingSectorsOnExtendedPath++;
					}

					// - continuous path overlap with existing sectors
					if (maxContinuousOverlap > 2) score += maxContinuousOverlap;

					// - existing sectors aligned with path
					if (numExistingSectorsOnExtendedPath > 1) score++;
					if (numExistingSectorsOnExtendedPath > 6) score++;
				}

				// - connects or easy to connect to something existing
				if (numExistingSectors > 0 || numAlignedSectors) score++;
				if (numAlignedSectors > 1) score++;

				// - crossings (crossing across existing path instead of following it)
				if (numCrossings > 0) score -= 1;
				if (numCrossings > 1) score -= 100;

				return score || 0;
			};

			let scoreForPOIAlignment = function (paths) {
				let score = 0;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						if (pois.length > 1) {
							for (let p = 0; p < pois.length; p++) {
								let poi = pois[p];
								
								// - pois not on path but aligned so it would be easy to connect them (if trying to align to multiple poi, otherwise the one needs to be on the path period)
								score += PositionConstants.getPositionAlignment(pos, poi);

								// pois awkwardly close to the shape but not on it
								let distance = PositionConstants.getDistanceTo(pos, poi);
								if (distance > 0 && distance < 3) score -= 1;
							}
						}
					}
				}

				return score || 0;
			};

			let scoreForLevelFeatures = function (paths) {
				let score = 0;

				let totalDistance = 0;
				let averagePosition = new PositionVO(levelVO.level, 0, 0);
				let numPositions = 0;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					for (let j = 0; j < path.len; j++) {
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						averagePosition.sectorX += pos.sectorX;
						averagePosition.sectorY += pos.sectorY;

						numPositions++;
						
						// blocking features
						score -= WorldCreatorHelper.containsBlockingFeature(pos, LevelStructureGenerator.currentFeatures, true) ? 1 : 0;

						// distance to center
						let distance = PositionConstants.getDistanceTo(pos, levelVO.levelCenterPosition);
						totalDistance += distance;

						// alignment to key points
						if (pos.sectorX === 0) score++;
						if (pos.sectorY === 0) score++;
						if (pos.sectorX % 10 === 0) score++;
						if (pos.sectorY % 10 === 0) score++;
					}
				}

				// average distance to level center pos
				let averageDistance = Math.round(totalDistance / numPositions);
				score -= averageDistance / 10;

				// shape center distance to level center pos
				averagePosition.sectorX /= numPositions;
				averagePosition.sectorY /= numPositions;
				let centerDistance = PositionConstants.getDistanceTo(averagePosition, levelVO.levelCenterPosition);
				score -= centerDistance;

				return score || 0;
			};

			let score = 0;

			// - primary: number of POIs on paths
			score += countPoisOnPaths(paths) * 100;

			if (pois.length > 0 && score <= 0) return score;

			// - secondary: how paths align to pois not ON paths (for paths trying to hit multiple pois)
			if (pois.length > 1) score += scoreForPOIAlignment(paths);

			// - secondary: how paths align to existing structure (sectors)
			score += scoreForExistingStructure(paths);

			// - secondary: how paths align to level features (blocking features, level center position and bounds)
			score += scoreForLevelFeatures(paths);

			return score;
		},

		// paths: array of PathVO
		// options: stage, shape, requireSecondConnectionPoint
		getRandomPathsScore: function (levelVO, paths, options) {
			let score = 0;

			let densityScoreModifier = 1 - levelVO.structureSettings.density;
			let diagonalRate = paths.length == 1 ? levelVO.structureSettings.diagonalRateLine : levelVO.structureSettings.diagonalRateRect;
			if (options.shape == WorldCreatorConstants.SHAPE_CIRCLE) diagonalRate = 0.5;

			let getConnectionPointsScore = function () {
				let score = 0;

				let connectionPoints = levelVO.allConnectionPoints;

				let pointsOnPath = []; // points that appear somewhere on the paths
				let pointsOnPathEnds = []; // points that appear on path start/end/corner positions
				let pointsAligned = []; // points that are aligned to some position on the paths (can draw straight line)
				let pointsAlignedEnds = []; // points that are aligned to path start/end/corner positions
				let pointsNearMiss = []; // points that are close to the path but not quite on it
				
				let hasSecondConnectionPoint = false;

				for (let k = 0; k < connectionPoints.length; k++) {
					let connectionPoint = connectionPoints[k];
					let isUsable = LevelStructureGenerator.isConnectionPointUsable(levelVO, connectionPoint);

					let isOnPath = false;
					let isOnPathEnd = false;
					let isAligned = false; 
					let isAlignedEnd = false;
					let isNearMiss = false;

					for (let i = 0; i < paths.length; i++) {
						let path = paths[i];
						let isLastPath = i == paths.length - 1;

						for (let j = 0; j < path.len; j++) {
							let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

							let isPathEnd = j == 0 || j == path.len - 1;
							let isPathLastPosition = j == path.len - 1;

							let distance = PositionConstants.getDistanceTo(pos, connectionPoint.position);
							let isPositionOnPath = PositionConstants.isOnPath(connectionPoint.position, path.startPos, path.dir, path.len);

							if (isPositionOnPath) isOnPath = true;
							if (isPositionOnPath && isPathEnd) isOnPathEnd = true;

							let isPositionAligned = distance > 0 && distance < 20 && PositionConstants.getPositionAlignment(pos, connectionPoint.position) > 0;
							if (isPositionAligned) isAligned = true;
							if (isPositionAligned && isPathEnd) isAlignedEnd = true;

							let isPositionMiss = distance > 0 && distance < 2;
							if (isPositionMiss) isNearMiss = true;

							if (isUsable && distance === 0 && isPathLastPosition && (paths.length == 0 || !isLastPath)) {
								hasSecondConnectionPoint = true;
							}
						}
						
					}

					if (isOnPath) pointsOnPath.push(connectionPoint);
					if (isOnPathEnd) pointsOnPathEnds.push(connectionPoint);
					if (isAligned && !isOnPath) pointsAligned.push(connectionPoint);
					if (isAlignedEnd && !isOnPath) pointsAlignedEnds.push(connectionPoint);
					if (isNearMiss && !isOnPath) pointsNearMiss.push(connectionPoint);
				}

				score += pointsOnPath.length;
				score += pointsOnPathEnds.length * 2;

				if (pointsNearMiss.length > 0) {
					score -= pointsNearMiss.length * 5;
				} else {
					score += pointsAligned.length * 0.1;
					score += pointsAlignedEnds.length * 0.5;
				}

				if (options.requireSecondConnectionPoint && !hasSecondConnectionPoint) score -= 100;

				return score || 0;
			};

			let getSectorPositionScore = function () {
				let score = 0;

				let minX = levelVO.minX;
				let maxX = levelVO.maxX;
				let minY = levelVO.minY;
				let maxY = levelVO.maxY;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];
					let validCheck = LevelStructureGenerator.isValidPath(levelVO, path, path.stage, options);

					if (!validCheck.isValid) {
						score -= 100;
						continue;
					}

					let pathScore = 0;

					for (let j = 0; j < path.len; j++) {
						let plannedStage = options.stage || path.stage;
						let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

						minX = Math.min(minX, pos.sectorX);
						maxX = Math.max(maxX, pos.sectorX);
						minY = Math.min(minY, pos.sectorY);
						maxY = Math.max(maxY, pos.sectorY);

						// awkwardness
						pathScore -= LevelStructureGenerator.getPositionAwkwardnessScore(levelVO, pos);

						// preferred position
						if (!LevelStructureGenerator.isPreferredSectorPosition(levelVO, pos)) pathScore -= 1;

						// stage 
						pathScore += LevelStructureGenerator.getPositionStageSuitabilityScore(levelVO, pos, plannedStage);
						
						// validity
						let isValid = LevelStructureGenerator.isValidSectorPosition(levelVO, pos, path.stage, options);
						if (!isValid) pathScore -= 1;

						// stage
						let defaultStage = LevelStructureGenerator.getDefaultStage(levelVO, pos);
						if (plannedStage && plannedStage != defaultStage) pathScore -= 1;

						// distance
						let distanceToCenter = PositionConstants.getDistanceTo(pos, levelVO.levelCenterPosition);
						if (distanceToCenter > 20) pathScore -= 1 * levelVO.structureSettings.density;
						if (distanceToCenter > 30) pathScore -= 1;
						if (distanceToCenter > 40) pathScore -= 1;
						let distanceToOrigo = PositionConstants.getDistanceTo(pos, new PositionVO(levelVO.level, 0, 0));
						if (distanceToOrigo > 30) pathScore -= 1;
						if (distanceToOrigo > 40) pathScore -= 1;

						// density
						let density = levelVO.getAreaDensity(pos.sectorX, pos.sectorY, 2);
						if (density > 0.5) score -= 1 * densityScoreModifier;

						// alignment to key points
						if (pos.sectorX === 0) pathScore++;
						if (pos.sectorY === 0) pathScore++;
						if (pos.sectorX % 10 === 0) pathScore++;
						if (pos.sectorY % 10 === 0) pathScore++;
					}

					score += pathScore / path.len;
				}

				let oldWidth = Math.abs(levelVO.maxX - levelVO.minX);
				let newWidth = Math.abs(maxX - minX);
				if (newWidth > oldWidth && newWidth > WorldConstants.MAX_WIDTH) score -= (newWidth - oldWidth);
				let oldHeight = Math.abs(levelVO.maxY - levelVO.minY);
				let newHeight = Math.abs(maxY - minY);
				if (newHeight > oldHeight && newHeight > WorldConstants.MAX_HEIGHT) score -= (newHeight - oldHeight);

				return score;
			};

			let getPathsScore = function () {
				let score = 0;

				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];

					let averageNeighbourCount = LevelStructureGenerator.getAverageNeighbourCountForPath(levelVO, path);
					let averageDensity = LevelStructureGenerator.getAverageDensityForPath(levelVO, path);
					let minNeighbourCount = LevelStructureGenerator.getMinNeighbourCountForPath(levelVO, path);

					// path completion
					let pathDetailed = LevelStructureGenerator.getPath(levelVO, path.startPos, path.dir, path.len, false, options, null, i, paths.length);
					if (pathDetailed.completed) score += 1;
					if (pathDetailed.isValid) score += 1;

					// path length
					if (path.len <= 3) score -= 1;
					if (path.len <= 4) score -= 1 * densityScoreModifier;
					if (pathDetailed.path.length < levelVO.structureSettings.minPathLength) score -= 1;
					if (pathDetailed.path.length > levelVO.structureSettings.maxPathLength) score -= 1;

					if (pathDetailed.path.length == 0) continue;

					// path direction
					let isDiagonal = PositionConstants.isDiagonal(path.dir);
					if (diagonalRate === 0 && isDiagonal) score -= 10;
					if (diagonalRate === 1 && !isDiagonal) score -= 10;
					let diagonalValue = isDiagonal ? 1 : 0;
					let diagonalValueDiff = Math.abs(diagonalValue - diagonalRate);
					if (diagonalValueDiff > 0.6) score--;
					if (diagonalValueDiff > 0.7) score--;
					if (diagonalValueDiff > 0.8) score--;
					if (diagonalValueDiff > 0.9) score--;

					// existing neighbours (avoid crowdedness)
					if (averageNeighbourCount > 1) score -= 1 * densityScoreModifier;
					if (averageNeighbourCount > 2) score -= 1 * densityScoreModifier;
					if (averageNeighbourCount > 3) score -= 1;
					if (minNeighbourCount > 0) score -= path.len * densityScoreModifier;

					// density
					if (averageDensity > 0.5) score -= 10;
					if (averageDensity > 0.45) score--;
					if (averageDensity > 0.4) score--;
					if (averageDensity > 0.35) score--;
					if (averageDensity > 0.25) score--;
					if (averageDensity > 0.25) score--;
					
					if (paths.length > 1) continue;

					let endPos = pathDetailed.path[pathDetailed.path.length - 1];
					let endPosExists = levelVO.hasSector(endPos.sectorX, endPos.sectorY);

					// end pos connection (single lines only)
					if (endPosExists) score += 1;
					let endPosHasConnectionPoint = endPosExists && levelVO.pendingConnectionPoints.filter(p => p.position.equals(endPos)).length > 0;
					if (endPosHasConnectionPoint) score += 2;
				}

				return score || 0;
			}

			let getShapeSpecificScore = function () {
				let score = 0;
				
				let len1 = paths[0].len;
				let len2 = paths.length > 1 ? paths[1].len : - 1;

				if (options.shape == WorldCreatorConstants.SHAPE_LINE_ANY && len1 > 12) score--;

				if (options.shape == WorldCreatorConstants.SHAPE_RECTANGLE_CENTER || options.shape == WorldCreatorConstants.SHAPE_RECTANGLE_CORNER) {
					let isSquare = len1 == len2;
					let isSymmetrical = isSquare;
					if (options.shape == WorldConstants.SHAPE_RECTANGLE_CORNER) isSymmetrical = isSymmetrical || len1 === len2 * 2 || len2 === len1 * 2 || len1 === len2 * 2 - 1 || len2 === len1 * 2 - 1;
					if (isSquare) score += levelVO.structureSettings.symmetry;
					if (isSquare) score += MathUtils.map(levelVO.structureSettings.shapeOblongness, 0, 1, 0, -5);
					if (isSymmetrical) score += levelVO.structureSettings.symmetry;

					let oblongness = Math.max(len1 / len2, len2 / len1);
					let isOblong = oblongness >= 2;
					if (isOblong) score += MathUtils.map(levelVO.structureSettings.shapeOblongness, 0, 1, -10, 10);

					let isDiagonal = PositionConstants.isDiagonal(paths[0].dir);
					if (isDiagonal && !isSymmetrical) score -= 1;
				}

				return score;
			};

			let getSectorCountScore = function () {
				// all else being equal prefer bigger structures to avoid super dense levels
				let score = 0;
				for (let i = 0; i < paths.length; i++) {
					let path = paths[i];
					score += path.len * 0.01;
				}
				return score;
			};

			score += getConnectionPointsScore();
			score += getSectorPositionScore();
			score += getPathsScore();
			score += getShapeSpecificScore();
			score += getSectorCountScore();

			return score;
		},

		getAverageDensityForPath: function (levelVO, path) {
			let averageDensity = 0;
			for (let j = 0; j < path.len; j++) {
				let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

				let density = levelVO.getAreaDensity(pos.sectorX, pos.sectorY, 2);
				averageDensity += density;
			}

			averageDensity = averageDensity/path.len;

			return averageDensity;
		},

		getAverageNeighbourCountForPath: function (levelVO, path) {
			let averageNeighbourCount = 0;
			for (let j = 0; j < path.len; j++) {
				let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

				let neighbourCount = levelVO.getNeighbourCount(pos.sectorX, pos.sectorY);
				averageNeighbourCount += neighbourCount;
			}

			averageNeighbourCount = Math.round(averageNeighbourCount/path.len);

			return averageNeighbourCount;
		},

		getMinNeighbourCountForPath: function (levelVO, path) {
			let minNeighbourCount = 99;
			for (let j = 0; j < path.len; j++) {
				let pos = PositionConstants.getPositionOnPath(path.startPos, path.dir, j);

				let neighbourCount = levelVO.getNeighbourCount(pos.sectorX, pos.sectorY);
				minNeighbourCount = Math.min(minNeighbourCount, neighbourCount);
			}

			return minNeighbourCount;
		},

		getPositionAwkwardnessScore: function (levelVO, pos) {
			let result = 0;

			let neighbourCount = WorldCreatorHelper.getNeighbourCount(levelVO, pos);

			if (neighbourCount > 4) result++;

			let neighbours = WorldCreatorHelper.getNeighbours(levelVO, pos);
			let mainDirections = PositionConstants.getLevelDirections(true);
			let directions = PositionConstants.getLevelDirections();

			for (let d in mainDirections) {
				let direction = mainDirections[d];
				let previous = PositionConstants.getNextCounterClockWise(direction);
				let next = PositionConstants.getNextClockWise(direction);
				let opposite = PositionConstants.getOppositeDirection(direction);

				// 3 neighbours all 90 degrees from another
				if (neighbourCount == 3 && neighbours[direction] && neighbours[previous] && neighbours[next]) result++;
			}

			return result;
		},

		getPositionStageSuitabilityScore: function (levelVO, pos, stage) {
			if (!stage) return 0;

			let distanceToMatchingStage = 999;
			let distanceToWrongStage = 999;

			for (let levelStage in levelVO.stageCenterPositions) {
				let positions = levelVO.stageCenterPositions[levelStage];
				for (let i = 0; i < positions.length; i++) {
					let stageCenterPos = positions[i];
					let dist = PositionConstants.getDistanceTo(pos, stageCenterPos);
					
					if (levelStage == stage) {
						distanceToMatchingStage = Math.min(distanceToMatchingStage, dist);
					} else {
						distanceToWrongStage = Math.min(distanceToWrongStage, dist);
					}
				}
			}

			let score = 0;

			if (distanceToWrongStage < 5) score -= 1;
			if (distanceToWrongStage < 3) score -= 1;

			if (distanceToMatchingStage > 30) score -= 1;
			if (distanceToMatchingStage < 10) score += 1;

			return score;
		},
		
		createPaths: function (levelVO, paths, forceComplete, options, connectionPointType) {
			options = options || this.getDefaultOptions();

			let result = [];

			for (let i = 0; i < paths.length; i++) {
				let path = paths[i];
				let pathConnectionPointType = path.connectionPointType || connectionPointType || this.getDefaultPathConnectionPointType(levelVO, path.len);
				let pathResult = this.createPath(levelVO, path.startPos, path.dir, path.len, forceComplete, options, pathConnectionPointType);
				result = result.concat(pathResult.path);

				if (!forceComplete && !pathResult.completed) {
					break;
				}
			}

			return result;
		},
		
		filterIfSomethingLeft: function (arr, filter) {
			if (!arr || arr.length < 1) return arr;
			
			let filtered = arr.filter(filter);
			if (filtered.length > 0) return filtered;
			
			return arr;
		},
		
		getDefaultStage: function (levelVO, sectorPos) {
			var hasEarlyCenters = levelVO.stageCenterPositions[WorldConstants.CAMP_STAGE_EARLY].length > 0;
			var hasLateCenters = levelVO.stageCenterPositions[WorldConstants.CAMP_STAGE_LATE].length > 0;
			
			if (!hasEarlyCenters) {
				return WorldConstants.CAMP_STAGE_LATE;
			}
			
			var earlyNeighbourCount = levelVO.getNeighbourCount(sectorPos.sectorX, sectorPos.sectorY, WorldConstants.CAMP_STAGE_EARLY);
			
			// default: nearest stage center
			let result = null;
			var shortestDist = -1;
			var shorestDistCenter = null;
			for (var stage in levelVO.stageCenterPositions) {
				var positions = levelVO.stageCenterPositions[stage];
				var numOtherStageNeighbours = levelVO.getNeighbourCount(sectorPos.sectorX, sectorPos.sectorY, null, stage);
				for (let i = 0; i < positions.length; i++) {
					var pos = positions[i];
					var dist = PositionConstants.getDistanceTo(pos, sectorPos);
					var adjustedDist = dist + numOtherStageNeighbours;
					if (shortestDist < 0 || adjustedDist < shortestDist) {
						result = stage;
						shortestDist = adjustedDist;
						shortestDistCenter = pos;
					}
				}
			}
			
			// force late if nothing found
			if (shortestDist < 0) {
				return WorldConstants.CAMP_STAGE_LATE;
			}
			
			// force EARLY if likely on early required path
			for (let i = 0; i < levelVO.requiredPaths.length; i++) {
				path = levelVO.requiredPaths[i];
				if (path.stage == WorldConstants.CAMP_STAGE_EARLY) {
					if (PositionConstants.isBetween(path.start, path.end, sectorPos)) {
						return WorldConstants.CAMP_STAGE_EARLY;
					}
				}
			}
			
			// force LATE if far from anything
			var earlyCenter = PositionConstants.getMiddlePoint(levelVO.stageCenterPositions[WorldConstants.CAMP_STAGE_EARLY]);
			if (earlyCenter) {
				var distToEarly = PositionConstants.getDistanceTo(sectorPos, earlyCenter);
				var lateThreshold = (hasLateCenters ? 16 : 8) + earlyNeighbourCount;
				if (distToEarly > lateThreshold) {
					return WorldConstants.CAMP_STAGE_LATE;
				}
			}

			return result;
		},
		
		getDefaultOptions: function (options) {
			options = options || {};
			return {
				stage: options.stage,
				criticalPath: options.criticalPath,
				canConnectToDifferentStage: options.canConnectToDifferentStage
			};
		},
		
		getMaxExcursionDistance: function (levelVO) {
			let excursionLen = WorldCreatorConstants.getMaxPathLength(levelVO.campOrdinal, WorldCreatorConstants.CRITICAL_PATH_TYPE_CAMP_TO_POI_2);
			return Math.floor(excursionLen * 0.85);
		},

	};
	
	return LevelStructureGenerator;
});
