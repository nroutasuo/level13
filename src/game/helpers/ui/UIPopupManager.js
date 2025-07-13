// Manages showing and hiding pop-ups
define(['ash', 'text/Text', 'core/ExceptionHandler', 'game/GameGlobals', 'game/GlobalSignals', 'game/constants/UIConstants'],
function (Ash, Text, ExceptionHandler, GameGlobals, GlobalSignals, UIConstants) {

	let UIPopupManager = Ash.Class.extend({

		popupQueue: null,
		hiddenQueue: null,

		elements: {},

		showOverlayCounter: 0,
		
		constructor: function () {
			this.popupQueue = [];
			this.hiddenQueue = [];

			this.elements.overlay = $("#popup-overlay");
			
			GlobalSignals.add(this, GlobalSignals.windowResizedSignal, this.onWindowResized);
			GlobalSignals.add(this, GlobalSignals.popupResizedSignal, this.onPopupResized);

			this.elements.overlay.click(ExceptionHandler.wrapClick(function (e) {
				if (e.target == e.currentTarget) {
					GameGlobals.uiFunctions.popupManager.dismissPopups();
				}
			}));
		},
		
		// options:
		// - isMeta (bool) - default false
		// - isDismissable (bool) - default derived from other params
		// - forceShowInventoryManagement (bool) - default false
		// - setupCallback - callback to set up the popup before it's actually shown
		showPopup: function (title, msg, okButtonLabel, cancelButtonLabel, resultVO, okCallback, cancelCallback, options) {
			options = options || {};
			let isMeta = options.isMeta || false;
			let forceShowInventoryManagement = options.forceShowInventoryManagement;

			let action = options.action;
			
			let hasResult = resultVO && typeof resultVO !== 'undefined';
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

			GameGlobals.gameState.uiStatus.isBusyCounter++;
			
			// use the same popup container for all popups
			let popUpManager = this;
			let $popup = $("#common-popup");
			
			// text
			GameGlobals.uiFunctions.toggle("#common-popup-input-container", false);
			$("#common-popup h3").text(title);
			$("#common-popup p#common-popup-desc").html(msg || "");
			
			// results and rewards
			GameGlobals.uiFunctions.toggle("#info-results", showInventoryManagement);
			$("#info-results").empty();
			if (showInventoryManagement) {
				let rewardDiv = GameGlobals.playerActionResultsHelper.getRewardDiv(resultVO, { forceShowInventoryManagement: forceShowInventoryManagement });
				$("#info-results").append(rewardDiv);
				GameGlobals.uiFunctions.generateInfoCallouts("#reward-div");
			}
			
			// buttons and callbacks
			var $defaultButton = null;
			$("#common-popup .buttonbox").empty();

			if (!action) {
				$("#common-popup .buttonbox").append("<button id='info-ok' class='action'>" + okButtonLabel + "</button>");
				$("#info-ok").attr("action", showInventoryManagement ? "accept_inventory" : null);
				$("#info-ok").toggleClass("inventory-selection-ok", showInventoryManagement);
				$("#info-ok").toggleClass("action", showInventoryManagement);
				$("#info-ok").click(ExceptionHandler.wrapClick(function (e) {
					e.stopPropagation();
					popUpManager.handleOkButton(false, okCallback);
				}));
				$defaultButton = $("#info-ok");
			}
			
			let showTakeAll = hasResult && resultVO.hasSelectable();
			if (showTakeAll) {
				$("#common-popup .buttonbox").append("<button id='confirmation-takeall' class='action' action='take_all'>Take all</button>");
				$("#confirmation-takeall").click(ExceptionHandler.wrapClick(function (e) {
					popUpManager.handleOkButton(true, okCallback);
				}));
				$defaultButton = $("#confirmation-takeall");
			}

			if (action) {
				let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
				let actionName = Text.t("game.actions." + baseActionID + "_name");
				$("#common-popup .buttonbox").append("<button id='info-action' class='action' action='" + action + "'>" + actionName + "</button>");
				$("#info-action").click(ExceptionHandler.wrapClick(function (e) {
					popUpManager.handleOkButton(true, okCallback);
				}));
			}
			
			if (cancelButtonLabel) {
				$("#common-popup .buttonbox").append("<button id='confirmation-cancel'>" + cancelButtonLabel + "</button>");
				$("#confirmation-cancel").click(ExceptionHandler.wrapClick(function (e) {
					if (!GameGlobals.gameState.isPlayerInputAccepted()) return;
					popUpManager.closePopup("common-popup");
					if (cancelCallback) cancelCallback();
				}));
			}

			if ($defaultButton == null) {
				$defaultButton = $("#confirmation-cancel");
			}

			if ($defaultButton != null) {
				$defaultButton.toggleClass("button-popup-default", true);
			}

			if (options.setupCallback) {
				options.setupCallback();
			}
			
			// overlay
			$popup.toggleClass("popup-meta", isMeta);
			$popup.toggleClass("popup-ingame", !isMeta);

			this.showOverlay(() => {
				popUpManager.repositionPopup($popup);
				
				let slideTime = GameGlobals.gameState.uiStatus.isInitialized ? UIConstants.POPUP_FADE_IN_DURATION : 0;
				
				GameGlobals.uiFunctions.slideToggleIf($popup, null, true, slideTime, slideTime, () => {
					log.i("showed popup", "ui");
					popUpManager.repositionPopup($popup);
					GlobalSignals.popupShownSignal.dispatch("common-popup");
				});

				GlobalSignals.popupOpenedSignal.dispatch("common-popup");
				
				GameGlobals.uiFunctions.createButtons("#common-popup .buttonbox");
				
				this.setDismissable($popup, isDismissable);
				GameGlobals.uiFunctions.focus($defaultButton);
				this.updatePause();

				setTimeout(() => {
					GameGlobals.gameState.uiStatus.isBusyCounter--;
				}, 200);
			});
		},

		showOverlay: function (cb) {
			this.showOverlayCounter++;

			if (this.showOverlayCounter > 1) {
				cb();
				return;
			}
			
			GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.openPopup, 100);

			this.elements.overlay.stop().fadeIn(UIConstants.POPUP_OVERLAY_FADE_IN_DURATION, cb);
		},

		hideOverlay: function () {
			this.showOverlayCounter--;

			if (this.showOverlayCounter > 0) return;
			if (this.showOverlayCounter < 0) this.showOverlayCounter = 0;
			
			GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.closePopup, 100);

			this.elements.overlay.stop().fadeOut(UIConstants.POPUP_OVERLAY_FADE_OUT_DURATION);
		},

		setDismissable: function ($popup, isDismissable) {
			$popup.attr("data-dismissable", isDismissable);
			$popup.attr("data-dismissed", "false");
		},

		updatePause: function () {
			let hasOpenPopup = this.hasOpenPopup();
			GameGlobals.gameState.isPaused = hasOpenPopup;
			
			$("body").css("overflow", hasOpenPopup ? "hidden" : "initial");
			$(".hidden-by-popups").attr("aria-hidden", hasOpenPopup);

			if (hasOpenPopup) {
				$(".hidden-by-popups").attr("inert", hasOpenPopup);
			} else {
				$(".hidden-by-popups").removeAttr("inert");
			}
		},
		
		handleOkButton: function (isTakeAll, okCallback) {
			let id = "common-popup";
			if (!GameGlobals.gameState.isPlayerInputAccepted()) return;
			if (this.isClosing(id)) {
				log.w("popup already closing: " + id)
				return;
			}
			let canClose =  !okCallback || okCallback(isTakeAll) !== false;
			if (!canClose) return;
			GlobalSignals.triggerSoundSignal.dispatch(UIConstants.soundTriggerIDs.buttonClicked);
			this.closePopup(id);
		},
		
		closePopup: function (id) {
			let popupManager = this;
			$("#" + id).data("closing", true);

			if (popupManager.popupQueue.length === 0) {
				GlobalSignals.popupClosingSignal.dispatch(id);
				$("#" + id).data("fading", true);
				GameGlobals.uiFunctions.slideToggleIf($("#" + id), null, false, UIConstants.POPUP_FADE_OUT_DURATION, UIConstants.POPUP_FADE_OUT_DURATION, function () {
					$("#" + id).data("fading", false);
					$("#" + id).data("closing", false);
					$("#" + id + "p#common-popup-desc").html("");
					popupManager.showQueuedPopup();
					popupManager.updatePause();
					setTimeout(() => { GlobalSignals.popupClosedSignal.dispatch(id); });
				});

				// ensure hideOverlay is called even if animation is stopped by another popup opening
				setTimeout(() => {
					popupManager.hideOverlay();
				}, UIConstants.POPUP_FADE_OUT_DURATION);
			} else {
				$("#" + id).data("fading", false);
				$("#" + id).data("closing", false);
				GameGlobals.uiFunctions.toggle("#" + id, false);
				popupManager.showQueuedPopup();
				popupManager.updatePause();
				popupManager.hideOverlay();
				setTimeout(() => { GlobalSignals.popupClosedSignal.dispatch(id); });
			}
		},
		
		repositionPopups: function () {
			$.each($(".popup"), function () {
				GameGlobals.uiFunctions.popupManager.repositionPopup($(this));
			});
		},

		repositionPopup: function ($popup) {
			let winh = $(window).height();
			let winw = $(window).width();
			let isSmallLayout = winw <= UIConstants.SMALL_LAYOUT_THRESHOLD;
			let padding = isSmallLayout ? 0 : 20;

			let popuph = Math.min($popup.height(), winh);
			let popupw = Math.min($popup.width(), winw);
			$popup.css("top", Math.max(0, (winh - popuph) / 2 - padding));
			$popup.css("left", (winw - popupw) / 2);
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
			this.updatePause();
		},
		
		dismissPopups: function () {
			var popupManager = this;
			$.each($(".popup:visible"), function () {
				let dataDismissable = $(this).attr("data-dismissable");
				let isDismissable = dataDismissable == true || dataDismissable == "true";
				if (isDismissable) {
					popupManager.dismissPopup($(this));
				}
			});
			this.updatePause();
		},

		dismissPopup: function ($popup) {
			if (!GameGlobals.gameState.isPlayerInputAccepted()) return;
			let dataDismissed = $popup.attr("data-dismissed");
			if (dataDismissed == true || dataDismissed == "true") return;
			let dataToggling = $popup.attr("data-toggling");
			if (dataToggling == true || dataToggling == "true") return;
			$popup.attr("data-dismissed", "true");
			$popup.find(".button-popup-default").trigger("click");
		},
		
		showQueuedPopup: function () {
			if (this.popupQueue.length > 0) {
				let queued = this.popupQueue.pop();
				this.showPopup(queued.title, queued.msg, queued.okButtonLabel, queued.cancelButtonLabel, queued.resultVO, queued.okCallback, queued.cancelCallback, queued.options);
			} else {
				this.updatePause();
			}
		},

		isClosing: function (id) {
			return $("#" + id).data("closing") === true;
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
