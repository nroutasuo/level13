// Result of a player action such as scavenge or fight: rewards (res, items, ..) and penalties (injuries, lost explorers, ..)
define(['ash', 'game/constants/PerkConstants', 'game/vos/ResourcesVO'], function (Ash, PerkConstants, ResourcesVO) {
	
	var ResultVO = Ash.Class.extend({
		
		action: null,
		
		// rewards
		gainedResources: null,
		gainedCurrency: null,
		gainedItems: [],
		gainedExplorers: [],
		gainedBlueprintPiece: null,
		gainedEvidence: 0,
		gainedRumours: 0,
		gainedHope: 0,
		gainedInsight: 0,
		gainedReputation: 0,
		gainedPopulation: 0,
		gainedItemUpgrades: [],
		lostExplorerInjuries: [], // explorerID
		
		// penalties
		lostResources: null,
		lostCurrency: null,
		lostItems: [],
		brokenItems: [],
		lostExplorers: [],
		gainedExplorerInjuries: [], // explorerID

		// perks (can be positive or negative)
		lostPerks: [],
		gainedPerks: [],

		// neutral results
		storyFlags: {}, // flagID -> new value
		removeCharacter: false,
		replaceDialogue: false,
		startQuest: null,
		endQuest: null,
		
		// additional info for UI
		foundStashVO: null,
		gainedResourcesFromExplorers: null, // subset of gainedResources
		gainedItemsFromExplorers: [], // subset of gainedItems
		
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
			this.gainedExplorers = [];
			this.gainedBlueprintPiece = null;
			this.gainedEvidence = 0;
			this.gainedRumours = 0;
			this.gainedHope = 0;
			this.gainedInsight = 0;
			this.gainedReputation = 0;
			this.gainedPopulation = 0;
			this.gainedItemUpgrades = [];
			
			this.lostResources = new ResourcesVO();
			this.lostCurrency = 0;
			this.lostItems = [];
			this.brokenItems = [];
			this.lostExplorers = [];
			this.lostPerks = [];
			this.gainedPerks = [];

			this.storyFlags = {};
			this.removeCharacter = false;
			this.replaceDialogue = false;
			this.startQuest = null;
			this.endQuest = null;
			
			this.selectedItems = [];
			this.selectedResources = new ResourcesVO();
			this.discardedItems = [];
			this.discardedResources = new ResourcesVO();
			
			this.gainedResourcesFromExplorers = new ResourcesVO();
			this.gainedItemsFromExplorers = [];
		},
		
		hasSelectable: function () {
			return this.gainedResources.getTotal() > 0 || this.gainedItems.length > 0;
		},

		getGainedInjuries: function () {
			return this.gainedPerks.filter(perk => perk.type == PerkConstants.perkTypes.injury);
		},

		getGainedCurses: function () {
			return this.gainedPerks.filter(perk => perk.id == PerkConstants.perkIds.cursed);
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
			return this.isVisuallyEmpty()
				&& Object.keys(this.storyFlags).length == 0
				&& this.startQuest == null
				&& this.endQuest == null;
		},
		
		isVisuallyEmpty: function () {
			return this.gainedResources.getTotal() == 0
				&& this.gainedCurrency == 0
				&& this.lostResources.getTotal() == 0
				&& this.lostCurrency == 0
				&& this.gainedItems.length == 0
				&& this.gainedExplorers.length == 0
				&& this.lostItems.length == 0
				&& this.brokenItems.length == 0
				&& this.lostExplorers.length == 0
				&& this.lostPerks.length == 0
				&& this.gainedPerks.length == 0
				&& this.gainedExplorerInjuries.length == 0
				&& this.lostExplorerInjuries.length == 0
				&& this.gainedBlueprintPiece == null
				&& this.gainedPopulation == 0
				&& this.gainedEvidence == 0
				&& this.gainedRumours == 0
				&& this.gainedHope == 0
				&& this.gainedInsight == 0
				&& this.gainedReputation == 0
				&& this.gainedItemUpgrades.length == 0
				&& this.discardedItems.length == 0
				&& this.discardedResources.getTotal() == 0;
		},

		isSomethingUseful: function () {
			return this.gainedResources.getTotal() > 0
				|| this.gainedItems.length > 0
				|| this.gainedCurrency > 0
				|| this.gainedExplorers.length > 0
				|| this.lostExplorerInjuries.length > 0
				|| this.gainedBlueprintPiece
				|| this.gainedEvidence > 0
				|| this.gainedRumours > 0
				|| this.gainedHope > 0
				|| this.gainedInsight > 0
				|| this.gainedReputation > 0
				|| this.gainedPopulation > 0
				|| this.gainedItemUpgrades > 0;
		},
		
		clone: function () {
			let result = new ResultVO(this.action);
			result.gainedResources = this.gainedResources.clone();
			result.gainedCurrency = this.gainedCurrency;
			result.lostResources = this.lostResources.clone();
			result.lostCurrency = this.lostCurrency;
			result.gainedItems = this.gainedItems.concat();
			result.gainedExplorers = this.gainedExplorers.concat();
			result.lostItems = this.lostItems.concat();
			result.brokenItems = this.brokenItems.concat();
			result.lostExplorers = this.lostExplorers.concat();
			result.lostPerks = this.lostPerks.concat();
			result.gainedPerks = this.gainedPerks.concat();
			result.gainedExplorerInjuries = this.gainedExplorerInjuries.concat();
			result.lostExplorerInjuries = this.lostExplorerInjuries.concat();
			result.gainedBlueprintPiece = this.gainedBlueprintPiece;
			result.gainedPopulation = this.gainedPopulation;
			result.gainedItemUpgrades = this.gainedItemUpgrades;
			result.gainedEvidence = this.gainedEvidence;
			result.gainedRumours = this.gainedRumours;
			result.gainedHope = this.gainedHope;
			result.gainedInsight = this.gainedInsight;
			result.gainedReputation = this.gainedReputation;
			result.storyFlags = this.storyFlags;
			result.removeCharacter = this.removeCharacter;
			result.replaceDialogue = this.replaceDialogue;
			result.startQuest = this.startQuest;
			result.endQuest = this.endQuest;
			return result;
		},
		
	});

	return ResultVO;
});
