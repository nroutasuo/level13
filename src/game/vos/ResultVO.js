// Result of a player action such as scavenge or fight: rewards (res, items, ..) and penalties (injuries, lost followers, ..)
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
    
    var ResultVO = Ash.Class.extend({
		
		// rewards
		gainedResources: null,
		gainedItems: [],
		gainedFollowers: [],
		gainedBlueprint: null,
		gainedEvidence: 0,
		gainedReputation: 0,
		gainedRumours: 0,
		gainedPopulation: 0,
		
		// penalties
		lostResources: null,
		lostItems: [],
		gainedInjuries: [],
	
        constructor: function () {
			this.gainedResources = new ResourcesVO();
			this.lostResources = new ResourcesVO();
		},
        
    });

    return ResultVO;
});
