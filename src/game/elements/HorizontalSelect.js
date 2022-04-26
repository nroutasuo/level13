define([],
function () {

	var HorizontalSelect = {
		
		init: function (id, title) {
			var obj = {};
			obj.$container = $("#" + id);
			obj.$container.toggleClass("horizontal-select", true);
			
			var titleSpan = "<span class='horizontal-select-title'>" + title + "</span>";
			obj.$container.append(titleSpan);
			
			obj.$list = $("<ul class='horizontal-select-list'></ul>");
			obj.$container.append(obj.$list);
			
			return obj;
		},
		
		setOptions: function (obj, options) {
			obj.$list.empty();
			obj.options = options;
			obj.lis = [];
			for (let i = 0; i < options.length; i++) {
				var index = i;
				var option = options[i];
				var $li = $("<li class='horizontal-select-option' data-ix='" + i + "'>" + option.label + "</li>");
				obj.$list.append($li);
				$li.click(function () {
					var ix = $(this).attr("data-ix");
					HorizontalSelect.selectOption(obj, ix);
				});
				obj.lis.push($li);
			}
			
			HorizontalSelect.selectOption(obj, 0);
		},
		
		getSelection: function (obj) {
			return obj.options[obj.selectedIx];
		},
		
		selectOption: function (obj, ix) {
			obj.selectedIx = ix;
			for (let i = 0; i < obj.lis.length; i++) {
				obj.lis[i].toggleClass("selected", i == ix);
			}
		}

	};

	return HorizontalSelect;
});
