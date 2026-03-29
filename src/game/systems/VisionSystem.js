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

		constructor: function () { },

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
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.isHidden) return;	
			if (!this.locationNodes.head) return;

			for (let node = this.visionNodes.head; node; node = node.next) {
				this.updateNode(node, time);
			}
		},

		updateNode: function (node, time) {
			this.updateLightLevel(node, time);
			this.updateVision(node, time);
		},

		updateLightLevel: function (node, time) {
			let vision = node.vision;
			let isAwake = vision.isAwake;

			let featuresComponent = this.locationNodes.head.entity.get(SectorFeaturesComponent);
			let currentLightLevel = featuresComponent.sunlit;

			if (!isAwake) currentLightLevel = PlayerStatConstants.NOT_AWAKE_LIGHT_COMFORT_LEVEL;
			if (GameGlobals.gameState.isLaunchStarted) currentLightLevel = 0;

			let oldValue = vision.comfortableLightLevel;

			if (oldValue === currentLightLevel) return;

			oldValue = oldValue || 0;

			let newValue = 0;
			let lightAdaptationSpeedFactor = 1/15;
			let diff = currentLightLevel - oldValue;

			if (isAwake) {
				let changePerSec = lightAdaptationSpeedFactor * GameConstants.gameSpeedExploration;
				if (diff < 0) changePerSec *= -1;
				newValue = oldValue + changePerSec * time;
				if (Math.abs(diff) < 0.01) newValue = currentLightLevel;
			} else { 
				newValue = PlayerStatConstants.NOT_AWAKE_LIGHT_COMFORT_LEVEL;
			}

			vision.comfortableLightLevel = newValue;
		},

		updateVision: function (node, time) {
			let vision = node.vision;
			if (!vision.value || isNaN(vision.value)) vision.value = 0;

			let oldValue = vision.value;
			let oldMaximum = vision.maximum || 0;
			
			let featuresComponent = this.locationNodes.head.entity.get(SectorFeaturesComponent);
			let statusComponent = this.locationNodes.head.entity.get(SectorStatusComponent);
			let itemsComponent = node.items;
			let perksComponent = node.perks;
			let improvements = this.locationNodes.head.entity.get(SectorImprovementsComponent);
			let campComponent = this.locationNodes.head.entity.get(CampComponent);
			let inCamp = node.entity.get(PositionComponent).inCamp;
			let sunlit = featuresComponent.sunlit;
			let isAwake = vision.isAwake;

			if (inCamp && !isAwake) {
				node.vision.isAwake = true;
				return;
			}
			
			let shadeBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.shade);
			let lightBonus = itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.light);
			
			let maxValue = 0;
			let visionPerSec = 0;
			let accSpeedFactor = Math.max(100 - oldValue, 10) / 200;
			
			vision.accSources = [];
			let addAccumulation = function (sourceName, value) {
				var visionPerSecSource = Math.round(value * accSpeedFactor * 10) / 10 * GameConstants.gameSpeedExploration;
				visionPerSec += visionPerSecSource;
				vision.accSources.push({ source: sourceName, amount: visionPerSecSource });
			};

			vision.maxSources = [];
			let addMax = function (sourceName, value) {
				maxValue += value;
				vision.maxSources.push({ source: sourceName, amount: value });
			};
			
			// Check max value and accumulation
			let maxValueBaseDefault =  PlayerStatConstants.VISION_BASE;
			let maxValueBase = maxValueBaseDefault;
			if (featuresComponent.sunlit > 0) maxValueBase = PlayerStatConstants.VISION_BASE_DUSKY;
			if (featuresComponent.sunlit > 0.5) maxValueBase = PlayerStatConstants.VISION_BASE_SUNLIT;
			if (!isAwake) maxValueBase = 0;

			addMax("Environment", maxValueBase);

			if (isAwake) {
				addAccumulation("Environment", maxValueBase / maxValueBaseDefault);
			
				if (inCamp) {
					if (!sunlit) {
						if (improvements.getCount(improvementNames.campfire) > 0) {
							if (campComponent && campComponent.campFireStarted) {
								let value = Math.max(0, 70 - maxValue);
								addMax("Campfire", value);
								addAccumulation("Campfire", 70 / maxValueBase * 2);
							}
						}
						if (improvements.getCount(improvementNames.lights) > 0) {
							let value = Math.max(0, 100 - maxValue);
							addMax("Lights", value);
							addAccumulation("Lights", 100 / maxValueBase);
						}
					}
				}
				
				if (sunlit > 0.5) {
					if (shadeBonus + maxValueBase > maxValue) {
						addMax("Sunglasses", shadeBonus);
						addAccumulation("Sunglasses", shadeBonus / maxValueBase);
					}
				} else if (sunlit < 0.5) {
					// equipment
					let lightItem = itemsComponent.getEquipped(ItemConstants.itemTypes.light)[0];
					if (lightItem && lightBonus + maxValueBase > maxValue) {
						let itemName = ItemConstants.getItemDisplayName(lightItem);
						addMax(itemName, lightBonus);
						addAccumulation(itemName, lightBonus / maxValueBase);
					}
					// consumable items
					if (statusComponent.glowStickSeconds > 0) {
						// TODO remove hardcoded glowstick vision value
						let glowstickValue = 30;
						let value = (maxValueBase + glowstickValue) - maxValue;
						addMax("Glowstick", value);
						addAccumulation("Glowstick", glowstickValue / maxValueBase);
						statusComponent.glowStickSeconds -= time * GameConstants.gameSpeedExploration;
					}
					// perks
					var perkBonus = perksComponent.getTotalEffect(PerkConstants.perkTypes.light);
					if (perkBonus > 0) {
						addMax("Beacon", perkBonus);
						addAccumulation("Beacon" , perkBonus);
					}
				}
			}
			
			if (GameGlobals.gameState.isLaunchStarted) {
				vision.accSources = [];
				visionPerSec = -maxValue/5;
			}
			
			// Set final values
			vision.value += time * visionPerSec;
			vision.accumulation = visionPerSec;
			vision.maximum = maxValue;
			
			// Effects of moving from different light environments
			let comfortableLightLevel = vision.comfortableLightLevel;
			let currentLightLevel = featuresComponent.sunlit;
			let comfortableLightLevelDiff = currentLightLevel - comfortableLightLevel;
			if (isAwake && Math.abs(comfortableLightLevelDiff) > 0.75) {
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
