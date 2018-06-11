define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/nodes/player/ItemsNode',
    ], function (Ash, UIConstants, ItemConstants, FightConstants, ItemsNode) {
var UIOutPopupInnSystem = Ash.System.extend({

        uiFunctions: null,       

		itemNodes: null,
        
        constructor: function (uiFunctions, gameState) {
            this.uiFunctions = uiFunctions;
            this.gameState = gameState;
            return this;
        },

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
		},
		
		removeFromEngine: function (engine) {
			this.itemNodes = null;
		},
        
        update: function (time) {
            if (!($("#inn-popup").is(":visible")) || $("inn-popup").data("fading") == true) {
                this.wasVisible = false;
                return;
            }
            
            if (!this.wasVisible) {
                this.initializePopup();
            }
            
            this.wasVisible = true;
        },
        
        initializePopup: function () {            
            this.refreshCurrent();
            
            var sys = this;
            $("table#inn-popup-options-followers button").click(function (e) {
                var followerID = $(this).attr("followerID");
                sys.selectFollower(followerID);
            });
        },
        
        refreshCurrent: function () {
            var currentFollowers = this.itemNodes.head.items.getAllByType(ItemConstants.itemTypes.follower);
            var numFollowers = currentFollowers.length;
            $("#inn-popup-current-desc").text("Current followers: " + numFollowers + " / " + FightConstants.getMaxFollowers(this.gameState.numCamps));
            
            $("table#inn-popup-current-followers").empty();
            $("table#inn-popup-current-followers").append("<tr></tr>");
            for (var i = 0; i < currentFollowers.length; i++) {
                var td = "<td id='td-item-use_in_inn_select-" + currentFollowers[i].id + "'>";
                td += UIConstants.getItemDiv(currentFollowers[i], false);
                td += "</td>";
                $("table#inn-popup-current-followers tr").append(td);
            }
            $("table#inn-popup-current-followers").append("<tr></tr>");
            for (var j = 0; j < currentFollowers.length; j++) {
                var td = "<td>";
                td += "<button class='action btn-narrow' action='use_in_inn_disband_" + currentFollowers[j].id + "' followerID='" + currentFollowers[j].id + "'>Disband</button>";
                td += "</td>";
                $($("table#inn-popup-current-followers tr")[1]).append(td);
            }
			this.uiFunctions.generateCallouts("#inn-popup-current-followers");
			this.uiFunctions.generateButtonOverlays("#inn-popup-current-followers");
            GlobalSignals.elementCreatedSignal.dispatch();
            
            var sys = this;
            $("table#inn-popup-current-followers button").click(function (e) {
                var followerID = $(this).attr("followerID");
                sys.disbandFollower(followerID, sys);
            });
        },
        
        selectFollower: function (followerID) {
            var follower = ItemConstants.getFollowerByID(followerID);
            this.uiFunctions.playerActions.playerActionsHelper.deductCosts("use_in_inn_select")
            this.uiFunctions.playerActions.addFollower(follower);
            this.uiFunctions.popupManager.closePopup("inn-popup");
        },
        
        disbandFollower: function (followerID) {
            // TODO pass to player action functions & unify with UIOoutBagSystem
            var item = this.itemNodes.head.items.getItem(followerID);
            this.itemNodes.head.items.discardItem(item);
            this.itemNodes.head.items.selectedItem = null;
            this.refreshCurrent();
        },

    });
    return UIOutPopupInnSystem;
});