define([
	'test/TestUtils',
	'worldcreator/WorldCreator', 
	'worldcreator/WorldCreatorRandom', 
	'worldcreator/WorldValidator',
	'worldcreator/WorldTemplateVO',
], function (TestUtils, WorldCreator, WorldCreatorRandom, WorldValidator, WorldTemplateVO) {

	let seeds = [ 24, 7534, WorldCreatorRandom.getNewSeed() ];

	let getAllLevels = function (worldVO) {
		let levels = [];
		for (let l = worldVO.topLevel; l >= worldVO.bottomLevel; l--) levels.push(l);
		return levels;
	}

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
			let output = document.querySelector("#qunit-test-output-" + QUnit.config.current.testId);
			output.appendChild(document.createTextNode("seed:" + QUnit.config.current.data));
		});

		hooks.afterEach(function () {
			// after every test
		});

		hooks.after(function () {
			// once after all tests are done
		});

		QUnit.test.each("two empty worlds from same seed are equal", seeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed);
			let worldVO2 = await WorldCreator.createWorld(seed);
			assert.propEqual(worldVO1, worldVO2);
		});

		QUnit.test.each("world created from template equals world created from seed", seeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed);
			let worldVO1Template = new WorldTemplateVO(worldVO1);
			let worldVO2 = await WorldCreator.createWorld(seed, worldVO1Template);
			assert.propEqual(worldVO1, worldVO2);
		});

		QUnit.test.each("two worlds with levels are equal", seeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed);
			let levels1 = [];
			for (let l = worldVO1.topLevel; l >= worldVO1.bottomLevel; l--) levels1.push(l);
			await WorldCreator.generateLevels(seed, worldVO1, null, levels1, mockItemsHelper);

			let worldVO2 = await WorldCreator.createWorld(seed);
			let levels2 = [];
			for (let l = worldVO2.topLevel; l >= worldVO2.bottomLevel; l--) levels2.push(l);
			await WorldCreator.generateLevels(seed, worldVO2, null, levels2, mockItemsHelper);

			assertWorldVOsEqual(assert, worldVO1, worldVO2);
		});

		QUnit.test.each("world created from template equals world created from seed with levels", seeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed);
			let levels1 = getAllLevels(worldVO1);
			await WorldCreator.generateLevels(seed, worldVO1, null, levels1, mockItemsHelper);

			let worldVO1Template = new WorldTemplateVO(worldVO1);

			let worldVO2 = await WorldCreator.createWorld(seed, worldVO1Template);
			let levels2 = getAllLevels(worldVO2);
			await WorldCreator.generateLevels(seed, worldVO2, null, levels2, mockItemsHelper);

			assertWorldVOsEqual(assert, worldVO1, worldVO2);
		});

		QUnit.test.each("two worlds equal when levels generated in different order", seeds, async function (assert, seed) {
			let worldVO1 = await WorldCreator.createWorld(seed);
			let levels1 = [];
			for (let l = 13; l >= worldVO1.bottomLevel; l--) levels1.push(l);
			levels1.push(14);
			await WorldCreator.generateLevels(seed, worldVO1, null, levels1, mockItemsHelper);

			let worldVO2 = await WorldCreator.createWorld(seed);
			let levels2 = [];
			for (let l = 13; l >= worldVO1.bottomLevel; l--) levels2.push(l);
			levels2.splice(7, 0, 14);
			await WorldCreator.generateLevels(seed, worldVO2, null, levels2, mockItemsHelper);

			assertWorldVOsEqual(assert, worldVO1, worldVO2);
		});
	});

	QUnit.module("world/validation", function (hooks) {
		let mockItemsHelper = TestUtils.getMockItemsHelper();

		hooks.before(function () {
			// once for all tests
		});

		hooks.beforeEach(function () {
			let output = document.querySelector("#qunit-test-output-" + QUnit.config.current.testId);
			output.appendChild(document.createTextNode("seed:" + QUnit.config.current.data));
		});

		hooks.afterEach(function () {
			// after every test
		});

		hooks.after(function () {
			// once after all tests are done
		});

		QUnit.test.each("world from seed is valid", seeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed);
			let validationResult = WorldValidator.validateWorld(worldVO);
			assert.true(validationResult.isValid, WorldValidator.getSummary(validationResult));
		});
		
		QUnit.test.each("levels are valid", seeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed);
			let levels = getAllLevels(worldVO);
			await WorldCreator.generateLevels(seed, worldVO, null, levels, mockItemsHelper);
			for (let i = 0; i < levels.length; i++) {
				let level = levels[i];
				let validationResult = WorldValidator.validateLevel(worldVO, null, worldVO.levels[level]);
				assert.true(validationResult.isValid, "level " + level + ": " + WorldValidator.getSummary(validationResult));
			}
		});
		
		QUnit.test.each("world template vo is valid", seeds, async function (assert, seed) {
			let worldVO = await WorldCreator.createWorld(seed);
			let levels = getAllLevels(worldVO);
			await WorldCreator.generateLevels(seed, worldVO, null, levels, mockItemsHelper);
			let worldTemplateVO = new WorldTemplateVO(worldVO);
			let validationResult = WorldValidator.validateResultWorldTemplateVO(worldVO, worldTemplateVO, null);
			assert.true(validationResult.isValid, WorldValidator.getSummary(validationResult));
		});
	});

});
