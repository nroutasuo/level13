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
		
		// options:
		// - isMeta (bool) - default false
		// - isDismissable (bool) - default derived from other params
		// - forceShowInventoryManagement (bool) - default false
		showPopup: function (title, msg, okButtonLabel, cancelButtonLabel, resultVO, okCallback, cancelCallback, options) {
			options = options || {};
			let isMeta = options.isMeta || false;
			let forceShowInventoryManagement = options.forceShowInventoryManagement;
			
			let hasResult = resultVO && typeof resultVO !== 'undefined';
			let hasNonEmptyResult = hasResult && !resultVO.isEmpty();
			let showInventoryManagement = hasResult || forceShowInventoryManagement;
			
			let isDismissable = options.isDismissable || (typeof options.isDismissable == 'undefined' && !showInventoryManagement && !cancelButtonLabel);
			
			if (GameGlobals.gameState.uiStatus.isHidden && !isMeta) {
				log.i("queue popup (" + title + ")", "ui");
				this.hiddenQueue.push({ title: title, msg: msg, okButtonLabel: okButtonLabel, cancelButtonLabel: cancelButtonLabel, resultVO: resultVO, okCallback: okCallback, cancelCallback: cancelCallback, options: options });
				return;
			}
			
			if (this.hasOpenPopup()) {
				log.i("queue popup (" + title + ")", "ui");
				this.popupQueue.push({ title: title, msg: msg, okButtonLabel: okButtonLabel, cancelButtonLabel: cancelButtonLabel, resultVO: resultVO, okCallback: okCallback, cancelCallback: cancelCallback, options: options });
				return;
			}
			
			log.i("show popup (" + title + ")", "ui");
			
			// use the same popup container for all popups
			let popUpManager = this;
			let popup = $("#common-popup");
			if ($(popup).parent().hasClass("popup-overlay")) $(popup).unwrap();
			
			// text
			GameGlobals.uiFunctions.toggle("#common-popup-input-container", false);
			$("#common-popup h3").text(title);
			$("#common-popup p#common-popup-desc").html(msg);
			
			// results and rewards
			GameGlobals.uiFunctions.toggle("#info-results", showInventoryManagement);
			$("#info-results").empty();
			if (showInventoryManagement) {
				let rewardDiv = GameGlobals.playerActionResultsHelper.getRewardDiv(resultVO, false, forceShowInventoryManagement);
				$("#info-results").append(rewardDiv);
				GameGlobals.uiFunctions.generateCallouts("#reward-div");
			}
			
			// buttons and callbacks
			var $defaultButton = null;
			$("#common-popup .buttonbox").empty();
			$("#common-popup .buttonbox").append("<button id='info-ok' class='action'>" + okButtonLabel + "</button>");
			$("#info-ok").attr("action", showInventoryManagement ? "accept_inventory" : null);
			$("#info-ok").toggleClass("inventory-selection-ok", showInventoryManagement);
			$("#info-ok").toggleClass("action", showInventoryManagement);
			$("#info-ok").click(ExceptionHandler.wrapClick(function (e) {
				e.stopPropagation();
				popUpManager.handleOkButton(false, okCallback);
			}));
			$defaultButton = $("#info-ok");
			
			let showTakeAll = hasResult && resultVO.hasSelectable();
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
			
			let slideTime = GameGlobals.gameState.uiStatus.isInitialized ? 150 : 0;
			GameGlobals.uiFunctions.slideToggleIf($("#common-popup"), null, true, slideTime, slideTime, () => {
				log.i("showed popup", "ui");
				popUpManager.repositionPopups();
			});
			GlobalSignals.popupOpenedSignal.dispatch("common-popup");
			
			gtag('event', 'screen_view', { 'screen_name': "popup-common" });
			
			GameGlobals.uiFunctions.generateButtonOverlays("#common-popup .buttonbox");
			GameGlobals.uiFunctions.generateCallouts("#common-popup .buttonbox");
			
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
				let hidden = this.hiddenQueue.pop();
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
				let queued = this.popupQueue.pop();
				this.showPopup(queued.title, queued.msg, queued.okButtonLabel, queued.cancelButtonLabel, queued.resultVO, queued.okCallback, queued.cancelCallback, queued.options);
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
