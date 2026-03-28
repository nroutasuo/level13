define([], function () {
	
	let SaveUtils = {

		loadDictionary: function (saveDictionary, type) {
			let result = {};
			for (let key in saveDictionary) {
				let saveObject = saveDictionary[key];
				if (saveObject) {
					result[key] = new type();
					result[key].customLoadFromSave(saveObject);
				}
			}

			return result;
		},

		loadList: function (saveList, type) {
			let result = [];	
			for (let key in saveList) {
				let saveObject = saveList[key];
				if (saveObject) {
					result[key] = new type();
					result[key].customLoadFromSave(saveObject);
				}
			}
			return result;
		},
		
	};

	return SaveUtils;
});
