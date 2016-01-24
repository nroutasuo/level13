// Manages showing and hiding pop-ups
define(['ash', 'game/constants/UIConstants'],
function (Ash, UIConstants) {
    var UIPopupManager = Ash.Class.extend({
        
        popupQueue: null,
        playerActionResultsHelper: null,
        
        constructor: function (playerActionResultsHelper) {
            $(window).resize(this.onResize);
            this.playerActionResultsHelper = playerActionResultsHelper;
            this.popupQueue = [];
        },
        
        onResize: function () {
            $.each($(".popup"), function () {
                $(this).css("top", ($(window).height() - $(this).height()) / 2);
                $(this).css("left", ($(window).width() - $(this).width()) / 2);
            });
        },
        
        showPopup: function (id, title, msg, okButtonLabel, showCancel, resultVO) {
            if (this.hasOpenPopup()) {
                this.popupQueue.push({id: id, title: title, msg: msg, okButtonLabel: okButtonLabel, showCancel: showCancel, resultVO: resultVO });
                return;
            }
            
            var popUpManager = this;
            var popup = $("#common-popup");
            $("#common-popup-input-container").toggle(false);
            $("#common-popup h3").text(title);
            $("#common-popup p#common-popup-desc").text(msg);
            
            var hasResult = typeof resultVO !== 'undefined';
            $("#info-results").toggle(hasResult);
            if (hasResult) {
                $("#info-results").empty();
                var rewardDiv = this.playerActionResultsHelper.getRewardDiv(resultVO);
                $("#info-results").append(rewardDiv);
            }
            
            $("#common-popup .buttonbox").empty();
            if (showCancel) {
                $("#common-popup .buttonbox").append("<button id='confirmation-cancel'>Cancel</button>");
            }
            $("#common-popup .buttonbox").append("<button id='info-ok' class='action'>" + okButtonLabel + "</button>");
            
            $("#info-ok").click(function (e) {
                popUpManager.closePopup("common-popup");
            });
            
            $("#common-popup").wrap("<div class='popup-overlay level-bg-colour' style='display:none'></div>");
            $(".popup-overlay").toggle(true);
            $("#common-popup").slideDown(200, popUpManager.onResize);
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
                });
            } else {
                $("#" + id).toggle(false);
                $("#" + id).data("fading", false);
                popupManager.showQueuedPopup();
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
                this.showPopup(queued.id, queued.title, queued.msg, queued.okButtonLabel, queued.showCancel, queued.resultVO);
            }
        },
        
        hasOpenPopup: function () {
            return $(".popup:visible").length > 0;
        },
        
    });

    return UIPopupManager;
});
