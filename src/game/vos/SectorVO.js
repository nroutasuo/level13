define(['ash', 'game/vos/ResourcesVO', 'game/vos/EnvironmentalHazardsVO'], function (Ash, ResourcesVO, EnvironmentalHazardsVO) {

    var SectorVO = Ash.Class.extend({
	
		position: null,
        movementBlockers: {},
	
        constructor: function (position, isCampableLevel, notCampableReason, requiredResources) {
			this.position = position;
            this.campableLevel = isCampableLevel;
            this.notCampableReason = notCampableReason;
            this.criticalPaths = [];
            this.requiredResources = requiredResources ? requiredResources : new ResourcesVO();
            
            this.id = Math.floor(Math.random() * 100000);
            this.camp = false;
            this.locales = [];
			this.movementBlockers = {};
			this.passageUp = 0;
			this.passageDown = 0;
            this.sunlit = false;
            this.hazards = new EnvironmentalHazardsVO();
            this.hasSpring = false;
            this.resourcesRequired = new ResourcesVO();
            this.resourcesScavengable = new ResourcesVO();
            this.resourcesCollectable = new ResourcesVO();
        },
        
        addToCriticalPath: function (type) {
            if (this.criticalPaths.indexOf(type) >= 0) return;
            this.criticalPaths.push(type);
        },
		
		addBlocker: function (direction, blockerType) {
			this.movementBlockers[direction] = blockerType;
		},
		
		getBlockerByDirection: function (direction) {
			return this.movementBlockers[direction];
		},
		
		hasBlockerOfType: function (blockerType) {
			for (var blockedDirection in this.movementBlockers) {
				if (this.movementBlockers[blockedDirection] === blockerType) return true;
			}
			return false;
		},
		
    });

    return SectorVO;
});
