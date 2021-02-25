define(['ash', 'game/constants/UIConstants'
], function (Ash, UIConstants) {
	
	var CanvasConstants = {
	
		makeCanvasScrollable: function (canvasId) {
			$("#" + canvasId).mousedown({ helper: this }, this.onScrollableMapMouseDown);
			$("#" + canvasId).mouseup({ helper: this }, this.onScrollableMapMouseUp);
			$("#" + canvasId).mouseleave({ helper: this }, this.onScrollableMapMouseLeave);
			$("#" + canvasId).mousemove({ helper: this }, this.onScrollableMapMouseMove);
			
			$("#" + canvasId).addClass("scrollable");
			
			$("#" + canvasId).parent().wrap("<div class='scroll-position-container lvl13-box-2'></div>");
			$("#" + canvasId).parent().before("<div class='scroll-position-indicator scroll-position-indicator-vertical'/>");
			$("#" + canvasId).parent().before("<div class='scroll-position-indicator scroll-position-indicator-horizontal'/>");
		},
		
		onScrollableMapMouseDown: function (e) {
			$(this).attr("scrolling", "true");
			$(this).attr("scrollStartX", Math.floor(e.pageX));
			$(this).attr("scrollStartY", Math.floor(e.pageY));
			$(this).attr("scrollStartXScrollLeft", Math.floor($(this).parent().scrollLeft()));
			$(this).attr("scrollStartXScrollTop", Math.floor($(this).parent().scrollTop()));
		},
		
		onScrollableMapMouseUp: function (e) {
			e.data.helper.snapScrollPositionToGrid($(this).attr("id"));
			$(this).attr("scrolling", "false");
		},
		
		onScrollableMapMouseLeave: function (e) {
			e.data.helper.snapScrollPositionToGrid($(this).attr("id"));
			$(this).attr("scrolling", "false");
		},
		
		onScrollableMapMouseMove: function (e) {
			var isScrolling = $(this).attr("scrolling") === "true";
			if (isScrolling) {
				var currentX = Math.floor(e.pageX);
				var currentY = Math.floor(e.pageY);
				var posX = currentX - parseInt($(this).attr("scrollStartX")) - parseInt($(this).attr("scrollStartXScrollLeft"));
				var posY = currentY - parseInt($(this).attr("scrollStartY")) - parseInt($(this).attr("scrollStartXScrollTop"));
				$(this).parent().scrollLeft(-posX);
				$(this).parent().scrollTop(-posY);
				e.data.helper.updateScrollIndicators($(this).attr("id"));
			}
		},
		
		updateScrollEnable: function (canvasId) {
			var scrollContainer = $("#" + canvasId).parent();
			var maxScrollPosX = Math.max(0, -(scrollContainer.width() - $("#" + canvasId).width()));
			var maxScrollPosY = Math.max(0, -(scrollContainer.height() - $("#" + canvasId).height()));
			var isScrollEnabled = maxScrollPosY > 0 || maxScrollPosX > 0;
			if (!isScrollEnabled && $("#" + canvasId).hasClass("scroll-enabled"))
				$("#" + canvasId).removeClass("scroll-enabled");
			if (isScrollEnabled && !$("#" + canvasId).hasClass("scroll-enabled"))
				$("#" + canvasId).addClass("scroll-enabled");
		},
		
		updateScrollIndicators: function (canvasId) {
			var scrollContainer = $("#" + canvasId).parent();
			var scrollIndicatorVertical = scrollContainer.siblings(".scroll-position-indicator-vertical")[0];
			var scrollIndicatorHorizontal = scrollContainer.siblings(".scroll-position-indicator-horizontal")[0];
			
			var verticalScrollHeight = Math.min(1, scrollContainer.height() / $("#" + canvasId).height());
			var verticalScrollWidth = Math.min(1, scrollContainer.width() / $("#" + canvasId).width());
			var scrollIndicatorVerticalHeight = $(scrollIndicatorVertical).parent().height() * verticalScrollHeight;
			var scrollIndicatorHorizontalWidth = $(scrollIndicatorHorizontal).parent().width() * verticalScrollWidth;
			$(scrollIndicatorVertical).css("height", scrollIndicatorVerticalHeight + "px");
			$(scrollIndicatorHorizontal).css("width", scrollIndicatorHorizontalWidth + "px");
			
			var scrollPosX = scrollContainer.scrollLeft();
			var maxScrollPosX = Math.max(0, -(scrollContainer.width() - $("#" + canvasId).width()));
			var scrollPosY = scrollContainer.scrollTop();
			var maxScrollPosY = Math.max(0, -(scrollContainer.height() - $("#" + canvasId).height()));
			var maxIndicatorTop = scrollContainer.height() - scrollIndicatorVerticalHeight;
			var maxIndicatorLeft = scrollContainer.width() - scrollIndicatorHorizontalWidth;
			$(scrollIndicatorVertical).css("top", UIConstants.SCROLL_INDICATOR_SIZE + (maxScrollPosY > 0 ? (scrollPosY / maxScrollPosY) * maxIndicatorTop : 0) + "px");
			$(scrollIndicatorHorizontal).css("left", UIConstants.SCROLL_INDICATOR_SIZE + (maxScrollPosX > 0 ? (scrollPosX / maxScrollPosX) * maxIndicatorLeft : 0) + "px");
		},
		
		snapScrollPositionToGrid: function (canvasId) {
			var scrollContainer = $("#" + canvasId).parent();
			// TODO set grid size per canvas
			scrollContainer.scrollLeft(Math.round(scrollContainer.scrollLeft() / 20) * 20);
			scrollContainer.scrollTop(Math.round(scrollContainer.scrollTop() / 20) * 20);
		}
	};
	
	return CanvasConstants;
});
