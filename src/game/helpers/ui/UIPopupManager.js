// Manages showing and hiding pop-ups
define(['ash'],
function (Ash) {
    var UIPopupManager = Ash.Class.extend({
        
        popupQueue: null,
        
        constructor: function () {       
            $( window ).resize(this.onResize);
            this.popupQueue = [];
        },
        
        onResize: function() {
            $.each($(".popup"), function() {
                $(this).css("top", ( $(window).height() - $(this).height() ) / 2);
                $(this).css("left", ( $(window).width() - $(this).width() ) / 2);
            });
        },
        
        showPopup: function(id, title, msg, okButtonLabel, showCancel) {
            if (this.hasOpenPopup()) {
                this.popupQueue.push({id: id, title: title, msg: msg, okButtonLabel: okButtonLabel, showCancel: showCancel });
                return;
            }
            
            var popUpManager = this;
            var popup = "<div class='popup fill-on-mobiles' id='" + id + "' style='display:none;'>";
            popup += "<h3>" + title + "</h3><p>" + msg + "</p>";
            popup += "<div class='buttonbox'>";
            if (showCancel) {
                popup += "<button id='confirmation-cancel'>Cancel</button>";
            }
            popup += "<button id='info-ok' class='action'>" + okButtonLabel + "</button></div>";
            popup += "</div>";
            
            $("#grid-main").append(popup);            
            
            $("#info-ok").click( function(e) {
                popUpManager.closePopup(id);
            });
            
            $("body").css("overflow", "hidden");
            $("#" + id).wrap("<div class='popup-overlay level-bg-colour' style='display:none'></div>");
            $(".popup-overlay").fadeIn(200, function() {
                popUpManager.onResize();
                $("#" + id).fadeIn(150, popUpManager.onResize);                    
            });
        },
        
        closePopup: function(id, keep) {
            $("#" + id).data("fading", true);
            $("#" + id + " button").toggle(false);
            $("body").css("overflow", "initial");
            
            var popupManager = this;
            $("#" + id).fadeOut(200, function () {
                $(".popup-overlay").fadeOut(200, function() {
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
        
        showQueuedPopup: function() {
            if (this.popupQueue.length > 0) {
                var queued = this.popupQueue.pop();
                this.showPopup(queued.id, queued.title, queued.msg, queued.okButtonLabel, queued.showCancel );
            }
        },
        
        hasOpenPopup: function() {
            return $(".popup:visible").length > 0;  
        },
        
    });

    return UIPopupManager;
});
