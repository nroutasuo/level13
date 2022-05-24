// utils for making data-driven UI lists
// pass in the data to display and this takes care of creating, deleting and updating html elements as needed

// TODO pooling
// TODO two definitions of equality (data is the same, no update needed vs data has changed a bit but keep the same element anyway)
// TODO animations

define(function () {

	var UIList = {
		
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
			let numCreated = 0;
			let newItems = [];
			
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
				if (!li) {
					li = list.fnCreateItem();
					list.fnUpdateItem(li, d);
					newItems[i] = li;
					numCreated++;
				}
				
				li.data = data[i];
			}
			
			// append and save new items
			list.items = newItems;
			let newRoots = newItems.map(item => item.$root);
			list.$container.append(newRoots);

			return numCreated;
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
