define(['jquery/jquery-1.11.1.min'], function (jQuery) {
	
	var MetaUIUtils = {
		
		init: function () {
			this.registerCollapsibleContainerListeners();
		},
		
		registerCollapsibleContainerListeners: function () {
			var sys = this;
			$(".collapsible-header").click(function () {
				var wasVisible = $(this).next(".collapsible-content").is(":visible");
				sys.toggleCollapsibleContainer($(this), !wasVisible);
			});
			$.each($(".collapsible-header"), function () {
				sys.toggleCollapsibleContainer($(this), false, true);
			});
		},

		toggleCollapsibleContainer: function (element, show, quick) {
			var $element = typeof (element) === "string" ? $(element) : element;
			if (show) {
				var group = $element.parents(".collapsible-container-group");
				if (group.length > 0) {
					var sys = this;
					$.each($(group).find(".collapsible-header"), function () {
						var $child = $(this);
						if ($child[0] !== $element[0]) {
							sys.toggleCollapsibleContainer($child, false);
						}
					});
				}
			}
			$element.toggleClass("collapsible-collapsed", !show);
			$element.toggleClass("collapsible-open", show);
			this.slideToggleIf($element.next(".collapsible-content"), null, show, quick ? 0 : 300, quick ? 0 : 200);
		},

		slideToggleIf: function (element, replacement, show, durationIn, durationOut, cb) {
			var visible = this.isElementToggled(element);
			var toggling = ($(element).attr("data-toggling") == "true");
			var sys = this;

			if (show && (visible == false || visible == null) && !toggling) {
				if (replacement) sys.toggle(replacement, false);
				$(element).attr("data-toggling", "true");
				$(element).slideToggle(durationIn, function () {
					sys.toggle(element, true);
					$(element).attr("data-toggling", "false");
					if (cb) cb();
				});
			} else if (!show && (visible == true || visible == null) && !toggling) {
				$(element).attr("data-toggling", "true");
				$(element).slideToggle(durationOut, function () {
					if (replacement) sys.toggle(replacement, true);
					sys.toggle(element, false);
					$(element).attr("data-toggling", "false");
					if (cb) cb();
				});
			}
		},

		isElementToggled: function (element) {
			var $element = typeof (element) === "string" ? $(element) : element;
			if (($element).length === 0)
				return false;

			// if several elements, return their value if all agree, otherwise null
			if (($element).length > 1) {
				var previousIsToggled = null;
				var currentIsToggled = null;
				for (let i = 0; i < ($element).length; i++) {
					previousIsToggled = currentIsToggled;
					currentIsToggled = this.isElementToggled($(($element)[i]));
					if (i > 0 && previousIsToggled !== currentIsToggled) return null;
				}
				return currentIsToggled;
			}

			var visible = true;
			var visibletag = ($element.attr("data-visible"));

			if (typeof visibletag !== typeof undefined) {
				visible = (visibletag == "true");
			} else {
				visible = null;
			}
			return visible;
		},

		toggle: function (element, show, signalParams) {
			var $element = typeof (element) === "string" ? $(element) : element;
			if (($element).length === 0)
				return;
			if (typeof (show) === "undefined")
				show = false;
			if (show === null)
				show = false;
			if (!show)
				show = false;
			if (this.isElementToggled($element) === show)
				return;
			$element.attr("data-visible", show);
			$element.toggle(show);
		},
		
	};
	
	MetaUIUtils.init();

	return MetaUIUtils;
});
