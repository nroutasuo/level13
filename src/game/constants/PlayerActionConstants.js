define(['ash',
	'json!game/data/PlayerActionData.json',
	'utils/ObjectUtils',
	'game/constants/GameConstants',
	'game/constants/CampConstants',
	'game/constants/ImprovementConstants',
],
function (Ash, PlayerActionData, ObjectUtils, GameConstants, CampConstants, ImprovementConstants) {
	
	var PlayerActionConstants = {
		
		DISABLED_REASON_BAG_FULL: "ui.actions.disabled_reason_bag_full",
		DISABLED_REASON_BUSY: "ui.actions.disabled_reason_busy",
		DISABLED_REASON_EXPOSED: "DISABLED_REASON_EXPOSED",
		DISABLED_REASON_IN_PROGRESS: "ui.actions.disabled_reason_action_in_progress",
		DISABLED_REASON_INVALID_PARAMS: "DISABLED_REASON_INVALID_PARAMS",
		DISABLED_REASON_INVALID_SECTOR: 'DISABLED_REASON_INVALID_SECTOR',
		DISABLED_REASON_LAUNCHED: "Leaving the planet behind",
		DISABLED_REASON_LOCKED_RESOURCES: 'Requires undiscovered resources.',
		DISABLED_REASON_MAX_IMPROVEMENT_LEVEL: "ui.actions.disabled_reason_max_improvement_level",
		DISABLED_REASON_MAX_IMPROVEMENTS: 'DISABLED_REASON_MAX_IMPROVEMENTS',
		DISABLED_REASON_MILESTONE: 'DISABLED_REASON_MILESTONE',
		DISABLED_REASON_MIN_IMPROVEMENTS: 'DISABLED_REASON_MIN_IMPROVEMENTS',
		DISABLED_REASON_NOT_AWAKE: "DISABLED_REASON_NOT_AWAKE",
		DISABLED_REASON_NOT_IN_CAMP: "ui.actions.disabled_reason_not_in_camp",
		DISABLED_REASON_NOT_REACHABLE_BY_TRADERS: "Camp not reachable by traders.",
		DISABLED_REASON_POPULATION: "DISABLED_REASON_POPULATION",
		DISABLED_REASON_PROJECT_IN_PROGRESS: "ui.actions.disabled_reason_project_in_progress",
		DISABLED_REASON_RAID: "ui.actions.disabled_reason_raid",
		DISABLED_REASON_SCOUTED: 'DISABLED_REASON_SCOUTED',
		DISABLED_REASON_SUNLIT: 'DISABLED_REASON_SUNLIT',
		DISABLED_REASON_UPGRADE: 'DISABLED_REASON_UPGRADE',
		DISABLED_REASON_VISION: "DISABLED_REASON_VISION",
		
		loadData: function (data) {
			Object.assign(this, data);

			this.applyTemplates(data);
		},

		applyTemplates: function (data) {
			let templateActions = [];

			let allActions = [];
			allActions = allActions.concat(Object.keys(this.requirements));
			allActions = allActions.concat(Object.keys(this.costs));

			for (let i in allActions) {
				let templateAction = allActions[i];
				if (!this.isTemplateAction(templateAction)) continue;
				
				let templatePrefix = templateAction.replace("__", "");

				let templateReqs = data.requirements[templateAction] || {};
				let templateCosts = data.costs[templateAction] || {};
				let templateDuration = data.durations[templateAction] || null;

				let actionsToApply = [];

				for (let j in allActions) {
					let action = allActions[j];
					if (this.isTemplateAction(action)) continue;
					if (action.startsWith(templatePrefix)) {
						actionsToApply.push(action);
					}
				}

				for (let i in actionsToApply) {
					let action = actionsToApply[i];

					let oldReqs = data.requirements[action] || {};
					let newReqs = Object.assign({}, oldReqs);
					ObjectUtils.assignValues(newReqs, templateReqs);
					
					this.requirements[action] = newReqs;

					let oldCosts = data.costs[action] || {};
					let newCosts = Object.assign({}, templateCosts, oldCosts);
					this.costs[action] = newCosts;

					if (templateDuration && !this.durations[action]) this.durations[action] = templateDuration;
				}

				templateActions.push(templateAction);
			}

			for (let i in templateActions) {
				let templateAction = templateActions[i];
				delete this.requirements[templateAction];
				delete this.costs[templateAction];
				delete this.durations[templateAction];
			}
		},

		isTemplateAction: function (action) {
			return action.endsWith("__");
		},

		hasAction: function (action) {
			return this.requirements[action] || this.costs[action] || this.cooldowns[action] || this.durations[action] || false;
		},

		getCooldown: function (action) {
			action = this.getBaseActionID(action);
			let speed = this.isExplorationAction(action) ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;
			if (this.cooldowns[action]) {
				return this.cooldowns[action] / speed;
			}
			return 0;
		},

		getDuration: function (action, baseActionID) {
			baseActionID = baseActionID || this.getBaseActionID(action);
			let speed = this.isExplorationAction(baseActionID) ? GameConstants.gameSpeedExploration : GameConstants.gameSpeedCamp;

			// TODO make send_caravan duration dependent on the trade partner's location
			if (this.durations[baseActionID]) {
				return parseInt(this.durations[baseActionID]) / speed;
			}
			
			if (this.durations[action]) {
				return parseInt(this.durations[action]) / speed;
			}

			if (baseActionID.indexOf("build_out") >= 0) {
				let improvementName = this.getImprovementNameForAction(baseActionID);
				let improvementID = ImprovementConstants.getImprovementID(improvementName);
				let improvementDef = ImprovementConstants.getDef(improvementID);
				let buildTime = improvementDef.isProject ? 60 : 10;
				return buildTime / speed;
			}
			
			if (baseActionID.indexOf("build_in") >= 0) {
				return 5 / speed;
			}
			
			if (baseActionID == "craft") {
				return 2 / speed;
			}
			
			return 0;
		},

		// sectorFactor is 0-2, usually 1, can be >1 for dangerous sectors
		// actionFactor is 0-1, usually 1, typically 0 for things like scout_locale_i
		getRandomEncounterProbability: function (baseActionID, vision, sectorFactor, actionFactor) {
			if (vision === undefined) vision = 100;
			if (actionFactor === undefined) actionFactor = 1;
			if (this.randomEncounterProbabilities[baseActionID]) {
				let baseProbability = this.randomEncounterProbabilities[baseActionID][0];
				// 0-1, decreasing fast for higher vision, 0.25 for vision 50
				let visionFactor = Math.pow(1 - (vision / 100), 2); 
				let visionProbability = this.randomEncounterProbabilities[baseActionID][1] * visionFactor;
				let hazardFactor = 1;
				let result = Math.min(1, (baseProbability + visionProbability) * actionFactor * sectorFactor);
				return this.roundProbability(result);
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
				return this.roundProbability(result);
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
				return this.roundProbability(result);
			}
			return 0;
		},

		roundProbability: function (value) {
			if (value > 1) return 1;
			if (value < 0) return 0;
			if (value < 0.001) value = 0;
			return Math.round(value * 2000) / 2000;
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
		
		getBaseActionID: function (action) {
			if (!action) return action;
			
			if (action.indexOf("build_in_") >= 0) return action;
			if (action.indexOf("claim_milestone_") >= 0) return "claim_milestone";
			if (action.indexOf("improve_in_") >= 0) return "improve_in";
			if (action.indexOf("dismantle_") >= 0) return "dismantle";
			if (action.indexOf("dismantle_out_") >= 0) return "dismantle_out";
			if (action.indexOf("improve_out") >= 0) return "improve_out";
			if (action.indexOf("scout_locale_i") >= 0) return "scout_locale_i";
			if (action.indexOf("scout_locale_u") >= 0) return "scout_locale_u";
			if (action.indexOf("craft_") >= 0) return "craft";
			if (action.indexOf("discard_") >= 0) return "discard";
			if (action.indexOf("unequip_") >= 0) return "unequip";
			if (action.indexOf("equip_") >= 0) return "equip";
			if (action.indexOf("use_item_fight") >= 0) return "use_item_fight";
			if (action.indexOf("use_explorer_fight") >= 0) return "use_explorer_fight";
			if (action.indexOf("use_item") >= 0) return "use_item";
			if (action.indexOf("repair_item") >= 0) return "repair_item";
			if (action.indexOf("repair_in") >= 0) return "repair_in";
			if (action.indexOf("unlock_upgrade_") >= 0) return "unlock_upgrade";
			if (action.indexOf("create_blueprint_") >= 0) return "create_blueprint";
			if (action.indexOf("clear_waste_t") == 0) return "clear_waste_t";
			if (action.indexOf("clear_waste_r") == 0) return "clear_waste_r";
			if (action.indexOf("clear_debris_") == 0) return "clear_debris";
			if (action.indexOf("clear_explosives_") == 0) return "clear_explosives";
			if (action.indexOf("clear_gate_") == 0) return "clear_gate";
			if (action.indexOf("fight_gang_") >= 0) return "fight_gang";
			if (action.indexOf("send_caravan_") >= 0) return "send_caravan";
			if (action.indexOf("recruit_explorer_") >= 0) return "recruit_explorer";
			if (action.indexOf("start_explorer_dialogue") >= 0) return "start_explorer_dialogue";
			if (action.indexOf("start_visitor_dialogue") >= 0) return "start_visitor_dialogue";
			if (action.indexOf("start_refugee_dialogue") >= 0) return "start_refugee_dialogue";
			if (action.indexOf("start_in_npc_dialogue") >= 0) return "start_in_npc_dialogue";
			if (action.indexOf("start_out_npc_dialogue") >= 0) return "start_out_npc_dialogue";
			if (action.indexOf("dismiss_explorer") >= 0) return "dismiss_explorer";
			if (action.indexOf("heal_explorer_") == 0) return "heal_explorer";
			if (action.indexOf("deselect_explorer") >= 0) return "deselect_explorer";
			if (action.indexOf("select_explorer") >= 0) return "select_explorer";
			if (action.indexOf("dismiss_recruit_") >= 0) return "dismiss_recruit";
			if (action.indexOf("move_camp_global_") >= 0) return "move_camp_global";
			if (action.indexOf("start_dialogue") >= 0) return "start_dialogue";
			if (action.indexOf("end_dialogue") >= 0) return "end_dialogue";
			if (action.indexOf("select_dialogue_option") >= 0) return "select_dialogue_option";
			if (action.indexOf("build_out_passage") >= 0) {
				var parts = action.split("_");
				if (isNaN(parts[parts.length-1]))
					return action;
				return action.substring(0, action.lastIndexOf("_"));
			}
			return action;
		},
		
		getActionIDParam: function (action) {
			var remainder = action.replace(this.getBaseActionID(action) + "_", "");
			if (remainder && remainder !== action) return remainder;
			return "";
		},

		getRequirements: function (action, baseActionID) {
			baseActionID = baseActionID || this.getBaseActionID(action);
			return this.getRequirementsFromRaw(PlayerActionConstants.requirements[action] || PlayerActionConstants.requirements[baseActionID]);
		},

		getRequirementsFromRaw: function (reqs) {
			reqs = reqs || {};

			if (reqs.playerCanExplore) {
				reqs.playerInventory = reqs.playerInventory || {};
				reqs.playerInventory.resource_water = [ 3, -1 ];
				reqs.playerInventory.resource_food = [ 3, -1 ];
				reqs.stamina = [ 200, -1 ];
			}

			return reqs;
		},
		
		getImprovementNameForAction: function (action, disableWarnings) {
			let baseId = this.getBaseActionID(action);
			
			if (this.isImproveBuildingAction(baseId)) {
				let improvementID = this.getImprovementIDForAction(action);
				return improvementNames[improvementID];
			}
			
        	switch (baseId) {
				case "build_out_collector_food": return improvementNames.collector_food;
                case "build_out_collector_water": return improvementNames.collector_water;
                case "build_out_beacon": return improvementNames.beacon;
                case "build_in_home": return improvementNames.home;
                case "build_in_house": return improvementNames.house;
                case "build_in_storage": return improvementNames.storage;
                case "build_in_hospital": return improvementNames.hospital;
                case "build_in_tradepost": return improvementNames.tradepost;
                case "build_in_inn": return improvementNames.inn;
                case "build_out_spaceship1": return improvementNames.spaceship1;
                case "build_out_spaceship2": return improvementNames.spaceship2;
                case "build_out_spaceship3": return improvementNames.spaceship3;
                case "build_in_campfire": return improvementNames.campfire;
                case "build_in_darkfarm": return improvementNames.darkfarm;
                case "build_in_garden": return improvementNames.garden;
                case "build_in_square": return improvementNames.square;
                case "build_in_house2": return improvementNames.house2;
                case "build_in_generator": return improvementNames.generator;
                case "build_in_lights": return improvementNames.lights;
                case "build_in_apothecary": return improvementNames.apothecary;
                case "build_in_smithy": return improvementNames.smithy;
                case "build_in_cementmill": return improvementNames.cementmill;
                case "build_in_robotFactory": return improvementNames.robotFactory;
                case "build_in_library": return improvementNames.library;
                case "build_in_shrine": return improvementNames.shrine;
                case "build_in_temple": return improvementNames.temple;
                case "build_in_barracks": return improvementNames.barracks;
                case "build_in_fortification": return improvementNames.fortification;
                case "build_in_aqueduct": return improvementNames.aqueduct;
                case "build_in_stable": return improvementNames.stable;
                case "build_in_market": return improvementNames.market;
                case "improve_in_market": return improvementNames.market;
                case "build_in_radiotower": return improvementNames.radiotower;
                case "build_in_researchcenter": return improvementNames.researchcenter;
                case "build_out_passage_up_stairs": return improvementNames.passageUpStairs;
                case "build_out_passage_up_elevator": return improvementNames.passageUpElevator;
                case "build_out_passage_up_hole": return improvementNames.passageUpHole;
                case "build_out_passage_down_stairs": return improvementNames.passageDownStairs;
                case "build_out_passage_down_elevator": return improvementNames.passageDownElevator;
                case "build_out_passage_down_hole": return improvementNames.passageDownHole;
                case "send_caravan": return improvementNames.tradepost;
                case "build_out_camp": return improvementNames.camp;
			}
			
			for (var key in improvementNames) {
				var improvementName = improvementNames[key];
				var improvementActionName = this.getActionNameForImprovement(improvementName, disableWarnings);
				if (improvementActionName == baseId) {
					return improvementName;
				}
			}
			if (!disableWarnings) {
				log.w("No improvement name found for action " + action);
			}
			return "";
		},
		
		getActionBusyDescription: function (baseActionID) {
			switch (baseActionID) {
				case "use_in_home": return "resting";
				case "use_in_campfire": return "conversing";
				case "use_in_campfire_2": return "lighting";
				case "use_in_hospital": return "recovering";
				case "use_in_hospital_2": return "augmenting";
				case "use_in_market": return "visiting";
				case "use_in_library": return "studying";
				case "use_in_temple": return "donating";
				case "use_in_shrine": return "meditating";
				case "clear_waste_t": return "clearing waste";
				case "clear_waste_r": return "clearing waste";
				case "launch": return "launch";	
				default: return baseActionID;
			}
		},
		
		getImprovementIDForAction: function (actionName) {
			let baseId = this.getBaseActionID(actionName);
			if (this.isImproveBuildingAction(baseId)) {
				return actionName.replace("improve_in_", "").replace("improve_out_", "");
			}
			if (this.isUseImprovementAction(baseId)) {
				return actionName.replace("use_in_", "").replace("use_out_", "");
			}
			if (this.isRepairBuildingAction(baseId)) {
				return actionName.replace("repair_in_", "").replace("repar_out_", "");
			}
			if (baseId == "dismantle") {
				let result = actionName;
				result = result.replace("dismantle_in_", "");
				result = result.replace("dismantle_out_", "");
				return result;
			}
			let improvementName = this.getImprovementNameForAction(actionName);
			return ImprovementConstants.getImprovementID(improvementName);
		},

		getActionNameForImprovement: function (improvementName, disableWarnings) {
			switch (improvementName) {
				case improvementNames.collector_food: return "build_out_collector_food";
				case improvementNames.collector_water: return "build_out_collector_water";
				case improvementNames.beacon: return "build_out_beacon";
				case improvementNames.home: return "build_in_home";
				case improvementNames.house: return "build_in_house";
				case improvementNames.storage: return "build_in_storage";
				case improvementNames.hospital: return "build_in_hospital";
				case improvementNames.tradepost: return "build_in_tradepost";
				case improvementNames.inn: return "build_in_inn";
				case improvementNames.spaceship1: return "build_out_spaceship1";
				case improvementNames.spaceship2: return "build_out_spaceship2";
				case improvementNames.spaceship3: return "build_out_spaceship3";
				case improvementNames.campfire: return "build_in_campfire";
				case improvementNames.darkfarm: return "build_in_darkfarm";
				case improvementNames.garden: return "build_in_garden";
				case improvementNames.square: return "build_in_square";
				case improvementNames.house2: return "build_in_house2";
				case improvementNames.generator: return "build_in_generator";
				case improvementNames.lights: return "build_in_lights";
				case improvementNames.apothecary: return "build_in_apothecary";
				case improvementNames.smithy: return "build_in_smithy";
				case improvementNames.cementmill: return "build_in_cementmill";
				case improvementNames.robotFactory: return "build_in_robotFactory";
				case improvementNames.library: return "build_in_library";
				case improvementNames.shrine: return "build_in_shrine";
				case improvementNames.temple: return "build_in_temple";
				case improvementNames.barracks: return "build_in_barracks";
				case improvementNames.fortification: return "build_in_fortification";
				case improvementNames.aqueduct: return "build_in_aqueduct";
				case improvementNames.stable: return "build_in_stable";
				case improvementNames.market: return "build_in_market";
				case improvementNames.radiotower: return "build_in_radiotower";
				case improvementNames.researchcenter: return "build_in_researchcenter";
				case improvementNames.passageUpStairs: return "build_out_passage_up_stairs";
				case improvementNames.passageUpElevator: return "build_out_passage_up_elevator";
				case improvementNames.passageUpHole: return "build_out_passage_up_hole";
				case improvementNames.passageDownStairs: return "build_out_passage_down_stairs";
				case improvementNames.passageDownElevator: return "build_out_passage_down_elevator";
				case improvementNames.passageDownHole: return "build_out_passage_down_hole";
				case improvementNames.greenhouse: return "build_out_greenhouse";
				case improvementNames.tradepost_connector: return "build_out_tradepost_connector";
				case improvementNames.sundome: return "build_out_sundome";
				case improvementNames.luxuryOutpost: return "build_out_luxury_outpost";
				case improvementNames.camp: return "";
				default:
					if (!disableWarnings) {
						log.w("No improvement action name found for improvement " + improvementName);
					}
					return "";
			}
		},
		
		isImproveBuildingAction: function (baseActionID) {
			return baseActionID == "improve_in" || baseActionID == "improve_out";
		},
		
		isUseImprovementAction: function (baseActionID) {
			return baseActionID.indexOf("use_in_") >= 0 || baseActionID.indexOf("use_out_") >= 0
		},
		
		isBuildImprovementAction: function (baseActionID) {
			return baseActionID.indexOf("build_in_") >= 0 || baseActionID.indexOf("build_out_") >= 0
		},
		
		isRepairBuildingAction: function (baseActionID) {
			return baseActionID == "repair_in" || baseActionID == "repair_out";
		},
		
		isProjectAction: function (baseActionID) {
			let improvementName = this.getImprovementNameForAction(baseActionID, true);
			return improvementName && ImprovementConstants.isProject(improvementName);
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
			if (action == 'wait') return true;
			return false;
		},

		isActionAllowedWhileNotAwake: function (action) {
			if (action == "get_up") return true;

			return false;
		},

		// defines if the action (with duration) marks the player as "busy" or if it can happen in the background
		isBusyAction: function (baseActionID) {
			if (baseActionID.indexOf('build_in') === 0) return false;
			if (baseActionID.indexOf('improve_in') === 0) return false;
			if (baseActionID.indexOf('build_out') === 0) {
				let improvementName = this.getImprovementNameForAction(baseActionID);
				let improvementID = ImprovementConstants.getImprovementID(improvementName);
				let improvementDef = ImprovementConstants.getDef(improvementID);
				return improvementDef.isProject ? false : true;
			}
			
			switch (baseActionID) {
				case "send_caravan":
				case "clear_debris":
				case "clear_explosives":
				case "bridge_gap":
					return false;
				default:
					return true;
			}
		}

	};
	
	PlayerActionConstants.loadData(PlayerActionData);

	return PlayerActionConstants;

});
