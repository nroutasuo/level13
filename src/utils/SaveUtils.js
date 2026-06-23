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

		loadListDictionary: function (saveDictionary, type) {
			let result = {};

			if (Array.isArray(saveDictionary)) {
				// data type changed, do not attempt to load
				return result;
			}

			for (let key in saveDictionary) {
				result[key] = this.loadList(saveDictionary[key], type)
			}

			return result;
		},
		
	};

	return SaveUtils;
});
