define([
    'ash',
	'game/constants/GameConstants',
    'game/constants/ItemConstants',
    'game/nodes/player/VisionNode',
    'game/nodes/PlayerLocationNode',
    'game/components/common/PositionComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorStatusComponent',
], function (Ash, GameConstants, ItemConstants, VisionNode, PlayerLocationNode, PositionComponent, SectorImprovementsComponent, SectorFeaturesComponent, SectorStatusComponent) {
    var VisionSystem = Ash.System.extend({
	
        gameState: null,
    
        visionNodes: null,
        locationNodes: null,

        constructor: function (gameState) {
            this.gameState = gameState;
        },

        addToEngine: function (engine) {
            this.visionNodes = engine.getNodeList(VisionNode);
            this.locationNodes = engine.getNodeList(PlayerLocationNode);
        },

        removeFromEngine: function (engine) {
            this.visionNodes = null;
            this.locationNodes = null;
        },

        update: function (time) {
            for (var node = this.visionNodes.head; node; node = node.next) {
                this.updateNode(node, time);
            }
        },

        updateNode: function (node, time) {
            if (this.gameState.isPaused) return;
            
			var vision = node.vision;
			var oldMaximum = vision.maximum;
			var oldValue = vision.value;
			
			if (!this.locationNodes.head) return;
            
			var featuresComponent = this.locationNodes.head.entity.get(SectorFeaturesComponent);
            var statusComponent = this.locationNodes.head.entity.get(SectorStatusComponent);
			var itemsComponent = node.items;
			var improvements = this.locationNodes.head.entity.get(SectorImprovementsComponent);
			var inCamp = node.entity.get(PositionComponent).inCamp;
			var sunlit = featuresComponent.sunlit;
            
            var maxValue = 0;
            var visionPerSec = 0;
            var accSpeedFactor = Math.max(100 - oldValue, 10) / 200;
            
            vision.accSources = [];
            var addAccumulation = function (sourceName, value) {
                var visionPerSecSource = Math.round(value * accSpeedFactor * 10) / 10 * GameConstants.gameSpeed;
                visionPerSec += visionPerSecSource;
                vision.accSources.push({ source: sourceName, amount: visionPerSecSource });
            };
            
            // Check max value and accumulation
			var maxValueBase = 25;
			maxValue = maxValueBase;
            addAccumulation("Base", 25 / maxValueBase);
			
			if (inCamp) {
				if (!sunlit) {
					if (improvements.getCount(improvementNames.campfire) > 0) {
                        maxValue = Math.max(maxValue, 70);
                        addAccumulation("Campfire", 70 / maxValueBase);
                    }
					if (improvements.getCount(improvementNames.lights) > 0) {
                        maxValue = Math.max(maxValue, 100);
                        addAccumulation("Lights", 100 / maxValueBase);
                    }
				} else {
					if (improvements.getCount(improvementNames.ceiling) > 0) {
                        maxValue = Math.max(maxValue, 100);
                        addAccumulation("Ceiling", 100 / maxValueBase);
                    }
				}
			}
			
			if (sunlit) {
				var shadeItem = itemsComponent.getEquipped(ItemConstants.itemTypes.shades)[0];
				if (shadeItem && shadeItem.bonus + maxValueBase > maxValue) {
					maxValue = shadeItem.bonus + maxValueBase;
					addAccumulation(shadeItem.name, shadeItem.bonus / maxValueBase);
				}
			} else {
				var lightItem = itemsComponent.getEquipped(ItemConstants.itemTypes.light)[0];
				if (lightItem && lightItem.bonus + maxValueBase > maxValue) {
					maxValue = lightItem.bonus + maxValueBase;
					addAccumulation(lightItem.name, lightItem.bonus / maxValueBase);
				}
                if (statusComponent.glowStickSeconds > 0) {
                    // TODO remove hardcoded glowstick vision value
                    maxValue = 30 + maxValueBase;
                    addAccumulation("Glowstick", 30 / maxValueBase);
                }
                statusComponent.glowStickSeconds -= time * GameConstants.gameSpeed;
			}
			
			// Increase
			vision.value += time * visionPerSec;
			vision.accumulation = visionPerSec;
			vision.maximum = maxValue;
			
            // Effects of moving from different light environments
			if (oldMaximum > 0 && maxValue < oldMaximum) {
				vision.value = vision.value - (oldMaximum - maxValue);
			}
			if (oldMaximum > 0 && maxValue > oldMaximum && sunlit) {
				vision.value = vision.value - (oldMaximum - maxValue);
			}
			
            // Limit to min / max
			if (vision.value > maxValue) {
				vision.value = maxValue;
			}
			if (vision.value < 0) {
				vision.value = 0;
			}
        },
    });

    return VisionSystem;
});
