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
		
		getBlocker: function (sector, direction) {
			let passagesComponent = sector.get(PassagesComponent);
			return passagesComponent.getBlocker(direction);
		},
		
		isBlocked: function (sector, direction) {
			return this.isBlockedCheck(sector, direction).value;
		},
		
		getBlockedReason: function (sector, direction) {
			return this.isBlockedCheck(sector, direction).reason;
		},
		
		isBlockedCheck: function (sector, direction) {
			let passagesComponent = sector.get(PassagesComponent);
			
			let reason = "";
			let blocked = true;
			
			if (PositionConstants.isLevelDirection(direction)) {
				let isBridged = this.isBridged(sector, direction);
				let isDefeated = this.isDefeated(sector, direction);
				let isCleaned = this.isCleaned(sector, direction);
				let isCleared = this.isCleared(sector, direction);
				let isDisabled = this.isDisabled(sector, direction);
				let blocker = passagesComponent.getBlocker(direction);
				
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
						case MovementConstants.BLOCKER_TYPE_EXPLOSIVES:
							return { value: !isCleared, reason: "Blocked by explosives." };
						case MovementConstants.BLOCKER_TYPE_TOLL_GATE:
							return { value: !isDisabled && !isCleared, reason: "Blocked by a toll gate." };
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
		
		isDefeated: function (sector, direction) {
			var position = sector.get(PositionComponent).getPosition();
			var gangEntity = GameGlobals.levelHelper.getGang(position, direction);
			if (!gangEntity) return true;
			var gangComponent = gangEntity.get(GangComponent);
			return this.hasDefeatableBlocker(sector, direction) && gangComponent.isDefeated();
		},
		
		isPassageTypeAvailable: function (sector, direction) {
			let passagesComponent = sector.get(PassagesComponent);
			let passage = direction == PositionConstants.DIRECTION_UP ? passagesComponent.passageUp : passagesComponent.passageDown;
			if (passage == null) return false;
			
			let passageType = passage.type;

			if (passageType == MovementConstants.PASSAGE_TYPE_PREBUILT) return true;

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
		
		isCleaned: function (sector, direction) {
			var statusComponent = sector.get(SectorStatusComponent);
			var isCleared =
				statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_WASTE_TOXIC) ||
				statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE);
			return this.hasClearableBlocker(sector, direction) && isCleared;
		},
		
		isCleared: function (sector, direction) {
			let statusComponent = sector.get(SectorStatusComponent);
			if (!this.hasClearableBlocker(sector, direction)) return false;
			if (statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_DEBRIS)) return true;
			if (statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_EXPLOSIVES)) return true;
			if (statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_TOLL_GATE)) return true;
			return false;
		},
		
		isBridged: function (sector, direction) {
			var statusComponent = sector.get(SectorStatusComponent);
			return this.hasClearableBlocker(sector, direction) && statusComponent.isBlockerCleared(direction, MovementConstants.BLOCKER_TYPE_GAP);
		},

		isDisabled: function (sector, direction) {
			let statusComponent = sector.get(SectorStatusComponent);
			return statusComponent.isBlockerDisabled(direction);
		},
		
		hasBridgeableBlocker: function (sector, direction) {
			if (!direction) return this.hasBridgeableBlocker(sector, this.hasClearableBlocker);
			let passagesComponent = sector.get(PassagesComponent);
			return passagesComponent.isBridgeable(direction);
		},
		
		hasDefeatableBlocker: function (sector, direction) {
			if (!direction) return this.hasDefeatableBlocker(sector, this.hasClearableBlocker);
			let passagesComponent = sector.get(PassagesComponent);
			return passagesComponent.isDefeatable(direction);
		},
		
		hasClearableBlocker: function (sector, direction) {
			if (!direction) return this.hasMatchingBlocker(sector, this.hasClearableBlocker);
			let passagesComponent = sector.get(PassagesComponent);
			return passagesComponent.isClearable(direction);
		},

		hasCorrodibleBlocker: function (sector, direction) {
			if (!direction) return this.hasMatchingBlocker(sector, this.hasCorrodibleBlocker);
			let passagesComponent = sector.get(PassagesComponent);
			let blocker = passagesComponent.getBlocker(direction);
			if (!blocker) return false;
			if (blocker.type != MovementConstants.BLOCKER_TYPE_TOLL_GATE) return false;
			
			let statusComponent = sector.get(SectorStatusComponent);
			if (statusComponent.isBlockerDisabled(direction, blocker.type)) return false;

			return true;
		},

		hasMatchingBlocker: function (sector, check) {
			for (let i in PositionConstants.getLevelDirections()) {
				let direction = PositionConstants.getLevelDirections()[i];
				if (check(sector, direction)) return true;
			}
			return false;
		},

		isProjectBlocker: function (blockerType) {
			switch (blockerType) {
				case MovementConstants.BLOCKER_TYPE_GAP: return true;
				case MovementConstants.BLOCKER_TYPE_DEBRIS: return true;
				case MovementConstants.BLOCKER_TYPE_EXPLOSIVES: return true;
				default: return false;
			}
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
