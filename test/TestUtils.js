define([], function () {

	let TestUtils = {

		hasCurrentTestFailedAssertions: function () {
			return QUnit.config.current.assertions.filter((a) => !a.result).length > 0;
		},

		getMockItemsHelper: function () {
			let result = {};
			result.getNewEquipment = (campOrdinal) => [];
			result.isAvailable = () => false;
			result.getMinHazardColdForLevel = (campOrdinal) => campOrdinal * 2;
			result.getMaxHazardColdForLevel = (campOrdinal) => campOrdinal * 3;
			result.getMaxHazardFloodedForLevel = (campOrdinal) => campOrdinal * 2;
			result.getMaxHazardRadiationForLevel = (campOrdinal) => campOrdinal * 2;
			result.getMaxHazardPoisonForLevel = (campOrdinal) => campOrdinal * 2;
			result.getRequiredEquipment = (campOrdinal) => [];
			return result;
		},

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