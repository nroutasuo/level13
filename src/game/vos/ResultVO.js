// Result of a player action such as scavenge or fight: rewards (res, items, ..) and penalties (injuries, lost followers, ..)
define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {
    
    var ResultVO = Ash.Class.extend({
        
        action: null,
		
		// rewards
		gainedResources: null,
        gainedCurrency: null,
		gainedItems: [],
		gainedFollowers: [],
		gainedBlueprintPiece: null,
		gainedEvidence: 0,
		gainedReputation: 0,
		gainedRumours: 0,
		gainedPopulation: 0,
		
		// penalties
		lostResources: null,
        lostCurrency: null,
		lostItems: [],
        lostFollowers: [],
		gainedInjuries: [],
        
        // inventory management selection
        // gained resources and items must be manually picked up; status saved here; this is the final change to the player bag
        selectedItems: [],
        selectedResources: null,
        discardedItems: [],
        discardedResources: null,
	
        constructor: function (action) {
            this.action = action;
            
			this.gainedResources = new ResourcesVO();
            this.gainedCurrency = 0;
            this.gainedItems = [];
            this.gainedFollowers = [];
            this.gainedBlueprintPiece = null;
            this.gainedEvidence = 0;
            this.gainedReputation = 0;
            this.gainedRumours = 0;
            this.gainedPopulation = 0;
            
			this.lostResources = new ResourcesVO();
            this.lostCurrency = 0;
            this.lostItems = [];
            this.lostFollowers = [];
            this.gainedInjuries = [];
            
            this.selectedItems = [];
            this.selectedResources = new ResourcesVO();
            this.discardedItems = [];
            this.discardedResources = new ResourcesVO();
		},
        
        hasSelectable: function () {
            return this.gainedResources.getTotal() > 0 || this.gainedItems.length > 0;
        },
        
        clone: function () {
            var result = new ResultVO(this.action);
            result.gainedResources = this.gainedResources.clone();
            result.gainedCurrency = this.gainedCurrency;
            result.lostResources = this.lostResources.clone();
            result.lostCurrency = this.lostCurrency;
            result.gainedItems = this.gainedItems.concat();
            result.gainedFollowers = this.gainedFollowers.concat();
            result.lostItems = this.lostItems.concat();
            result.lostFollowers = this.lostFollowers.concat();
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
