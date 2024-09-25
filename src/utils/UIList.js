// utils for making data-driven UI lists
// pass in the data to display and this takes care of creating, deleting and updating html elements as needed

// TODO pooling
// TODO two definitions of equality (data is the same, no update needed vs data has changed a bit but keep the same element anyway)
// TODO animations

define(['game/GameGlobals'], function (GameGlobals) {

	let UIList = {
		
		// owner: object that controls the list - will be used to invoke list functions with owner as "this"
		// container: element inside which list items will be added
		// fnCreateItem: function () - should return new item that has a member called $root which will be added to container
		// fnUpdateItem: function (li, data) - should update the given list item with the given data
		// fnIsDataEqual: function (data1, data2) - optional - defines if a data is the same (no update needed)
		create: function (owner, container, fnCreateItem, fnUpdateItem, fnIsDataEqual) {
			let list = {};
			list.owner = owner;
			list.$container = $(container);
			list.data = [];
			list.items = [];
			list.fnCreateItem = fnCreateItem;
			list.fnUpdateItem = fnUpdateItem;
			list.fnIsDataEqual = fnIsDataEqual || ((d1, d2) => d1.id === d2.id);
			return list;
		},
		
		// list: a data structure returned by create
		// data: an array of data entries that the list's fnUpdateItem and fnIsDataEqual can use
		update: function (list, data) {
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
					list.fnUpdateItem.apply(list.owner, [ list.items[i], data[i] ]);
				}
			} else {
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
				
				// go through data and add any missing items
				for (let i = 0; i < data.length; i++) {
					let d = data[i]
					let li = newItems[i];
					if (li) {
						list.fnUpdateItem.apply(list.owner, [li, d]);
					} else  {
						li = list.fnCreateItem.apply(list.owner);
						list.fnUpdateItem.apply(list.owner, [li, d]);
						newItems[i] = li;
						createdItems.push(li);
					}
					
					li.data = data[i];
				}
				
				// append and save new items
				list.items = newItems;
				let newRoots = newItems.map(item => item.$root);
				list.$container.append(newRoots);
				
				// update any buttons (needs to be after they've been added to the DOM)
				this.initButtonsInCreatedItems(list, createdItems);
			}

			return createdItems;
		},
		
		initButtonsInCreatedItems: function (list, createdItems) {
			if (createdItems.length <= 0) return;
			
			// TODO get rid of the GameGlobals/UIFunctions dependency (put buttons in their own module like List?)
			// TODO fix assumption that container has an id
			
			let scope = "#" + list.$container.attr("id");
			GameGlobals.uiFunctions.createButtons(scope);
			
			for (let i = 0; i < createdItems.length; i++) {
				let li = createdItems[i];
				list.fnUpdateItem.apply(list.owner, [ li, li.data ]);
			}
		},
		
		getItemIndex: function (list, li, data) {
			for (let i = 0; i < data.length; i++) {
				let d = data[i]
				if (this.isDataEqual(list, li.data, d)) {
					return i;
				}
			}
			return -1;
		},
		
		isDataEqual: function (list, d1, d2) {
			if (list.fnIsDataEqual) {
				return list.fnIsDataEqual.apply(list.owner, [d1, d2]);
			} else {
				return d1 === d2;
			}
		},
		
	};

	return UIList;
});
