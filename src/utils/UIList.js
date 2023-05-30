// utils for making data-driven UI lists
// pass in the data to display and this takes care of creating, deleting and updating html elements as needed

// TODO pooling
// TODO two definitions of equality (data is the same, no update needed vs data has changed a bit but keep the same element anyway)
// TODO animations

define(['game/GameGlobals'], function (GameGlobals) {

	let UIList = {
		
		// container: element inside which list items will be added
		// fnCreateItem: function () - should return new item that has a member called $root which will be added to container
		// fnUpdateItem: function (li, data) - should update the given list item with the given data
		// fnIsDataEqual: function (data1, data2) - optional - defines if a data is the same (no update needed)
		create: function (container, fnCreateItem, fnUpdateItem, fnIsDataEqual) {
			let list = {};
			list.$container = $(container);
			list.data = [];
			list.items = [];
			list.fnCreateItem = fnCreateItem;
			list.fnUpdateItem = fnUpdateItem;
			list.fnIsDataEqual = fnIsDataEqual;
			return list;
		},
		
		// list: a data structure returned by create
		// data: an array of data entries that the list's fnUpdateItem and fnIsDataEqual can use
		update: function (list, data) {
			let newItems = [];
			let createdItems = [];
			
			for (let i = 0; i < list.items.length; i++) {
				let li = list.items[i];
				let newIndex = this.getItemIndex(list, li, data);
				
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
					list.fnUpdateItem(li, d);
				} else  {
					li = list.fnCreateItem();
					list.fnUpdateItem(li, d);
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

			return createdItems.length;
		},
		
		initButtonsInCreatedItems: function (list, createdItems) {
			if (createdItems.length <= 0) return;
			
			// TODO get rid of the GameGlobals/UIFunctions dependency (put buttons in their own module like List?)
			// TODO fix assumption that container has an id
			
			let scope = "#" + list.$container.attr("id");
			GameGlobals.uiFunctions.registerActionButtonListeners(scope);
			GameGlobals.uiFunctions.generateButtonOverlays(scope);
			GameGlobals.uiFunctions.generateCallouts(scope);
			
			for (let i = 0; i < createdItems.length; i++) {
				let li = createdItems[i];
				list.fnUpdateItem(li, li.data);
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
				return list.fnIsDataEqual(d1, d2);
			} else {
				return d1 === d2;
			}
		},
		
	};

	return UIList;
});
