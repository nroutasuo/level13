define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/LogConstants',
	'game/nodes/player/VisionNode',
	'game/nodes/PlayerLocationNode',
	'game/components/common/PositionComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent'
], function (
	Ash,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	ItemConstants,
	PerkConstants,
	PlayerStatConstants,
	LogConstants,
	VisionNode,
	PlayerLocationNode,
	PositionComponent,
	LogMessagesComponent,
	SectorImprovementsComponent,
	SectorFeaturesComponent,
	SectorStatusComponent
) {
	var VisionSystem = Ash.System.extend({
	
		gameState: null,
	
		visionNodes: null,
		locationNodes: null,
		
		wasSunlit: null,
		lastSignalValue: -1,

		constructor: function () {
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.visionNodes = engine.getNodeList(VisionNode);
			this.locationNodes = engine.getNodeList(PlayerLocationNode);
			
			GlobalSignals.add(this, GlobalSignals.playerMovedSignal, this.onPlayerMoved, GlobalSignals.PRIORITY_HIGH);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.visionNodes = null;
			this.locationNodes = null;
			this.engine = null;
		},

		update: function (time) {
			for (var node = this.visionNodes.head; node; node = node.next) {
				this.updateNode(node, time);
			}
		},

		updateNode: function (node, time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isHidden) return;
			
			var vision = node.vision;
			if (!vision.value || isNaN(vision.value)) vision.value = 0;
			var oldMaximum = vision.maximum;
			var oldValue = vision.value;
			
			if (!this.locationNodes.head) return;
			
			var featuresComponent = this.locationNodes.head.entity.get(SectorFeaturesComponent);
			var statusComponent = this.locationNodes.head.entity.get(SectorStatusComponent);
			var itemsComponent = node.items;
			var perksComponent = node.perks;
			var improvements = this.locationNodes.head.entity.get(SectorImprovementsComponent);
			var inCamp = node.entity.get(PositionComponent).inCamp;
			var sunlit = featuresComponent.sunlit;
			
			var maxValue = 0;
			var visionPerSec = 0;
			var accSpeedFactor = Math.max(100 - oldValue, 10) / 200;
			
			vision.accSources = [];
			var addAccumulation = function (sourceName, value) {
				var visionPerSecSource = Math.round(value * accSpeedFactor * 10) / 10 * GameConstants.gameSpeedExploration;
				visionPerSec += visionPerSecSource;
				vision.accSources.push({ source: sourceName, amount: visionPerSecSource });
			};
			
			// Check max value and accumulation
			var maxValueBase = sunlit ? PlayerStatConstants.VISION_BASE_SUNLIT : PlayerStatConstants.VISION_BASE;
			maxValue = maxValueBase;
			addAccumulation("Base", (sunlit ? 75 : 25) / maxValueBase);
			
			if (inCamp) {
				if (!sunlit) {
					if (improvements.getCount(improvementNames.campfire) > 0) {
						maxValue = Math.max(maxValue, 70);
						addAccumulation("Campfire", 70 / maxValueBase * 2);
					}
					if (improvements.getCount(improvementNames.lights) > 0) {
						maxValue = Math.max(maxValue, 100);
						addAccumulation("Lights", 100 / maxValueBase);
					}
				}
			}
			
			if (sunlit) {
				var shadeBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.shade);
				if (shadeBonus + maxValueBase > maxValue) {
					maxValue = shadeBonus + maxValueBase;
					addAccumulation("Sunglasses", shadeBonus / maxValueBase);
				}
			} else {
				// equipment
				var lightItem = itemsComponent.getEquipped(ItemConstants.itemTypes.light)[0];
				if (lightItem && lightItem.getCurrentBonus(ItemConstants.itemBonusTypes.light) + maxValueBase > maxValue) {
					maxValue = lightItem.getCurrentBonus(ItemConstants.itemBonusTypes.light) + maxValueBase;
					addAccumulation(lightItem.name, lightItem.getCurrentBonus(ItemConstants.itemBonusTypes.light) / maxValueBase);
				}
				// consumable items
				if (statusComponent.glowStickSeconds > 0) {
					// TODO remove hardcoded glowstick vision value
					maxValue = 30 + maxValueBase;
					addAccumulation("Glowstick", 30 / maxValueBase);
				}
				statusComponent.glowStickSeconds -= time * GameConstants.gameSpeedExploration;
				// pekrs
				var perkBonus = perksComponent.getTotalEffect(PerkConstants.perkTypes.light);
				if (perkBonus > 0) {
					maxValue += perkBonus;
					addAccumulation("Beacon" , perkBonus);
				}
			}
			
			if (GameGlobals.gameState.isLaunchStarted) {
				visionPerSec = 0;
				vision.accSources = [];
				visionPerSec = -maxValue/5;
			}
			
			// Set final values
			vision.value += time * visionPerSec;
			vision.accumulation = visionPerSec;
			vision.maximum = maxValue;
			
			// Effects of moving from different light environments
			var logComponent = node.entity.get(LogMessagesComponent);
			if (oldMaximum > 0 && this.wasSunlit !== null) {
				if (this.wasSunlit !== sunlit) {
					// switching between darkness and sunlight
					var isTotalReset = maxValue === maxValueBase;
					vision.value = isTotalReset ? 0 : maxValueBase;
					if (sunlit) {
						if (isTotalReset) {
							logComponent.addMessage(LogConstants.MSG_ID_VISION_RESET, "Blinded by sunlight.");
						} else {
							logComponent.addMessage(LogConstants.MSG_ID_VISION_RESET, "Engulfed by sunlight.");
						}
					} else {
						if (isTotalReset) {
							logComponent.addMessage(LogConstants.MSG_ID_VISION_RESET, "The darkness is like a wall.");
						} else {
							logComponent.addMessage(LogConstants.MSG_ID_VISION_RESET, "Back into the darkness.");
						}
					}
				} else if (oldMaximum > maxValue && oldValue - 10 > maxValue && maxValue === maxValueBase) {
					// being reset back to base value (losing equipment, not having equipment and leaving camp)
					vision.value = 0;
					if (sunlit) {
						logComponent.addMessage(LogConstants.MSG_ID_VISION_RESET, "Blinded by sunlight.");
					} else {
						logComponent.addMessage(LogConstants.MSG_ID_VISION_RESET, "The darkness is like a wall.");
					}
				}
			}
			this.wasSunlit = sunlit;
			
			// Limit to min / max
			if (vision.value > maxValue) {
				vision.value = maxValue;
			}
			if (vision.value < 0) {
				vision.value = 0;
			}
			
			// check unlocked features
			if (vision.value > maxValueBase) {
				if (!GameGlobals.gameState.unlockedFeatures.vision) {
					GameGlobals.gameState.unlockedFeatures.vision = true;
					GlobalSignals.featureUnlockedSignal.dispatch();
				}
			}
			
			// dispatch update
			if (Math.abs(vision.value - this.lastSignalValue) >= 1) {
				this.lastSignalValue = vision.value;
				GlobalSignals.visionChangedSignal.dispatch();
			}
		},
		
		onPlayerMoved: function () {
			this.update(0);
		}
	});

	return VisionSystem;
});
