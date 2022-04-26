// Singleton with helper methods for movement, blockers etc
define([
	'ash',
	'game/GameGlobals',
	'game/constants/LocaleConstants',
	'game/constants/MovementConstants',
	'game/constants/PositionConstants',
	'game/nodes/player/ItemsNode',
	'game/components/common/PositionComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/type/GangComponent',
], function (Ash, GameGlobals, LocaleConstants, MovementConstants, PositionConstants, ItemsNode, PositionComponent, PassagesComponent, SectorControlComponent, SectorStatusComponent, SectorImprovementsComponent, GangComponent) {
	
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
						case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC:
							return { value: !isCleaned, reason: "Blocked by toxic waste." };
						case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE:
							return { value: !isCleaned, reason: "Blocked by radioactive waste." };
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
		
		isDefeated: function (sectorEntity, direction) {
			var position = sectorEntity.get(PositionComponent).getPosition();
			var gangEntity = GameGlobals.levelHelper.getGang(position, direction);
			if (!gangEntity) return true;
			var gangComponent = gangEntity.get(GangComponent);
			return this.hasDefeatableBlocker(sectorEntity, direction) && gangComponent.isDefeated();
		},
		
		isPassageTypeAvailable: function (sector, direction) {
			let passagesComponent = sector.get(PassagesComponent);
			let passage = direction == PositionConstants.DIRECTION_UP ? passagesComponent.passageUp : passagesComponent.passageDown;
			if (passage == null) return false;
			
			let passageType = passage.type;
			let action = this.getBuildActionForPassageType(passageType);
			if (action == null) return false;
			
			let reqs = GameGlobals.playerActionsHelper.getReqs(action, sector);
			let upgrades = reqs.upgrades;
			if (!upgrades) return true;
			
			for (var upgradeID in upgrades) {
				if (!GameGlobals.tribeHelper.hasUpgrade(upgradeID)) {
					return false;
				}
			}
			
			return true;
		},
		
		isCleaned: function (sectorEntity, direction) {
			var statusComponent = sectorEntity.get(SectorStatusComponent);
			var isCleared =
				statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_WASTE_TOXIC) ||
				statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);
			return this.hasClearableBlocker(sectorEntity, direction) && isCleared;
		},
		
		isCleared: function (sectorEntity, direction) {
			var statusComponent = sectorEntity.get(SectorStatusComponent);
			return this.hasClearableBlocker(sectorEntity, direction) && statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_DEBRIS);
		},
		
		isBridged: function (sectorEntity, direction) {
			var statusComponent = sectorEntity.get(SectorStatusComponent);
			return this.hasClearableBlocker(sectorEntity, direction) && statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_GAP);
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
		
		getBuildActionForPassageType: function (passageType) {
			switch (passageType) {
				case MovementConstants.PASSAGE_TYPE_HOLE:
					return "build_out_passage_down_hole";
				case MovementConstants.PASSAGE_TYPE_ELEVATOR:
					return "build_out_passage_down_elevator";
				case MovementConstants.PASSAGE_TYPE_STAIRWELL:
					return "build_out_passage_down_stairs";
			}
			return null;
		}
	});
	
	return MovementHelper;
});
