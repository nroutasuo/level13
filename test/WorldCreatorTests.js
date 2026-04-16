define([
	'test/TestUtils',
	'worldcreator/WorldCreator', 
	'game/constants/WorldConstants', 
	'worldcreator/WorldCreatorDebug', 
	'worldcreator/WorldCreatorRandom', 
	'worldcreator/WorldValidator',
	'worldcreator/WorldTemplateVO',
	'game/helpers/ItemsHelper',
], function (TestUtils, WorldCreator, WorldConstants, WorldCreatorDebug, WorldCreatorRandom, WorldValidator, WorldTemplateVO, ItemsHelper) {

	let worldSeeds = [ 24, 7534, WorldCreatorRandom.getNewSeed(), WorldCreatorRandom.getNewSeed() ];

	let getAllLevels = function (worldVO) {
		let levels = [];
		for (let l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) levels.push(l);
		return levels;
	}

	let defaultProgressionConfig = WorldCreatorDebug.getTestProgressionConfig();

	QUnit.module("world/determinism", function (hooks) {

		let mockItemsHelper = TestUtils.getMockItemsHelper();

		let assertWorldVOsEqual = function (assert, worldVO1, worldVO2) {
			// breaks down world comparison into smaller pieces just to make diffs easier to look
			worldVO1.resetCaches();
			worldVO2.resetCaches();

			// compare levels
			for (let l = worldVO1.topLevel; l >= worldVO1.bottomLevel; l--) {
				let levelVO1 = worldVO1.levels[l];
				let levelVO2 = worldVO2.levels[l];

				if (!levelVO1 && !levelVO2) continue;

				for (let s = 0; s < levelVO1.sectors.length; s++) {
					// if (TestUtils.hasCurrentTestFailedAssertions()) continue;
					let sectorVO1 = levelVO1.sectors[s];
					let sectorVO2 = levelVO2.sectors[s];
					// TODO fix possible enemies so they can be tested (save ids, too big to diff usefully now)
					sectorVO1.possibleEnemies = [];
					sectorVO2.possibleEnemies = [];
					assert.propEqual(sectorVO1, sectorVO2, "sector " + sectorVO1);
				}

				levelVO1.sectors = [];
				levelVO2.sectors = [];

				assert.propEqual(levelVO1, levelVO2, "level " + levelVO1.level);
			}

			// compare worlds
			worldVO1.levels = [];
			worldVO2.levels = [];
			assert.propEqual(worldVO1, worldVO2, "world");
		}

		hooks.before(function () {
			// once for all tests
		});

		hooks.beforeEach(function () {
			TestUtils.addDetailToOutput("seed:" + QUnit.config.current.data);
		});

		hooks.afterEach(function () {
			// after every test
		});

		hooks.after(function () {
			// once after all tests are done
		});

		QUnit.test.each("two empty worlds from same seed are equal", worldSeeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let worldVO2 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			assert.propEqual(worldVO1, worldVO2);
		});

		QUnit.test.each("world created from template equals world created from seed", worldSeeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let worldVO1Template = new WorldTemplateVO(worldVO1);
			let worldVO2 = await WorldCreator.createWorld(seed, worldVO1Template, defaultProgressionConfig);
			assert.propEqual(worldVO1, worldVO2);
		});

		QUnit.test.each("two worlds with levels are equal", worldSeeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels1 = [];
			for (let l = worldVO1.topLevel; l >= worldVO1.bottomLevel; l--) levels1.push(l);
			await WorldCreator.generateLevels(seed, worldVO1, null, levels1, mockItemsHelper, defaultProgressionConfig);

			let worldVO2 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels2 = [];
			for (let l = worldVO2.topLevel; l >= worldVO2.bottomLevel; l--) levels2.push(l);
			await WorldCreator.generateLevels(seed, worldVO2, null, levels2, mockItemsHelper, defaultProgressionConfig);

			assertWorldVOsEqual(assert, worldVO1, worldVO2);
		});

		QUnit.test.each("world created from template equals world created from seed with levels", worldSeeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels1 = getAllLevels(worldVO1);
			await WorldCreator.generateLevels(seed, worldVO1, null, levels1, mockItemsHelper, defaultProgressionConfig);

			let worldVO1Template = new WorldTemplateVO(worldVO1);

			let worldVO2 = await WorldCreator.createWorld(seed, worldVO1Template, defaultProgressionConfig);
			let levels2 = getAllLevels(worldVO2);
			await WorldCreator.generateLevels(seed, worldVO2, null, levels2, mockItemsHelper, defaultProgressionConfig);

			assertWorldVOsEqual(assert, worldVO1, worldVO2);
		});

		QUnit.test.each("two worlds equal when levels generated in different order", worldSeeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels1 = [];
			for (let l = 13; l >= worldVO1.bottomLevel; l--) levels1.push(l);
			levels1.push(14);
			await WorldCreator.generateLevels(seed, worldVO1, null, levels1, mockItemsHelper, defaultProgressionConfig);

			let worldVO2 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels2 = [];
			for (let l = 13; l >= worldVO1.bottomLevel; l--) levels2.push(l);
			levels2.splice(7, 0, 14);
			await WorldCreator.generateLevels(seed, worldVO2, null, levels2, mockItemsHelper, defaultProgressionConfig);

			assertWorldVOsEqual(assert, worldVO1, worldVO2);
		});

		QUnit.test.each("two worlds equal when levels generated one by one or in one go", worldSeeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels = getAllLevels(worldVO1);
			await WorldCreator.generateLevels(seed, worldVO1, null, levels, mockItemsHelper, defaultProgressionConfig);

			let worldVO2 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			for (let l = 0; l < levels.length; l++) {
				let level = levels[l];
				await WorldCreator.generateLevels(seed, worldVO2, null, [ level ], mockItemsHelper, defaultProgressionConfig);
			}

			assertWorldVOsEqual(assert, worldVO1, worldVO2);
		});
	});

	QUnit.module("world/validation", function (hooks) {
		let itemsHelper = new ItemsHelper();

		hooks.before(function () {
			// once for all tests
		});

		hooks.beforeEach(function () {
			TestUtils.addDetailToOutput("seed:" + QUnit.config.current.data);
		});

		hooks.afterEach(function () {
			// after every test
		});

		hooks.after(function () {
			// once after all tests are done
		});

		QUnit.test.each("world from seed is valid", worldSeeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let validationResult = WorldValidator.validateWorld(worldVO);
			assert.true(validationResult.isValid, WorldValidator.getSummary(validationResult));
		});
		
		QUnit.test.each("levels are valid", worldSeeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels = getAllLevels(worldVO);
			await WorldCreator.generateLevels(seed, worldVO, null, levels, itemsHelper, defaultProgressionConfig);
			for (let i = 0; i < levels.length; i++) {
				let level = levels[i];
				let validationResult = WorldValidator.validateLevel(worldVO, null, worldVO.levels[level]);
				assert.true(validationResult.isValid, "level " + level + ": " + WorldValidator.getSummary(validationResult));
			}
		});
		
		QUnit.test.each("world template vo is valid", worldSeeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels = getAllLevels(worldVO);
			await WorldCreator.generateLevels(seed, worldVO, null, levels, itemsHelper, defaultProgressionConfig);
			let worldTemplateVO = new WorldTemplateVO(worldVO);
			let validationResult = WorldValidator.validateResultWorldTemplateVO(worldVO, worldTemplateVO, null);
			assert.true(validationResult.isValid, WorldValidator.getSummary(validationResult));
		});
	});

	QUnit.module("world/compatibility", function (hooks) {
		let mockItemsHelper = TestUtils.getMockItemsHelper();

		hooks.before(function () {
			// once for all tests
		});

		hooks.beforeEach(function () {
			TestUtils.addDetailToOutput("seed:" + QUnit.config.current.data);
		});

		hooks.afterEach(function () {
			// after every test
		});

		hooks.after(function () {
			// once after all tests are done
		});

		QUnit.test.each("world contains version", worldSeeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			assert.equal(worldVO.version, WorldConstants.version);
		});

		QUnit.test.each("levels contains version when generated", worldSeeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels = [ 13, 12, 11, 10 ];
			await WorldCreator.generateLevels(seed, worldVO, null, levels, mockItemsHelper, defaultProgressionConfig);
			for (let l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
				let isGenerated = levels.indexOf(l) >= 0;
				let levelVO = worldVO.levels[l];
				if (isGenerated) {
					assert.equal(levelVO.version, WorldConstants.version, "generated level has version");
				} else {
					assert.equal(levelVO.version, null, "not generated level has no version");
				}
			}
		});

		QUnit.test.each("world keeps original version from template", worldSeeds, async function (assert, seed) {
			let version = "0.6.3";
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let worldTemplateVO = new WorldTemplateVO(worldVO1);
			worldTemplateVO.version = version;
			let worldVO2 = await WorldCreator.createWorld(seed, worldTemplateVO, defaultProgressionConfig);
			assert.equal(worldVO2.version, version);
		});

		QUnit.test.each("levels keep version from template if generated before", worldSeeds, async function (assert, seed) {
			let version = "0.6.3";
			let currentVersion = WorldConstants.version;
			WorldConstants.version = version;
			let worldVO1 = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
			let levels1 = [ 13, 12, 11, 10 ];
			await WorldCreator.generateLevels(seed, worldVO1, null, levels1, mockItemsHelper, defaultProgressionConfig);

			let worldTemplateVO = new WorldTemplateVO(worldVO1);
			WorldConstants.version = currentVersion;
			let worldVO2 = await WorldCreator.createWorld(seed, worldTemplateVO, defaultProgressionConfig);
			let levels2 = [ 13, 12, 11, 10, 9, 8 ];
			await WorldCreator.generateLevels(seed, worldVO2, worldTemplateVO, levels2, mockItemsHelper, defaultProgressionConfig);
			for (let l = worldVO1.topLevel; l >= worldVO1.bottomLevel; l--) {
				let isGeneratedBefore = levels1.indexOf(l) >= 0;
				let isGeneratedNow = levels2.indexOf(l) >= 0;
				let levelVO = worldVO2.levels[l];
				if (isGeneratedBefore) {
					assert.equal(levelVO.version, version, "level generated on old version keeps old version");
				} else if (isGeneratedNow) {
					assert.equal(levelVO.version, WorldConstants.version, "level generated on new version has current version");
				} else {
					assert.equal(levelVO.version, null, "not generated level has no version");
				}
			}
		});
	});

	QUnit.module("world/random", function (hooks) {
		// test cases

		// - typical inputs to random are world seed, sector coordinates, and list indices
		let randomSeeds = [ 0, 1, 13, -8, 24, 1111, 7000, 9821, 1204, 61356 ];
		// - typical ranges for random int are list indices, hazard values, item counts
		let randomIntRanges = [ [0, 10], [1, 4], [0, 135], [53, 77] ];
		let randomIntCases = [];
		// - typical probabilities for random bool
		let randomBoolProbabilities = [ 0.01, 0.1, 0.3, 0.5, 0.75, 0.98 ];
		let randomBoolCases = [];

		for (let s = 0; s < randomSeeds.length; s++) {
			for (let r = 0; r < randomIntRanges.length; r++) {
				let range = randomIntRanges[r];
				randomIntCases.push({ randomSeed: randomSeeds[s], range: range, min: range[0], max: range[1] });
			}

			for (let p = 0; p < randomBoolProbabilities.length; p++) {
				randomBoolCases.push({ randomSeed: randomSeeds[s], probability: randomBoolProbabilities[p] });
			}
		}

		// utils

		let formatSeedAndResult = (seed, result) => seed + " -> " + result;
		let formatSeedRangeAndResult = (testCase, result) => testCase.randomSeed + " [" + testCase.min + "," + testCase.max + "] -> " + result;

		// basics

		QUnit.test("random int is int", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let r = WorldCreatorRandom.randomInt(randomSeed);
				assert.true(Number.isInteger(r), "random number from seed " + formatSeedAndResult(randomSeed, r));
			});
		});

		QUnit.test("random int respects range", function (assert) {
			TestUtils.each(randomIntCases, (testCase) => {
				let r = WorldCreatorRandom.randomInt(testCase.randomSeed, testCase.min, testCase.max);
				assert.true(r >= testCase.min, "random number from seed " + formatSeedRangeAndResult(testCase, r));
				assert.true(r < testCase.max, "random number from seed " + formatSeedRangeAndResult(testCase, r));
			});
		});

		// determinism

		QUnit.test("same seed results in same random number", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let r1 = WorldCreatorRandom.random(randomSeed);
				let r2 = WorldCreatorRandom.random(randomSeed);
				assert.equal(r1, r2, "random number from seed " + formatSeedAndResult(randomSeed, r1));
			});
		});

		QUnit.test("same seed results in same random int", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let r1 = WorldCreatorRandom.randomInt(randomSeed);
				let r2 = WorldCreatorRandom.randomInt(randomSeed);
				assert.equal(r1, r2, "random int from seed " + formatSeedAndResult(randomSeed, r1));
			});
		});

		QUnit.test("same seed results in same random boolean", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let r1 = WorldCreatorRandom.randomBool(randomSeed);
				let r2 = WorldCreatorRandom.randomBool(randomSeed);
				assert.equal(r1, r2, "random bool from seed " + formatSeedAndResult(randomSeed, r1));
			});
		});

		// variability (different seeds result different output)

		QUnit.test("different seed results in different random number", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let r1 = WorldCreatorRandom.random(randomSeed);
				let r2 = WorldCreatorRandom.random(randomSeed + 1);
				assert.notEqual(r1, r2, "random number from seed " + formatSeedAndResult(randomSeed, r2) + " and " + formatSeedAndResult(randomSeed + 1, r2));
			});
		});

		QUnit.test("different seed results in different random int", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let r1 = WorldCreatorRandom.randomInt(randomSeed);
				let r2 = WorldCreatorRandom.randomInt(randomSeed + 1);
				assert.notEqual(r1, r2, "random int from seed " + formatSeedAndResult(randomSeed, r2) + " and " + formatSeedAndResult(randomSeed + 1, r2));
			});
		});

		QUnit.test("different seed results in different bool", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let testRange = 300;
				let hasReturnedTrue = false;
				let hasReturnedFalse = false;
				for (let i = 0; i < testRange; i++) {
					let r = WorldCreatorRandom.randomBool(randomSeed + i);
					if (r) hasReturnedTrue = true;
					if (!r) hasReturnedFalse = true;
				}

				assert.true(hasReturnedTrue, "random bool from seed " + randomSeed + "+" + testRange + " produced 'true' at least once");
				assert.true(hasReturnedFalse, "random bool from seed " + randomSeed + "+" + testRange + " produced 'false' at least once");
			});
		});

		// variance (different seeds result in significantly different output)

		QUnit.test("similar seed can result in very different random number", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let maxDiff = 0;
				let seeds = [];
				for (let i = 0; i < 100; i++) seeds.push(randomSeed + i);
				let numbers = [];
				for (let i = 0; i < seeds.length; i++) {
					let seed = seeds[i];
					let randomNumber = WorldCreatorRandom.random(seed);
					numbers.push(randomNumber);
					if (i > 0) {
						let previousNumber = numbers[i-1];
						maxDiff = Math.max(maxDiff, Math.abs(previousNumber - randomNumber));
					}
				}
				let threshold = 0.1;
				assert.true(maxDiff > threshold, "maximum difference (" + maxDiff + ") between random numbers from seeds " + randomSeed + "+100 is greated than " + threshold);
			});
		});

		QUnit.test("similar seed can result in very different random int", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let maxDiff = 0;
				let seeds = [];
				for (let i = 0; i < 100; i++) seeds.push(randomSeed + i);
				let numbers = [];
				for (let i = 0; i < seeds.length; i++) {
					let seed = seeds[i];
					let randomNumber = WorldCreatorRandom.randomInt(seed);
					numbers.push(randomNumber);
					if (i > 0) {
						let previousNumber = numbers[i-1];
						maxDiff = Math.max(maxDiff, Math.abs(previousNumber - randomNumber));
					}
				}
				let threshold = 10;
				assert.true(maxDiff > threshold, "maximum difference (" + maxDiff + ") between random numbers from seeds " + randomSeed + "+100 is greated than " + threshold);
			});
		});

		// distribution (output doesn't prefer some values)

		QUnit.test("random number has decent distribution", function (assert) {
			TestUtils.each(randomSeeds, (randomSeed) => {
				let iterations = 50000;
				let diffPercentThreshold = 30;

				let counts = [];
				for (let i = 0; i < 10; i++) counts[i] = 0;
				for (let i = 0; i < iterations; i++) {
					let r = WorldCreatorRandom.random(randomSeed + i);
					let roundedValue = Math.floor(r * 10);
					counts[roundedValue]++;
				}

				let expectedCount = iterations / 10;

				for (let i = 0; i < counts.length; i++) {
					let roundedValue = i;
					let count = counts[i];
					let diff = count - expectedCount;
					let diffPercent = Math.abs((diff / expectedCount) * 100);

					assert.ok(diffPercent < diffPercentThreshold, "value rounding down to " + (roundedValue/10) + " was produced " + count + " times");
				};
			});
		});

		QUnit.test("random int has decent distribution", function (assert) {
			TestUtils.each(randomIntCases, (testCase) => {
				let min = testCase.min;
				let max = testCase.max;
				let iterations = 50000;
				let rangeSize = max - min;
				let diffPercentThreshold = 35;

				let counts = [];
				for (let i = 0; i < max; i++) counts[i] = 0;
				for (let i = 0; i < iterations; i++) {
					let r = WorldCreatorRandom.randomInt(testCase.randomSeed + i, min, max);
					if (r < min || r >= max) {
						assert.ok(false, "Value ${n} out of range");
						return;
					}
					if (!counts[r]) counts[r] = 0;
					counts[r]++;
				}

				let expectedCount = Math.round(iterations / rangeSize);

				for (let i = 0; i < counts.length; i++) {
					let value = i;
					if (value < min || value >= max) continue;
					let count = counts[i];
					let diff = count - expectedCount;
					let diffPercent = Math.abs((diff / expectedCount) * 100);

					assert.ok(diffPercent < diffPercentThreshold, "value " + value + " was produced " + count + " times for range [" + min + "," + max + "] (expected around " + expectedCount + ")");
				};
			});
		});

		QUnit.test("random bool has decent distribution", function (assert) {
			TestUtils.each(randomBoolCases, (testCase) => {
				let iterations = 50000;
				let diffPercentThreshold = 35;

				let numTrue = 0;
				for (let i = 0; i < iterations; i++) {
					let r = WorldCreatorRandom.randomBool(testCase.randomSeed + i, testCase.probability);
					if (r) numTrue++;
				}

				let expectedCount = Math.round(iterations * testCase.probability);
				let diff = numTrue - expectedCount;
				let diffPercent = Math.abs((diff / expectedCount) * 100);

				assert.ok(diffPercent < diffPercentThreshold, "value true was produced " + numTrue + " times for probability [" + testCase.probability + "] (expected around " + expectedCount + ")");
			});
		});

		// practice (random results in actual worlds)
		
		QUnit.test("different worlds have different random features", async function (assert) {
			let worldSeeds = [ 24, 2456, 5001, 8210 ];
			let worldVOs = {};
			for (let i = 0; i < worldSeeds.length; i++) {
				let seed = worldSeeds[i];
				let worldVO = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
				worldVOs[i] = worldVO;
			}

			let luxuryResources = {};
			for (let i = 0; i < worldSeeds.length; i++) {
				let seed = worldSeeds[i];
				let worldVO = await WorldCreator.createWorld(seed, null, defaultProgressionConfig);
				let worldLuxuryResources = [];
				for (let l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) {
					let levelVO = worldVO.levels[l];
					for (let j = 0; j < levelVO.luxuryResources.length; j++) {
						worldLuxuryResources.push(levelVO.luxuryResources[j]);
					}
				}

				luxuryResources[i] = worldLuxuryResources;
			}

			for (let i = 0; i < worldSeeds.length; i++) {
				let s1 = worldSeeds[i];
				for (let j = i + 1; j < worldSeeds.length; j++) {
					let s2 = worldSeeds[j];
					assert.notPropEqual(luxuryResources[i], luxuryResources[j], "luxury resources are different in world seeds (" + s1 + " vs " + s2 + ")")
				}
			}
		});
	});

});
