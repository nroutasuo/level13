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

		addUpgrade: function (upgrade) {
			if (!this.hasUpgrade(upgrade)) {
				this.boughtUpgrades.push(upgrade);
				this.removeBlueprints(upgrade);
			}
		},

		hasUpgrade: function (upgrade) {
			return this.boughtUpgrades.indexOf(upgrade) >= 0;
		},

		createBlueprint: function (upgradeID) {
			var blueprintVO = this.getBlueprint(upgradeID);
			if (blueprintVO) {
				blueprintVO.completed = true;
			}
		},

		useBlueprint: function (upgradeID) {
			var blueprintVO = this.getBlueprint(upgradeID);
			if (blueprintVO) {
				this.newBlueprints.splice(this.newBlueprints.indexOf(blueprintVO), 1);
				this.availableBlueprints.push(blueprintVO);
			} else {
				log.w("No such blueprint found: " + upgradeID);
			}
		},

		addNewBlueprintPiece: function (upgradeID) {
			if (this.hasUpgrade(upgradeID)) return;
			var blueprintVO = this.getBlueprint(upgradeID);
			if (!blueprintVO) {
				var maxPieces = UpgradeConstants.getMaxPiecesForBlueprint(upgradeID);
				blueprintVO = new BlueprintVO(upgradeID, maxPieces);
				this.newBlueprints.push(blueprintVO);
			}
			blueprintVO.currentPieces++;
		},

		hasBlueprint: function (upgradeID) {
			return this.getBlueprint(upgradeID) !== null;
		},

		getBlueprint: function (upgradeID) {
			for (let i = 0; i < this.newBlueprints.length; i++) {
				if (this.newBlueprints[i].upgradeID === upgradeID) return this.newBlueprints[i];
			}
			for (let j = 0; j < this.availableBlueprints.length; j++) {
				if (this.availableBlueprints[j].upgradeID === upgradeID) return this.availableBlueprints[j];
			}
			return null;
		},

		hasAvailableBlueprint: function (upgradeID) {
			return this.availableBlueprints.indexOf(this.getBlueprint(upgradeID)) >= 0;
		},
		
		hasAllPieces: function (upgradeID) {
			var blueprintVO = this.getBlueprint(upgradeID);
			if (!blueprintVO) return false;
			return blueprintVO.currentPieces >= blueprintVO.maxPieces;
		},

		hasNewBlueprint: function (upgradeID) {
			var blueprintVO = this.getBlueprint(upgradeID);
			return blueprintVO && blueprintVO.completed && this.newBlueprints.indexOf(blueprintVO) >= 0;
		},
		
		hasUnfinishedBlueprint: function (upgradeID) {
			var blueprintVO = this.getBlueprint(upgradeID);
			return blueprintVO;// && !blueprintVO.completed && this.newBlueprints.indexOf(blueprintVO) >= 0;
		},

		getUnfinishedBlueprints: function () {
			var unfinished = [];
			for (let i = 0; i < this.newBlueprints.length; i++) {
				if (!this.newBlueprints[i].completed) unfinished.push(this.newBlueprints[i]);
			}
			return unfinished;
		},

		getNewBlueprints: function () {
			return this.newBlueprints;
		},

		removeBlueprints: function (upgradeID) {
			for (let i = 0; i < this.newBlueprints.length; i++) {
				if (this.newBlueprints[i].upgradeID === upgradeID) {
					this.newBlueprints.splice(i, 1);
					break;
				}
			}
			for (let j = 0; j < this.availableBlueprints.length; j++) {
				if (this.availableBlueprints[j].upgradeID === upgradeID) {
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
