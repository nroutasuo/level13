define([
    'ash',
    'game/constants/UIConstants',
    'game/constants/ItemConstants',
    'game/constants/BagConstants',
    'game/nodes/PlayerPositionNode',
    'game/nodes/PlayerLocationNode',
    'game/components/player/BagComponent',
    'game/components/player/ItemsComponent',
], function (
    Ash, UIConstants, ItemConstants, BagConstants,
    PlayerPositionNode, PlayerLocationNode,
    BagComponent, ItemsComponent
) {
    var UIOutEmbarkSystem = Ash.System.extend({
	
		uiFunctions : null,
		gameState : null,
		resourcesHelper: null,
        levelHelper: null,
		
		engine: null,
		
		playerPosNodes: null,
		playerLocationNodes: null,
		
		tabChangedSignal: null,
	
		constructor: function (uiFunctions, tabChangedSignal, gameState, resourceHelper) {
			this.uiFunctions = uiFunctions;
			this.gameState = gameState;
			this.resourcesHelper = resourceHelper;
			this.tabChangedSignal = tabChangedSignal;
			return this;
		},
	
		addToEngine: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			
			this.initListeners();
			
			this.engine  = engine;
		},

		removeFromEngine: function (engine) {
			this.playerPosNodes = null;
			this.playerLocationNodes = null;
			this.engine = null;
		},
	
		initListeners: function () {
			var sys = this;
            this.tabChangedSignal.add(function () {
                sys.regenrateEmbarkItems();
            });
		},
		
		initLeaveCampRes: function () {
			if (this.gameState.uiStatus.leaveCampRes) {
				var campResources = this.resourcesHelper.getCurrentStorage();
				for (var key in resourceNames) {
					var name = resourceNames[key];
					var oldVal = this.gameState.uiStatus.leaveCampRes[name];
					var campVal = campResources.resources.getResource(name);
					if (oldVal && oldVal > 0) {
						var value = Math.floor(Math.min(oldVal, campVal));
						$("#stepper-embark-" + name + " input").val(value);
					}
				}
			}
		},
        
        initLeaveCampItems: function () {
			if (this.gameState.uiStatus.leaveCampItems) {
                var itemsComponent = this.playerPosNodes.head.entity.get(ItemsComponent);
				for (var key in this.gameState.uiStatus.leaveCampItems) {
					var itemID = key;
					var oldVal = this.gameState.uiStatus.leaveCampItems[itemID];
					var ownedCount = itemsComponent.getCountById(itemID, true);
					if (oldVal && oldVal > 0) {
						var value = Math.floor(Math.min(oldVal, ownedCount));
						$("#stepper-embark-" + itemID + " input").val(value);
					}
				}
			}
        },
		
		update: function (time) {
			if (this.gameState.uiStatus.currentTab !== this.uiFunctions.elementIDs.tabs.out) {
				this.refreshedEmbark = false;
				return;
			}
			
			var posComponent = this.playerPosNodes.head.position;
            
            if (!this.playerLocationNodes.head) {
                return;
            }
			
            // TODO create nice transitions for leaving camp
			$("#container-tab-enter-out").toggle(posComponent.inCamp);
			$("#container-tab-two-out").toggle(!posComponent.inCamp);
			$("#container-tab-two-out-actions").toggle(!posComponent.inCamp);
			
			if (posComponent.inCamp) {
				if (!this.refreshedEmbark) {
					this.initLeaveCampRes();
                    this.initLeaveCampItems();
				}
				this.updateEmbarkPage();
				this.refreshedEmbark = true;
			}
		},
		
		updateEmbarkPage: function () {
			$("#tab-header h2").text("Leave camp");
            
			var campResources = this.resourcesHelper.getCurrentStorage();
            var bagComponent = this.playerPosNodes.head.entity.get(BagComponent);
            var selectedCapacity = 0;
			var selectedAmount;
            
			// Resource steppers
			$.each($("#embark-resources tr"), function () {
				var resourceName = $(this).attr("id").split("-")[2];
				var campVal = campResources.resources.getResource(resourceName);
				var visible = campVal > 0;
				var inputMax = Math.min(Math.floor(campVal));
				$(this).toggle(visible);
				$(this).children("td").children(".stepper").children("input").attr("max", inputMax);
                selectedAmount = Math.max(0, $(this).children("td").children(".stepper").children("input").val());
                selectedCapacity += selectedAmount * BagConstants.getResourceCapacity(resourceName);
			});
            
            // Items steppers
            var itemsComponent = this.playerPosNodes.head.entity.get(ItemsComponent);
            var visibleItemTRs = 0;
			$.each($("#embark-items tr"), function () {
				var itemID = $(this).attr("id").split("-")[2];
                var count = itemsComponent.getCountById(itemID, true);
				var visible = count > 0;
                if (visible) visibleItemTRs++;
				var inputMax = Math.min(Math.floor(count));
                var inputMin = 0;
                var inputValue = $(this).children("td").children(".stepper").children("input").attr("value");
				$(this).toggle(visible);
				$(this).children("td").children(".stepper").children("input").attr("max", inputMax);
				$(this).children("td").children(".stepper").children("input").attr("min", inputMin);
				$(this).children("td").children(".stepper").children("input").attr("value", Math.max(inputValue, inputMin));
                selectedAmount = Math.max(0, $(this).children("td").children(".stepper").children("input").val());
                selectedCapacity += selectedAmount * BagConstants.getItemCapacity(itemsComponent.getItem(itemID));
			});
			
            $("#embark-items-container").toggle(visibleItemTRs > 0);
            
            bagComponent.selectedCapacity = selectedCapacity;
			$("#embark-bag .value").text(UIConstants.roundValue(bagComponent.selectedCapacity));
			$("#embark-bag .value-total").text(bagComponent.totalCapacity);
		},
        
        regenrateEmbarkItems: function () {
            $("#embark-items").empty();
            var itemsComponent = this.playerPosNodes.head.entity.get(ItemsComponent);
            var uniqueItems = itemsComponent.getUnique(true);
			uniqueItems = uniqueItems.sort(UIConstants.sortItemsByType);
            for (var i = 0; i < uniqueItems.length; i++) {
                var item = uniqueItems[i];
                var count = itemsComponent.getCountById(item.id, true);
                var showCount = item.equipped ? count - 1 : count;
                if (item.type === ItemConstants.itemTypes.uniqueEquipment) continue;
                if (item.type === ItemConstants.itemTypes.follower) continue;
                if (item.equipped && count === 1) continue;
                $("#embark-items").append(
                    "<tr id='embark-assign-" + item.id + "'>" +
                    "<td><img src='" + item.icon + "'/>" + item.name + "</td>" +
                    "<td><div class='stepper' id='stepper-embark-" + item.id + "'></div></td>" +
                    "<td class='list-amount'> / " + showCount + "</div></td>" +
                    "</tr>"
                );
            }
            this.uiFunctions.generateSteppers("#embark-items");
            this.uiFunctions.registerStepperListeners("#embark-items");
        },
		
    });

    return UIOutEmbarkSystem;
});
