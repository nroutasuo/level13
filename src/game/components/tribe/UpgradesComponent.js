define(['ash', 'game/constants/UpgradeConstants', 'game/vos/UpgradeVO', 'game/vos/BlueprintVO'],
function (Ash, UpgradeConstants, UpgradeVO, BlueprintVO) {
	var UpgradesComponent = Ash.Class.extend({

		boughtUpgrades: [],

		newBlueprints: [],
		availableBlueprints: [],

		constructor: function () {
			this.boughtUpgrades = [];
			this.newBlueprints = [];
			this.availableBlueprints = [];
		},

		addUpgrade: function (upgradeId) {
			if (!this.hasUpgrade(upgradeId)) {
				this.boughtUpgrades.push(upgradeId);
				this.removeBlueprints(upgradeId);
			}
		},

		hasUpgrade: function (upgradeId) {
			return this.boughtUpgrades.indexOf(upgradeId) >= 0;
		},

		createBlueprint: function (upgradeId) {
			var blueprintVO = this.getBlueprint(upgradeId);
			if (blueprintVO) {
				blueprintVO.completed = true;
			}
		},

		useBlueprint: function (upgradeId) {
			var blueprintVO = this.getBlueprint(upgradeId);
			if (blueprintVO) {
				this.newBlueprints.splice(this.newBlueprints.indexOf(blueprintVO), 1);
				this.availableBlueprints.push(blueprintVO);
			} else {
				log.w("No such blueprint found: " + upgradeId);
			}
		},

		addNewBlueprintPiece: function (upgradeId) {
			if (this.hasUpgrade(upgradeId)) return;
			var blueprintVO = this.getBlueprint(upgradeId);
			if (!blueprintVO) {
				var maxPieces = UpgradeConstants.getMaxPiecesForBlueprint(upgradeId);
				blueprintVO = new BlueprintVO(upgradeId, maxPieces);
				this.newBlueprints.push(blueprintVO);
			}
			blueprintVO.currentPieces++;
		},

		hasBlueprint: function (upgradeId) {
			return this.getBlueprint(upgradeId) !== null;
		},

		getBlueprint: function (upgradeId) {
			for (var i = 0; i < this.newBlueprints.length; i++) {
				if (this.newBlueprints[i].upgradeId === upgradeId) return this.newBlueprints[i];
			}
			for (var j = 0; j < this.availableBlueprints.length; j++) {
				if (this.availableBlueprints[j].upgradeId === upgradeId) return this.availableBlueprints[j];
			}
			return null;
		},

		hasAvailableBlueprint: function (upgradeId) {
			return this.availableBlueprints.indexOf(this.getBlueprint(upgradeId)) >= 0;
		},
		
		hasAllPieces: function (upgradeId) {
			var blueprintVO = this.getBlueprint(upgradeId);
			if (!blueprintVO) return false;
			return blueprintVO.currentPieces >= blueprintVO.maxPieces;
		},

		hasNewBlueprint: function (upgradeId) {
			var blueprintVO = this.getBlueprint(upgradeId);
			return blueprintVO && blueprintVO.completed && this.newBlueprints.indexOf(blueprintVO) >= 0;
		},
		
		hasUnfinishedBlueprint: function (upgradeId) {
			var blueprintVO = this.getBlueprint(upgradeId);
			return blueprintVO;// && !blueprintVO.completed && this.newBlueprints.indexOf(blueprintVO) >= 0;
		},

		getUnfinishedBlueprints: function () {
			var unfinished = [];
			for (var i = 0; i < this.newBlueprints.length; i++) {
				if (!this.newBlueprints[i].completed) unfinished.push(this.newBlueprints[i]);
			}
			return unfinished;
		},

		getNewBlueprints: function () {
			return this.newBlueprints;
		},

		removeBlueprints: function (upgradeID) {
			for (var i = 0; i < this.newBlueprints.length; i++) {
				if (this.newBlueprints[i].upgradeId === upgradeID) {
					this.newBlueprints.splice(i, 1);
					break;
				}
			}
			for (var j = 0; j < this.availableBlueprints.length; j++) {
				if (this.availableBlueprints[j].upgradeId === upgradeID) {
					this.availableBlueprints.splice(j, 1);
					break;
				}
			}
		},

		getSaveKey: function () {
			return "Upgrades";
		},

	});

	return UpgradesComponent;
});
