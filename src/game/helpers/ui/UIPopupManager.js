// Manages showing and hiding pop-ups
define(['ash', 'game/constants/UIConstants'],
function (Ash, UIConstants) {
    var UIPopupManager = Ash.Class.extend({
        
        popupQueue: null,
        
        constructor: function () {
            $(window).resize(this.onResize);
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
                popup += "<div class='infobox infobox-temporary'>";
                var gainedhtml = "<span class='listheader'>Gained:</span>";
                gainedhtml += "<ul class='resultlist'>";
                if (resultVO.gainedResources) {
                    gainedhtml += UIConstants.getResourceList(resultVO.gainedResources);
                }
                if (resultVO.gainedItems) {
                    gainedhtml += UIConstants.getItemList(resultVO.gainedItems);
                }
                if (resultVO.gainedEvidence) {
                    gainedhtml += "<li>" + resultVO.gainedEvidence + " evidence</li>";
                }
                gainedhtml += "</ul>";
                if (gainedhtml.indexOf("<li") > 0) popup += gainedhtml;
                
				var losthtml = "<span class='listheader'>Lost:</span>";
                losthtml += "<ul class='resultlist'>";
                if (resultVO.lostResources) {
                    losthtml += UIConstants.getResourceList(resultVO.lostResources);
                }
                if (resultVO.lostItems) {
                    losthtml += UIConstants.getItemList(resultVO.lostItems);
                }
                losthtml += "</ul>";
                if (losthtml.indexOf("<li") > 0) popup += losthtml;
                
                if (resultVO.gainedInjuries.length > 0) {
					losthtml += "<p class='warning'>You got injured.</p>";
                }
                
                popup += "</div>";
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
