define(['ash',
	'json!game/data/PlayerActionData.json',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
],
function (Ash, PlayerActionData, GameConstants, CampConstants, ImprovementConstants) {
	
	var PlayerActionConstants = {
		
		DISABLED_REASON_INVALID_PARAMS: "DISABLED_REASON_INVALID_PARAMS",
		DISABLED_REASON_LOCKED_RESOURCES: 'Requires undiscovered resources.',
		DISABLED_REASON_BAG_FULL: 'Bag full.',
		DISABLED_REASON_NOT_IN_CAMP: 'Must be in camp to do this.',
		DISABLED_REASON_POPULATION: "DISABLED_REASON_POPULATION",
		DISABLED_REASON_NOT_ENOUGH_LEVEL_POP: 'Not enough people on this level.',
		DISABLED_REASON_NOT_REACHABLE_BY_TRADERS: "Camp not reachable by traders.",
		DISABLED_REASON_BUSY: 'Busy',
		DISABLED_REASON_LAUNCHED: "Leaving the planet behind",
		DISABLED_REASON_MAX_IMPROVEMENT_LEVEL: 'Max level',
		DISABLED_REASON_MIN_IMPROVEMENTS: 'DISABLED_REASON_MIN_IMPROVEMENTS',
		DISABLED_REASON_MAX_IMPROVEMENTS: 'DISABLED_REASON_MAX_IMPROVEMENTS',
		DISABLED_REASON_SCOUTED: 'DISABLED_REASON_SCOUTED',
		DISABLED_REASON_SUNLIT: 'DISABLED_REASON_SUNLIT',
		DISABLED_REASON_UPGRADE: 'DISABLED_REASON_UPGRADE',
		
		loadData: function (data) {
			Object.assign(this, data);
		},

		hasAction: function (action) {
			return this.requirements[action] || this.costs[action] || this.cooldowns[action] || this.durations[action] || this.descriptions[action] || false;
		},

		getCooldown: function (action) {
			var speed = this.isExplorationAction(action) ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
			if (this.cooldowns[action]) {
				return this.cooldowns[action] / speed;
			}
			return 0;
		},

		getDuration: function (baseActionID) {
			var speed = this.isExplorationAction(baseActionID) ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
			// TODO make send_caravan duration dependent on the trade partner's location
			if (this.durations[baseActionID]) {
				return parseInt(this.durations[baseActionID]) / speed;
			}
			return 0;
		},

		getRandomEncounterProbability: function (baseActionID, vision, sectorFactor, actionFactor) {
			if (vision === undefined) vision = 100;
			if (actionFactor === undefined) actionFactor = 1;
			if (this.randomEncounterProbabilities[baseActionID]) {
				var baseProbability = this.randomEncounterProbabilities[baseActionID][0];
				var visionFactor = Math.pow(1 - (vision / 100), 2);
				var visionProbability = this.randomEncounterProbabilities[baseActionID][1] * visionFactor;
				return Math.min(1, (baseProbability + visionProbability) * actionFactor * sectorFactor);
			}
			return 0;
		},

		getInjuryProbability: function (action, vision, luck) {
			if (vision === undefined) vision = 100;
			if (this.injuryProbabilities[action]) {
				let baseProbability = this.injuryProbabilities[action][0];
				let visionFactor = Math.pow(1 - (vision / 100), 2);
				let luckFactor = this.getNegativeProbabiltityLuckFactor(luck);
				let visionProbability = this.injuryProbabilities[action][1] * visionFactor;
				let result = (baseProbability + visionProbability) * luckFactor;
				if (result < 0.001) result = 0;
				return result;
			}
			return 0;
		},

		getLoseInventoryProbability: function (action, vision, luck) {
			if (vision === undefined) vision = 100;
			if (this.loseInventoryProbabilities[action]) {
				let baseProbability = this.loseInventoryProbabilities[action][0];
				let visionFactor = Math.pow(1 - (vision / 100), 4);
				let luckFactor = this.getNegativeProbabiltityLuckFactor(luck);
				let visionProbability = this.loseInventoryProbabilities[action][1] * visionFactor;
				let result = (baseProbability + visionProbability) * luckFactor;
				if (result < 0.001) result = 0;
				return result;
			}
			return 0;
		},
		
		getNegativeProbabiltityLuckFactor: function (luck) {
			if (luck === undefined) luck = 0;
			if (luck < 0) luck = 0;
			if (luck > 100) luck = 100;
			return 100/(100 + luck);
		},

		isExplorationAction: function (action) {
			switch (action) {
				case 'scavenge':
				case 'investigate':
				case 'use_spring':
				case 'scout_locale_i':
				case 'scout_locale_u':
				case 'clear_workshop':
				case 'clear_waste_t':
				case 'clear_waste_r':
				case 'fight_gang':
					return true;
				default:
					return false;
			}
		},

		isLocationAction: function (action) {
			if (!action) return false;
			if (typeof this.location_actions[action] !== 'undefined') {
				return this.location_actions[action];
			}
			if (action.indexOf('build_in_') === 0) return true;
			if (action.indexOf('build_out_') === 0) return true;
			if (action.indexOf('use_in_') === 0) return true;
			if (action.indexOf('use_out_') === 0) return true;
			if (action.indexOf('fight_') === 0) return true;
			if (action.indexOf('scout_') === 0) return true;
			return false;
		},

		// defines if the action (with duration) marks the player as "busy" or if it can happen in the background
		isBusyAction: function (baseActionID) {
			switch (baseActionID) {
				case 'send_caravan':
					return false;
				default:
					return true;
			}
		}

	};
	
	PlayerActionConstants.loadData(PlayerActionData);

	return PlayerActionConstants;

});
