define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/nodes/player/ItemsNode',
    ], function (Ash, GameGlobals, GlobalSignals, UIConstants, ItemConstants, FightConstants, ItemsNode) {
var UIOutPopupInnSystem = Ash.System.extend({

		itemNodes: null,

        constructor: function () {
            return this;
        },

		addToEngine: function (engine) {
			this.itemNodes = engine.getNodeList(ItemsNode);
            GlobalSignals.add(this, GlobalSignals.popupOpenedSignal, this.onPopupOpened);
		},

		removeFromEngine: function (engine) {
            GlobalSignals.removeAll(this);
			this.itemNodes = null;
		},

        onPopupOpened: function (name) {
            if (name === "inn-popup") {
                this.initializePopup();
            }
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
            $("#inn-popup-current-desc").text("Current followers: " + numFollowers + " / " + FightConstants.getMaxFollowers(GameGlobals.gameState.numCamps));

            $("table#inn-popup-current-followers").empty();
            $("table#inn-popup-current-followers").append("<tr></tr>");
            for (var i = 0; i < currentFollowers.length; i++) {
                var item = currentFollowers[i];
                var td = "<td id='td-item-use_in_inn_select-" + currentFollowers[i].id + "'>";
                td += UIConstants.getItemDiv(this.itemNodes.head.items, item, false, UIConstants.getItemCallout(item, true), true);
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
			GameGlobals.uiFunctions.generateCallouts("#inn-popup-current-followers");
			GameGlobals.uiFunctions.generateButtonOverlays("#inn-popup-current-followers");
            GlobalSignals.elementCreatedSignal.dispatch();

            var sys = this;
            $("table#inn-popup-current-followers button").click(function (e) {
                var followerID = $(this).attr("followerID");
                sys.disbandFollower(followerID, sys);
            });
        },

        selectFollower: function (followerID) {
            var follower = ItemConstants.getFollowerByID(followerID);
            GameGlobals.playerActionsHelper.deductCosts("use_in_inn_select")
            GameGlobals.playerActionFunctions.addFollower(follower);
            GameGlobals.uiFunctions.popupManager.closePopup("inn-popup");
        },

        disbandFollower: function (followerID) {
            // TODO pass to player action functions & unify with UIOoutBagSystem
            var item = this.itemNodes.head.items.getItem(followerID, null, true);
            this.itemNodes.head.items.discardItem(item, false);
            this.itemNodes.head.items.selectedItem = null;
            this.refreshCurrent();
        },

    });
    return UIOutPopupInnSystem;
});
