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
                this.popupQueue.push({id: id, title: title, msg: msg, okButtonLabel: okButtonLabel, showCancel: showCancel });
                return;
            }
            
            var popUpManager = this;
            var popup = "<div class='popup fill-on-mobiles' id='" + id + "' style='display:none;'>";
            popup += "<h3>" + title + "</h3><p>" + msg + "</p>";
            
            if (resultVO) {
                popup += this.playerActionResultsHelper.getRewardDiv(resultVO);
            }
            
            popup += "<div class='buttonbox'>";
            if (showCancel) {
                popup += "<button id='confirmation-cancel'>Cancel</button>";
            }
            popup += "<button id='info-ok' class='action'>" + okButtonLabel + "</button></div>";
            popup += "</div>";
            
            $("#grid-main").append(popup);
            
            $("#info-ok").click(function (e) {
                popUpManager.closePopup(id);
            });
            
            $("body").css("overflow", "hidden");
            $("#" + id).wrap("<div class='popup-overlay level-bg-colour' style='display:none'></div>");
            $(".popup-overlay").fadeIn(200, function () {
                popUpManager.onResize();
                $("#" + id).fadeIn(150, popUpManager.onResize);
            });
        },
        
        closePopup: function (id, keep) {
            $("#" + id).data("fading", true);
            $("#" + id + " button").toggle(false);
            $("body").css("overflow", "initial");
            
            var popupManager = this;
            $("#" + id).fadeOut(200, function () {
                $(".popup-overlay").fadeOut(200, function () {
                    $("#" + id).unwrap();
                    if (!keep) {
                        $("#" + id).remove();
                    } else {
                        $("#" + id).data("fading", false);
                    }
                    
                    popupManager.showQueuedPopup();
                });
            });
        },
        
        closeAllPopups: function () {
            this.popupQueue = [];
            var popupManager = this;
            $.each($(".popup:visible"), function () {
                popupManager.closePopup($(this).attr("id"), true);
            });
        },
        
        showQueuedPopup: function () {
            if (this.popupQueue.length > 0) {
                var queued = this.popupQueue.pop();
                this.showPopup(queued.id, queued.title, queued.msg, queued.okButtonLabel, queued.showCancel );
            }
        },
        
        hasOpenPopup: function () {
            return $(".popup:visible").length > 0;
        },
        
    });

    return UIPopupManager;
});
