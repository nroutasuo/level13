define([
	'jquery/jquery-1.11.1.min',
	'core/ConsoleLogger',
	'lzstring/lz-string',
	'game/helpers/SaveHelper',
	'game/constants/UpgradeConstants'
], function (jQuery, ConsoleLogger, LZString, SaveHelper, UpgradeConstants) {
	
	'use strict';
	
	function registerButtonListeners() {
		$("#fix-evidence-knife-compass").click(function () { applyFixEvidenceKnifeCompass(); });
		$("#fix-blueprints-crafting").click(function () { applyFixBlueprintCrafting(); });
		$("#fix-evidence-crafting").click(function () { applyFixEvidenceCrafting(); });
		$("#fix-evidence-textile-arts").click(function () { applyFixEvidenceTextileArts(); });
	}
	
	function showMessage(str) {
		alert(str)
	}
		
	function loadSave() {
		log.i("loading save..")
		var compressed = $("#save-input").val();
		if (!compressed) {
			return null;
		}
		var saveHelper = new SaveHelper();
		var json = LZString.decompressFromBase64(compressed);
		log.i("loaded save version: " + json.version)
		var object = saveHelper.parseSaveJSON(json);
		return object;
	}
	
	function exportSave(object) {
		let json = JSON.stringify(object);
		let compressed = LZString.compressToBase64(json);
		$("#save-output").val(compressed);
	}
	
	function validateSave(save) {
		if (!save) return false;
		if (!save.entitiesObject) return false;
		if (!save.gameState) return false;
		if (!save.version) return false;
		return true;
	}
	
	function checkSave(save, checks) {
		let result = { ok: true, reason: "" };
		
		log.i("checking save..");
		for (let i = 0; i < checks.length; i++) {
			let checkResult = checks[i](save);
			log.i("check " + i + " " + checkResult.ok + " " + checkResult.reason);
			if (!checkResult.ok) {
				result.ok = false;
				result.reason = checkResult.reason;
				break;
			}
		}
		
		return result;
	}
	
	function checkSaveHasUpgrade(save, upgradeID, requiredValue) {
		let result = { ok: true, reason: "" };
		let upgradeName = UpgradeConstants.upgradeDefinitions[upgradeID].name;
		let hasUpgrade = save.entitiesObject.tribe.Upgrades.boughtUpgrades.indexOf(upgradeID) >= 0;
		result.ok = hasUpgrade == requiredValue;
		result.reason = "Upgrade " + upgradeName + " " + (hasUpgrade ? "already unlocked" : "not unlocked");
		return result;
	}
	
	function fixSave(save, fixes) {
		let result = JSON.parse(JSON.stringify(save));
		log.i("applying fix..");
		for (let i = 0; i < fixes.length; i++) {
			log.i("applying fix " + (i+1) + "/" + fixes.length);
			fixes[i](result);
		}
		log.i("fix done");
		return result;
	}
	
	function fixSaveRemoveUpgrade(save, upgradeID) {
		let boughtUpgrades = save.entitiesObject.tribe.Upgrades.boughtUpgrades;
		let index = boughtUpgrades.indexOf(upgradeID);
		boughtUpgrades.splice(index, 1);
		
		if (UpgradeConstants.piecesByBlueprint[upgradeID]) {
			let blueprint = { upgradeID: upgradeID, maxPieces: UpgradeConstants.piecesByBlueprint[upgradeID], currentPieces: UpgradeConstants.piecesByBlueprint[upgradeID] };
			save.entitiesObject.tribe.Upgrades.availableBlueprints.push(blueprint);
		}
	}
	
	function fixSaveGrantEvidence(save, amount) {
		let currentValue = save.entitiesObject.player.Evidence.value || 0;
		let newValue = currentValue + amount;
		save.entitiesObject.player.Evidence.value = newValue;
	}
	
	function fixSaveGrantRumours(save, amount) {
		let currentValue = save.entitiesObject.player.Rumours.value || 0;
		let newValue = currentValue + amount;
		save.entitiesObject.player.Rumours.value = newValue;
	}
	
	function fixSaveGrantBlueprints(save, upgradeID) {
		if (UpgradeConstants.piecesByBlueprint[upgradeID]) {
			let currentIndex = -1;
			for (let i = 0; i < save.entitiesObject.tribe.Upgrades.newBlueprints.length; i++) {
				if (save.entitiesObject.tribe.Upgrades.newBlueprints[i].upgradeID == upgradeID) {
					currentIndex = i;
					break;
				}
			}
			if (currentIndex >= 0) {
				save.entitiesObject.tribe.Upgrades.newBlueprints.splice(currentIndex, 1);
			}
			let blueprint = { upgradeID: upgradeID, maxPieces: UpgradeConstants.piecesByBlueprint[upgradeID], currentPieces: UpgradeConstants.piecesByBlueprint[upgradeID] };
			save.entitiesObject.tribe.Upgrades.newBlueprints.push(blueprint);
		}
	}
	
	function applyFix(checkActions, fixActions, message) {
		let save = loadSave();
		let isSaveValid = validateSave(save);
		if (!isSaveValid) {
			showMessage("Input is not a valid save.");
			return;
		}
		
		let checkResult = checkSave(save, checkActions);
		
		if (!checkResult.ok) {
			showMessage("This save is not valid for this fix. Reason: " + checkResult.reason);
			return;
		}
		
		let result = fixSave(save, fixActions);
		exportSave(result);
		showMessage("Fix applied. " + message + " Copy new save from the Output box.");
	}
	
	function applyFixEvidenceKnifeCompass() {
		// cost in 0.3.1
		let evidenceCost = 80;
		let rumourCost = 58;
		
		applyFix([
			function (save) { return checkSaveHasUpgrade(save, "unlock_building_tradingpost", false); },
			function (save) { return checkSaveHasUpgrade(save, "unlock_weapon_15", true); },
		], [
			function (save) { fixSaveRemoveUpgrade(save, "unlock_weapon_15") },
			function (save) { fixSaveGrantEvidence(save, evidenceCost) },
			function (save) { fixSaveGrantRumours(save, 58) },
		],
			"Removed upgrade 'Knife' and reinbursed " + evidenceCost + " Evidence and " + rumourCost + " Rumours."
		);
	}
	
	function applyFixBlueprintCrafting() {
		applyFix([
			function (save) { return checkSaveHasUpgrade(save, "unlock_item_shoe1", false); }
		],[
			function (save) { fixSaveGrantBlueprints(save, "unlock_item_shoe1") },
		],
			"Added blueprint(s) for Crafting."
		);
	}
	
	function applyFixEvidenceCrafting() {
		// cost in 0.3.2
		let evidenceCost = 50;
		
		applyFix([
			function (save) { return checkSaveHasUpgrade(save, "unlock_item_clothing2", false); },
			function (save) { return checkSaveHasUpgrade(save, "unlock_building_passage_staircase", true); },
		], [
			function (save) { fixSaveRemoveUpgrade(save, "unlock_building_passage_staircase") },
			function (save) { fixSaveGrantEvidence(save, evidenceCost) },
		],
			"Removed upgrade 'Building Projects' and reimbursed " + evidenceCost + " Evidence."
		);
	}
	
	function applyFixEvidenceTextileArts() {
		// cost in 0.3.2
		let evidenceCost = 80;
		
		applyFix([
			function (save) { return checkSaveHasUpgrade(save, "unlock_clothing_warm", false); },
			function (save) { return checkSaveHasUpgrade(save, "unlock_building_tradingpost", true); },
		], [
			function (save) { fixSaveRemoveUpgrade(save, "unlock_building_tradingpost") },
			function (save) { fixSaveGrantEvidence(save, evidenceCost) },
		],
			"Removed upgrade 'Compass' and reimbursed " + evidenceCost + " Evidence."
		);
	}
	
	registerButtonListeners();
	
});
