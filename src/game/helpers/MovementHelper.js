// Singleton with helper methods for movement, blockers etc
define([
    'ash',
    'game/constants/ItemConstants',
    'game/nodes/player/ItemsNode',
    'game/components/sector/PassagesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, ItemConstants, ItemsNode, PassagesComponent, SectorControlComponent, SectorImprovementsComponent) {
    
    var MovementHelper = Ash.Class.extend({
        
		engine: null,
		itemsNodes: null,
		
		DIRECTION_LEFT: 0,
		DIRECTION_RIGHT: 1,
		DIRECTION_UP: 2,
		DIRECTION_DOWN: 3,
		
		constructor: function (engine) {
			this.engine = engine;
			this.itemsNodes = engine.getNodeList(ItemsNode);
		},
		
		isBlockedLeft: function (sectorEntity) {
			return this.isBlocked(sectorEntity, this.DIRECTION_LEFT).value;
		},
		
		isBlockedRight: function (sectorEntity) {
			return this.isBlocked(sectorEntity, this.DIRECTION_RIGHT).value;
		},
			
		isBlockedUp: function (sectorEntity) {
			return this.isBlocked(sectorEntity, this.DIRECTION_UP).value;
		},
		
		isBlockedDown: function (sectorEntity) {
			return this.isBlocked(sectorEntity, this.DIRECTION_DOWN).value;
		},
		
		getBlockedReasonLeft: function (sectorEntity) {
				return this.isBlocked(sectorEntity, this.DIRECTION_LEFT).reason;
		},
		
		getBlockedReasonRight: function (sectorEntity) {
				return this.isBlocked(sectorEntity, this.DIRECTION_RIGHT).reason;
		},
		
		getBlockedReasonUp: function (sectorEntity) {
			return this.isBlocked(sectorEntity, this.DIRECTION_UP).reason;
		},
		
		getBlockedReasonDown: function (sectorEntity) {
			return this.isBlocked(sectorEntity, this.DIRECTION_DOWN).reason;
		},
		
		isBlocked: function(sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			
			var reason = "";
			var blocked = true;
			
			if (direction == this.DIRECTION_RIGHT || direction == this.DIRECTION_LEFT) {
				var isBridged = this.isBridged(sectorEntity, direction);
				var isDefeated = this.isDefeated(sectorEntity, direction);
				var isCleaned = false;
				
				var blocker = null;
				if (direction == this.DIRECTION_RIGHT) blocker = passagesComponent.blockerRight;
				if (direction == this.DIRECTION_LEFT) blocker = passagesComponent.blockerLeft;
					
				var notBridged = blocker != null && blocker.bridgeable && !isBridged;
				var notDefeated = blocker != null && blocker.defeatable && !isDefeated;
				var notCleaned = blocker != null && blocker.cleanable && !isCleaned;
				
				blocked = blocker && (notBridged || notDefeated || notCleaned);
				if (notBridged) reason = "Bridge needed.";
				if (notDefeated) reason = "Blocked by a gang.";
				if (notCleaned) reason = "Blocked by toxic waste.";
				
				return { value: blocked, reason: reason };
			}
			
			if (direction == this.DIRECTION_UP || direction == this.DIRECTION_DOWN) {
			var items = this.itemsNodes.head.items.getEquipped(ItemConstants.itemTypes.movement);
			var isHook = false;
			var isAdvHook = false;
			var isFlying = false;
			
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (item.id == ItemConstants.itemDefinitions.movement[0].id) isFlying = true;
			}
			
			blocked = true;
			var passage = null;
			if (direction == this.DIRECTION_UP) passage = passagesComponent.passageUp;
			if (direction == this.DIRECTION_DOWN) passage = passagesComponent.passageDown;
			
			if (!passage) {
				blocked = true;
				reason = "No passage.";
			} else {
				blocked = false;
			}
			}
			
			return { value: blocked, reason: reason };
		},
		
		isBridged: function(sectorEntity, direction) {
			var improvementsComponent = sectorEntity.get(SectorImprovementsComponent); 
			return this.hasBridgeableBlocker(sectorEntity, direction) && improvementsComponent.getCount(improvementNames.bridge) > 0;
		},
		
		isDefeated: function(sectorEntity, direction) {
			var controlComponent = sectorEntity.get(SectorControlComponent); 
			return this.hasDefeatableBlocker(sectorEntity, direction) && controlComponent.hasControl();
		},
		
		hasBridgeableBlocker: function(sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			
			if (direction === this.DIRECTION_RIGHT) {
				return passagesComponent.isRightBridgeable();
			}
			
			if (direction === this.DIRECTION_LEFT) {
				return passagesComponent.isLeftBridgeable();
			}
			
			return false;
		},
		
		hasDefeatableBlocker: function (sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			
			if (direction === this.DIRECTION_RIGHT) {
				return passagesComponent.isRightDefeatable();
			}
			
			if (direction === this.DIRECTION_LEFT) {
				return passagesComponent.isLeftDefeatable();
			}
			
			return false;
		},
    });
    
    return MovementHelper;
});