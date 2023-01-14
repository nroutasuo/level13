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
		gainedRumours: 0,
		gainedFavour: 0,
		gainedReputation: 0,
		gainedPopulation: 0,
		
		// penalties
		lostResources: null,
		lostCurrency: null,
		lostItems: [],
		brokenItems: [],
		lostFollowers: [],
		lostPerks: [],
		gainedInjuries: [],
		
		// additional info for UI
		foundStashVO: null,
		gainedResourcesFromFollowers: null, // subset of gainedResources
		gainedItemsFromFollowers: [], // subset of gainedItems
		
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
			this.gainedRumours = 0;
			this.gainedFavour = 0;
			this.gainedReputation = 0;
			this.gainedPopulation = 0;
			
			this.lostResources = new ResourcesVO();
			this.lostCurrency = 0;
			this.lostItems = [];
			this.brokenItems = [];
			this.lostFollowers = [];
			this.lostPerks = [];
			this.gainedInjuries = [];
			
			this.selectedItems = [];
			this.selectedResources = new ResourcesVO();
			this.discardedItems = [];
			this.discardedResources = new ResourcesVO();
			
			this.gainedResourcesFromFollowers = new ResourcesVO();
		},
		
		hasSelectable: function () {
			return this.gainedResources.getTotal() > 0 || this.gainedItems.length > 0;
		},
		
		getUnselectedAndDiscardedItems: function () {
			let result = [];
			for (let i = 0; i < this.discardedItems.length; i++) {
				result.push(this.discardedItems[i]);
			}
			for (let i = 0; i < this.gainedItems.length; i++) {
				let item = this.gainedItems[i];
				if (this.selectedItems.indexOf(item) < 0) {
					result.push(item);
				}
			}
			return result;
		},
		
		isEmpty: function () {
			return this.gainedResources.getTotal() == 0
				&& this.gainedCurrency == 0
				&& this.lostResources.getTotal() == 0
				&& this.lostCurrency == 0
				&& this.gainedItems.length == 0
				&& this.gainedFollowers.length == 0
				&& this.lostItems.length == 0
				&& this.brokenItems.length == 0
				&& this.lostFollowers.length == 0
				&& this.lostPerks.length == 0
				&& this.gainedInjuries.length == 0
				&& this.gainedBlueprintPiece == null
				&& this.gainedPopulation == 0
				&& this.gainedEvidence == 0
				&& this.gainedRumours == 0
				&& this.gainedFavour == 0
				&& this.gainedReputation == 0;
		},
		
		clone: function () {
			let result = new ResultVO(this.action);
			result.gainedResources = this.gainedResources.clone();
			result.gainedCurrency = this.gainedCurrency;
			result.lostResources = this.lostResources.clone();
			result.lostCurrency = this.lostCurrency;
			result.gainedItems = this.gainedItems.concat();
			result.gainedFollowers = this.gainedFollowers.concat();
			result.lostItems = this.lostItems.concat();
			result.brokenItems = this.brokenItems.concat();
			result.lostFollowers = this.lostFollowers.concat();
			result.lostPerks = this.lostPerks.concat();
			result.gainedInjuries = this.gainedInjuries.concat();
			result.gainedBlueprintPiece = this.gainedBlueprintPiece;
			result.gainedPopulation = this.gainedPopulation;
			result.gainedEvidence = this.gainedEvidence;
			result.gainedRumours = this.gainedRumours;
			result.gainedFavour = this.gainedFavour;
			result.gainedReputation = this.gainedReputation;
			return result;
		},
		
	});

	return ResultVO;
});
