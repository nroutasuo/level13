// Helper methods related to rewards from player actions such as scavenging and scouting
define([
    'ash',
	'game/constants/TextConstants',
	'game/constants/ItemConstants',
    'game/nodes/PlayerStatsNode',
    'game/nodes/PlayerLocationNode',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/player/ItemsComponent',
	'game/vos/ResourcesVO'
], function (
	Ash,
	TextConstants,
	ItemConstants,
	PlayerStatsNode,
	PlayerLocationNode,
	SectorFeaturesComponent,
	SectorStatusComponent,
	ItemsComponent,
	ResourcesVO
) {
    var PlayerActionRewardsHelper = Ash.Class.extend({
		
		resourcesHelper: null,
		
		playerStatsNodes: null,
		playerLocationNodes: null,
		
		constructor: function (engine, gameState, resourcesHelper) {
			this.engine = engine;
			this.gameState = gameState;
			this.resourcesHelper = resourcesHelper;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
		},
		
        getScavengeRewards: function () {
			var rewards = {};
			
			var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources;
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var playerPos = this.playerLocationNodes.head.position;
			var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
			var efficiency = this.getScavengeEfficiency();
			var playerVision = this.playerStatsNodes.head.vision.value;
		
			rewards.resources = this.getRewardResources(1, efficiency, sectorResources);
			rewards.items = this.getRewardItems(0.0075, playerVision * 0.25, itemsComponent, levelOrdinal);
			rewards.perks = this.getRewardPerks();
			
			return rewards;
		},
		
		getScoutRewards: function () {
			var rewards = {};
			
			var efficiency = this.getScavengeEfficiency();
            var sectorResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources;
			
			rewards.resources = this.getRewardResources(0.5, efficiency * 5, sectorResources);
			rewards.evidence = 1;
					
			return rewards;
		},
		
		getScoutLocaleRewards: function (localeVO) {
			var rewards = {};
			
            var availableResources = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent).resources.clone();
			availableResources.addAll(localeVO.getResourceBonus(this.gameState.unlockedFeatures.resources));
			var efficiency = this.getScavengeEfficiency();
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
			var playerPos = this.playerLocationNodes.head.position;
			var levelOrdinal = this.gameState.getLevelOrdinal(playerPos.level);
			var localeDifficulty = localeVO.requirements.vision + localeVO.costs.stamina;
			
			rewards.resources = this.getRewardResources(1, efficiency * localeDifficulty / 15, availableResources);
			rewards.items = this.getRewardItems(0.2, localeDifficulty / 2, itemsComponent, levelOrdinal);
			rewards.perks = this.getRewardPerks();
			rewards.evidence = 1;
					
			return rewards;
		},
		
		collectRewards: function (rewards) {
			var currentStorage = this.resourcesHelper.getCurrentStorage(true);
			currentStorage.addResources(rewards.resources);
			
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var amount = rewards.resources.getResource(name);
				if (amount > 0) {
					sectorStatus.addDiscoveredResource(name);
				}
			}
			
			if (rewards.items) {
				var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
				for (var i = 0; i < rewards.items.length; i++) {
					var item = rewards.items[i];
					itemsComponent.addItem(item);
				}
			}
			
			// TODO add perks (injuries)
			
			if (rewards.evidence) this.playerStatsNodes.head.evidence.value += rewards.evidence;
		},
		
		getRewardsMessage: function (rewards, baseMsg) {
			var msg = baseMsg;
			var replacements = [];
			var values = [];
			var foundSomething = rewards.resources.getTotal() > 0;
			
			var resourceTemplate = TextConstants.getLogResourceText(rewards.resources);
			msg += "Found " + resourceTemplate.msg;
			replacements = replacements.concat(resourceTemplate.replacements);
			values = values.concat(resourceTemplate.values);
			
			if (rewards.items) {
				if (rewards.items.length > 0) {
					msg += ", ";
					foundSomething = true;
				}
				
				for (var i = 0; i < rewards.items.length; i++) {
					var item = rewards.items[i];
					msg += "$" + replacements.length + ", ";
					replacements.push("#" + replacements.length);
					values.push(item.name);
				}
			}
			
			if (rewards.evidence) {
				msg += ", ";
				foundSomething = true;
				msg += "$" + replacements.length + ", ";
				replacements.push("#" + replacements.length + " evidence");
				values.push(rewards.evidence);
			}
			
			if (foundSomething) {
				msg = msg.slice(0, -2);
				msg += ".";
			} else {
				msg = "Didn't find anything.";
			}
			
			// TODO add perks (injuries)
			
			return { msg: msg, replacements: replacements, values: values };
		},
		
		getScavengeEfficiency: function () {
			var playerVision = this.playerStatsNodes.head.vision.value;
			var playerHealth = this.playerStatsNodes.head.stamina.health;
            return (playerHealth / 100) * (playerVision / 100);
        },
        
		getRewardResources: function (probabilityFactor, amountFactor, availableResources) {
			var results = new ResourcesVO();
			for (var key in resourceNames) {
				var name = resourceNames[key];
				var resAmount = availableResources.getResource(name);
				var probability = 0.2;
				var resAmountFactor = 1;
				if (name === "metal") {
					probability = 0.98;
					resAmountFactor = 2;
				} else if (name === "water" || name === "food") {
					probability = 0.3;
					resAmountFactor = 3;
				}
				probability = probability * probabilityFactor;
				var resultAmount = Math.random() < probability ?
					Math.ceil(amountFactor * resAmountFactor * resAmount * Math.random()) :
					0;
		
				results.setResource(name, resultAmount);
			}
			
			return results;
		},
	
		// probability of getting something: 0-1 for one item
		// typical rarity of items: 0-100
		getRewardItems: function (itemProbability, itemRarity, currentItems, levelOrdinal) {
			var items = [];
			
			// Neccessity items that the player should find quickly if missing
			var necessityItem = this.getNecessityItem(currentItems);
			if (necessityItem && Math.random() < itemProbability * 33) {
				items.push(necessityItem);
			}
			
			// Normal items
			if (Math.random() < itemProbability) {
				var itemTypeRand = Math.random();
				if(itemTypeRand < 0.2) {
					items.push( ItemConstants.itemDefinitions.shoes[0].clone());
				} else if (itemTypeRand < 0.25) {
					var i = Math.floor(Math.random()*ItemConstants.itemDefinitions.bag.length-1);
					items.push( ItemConstants.itemDefinitions.bag[i+1].clone());
				} else if (itemTypeRand < 0.5) {
					items.push(ItemConstants.getDefaultClothing(levelOrdinal));
				} else if (itemTypeRand < 0.75) {
					items.push(ItemConstants.getDefaultWeapon(levelOrdinal));
				} else {
					var i = Math.floor(Math.random()*ItemConstants.itemDefinitions.artefact.length);
					items.push( ItemConstants.itemDefinitions.artefact[i].clone());
				}
			}
			return items;
		},
		
		getNecessityItem: function (currentItems) {
			if (currentItems.getCurrentBonus(ItemConstants.itemTypes.bag) <= 0) {
				return ItemConstants.itemDefinitions.bag[0];
			}			
			return null;
		},
		
		getRewardPerks: function () {
			// TODO injuries and other perks for sca/fi/i
			return {};
		},
        
    });
    
    return PlayerActionRewardsHelper;
});