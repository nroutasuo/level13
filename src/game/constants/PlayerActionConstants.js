define(['ash',
	'json!game/data/PlayerActionData.json',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
],
function (Ash, PlayerActionData, GameConstants, CampConstants, ImprovementConstants) {
	
	var PlayerActionConstants = {
		
		UNAVAILABLE_REASON_LOCKED_RESOURCES: 'Requires undiscovered resources.',
		UNAVAILABLE_REASON_BAG_FULL: 'Bag full.',
		UNAVAILABLE_REASON_NOT_IN_CAMP: 'Must be in camp to do this.',
		UNAVAILABLE_REASON_POPULATION: "UNAVAILABLE_REASON_POPULATION",
		DISABLED_REASON_NOT_ENOUGH_LEVEL_POP: 'Not enough people on this level.',
		DISABLED_REASON_NOT_REACHABLE_BY_TRADERS: "Camp not reachable by traders.",
		UNAVAILABLE_REASON_BUSY: 'Busy',
		UNAVAILABLE_REASON_MAX_IMPROVEMENT_LEVEL: 'Max level',
		
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

		getInjuryProbability: function (action, vision) {
			if (vision === undefined) vision = 100;
			if (this.injuryProbabilities[action]) {
				var baseProbability = this.injuryProbabilities[action][0];
				var visionFactor = Math.pow(1 - (vision / 100), 2);
				var visionProbability = this.injuryProbabilities[action][1] * visionFactor;
				let result = baseProbability + visionProbability;
				if (result < 0.001) result = 0;
				return result;
			}
			return 0;
		},

		getLoseInventoryProbability: function (action, vision) {
			if (vision === undefined) vision = 100;
			if (this.loseInventoryProbabilities[action]) {
				var baseProbability = this.loseInventoryProbabilities[action][0];
				var visionFactor = Math.pow(1 - (vision / 100), 4);
				var visionProbability = this.loseInventoryProbabilities[action][1] * visionFactor;
				return baseProbability + visionProbability;
			}
			return 0;
		},

		isExplorationAction: function (action) {
			switch (action) {
				case 'scavenge':
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
