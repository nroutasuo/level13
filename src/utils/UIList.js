// utils for making data-driven UI lists
// pass in the data to display and this takes care of creating, deleting and updating html elements as needed

// TODO pooling
// TODO animations

define(['game/GameGlobals'], function (GameGlobals) {

	let UIList = {
		
		// owner: object that controls the list - will be used to invoke list functions with owner as "this"
		// container: element inside which list items will be added
		// fnCreateItem: function () - should return new item that has a member called $root which will be added to container
		// fnUpdateItem: function (li, data) - should update the given list item with the given data
		// fnIsDataSame: function (data1, data2) - optional - defines if a data is the same item (no new item neede)
		// fnIsDataUnchanged: function (data1, data2) - optional - defines if data is unchanged (no update call needed) (performance optimization)
		create: function (owner, container, fnCreateItem, fnUpdateItem, fnIsDataSame, fnIsDataUnchanged) {
			let list = {};
			list.owner = owner;
			list.$container = $(container);
			list.data = [];
			list.items = [];
			list.fnCreateItem = fnCreateItem;
			list.fnUpdateItem = fnUpdateItem;
			list.fnIsDataSame = fnIsDataSame || ((d1, d2) => d1.id === d2.id);
			list.fnIsDataUnchanged = fnIsDataUnchanged || ((d1, d2) => false);
			return list;
		},
		
		// list: a data structure returned by create
		// data: an array of data entries that should be mapped to items and those items updated where needed
		// forceUpdate: force all items to update even if data hasn't changed
		update: function (list, data, forceUpdate) {
			let newIndices = [];
			let newItems = [];
			let createdItems = [];

			let foundDifferingIndex = false;

			let li;
			let newIndex;
			
			for (let i = 0; i < list.items.length; i++) {
				li = list.items[i];
				newIndex = this.getItemIndex(list, li, data);
				if (newIndex != i) {
					foundDifferingIndex = true;
				}
				newIndices[i] = newIndex;
			}

			let keepItems = list.items.length == data.length && !foundDifferingIndex;

			if (keepItems) {
				for (let i = 0; i < list.items.length; i++) {
					this.updateListItem(list, list.items[i], data[i], forceUpdate);
				}
			} else {
				// remove or detach
				for (let i = 0; i < list.items.length; i++) {
					li = list.items[i];
					newIndex = newIndices[i];
					
					if (newIndex >= 0) {
						li.$root.detach();
						newItems[newIndex] = li;
					} else {
						li.data = null;
						li.$root.remove();
					}
				}
				
				// add back or create new one + update
				for (let i = 0; i < data.length; i++) {
					let d = data[i]
					let li = newItems[i];
					if (li) {
						this.updateListItem(list, li, d, forceUpdate);
					} else  {
						li = list.fnCreateItem.apply(list.owner);
						this.updateListItem(list, li, d, forceUpdate);
						newItems[i] = li;
						createdItems.push(li);
					}
				}
				
				// append to DOM and save new items
				list.items = newItems;
				let newRoots = newItems.map(item => item.$root);
				list.$container.append(newRoots);
				
				// update any buttons (needs to be after they've been added to the DOM)
				this.initButtonsInCreatedItems(list, createdItems);
			}

			return createdItems;
		},

		updateListItem: function (list, li, data, forced) {
			let shouldUpdate = forced || !this.isDataUnchanged(list, li, data);

			if (shouldUpdate) {
				let newData = data;
				if (typeof data === "object") newData = Object.assign({}, data);
				list.fnUpdateItem.apply(list.owner, [li, newData]);
				li.data = newData;
			}
		},
		
		initButtonsInCreatedItems: function (list, createdItems) {
			if (createdItems.length <= 0) return;
			
			// TODO get rid of the GameGlobals/UIFunctions dependency (put buttons in their own module like List?)
			// TODO fix assumption that container has an id
			
			let scope = "#" + list.$container.attr("id");
			GameGlobals.uiFunctions.createButtons(scope);
			
			for (let i = 0; i < createdItems.length; i++) {
				let li = createdItems[i];
				this.updateListItem(list, li, li.data, true);
			}
		},
		
		getItemIndex: function (list, li, data) {
			for (let i = 0; i < data.length; i++) {
				let d = data[i]
				if (this.isDataSame(list, li.data, d)) {
					return i;
				}
			}
			return -1;
		},
		
		isDataSame: function (list, d1, d2) {
			if (list.fnIsDataSame) {
				return list.fnIsDataSame.apply(list.owner, [d1, d2]);
			} else {
				return d1 === d2;
			}
		},

		isDataUnchanged: function (list, li, data) {
			if (!li.data) return false;
			if (list.fnIsDataUnchanged) {
				return list.fnIsDataUnchanged.apply(list.owner, [li.data, data]);
			} else {
				return false;
			}
		}
		
	};

	return UIList;
});
