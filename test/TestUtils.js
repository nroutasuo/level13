define([], function () {

	let TestUtils = {

		hasCurrentTestFailedAssertions: function () {
			return QUnit.config.current.assertions.filter((a) => !a.result).length > 0;
		},

		addDetailToOutput: function (s) {
			let output = document.querySelector("#qunit-test-output-" + QUnit.config.current.testId);
			output.appendChild(document.createTextNode(s));
		},

		getMockItemsHelper: function () {
			let result = {};
			result.isAvailable = () => false;
			result.getMaxHazardColdForLevel = (campOrdinal) => campOrdinal * 3;
			result.getMaxHazardFloodedForLevel = (campOrdinal) => campOrdinal * 2;
			result.getMaxHazardPoisonForLevel = (campOrdinal) => campOrdinal * 2;
			result.getMaxHazardRadiationForLevel = (campOrdinal) => campOrdinal * 2;
			result.getMinHazardColdForLevel = (campOrdinal) => campOrdinal * 2;
			result.getNewEquipment = (campOrdinal) => [];
			result.getRequiredEquipment = (campOrdinal) => [];
			result.getUsableIngredient = (availableIngredients, rand) => availableIngredients[0];
			return result;
		},

		// do the same test with different outputs, assert in test callback, different from QUnit.test.each in that everything gets summarized under one test
		each: async function (cases, test) {
			for (let i = 0; i < cases.length; i++) {
				test(cases[i]);
			}
		},

		// do the exact same thing x times, expect no execptios or assert failures
		repeat: async function (assert, times, test) {
			for (let i = 0; i < times; i++) {
				try {
					await test();
				} catch (err) {
					assert.ok(false, "Iteration " + i + " failed: " + err.message);
					return false;
				}

				if (TestUtils.hasCurrentTestFailedAssertions()) {
					return false;
				}
			}
			assert.ok(true, "Passed " + times + " iterations");
			return true;
		}

	};

	return TestUtils;
});