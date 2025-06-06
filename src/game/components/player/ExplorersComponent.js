define(['ash', 'game/constants/ExplorerConstants', 'game/constants/ItemConstants'],
function (Ash, ExplorerConstants, ItemConstants) {

	let ExplorersComponent = Ash.Class.extend({

		explorers: [], // ExplorerVO
		quests: {}, // storyID -> list of explorerID

		constructor: function () {
			this.explorers = [];
			this.quests = {};
		},
		
		getAll: function () {
			return this.explorers;
		},
		
		getParty: function () {
			let explorersInParty = [];
			for (let i = 0; i < this.explorers.length; i++) {
				if (this.explorers[i].inParty) {
					explorersInParty.push(this.explorers[i]);
				}
			}
			return explorersInParty;
		},
		
		getExplorerByID: function (explorerID) {
			for (let i = 0; i < this.explorers.length; i++) {
				if (this.explorers[i].id == explorerID) {
					return this.explorers[i];
				}
			}
			return null;
		},
		
		getExplorerInPartyByType: function (explorerType) {
			var explorers = this.getExplorersByType(explorerType, true);
			return explorers.length > 0 ? explorers[0] : null;
		},
		
		getExplorersByType: function (explorerType, onlyParty) {
			var result = [];
			for (let i = 0; i < this.explorers.length; i++) {
				if (!onlyParty || this.explorers[i].inParty) {
					let type = ExplorerConstants.getExplorerTypeForAbilityType(this.explorers[i].abilityType);
					if (type == explorerType) {
						result.push(this.explorers[i]);
					}
				}
			}
			return result;
		},
		
		addExplorer: function (explorer) {
			this.explorers.push(explorer);
		},
		
		setExplorerInParty: function (explorer, inParty) {
			explorer.inParty = inParty;
		},
		
		removeExplorer: function (explorer) {
			if (!explorer) return;
			let index = this.explorers.indexOf(explorer);
			if (index < 0) {
				log.w("couldn't find explorer to remove: " + explorer.id);
				return;
			}
  			this.explorers.splice(index, 1);
		},
		
		getCurrentBonus: function (itemBonusType) {
			let isMultiplier = ItemConstants.isMultiplier(itemBonusType);
			let bonus = isMultiplier ? 1 : 0;
			let party = this.getParty();
			for (let i = 0; i < this.explorers.length; i++) {
				var explorer = this.explorers[i];
				if (!explorer.inParty) continue;
				if (explorer.injuredTimer >= 0) continue;
				let explorerBonus = ExplorerConstants.getExplorerItemBonus(explorer, party, itemBonusType);
				if (isMultiplier) {
					if (explorerBonus != 0) {
						bonus *= explorerBonus;
					}
				} else {
					bonus += explorerBonus;
				}
			}
			return bonus;
		},
		
		getExplorerComparison: function (explorer) {
			if (explorer == null) return null;
			let type = ExplorerConstants.getExplorerTypeForAbilityType(explorer.abilityType);
			let selectedExplorer = this.getExplorerInPartyByType(type);
			if (selectedExplorer == null) return null;
			if (!ExplorerConstants.isComparableAbilityTypes(selectedExplorer.abilityType, explorer.abilityType)) return null;
			
			return ExplorerConstants.getTotalItemBonus(explorer, []) - ExplorerConstants.getTotalItemBonus(selectedExplorer, []);
		},

		getSaveKey: function () {
			return "Explorers";
		},

		getOldSaveKey: function () {
			return "Followers";
		},

		getCustomSaveObject: function () {
			var copy = {};
			copy.explorers = this.explorers;
			copy.quests = {};
			for (let key in this.quests) {
				copy.quests[key] = this.quests[key];
			}
			return copy;
		},

		customLoadFromSave: function (componentValues) {
			this.explorers = componentValues.explorers || componentValues.followers || [];
			this.quests = componentValues.quests || {};
		},
	});

	return ExplorersComponent;
});
