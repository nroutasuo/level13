// Manages showing and hiding pop-ups
define(['ash', 'game/constants/UIConstants'],
function (Ash, UIConstants) {
    var UIPopupManager = Ash.Class.extend({
        
        popupQueue: null,
        playerActionResultsHelper: null,
        
        constructor: function (gameState, playerActionResultsHelper) {
            $(window).resize(this.onResize);
            this.gameState = gameState;
            this.playerActionResultsHelper = playerActionResultsHelper;
            this.popupQueue = [];
        },
        
        onResize: function () {
            $.each($(".popup"), function () {
                $(this).css("top", ($(window).height() - $(this).height()) / 2);
                $(this).css("left", ($(window).width() - $(this).width()) / 2);
            });
        },
        
        showPopup: function (title, msg, okButtonLabel, showCancel, resultVO, okCallback, cancelCallback) {
            if (this.hasOpenPopup()) {
                this.popupQueue.push({title: title, msg: msg, okButtonLabel: okButtonLabel, showCancel: showCancel, resultVO: resultVO });
                return;
            }
            
            // use the same popup container for all popups
            var popUpManager = this;
            var popup = $("#common-popup");
            if ($(popup).parent().hasClass("popup-overlay")) $(popup).unwrap();
            
            // text
            $("#common-popup-input-container").toggle(false);
            $("#common-popup h3").text(title);
            $("#common-popup p#common-popup-desc").html(msg);
            
            // results and rewards
            var hasResult = resultVO && typeof resultVO !== 'undefined';
            $("#info-results").toggle(hasResult);
            if (hasResult) {
                $("#info-results").empty();
                var rewardDiv = this.playerActionResultsHelper.getRewardDiv(resultVO, false);
                $("#info-results").append(rewardDiv);
            }
            
            // buttons and callbacks
            $("#common-popup .buttonbox").empty();
            $("#common-popup .buttonbox").append("<button id='info-ok' class='action'>" + okButtonLabel + "</button>");
            $("#info-ok").click(function (e) {
                popUpManager.closePopup("common-popup");
                if (okCallback) okCallback();
            });
            if (showCancel) {
                $("#common-popup .buttonbox").append("<button id='confirmation-cancel'>Cancel</button>");
                $("#confirmation-cancel").click(function (e) {
                    popUpManager.closePopup("common-popup");
                    if (cancelCallback) cancelCallback();
                });
            }
            
            // overlay
            $("#common-popup").wrap("<div class='popup-overlay level-bg-colour' style='display:none'></div>");
            $(".popup-overlay").toggle(true);
            popUpManager.onResize();
            $("#common-popup").slideDown(200, popUpManager.onResize);
            
            // pause the game while a popup is open
            this.gameState.isPaused = this.hasOpenPopup();
        },
        
        closePopup: function (id) {
            var popupManager = this;
            if (popupManager.popupQueue.length === 0) {
                $("#" + id).data("fading", true);
                $("#" + id).slideUp(200, function () {
                    $(".popup-overlay").toggle(false);
                    $("#" + id).unwrap();
                    $("#" + id).data("fading", false);
                    popupManager.showQueuedPopup();
                    popupManager.gameState.isPaused = popupManager.hasOpenPopup();
                });
            } else {
                $("#" + id).toggle(false);
                $("#" + id).data("fading", false);
                popupManager.showQueuedPopup();
                popupManager.gameState.isPaused = popupManager.hasOpenPopup();
            }
        },
        
        closeAllPopups: function () {
            this.popupQueue = [];
            var popupManager = this;
            $.each($(".popup:visible"), function () {
                popupManager.closePopup($(this).attr("id"));
            });
        },
        
        showQueuedPopup: function () {
            if (this.popupQueue.length > 0) {
                var queued = this.popupQueue.pop();
                this.showPopup(queued.title, queued.msg, queued.okButtonLabel, queued.showCancel, queued.resultVO);
            }
        },
        
        hasOpenPopup: function () {
            return $(".popup:visible").length > 0;
        },
        
    });

    return UIPopupManager;
});
