// Result of a player action such as scavenge or fight: rewards (res, items, ..) and penalties (injuries, lost followers, ..)
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
    
    var ResultVO = Ash.Class.extend({
		
		// rewards
		gainedResources: null,
		gainedItems: [],
		gainedFollowers: [],
		gainedBlueprintPiece: null,
		gainedEvidence: 0,
		gainedReputation: 0,
		gainedRumours: 0,
		gainedPopulation: 0,
		
		// penalties
		lostResources: null,
		lostItems: [],
		gainedInjuries: [],
        
        // gained resources and items must be manually picked up; status saved here; this is the final change to the player bag
        selectedItems: [],
        selectedResources: null,
        discardedItems: [],
        discardedResources: null,
	
        constructor: function () {
			this.gainedResources = new ResourcesVO();
            this.gainedItems = [];
            this.gainedFollowers = [];
            this.gainedBlueprintPiece = null;
            this.gainedEvidence = 0;
            this.gainedReputation = 0;
            this.gainedRumours = 0;
            this.gainedPopulation = 0;
            
			this.lostResources = new ResourcesVO();
            this.lostItems = [];
            this.gainedInjuries = [];
            
            this.selectedItems = [];
            this.selectedResources = new ResourcesVO();
            this.discardedItems = [];
            this.discardedResources = new ResourcesVO();
		},
        
        clone: function () {
            var result = new ResultVO();
            result.gainedResources = this.gainedResources.clone();
            result.lostResources = this.lostResources.clone();
            result.gainedItems = this.gainedItems.concat();
            result.gainedFollowers = this.gainedFollowers.concat();
            result.lostItems = this.lostItems.concat();
            result.gainedInjuries = this.gainedInjuries.concat();
            result.gainedBlueprintPiece = this.gainedBlueprintPiece;
            result.gainedPopulation = this.gainedPopulation;
            result.gainedEvidence = this.gainedEvidence;
            result.gainedReputation = this.gainedReputation;
            result.gainedRumours = this.gainedRumours;
            return result;
        },
        
    });

    return ResultVO;
});
