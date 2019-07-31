// Singleton with helper methods for movement, blockers etc
define([
    'ash',
    'game/constants/LocaleConstants',
    'game/constants/MovementConstants',
    'game/constants/PositionConstants',
    'game/nodes/player/ItemsNode',
    'game/components/common/PositionComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
], function (Ash, LocaleConstants, MovementConstants, PositionConstants, ItemsNode, PositionComponent, PassagesComponent, SectorControlComponent, SectorStatusComponent, SectorImprovementsComponent) {
    
    var MovementHelper = Ash.Class.extend({
        
		engine: null,
		itemsNodes: null,
		
		constructor: function (engine) {
			this.engine = engine;
			this.itemsNodes = engine.getNodeList(ItemsNode);
		},
		
		getBlocker: function (sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			return passagesComponent.getBlocker(direction);
		},
		
		isBlocked: function (sectorEntity, direction) {
			return this.isBlockedCheck(sectorEntity, direction).value;
		},
		
		getBlockedReason: function (sectorEntity, direction) {
			return this.isBlockedCheck(sectorEntity, direction).reason;
		},
		
		isBlockedCheck: function (sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			
			var reason = "";
			var blocked = true;
			
			if (PositionConstants.isLevelDirection(direction)) {
				var isBridged = this.isBridged(sectorEntity, direction);
				var isDefeated = this.isDefeated(sectorEntity, direction);
				var isCleaned = this.isCleaned(sectorEntity, direction);
                var isCleared = this.isCleared(sectorEntity, direction);
				var blocker = passagesComponent.getBlocker(direction);
				
                if (blocker !== null) {
                    switch (blocker.type) {
        				case MovementConstants.BLOCKER_TYPE_GAP:
				            return { value: !isBridged, reason: "Bridge needed." };
        				case MovementConstants.BLOCKER_TYPE_WASTE:
				            return { value: !isCleaned, reason: "Blocked by toxic waste." };
        				case MovementConstants.BLOCKER_TYPE_GANG:
				            return { value: !isDefeated, reason: "Blocked by a fight." };
                        case MovementConstants.BLOCKER_TYPE_DEBRIS:
				            return { value: !isCleared, reason: "Blocked by debris." };
                        default:
                            log.w(this, "Unknown blocker type: " + blocker.type);
                            return { value: false };
                    }
                } else {
                    return { value: false };
                }
			}
			
			if (direction === PositionConstants.DIRECTION_UP || direction === PositionConstants.DIRECTION_DOWN) {
				blocked = true;
				var passage = null;
				if (direction === PositionConstants.DIRECTION_UP) passage = passagesComponent.passageUp;
				if (direction === PositionConstants.DIRECTION_DOWN) passage = passagesComponent.passageDown;
				
				if (!passage) {
					blocked = true;
					reason = "No passage.";
				} else {
					blocked = false;
				}
			}
			
			return { value: blocked, reason: reason };
		},
		
		isBridged: function (sectorEntity, direction) {
			var improvementsComponent = sectorEntity.get(SectorImprovementsComponent);
			return this.hasBridgeableBlocker(sectorEntity, direction) && improvementsComponent.getCount(improvementNames.bridge) > 0;
		},
		
		isDefeated: function (sectorEntity, direction) {
			var controlComponent = sectorEntity.get(SectorControlComponent);
			var localeId = LocaleConstants.getPassageLocaleId(direction);
			return this.hasDefeatableBlocker(sectorEntity, direction) && controlComponent.hasControlOfLocale(localeId);
		},
        
        isCleaned: function (sectorEntity, direction) {
            var statusComponent = sectorEntity.get(SectorStatusComponent);
            return this.hasClearableBlocker(sectorEntity, direction) && statusComponent.isCleared(direction, MovementConstants.BLOCKER_TYPE_WASTE);
        },
        
        isCleared: function (sectorEntity, direction) {
            var statusComponent = sectorEntity.get(SectorStatusComponent);
            return this.hasClearableBlocker(sectorEntity, direction) && statusComponent.isCleared(direction, MovementConstants.BLOCKER_TYPE_DEBRIS);
        },
		
		hasBridgeableBlocker: function (sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			return passagesComponent.isBridgeable(direction);
		},
		
		hasDefeatableBlocker: function (sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			return passagesComponent.isDefeatable(direction);
		},
		
		hasClearableBlocker: function (sectorEntity, direction) {
			var passagesComponent = sectorEntity.get(PassagesComponent);
			return passagesComponent.isClearable(direction);
		},
    });
    
    return MovementHelper;
});
