// Manages showing and hiding pop-ups
define(['ash', 'core/ExceptionHandler', 'game/GameGlobals', 'game/GlobalSignals'],
function (Ash, ExceptionHandler, GameGlobals, GlobalSignals) {
	var UIPopupManager = Ash.Class.extend({
		
		popupQueue: null,
		hiddenQueue: null,
		
		constructor: function () {
			this.popupQueue = [];
			this.hiddenQueue = [];
			
			GlobalSignals.add(this, GlobalSignals.windowResizedSignal, this.onWindowResized);
			GlobalSignals.add(this, GlobalSignals.popupResizedSignal, this.onPopupResized);
		},
		
		showPopup: function (title, msg, okButtonLabel, cancelButtonLabel, resultVO, okCallback, cancelCallback, isMeta, isDismissable) {
			if (GameGlobals.gameState.uiStatus.isHidden && !isMeta) {
				this.hiddenQueue.push({title: title, msg: msg, okButtonLabel: okButtonLabel, cancelButtonLabel: cancelButtonLabel, resultVO: resultVO, okCallback: okCallback, cancelCallback: cancelCallback, isDismissable: isDismissable });
				return;
			}
			
			if (this.hasOpenPopup()) {
				this.popupQueue.push({title: title, msg: msg, okButtonLabel: okButtonLabel, cancelButtonLabel: cancelButtonLabel, resultVO: resultVO, okCallback: okCallback, cancelCallback: cancelCallback, isMeta: isMeta, isDismissable: isDismissable });
				return;
			}
			
			// use the same popup container for all popups
			var popUpManager = this;
			var popup = $("#common-popup");
			if ($(popup).parent().hasClass("popup-overlay")) $(popup).unwrap();
			
			// text
			GameGlobals.uiFunctions.toggle("#common-popup-input-container", false);
			$("#common-popup h3").text(title);
			$("#common-popup p#common-popup-desc").html(msg);
			
			// results and rewards
			var hasResult = resultVO && typeof resultVO !== 'undefined';
			var hasNonEmptyResult = hasResult && !resultVO.isEmpty();
			GameGlobals.uiFunctions.toggle("#info-results", hasResult);
			$("#info-results").empty();
			if (hasResult) {
				var rewardDiv = GameGlobals.playerActionResultsHelper.getRewardDiv(resultVO, false);
				$("#info-results").append(rewardDiv);
				GameGlobals.uiFunctions.generateCallouts("#reward-div");
			}
			
			// buttons and callbacks
			var $defaultButton = null;
			$("#common-popup .buttonbox").empty();
			$("#common-popup .buttonbox").append("<button id='info-ok' class='action'>" + okButtonLabel + "</button>");
			$("#info-ok").attr("action", hasResult ? "accept_inventory" : null);
			$("#info-ok").toggleClass("inventory-selection-ok", hasResult);
			$("#info-ok").toggleClass("action", hasResult);
			$("#info-ok").click(ExceptionHandler.wrapClick(function (e) {
				e.stopPropagation();
				popUpManager.handleOkButton(false, okCallback);
			}));
			$defaultButton = $("#info-ok");
			
			var showTakeAll = hasResult && resultVO.hasSelectable();
			if (showTakeAll) {
				$("#common-popup .buttonbox").append("<button id='confirmation-takeall' class='action' action='take_all'>Take all</button>");
				$("#confirmation-takeall").click(ExceptionHandler.wrapClick(function (e) {
					popUpManager.handleOkButton(true, okCallback);
				}));
				$defaultButton = $("#confirmation-takeall");
			}
			
			if (cancelButtonLabel) {
				$("#common-popup .buttonbox").append("<button id='confirmation-cancel'>" + cancelButtonLabel + "</button>");
				$("#confirmation-cancel").click(ExceptionHandler.wrapClick(function (e) {
					popUpManager.closePopup("common-popup");
					if (cancelCallback) cancelCallback();
				}));
			}
			
			// overlay
			let overlayClass = isMeta ? "popup-overlay-meta" : "popup-overlay-ingame";
			$("#common-popup").toggleClass("popup-meta", isMeta);
			$("#common-popup").toggleClass("popup-ingame", !isMeta);
			$("#common-popup").wrap("<div class='popup-overlay " + overlayClass + "' style='display:none'></div>");
			GameGlobals.uiFunctions.toggle(".popup-overlay", true);
			popUpManager.repositionPopups();
			GameGlobals.uiFunctions.slideToggleIf($("#common-popup"), null, true, 150, 150, popUpManager.repositionPopups);
			GlobalSignals.popupOpenedSignal.dispatch("common-popup");
			
			gtag('event', 'screen_view', { 'screen_name': "popup-common" });
			
			GameGlobals.uiFunctions.generateButtonOverlays("#common-popup .buttonbox");
			GameGlobals.uiFunctions.generateCallouts("#common-popup .buttonbox");
			
			if (typeof isDismissable == 'undefined') {
				isDismissable = !hasNonEmptyResult && !cancelButtonLabel;
			}
			popup.attr("data-dismissable", isDismissable);
			popup.attr("data-dismissed", "false");
			if (isDismissable) {
				$(".popup-overlay").click(ExceptionHandler.wrapClick(function (e) {
					GameGlobals.uiFunctions.popupManager.dismissPopups();
				}));
			}
		
			if ($defaultButton) {
				$defaultButton.focus()
			}
			
			// pause the game while a popup is open
			GameGlobals.gameState.isPaused = this.hasOpenPopup();
		},
		
		handleOkButton: function (isTakeAll, okCallback) {
			let canClose = !okCallback || okCallback(isTakeAll) !== false;
			if (!canClose) return;
			this.closePopup("common-popup");
		},
		
		closePopup: function (id) {
			var popupManager = this;
			if (popupManager.popupQueue.length === 0) {
				GlobalSignals.popupClosingSignal.dispatch(id);
				$("#" + id).data("fading", true);
				GameGlobals.uiFunctions.slideToggleIf($("#" + id), null, false, 100, 100, function () {
					GameGlobals.uiFunctions.toggle(".popup-overlay", false);
					$("#" + id).unwrap();
					$("#" + id).data("fading", false);
					$("#" + id + "p#common-popup-desc");
					GlobalSignals.popupClosedSignal.dispatch(id);
					popupManager.showQueuedPopup();
					GameGlobals.gameState.isPaused = popupManager.hasOpenPopup();
				});
			} else {
				$("#" + id).data("fading", false);
				GameGlobals.uiFunctions.toggle("#" + id, false);
				GlobalSignals.popupClosedSignal.dispatch(id);
				popupManager.showQueuedPopup();
				GameGlobals.gameState.isPaused = popupManager.hasOpenPopup();
			}
		},
		
		repositionPopups: function () {
			var winh = $(window).height();
			var winw = $(window).width();
			var padding = 20;
			$.each($(".popup"), function () {
				var popuph = $(this).height();
				var popupw = $(this).width();
				$(this).css("top", Math.max(0, (winh - popuph) / 2 - padding));
				$(this).css("left", (winw - popupw) / 2);
			});
		},
		
		closeHidden: function (ok) {
			if (this.hiddenQueue.length > 0) {
				var hidden = this.hiddenQueue.pop();
				if (ok) {
					if (hidden.okCallback) hidden.okCallback();
				} else {
					if (hidden.cancelCallback) hidden.cancelCallback();
				}
			}
		},
		
		closeAllPopups: function () {
			this.popupQueue = [];
			var popupManager = this;
			$.each($(".popup:visible"), function () {
				popupManager.closePopup($(this).attr("id"));
			});
		},
		
		dismissPopups: function () {
			var popupManager = this;
			$.each($(".popup:visible"), function () {
				let dataDismissable = $(this).attr("data-dismissable");
				let isDismissable = dataDismissable == true || dataDismissable == "true";
				if (isDismissable) {
					let dataDismissed = $(this).attr("data-dismissed");
					if (dataDismissed == true || dataDismissed == "true") return;
					$(this).attr("data-dismissed", "true");
					$(this).find("#info-ok").trigger("click");
				}
			});
		},
		
		showQueuedPopup: function () {
			if (this.popupQueue.length > 0) {
				var queued = this.popupQueue.pop();
				this.showPopup(queued.title, queued.msg, queued.okButtonLabel, queued.cancelButtonLabel, queued.resultVO, queued.okCallback, queued.cancelCallback, queued.isMeta);
			}
		},
		
		hasOpenPopup: function () {
			return $(".popup:visible").length > 0;
		},
		
		onWindowResized: function () {
			this.repositionPopups();
		},
		
		onPopupResized: function () {
			this.repositionPopups();
		},
		
	});

	return UIPopupManager;
});
