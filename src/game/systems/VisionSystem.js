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
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
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
	CampComponent,
	PositionComponent,
	SectorImprovementsComponent,
	SectorFeaturesComponent,
	SectorStatusComponent
) {
	let VisionSystem = Ash.System.extend({
	
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
			
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged, GlobalSignals.PRIORITY_HIGH);
			GlobalSignals.add(this, GlobalSignals.perksChangedSignal, this.onPerksChanged, GlobalSignals.PRIORITY_HIGH);
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
			let campComponent = this.locationNodes.head.entity.get(CampComponent);
			var inCamp = node.entity.get(PositionComponent).inCamp;
			var sunlit = featuresComponent.sunlit;
			let isAwake = vision.isAwake;

			if (inCamp && !isAwake) {
				node.vision.isAwake = true;
				return;
			}
			
			let maxValue = 0;
			let visionPerSec = 0;
			let accSpeedFactor = Math.max(100 - oldValue, 10) / 200;
			let shadeBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.shade);
			let lightBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.light);
			
			vision.accSources = [];
			var addAccumulation = function (sourceName, value) {
				var visionPerSecSource = Math.round(value * accSpeedFactor * 10) / 10 * GameConstants.gameSpeedExploration;
				visionPerSec += visionPerSecSource;
				vision.accSources.push({ source: sourceName, amount: visionPerSecSource });
			};
			
			// Check max value and accumulation
			let maxValueBaseDefault =  PlayerStatConstants.VISION_BASE;
			let maxValueBase = isAwake ? sunlit ? PlayerStatConstants.VISION_BASE_SUNLIT : PlayerStatConstants.VISION_BASE : 0;
			maxValue = maxValueBase;

			if (isAwake) {
				addAccumulation("Base", (sunlit ? 75 : 25) / maxValueBase);
			
				if (inCamp) {
					if (!sunlit) {
						if (improvements.getCount(improvementNames.campfire) > 0) {
							if (campComponent && campComponent.campFireStarted) {
								maxValue = Math.max(maxValue, 70);
								addAccumulation("Campfire", 70 / maxValueBase * 2);
							}
						}
						if (improvements.getCount(improvementNames.lights) > 0) {
							maxValue = Math.max(maxValue, 100);
							addAccumulation("Lights", 100 / maxValueBase);
						}
					}
				}
				
				if (sunlit) {
					if (shadeBonus + maxValueBase > maxValue) {
						maxValue += shadeBonus;
						addAccumulation("Sunglasses", shadeBonus / maxValueBase);
					}
				} else {
					// equipment
					let lightItem = itemsComponent.getEquipped(ItemConstants.itemTypes.light)[0];
					if (lightItem && lightBonus + maxValueBase > maxValue) {
						maxValue += lightBonus;
						let itemName = ItemConstants.getItemDisplayName(lightItem);
						addAccumulation(itemName, lightBonus / maxValueBase);
					}
					// consumable items
					if (statusComponent.glowStickSeconds > 0) {
						// TODO remove hardcoded glowstick vision value
						let glowstickValue = 30;
						maxValue = Math.max(maxValue, maxValueBase + glowstickValue);
						addAccumulation("Glowstick", glowstickValue / maxValueBase);
						statusComponent.glowStickSeconds -= time * GameConstants.gameSpeedExploration;
					}
					// pekrs
					var perkBonus = perksComponent.getTotalEffect(PerkConstants.perkTypes.light);
					if (perkBonus > 0) {
						maxValue += perkBonus;
						addAccumulation("Beacon" , perkBonus);
					}
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
			if (oldMaximum > 0 && this.wasSunlit !== null) {
				if (this.wasSunlit !== sunlit) {
					// switching between darkness and sunlight
					let isTotalReset = maxValue === maxValueBase;
					let maxValueExtra = maxValue - maxValueBaseDefault;
					let newValue = isTotalReset ? 0 : (maxValueBaseDefault + maxValueExtra / 2);
					vision.value = newValue;
					if (!inCamp) {
						if (sunlit) {
							if (isTotalReset) {
								GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_VISION_RESET, "Blinded by sunlight.");
							} else {
								GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_VISION_RESET, "Engulfed by sunlight.");
							}
						} else {
							if (isTotalReset) {
								GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_VISION_RESET, "The darkness is like a wall.");
							} else {
								GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_VISION_RESET, "Back into the darkness.");
							}
						}
					}
				} else if (oldMaximum > maxValue && oldValue - 10 > maxValue && maxValue === maxValueBase) {
					// being reset back to base value (losing equipment, not having equipment and leaving camp)
					vision.value = 0;
					if (!inCamp) {
						if (sunlit) {
							GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_VISION_RESET, "Blinded by sunlight.");
						} else {
							GameGlobals.playerHelper.addLogMessage(LogConstants.MSG_ID_VISION_RESET, "The darkness is like a wall.");
						}
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
				GameGlobals.playerActionFunctions.unlockFeature("vision");
			}
			
			// dispatch update
			if (Math.abs(vision.value - this.lastSignalValue) >= 1) {
				this.lastSignalValue = vision.value;
				GlobalSignals.visionChangedSignal.dispatch();
			}
		},
		
		onPerksChanged: function () {
			this.update(0);
		},
		
		onPlayerPositionChanged: function () {
			this.update(0);
		}
	});

	return VisionSystem;
});
