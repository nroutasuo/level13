 define([
	'ash',
	'text/Text',
	'utils/MathUtils',
	'utils/UIState',
	'utils/UIList',
	'utils/UIAnimations',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/CharacterConstants',
	'game/constants/ImprovementConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/UIConstants',
	'game/constants/UpgradeConstants',
	'game/constants/OccurrenceConstants',
	'game/constants/CampConstants',
	'game/constants/DialogueConstants',
	'game/constants/TextConstants',
	'game/constants/TribeConstants',
	'game/nodes/level/PlayerLevelNode',
	'game/nodes/PlayerPositionNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/tribe/TribeUpgradesNode',
	'game/components/player/PerksComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/common/CampComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/ReputationComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'text/Text'
], function (
	Ash, Text, MathUtils, UIState, UIList, UIAnimations, GameGlobals, GlobalSignals,
	CharacterConstants, ImprovementConstants, PlayerActionConstants, UIConstants, UpgradeConstants, OccurrenceConstants, CampConstants, DialogueConstants, TextConstants, TribeConstants,
	PlayerLevelNode, PlayerPositionNode, PlayerLocationNode, TribeUpgradesNode,
	PerksComponent, PlayerActionComponent,
	CampComponent, ResourcesComponent, ResourceAccumulationComponent, OutgoingCaravansComponent, ReputationComponent, SectorImprovementsComponent, CampEventTimersComponent,
	Text
) {
	let UIOutCampSystem = Ash.System.extend({
		
		context: "UIOutCampSystem",

		engine: null,

		playerPosNodes: null,
		playerLocationNodes: null,
		playerLevelNodes: null,
		tribeUpgradesNodes: null,

		bubbleNumber: -1,
		
		visibleBuildingCount: 0,
		availableBuildingCount: 0,
		lastShownVisibleBuildingCount: 0,
		lastShownAvailableBuildingCount: 0,
		currentEvents: 0,
		lastShownEvents: 0,

		elements: {
			improvementRows: [],
			steppers: {},
		},

		constructor: function () {
			this.initImprovements();
			this.initWorkers();
			this.initElements();
		},
		
		initElements: function () {
			this.campActionList = UIList.create(this, $("#in-occurrences-building-container"), this.createCampActionListItem, this.updateCampActionListItem, this.isCampActionListItemDataSame);
			this.campOccurrencesList = UIList.create(this, $("#in-occurrences-camp-container"), this.createCampActionListItem, this.updateCampOccurrenceListItem, this.isCampOccurrenceListItemDataSame);
			this.campMiscEventsList = UIList.create(this, $("#in-occurrences-misc-container"), this.createCampActionListItem, this.updateCampMiscEventListItem);
			this.characterList = UIList.create(this, $("#in-characters ul"), this.createCharacterListItem, this.updateCharacterListItem);

			this.elements.populationAutoassignedLabel = $("#in-population #in-population-autoassigned");
			this.elements.populationAutoAssignToggle = $(".in-assign-workers-auto-toggle");
			this.elements.populationDecreaseHint = $("#in-population-decrease-hint");
			this.elements.populationDetailsContainer = $("#in-population-details");
			this.elements.populationHeader = $("#in-population h3");
			this.elements.populationProgressBar = $("#in-population-bar-next");
			this.elements.populationProgressBarLabel = $("#in-population-bar-next .progress-label");
			this.elements.populationProgressLabel = $("#in-population-next");
			this.elements.populationReputationRequirementLabel = $("#in-population-reputation");
			this.elements.populationRobotsChangeIndicator = $("#robots-change-indicator");
			this.elements.populationRobotsContainer = $("#in-population #in-population-robots");
			this.elements.populationRobotsContainer = $("#in-population-robots");
			this.elements.populationRobotsLabel = $("#in-population #in-population-robots .value");
			this.elements.populationUnassignedLabel = $("#in-population #in-population-status span");
			this.elements.unassignedWorkersBubble = $("#unassigned-workers-bubble");
			this.elements.workersTable = $("#in-assign-workers");
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLevelNodes = engine.getNodeList(PlayerLevelNode);
			this.tribeUpgradesNodes = engine.getNodeList(TribeUpgradesNode);
			
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.onTabChanged);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.onImprovementBuilt);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.onPlayerPositionChanged);
			GlobalSignals.add(this, GlobalSignals.playerLocationChangedSignal, this.onPlayerPositionChanged);
			GlobalSignals.add(this, GlobalSignals.campRenamedSignal, this.onCampRenamed);
			GlobalSignals.add(this, GlobalSignals.populationChangedSignal, this.onPopulationChanged);
			GlobalSignals.add(this, GlobalSignals.campEventEndedSignal, this.onCampEventEnded);
			GlobalSignals.add(this, GlobalSignals.workersAssignedSignal, this.onWorkersAssigned);
			GlobalSignals.add(this, GlobalSignals.gameShownSignal, this.onGameShown);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
			GlobalSignals.add(this, GlobalSignals.gameStartedSignal, this.refresh);

			this.refresh();
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerLocationNodes = null;
			this.playerPosNodes = null;
			this.playerLevelNodes = null;
			this.tribeUpgradesNodes = null;

			GlobalSignals.removeAll(this);
		},

		update: function () {
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in;
			
			if (!this.playerLocationNodes.head) return;
			if (!this.playerPosNodes.head.position.inCamp) return;
			if (GameGlobals.gameState.uiStatus.isTransitioning) return;

			this.updateEvents(isActive);
			this.updatePopulationDisplayFast();
		},

		slowUpdate: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head) return;

			this.updateImprovements();
			this.updateBubble();
			this.updateStats();
			this.updatePopulationDisplaySlow();
		},

		refresh: function () {
			if (!this.playerLocationNodes.head) return;
			if (!this.playerPosNodes.head.position.inCamp) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;

			let campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;

			let position = this.playerPosNodes.head.position.getPosition();
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);

			// Header
			let isOutpost = GameGlobals.campBalancingHelper.isOutpost(campOrdinal);
			let headerTextKey = "ui.camp.page_header_default";
			if (isOutpost) headerTextKey = "ui.camp.page_header_outpost";
			GameGlobals.uiFunctions.setText("#tab-header h2", headerTextKey);

			this.updateAssignedWorkers();
			this.updateWorkerMaxDescriptions();
			this.updateImprovements();
			this.updateStats();
			this.updateBubble();
			this.updateCharactersDisplay();
			this.updatePopulationDisplaySlow();
			this.updatePopulationDisplayFast();
		},

		updateBubble: function () {
			let campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
			let campCount = GameGlobals.gameState.numCamps;
			
			let buildingNum = this.visibleBuildingCount - this.lastShownVisibleBuildingCount;
			if (campCount == 1) {
				buildingNum = this.availableBuildingCount - this.lastShownAvailableBuildingCount;
			}
			
			let eventNum = this.currentEvents - this.lastShownEvents;

			let freePopulation = campComponent.getFreePopulation();

			let newBubbleNumber = buildingNum + eventNum + freePopulation;
			
			GameGlobals.uiFunctions.updateBubble("#switch-in .bubble", this.bubbleNumber, newBubbleNumber);
			this.bubbleNumber = newBubbleNumber;
		},

		getCampMaxPopulation: function () {
			if (!this.playerLocationNodes.head) return;
			return GameGlobals.campHelper.getCampMaxPopulation(this.playerLocationNodes.head.entity);
		},

		updateWorkerStepper: function (campComponent, id, workerType, maxWorkers, showMax, isAutoAssigned) {
			GameGlobals.uiFunctions.toggle($(id).closest("tr"), maxWorkers > 0);

			var freePopulation = campComponent.getFreePopulation() || 0;
			var assignedWorkers = Math.max(0, campComponent.assignedWorkers[workerType]) || 0;
			var maxAssigned = Math.min(assignedWorkers + freePopulation, maxWorkers);
			GameGlobals.uiFunctions.updateStepper(id, assignedWorkers, 0, maxAssigned);
			
			let $checkbox = $("#in-assing-worker-auto-" + workerType);
			$checkbox.prop("checked", isAutoAssigned);

			$(id).parent().siblings(".in-assign-worker-limit").children(".callout-container").children(".info-callout-target").html(showMax ? "<span>/ " + maxWorkers + "</span>" : "");
		},

		updatePopulationDisplaySlow: function () {
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in;
			if (!isActive) return;
			if (GameGlobals.gameState.uiStatus.isBlocked) return;

			let camp = this.playerLocationNodes.head.entity;
			let campComponent = camp.get(CampComponent);
			if (!campComponent) return;

			let currentPopulation =  Math.floor(campComponent.population);
			let maxPopulation = this.getCampMaxPopulation();
			
			// reputation requirements
			let reputation = camp.get(ReputationComponent).value;
			let reqRepCur = CampConstants.getRequiredReputation(Math.floor(campComponent.population));
			let reqRepNext = CampConstants.getRequiredReputation(Math.floor(campComponent.population) + 1);
			let isReputationBlocking = reqRepNext < reputation;
			GameGlobals.uiFunctions.setText(this.elements.populationReputationRequirementLabel, "ui.camp.population_reputation_status_field", { current: reqRepCur, next: reqRepNext });

			// population header
			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationHeader, null, maxPopulation > 0 || campComponent.population > 0, 200, 200);
			GameGlobals.uiFunctions.setText(this.elements.populationHeader, "ui.camp.population_header", { current: currentPopulation, max: maxPopulation });

			// unassigned workers
			let freePopulation = campComponent.getFreePopulation();
			GameGlobals.uiFunctions.toggle(this.elements.unassignedWorkersBubble, freePopulation > 0);
			GameGlobals.uiFunctions.setText(this.elements.populationUnassignedLabel, "ui.camp.population_unassigned_workers_field", { value: freePopulation });

			// auto-assigned workers
			let autoAssignedWorkers = campComponent.getAutoAssignedWorkers();
			let autoAssignedWorkersNames = autoAssignedWorkers.map(workerType => CampConstants.getWorkerDisplayName(workerType));
			let autoAssignedWorkersText = TextConstants.getListText(autoAssignedWorkersNames, 3);
			GameGlobals.uiFunctions.setText(this.elements.populationAutoassignedLabel, "ui.camp.population_auto_assigned_workers_field", { value: autoAssignedWorkersText });
			GameGlobals.uiFunctions.toggle(this.elements.populationAutoAssignToggle, GameGlobals.gameState.unlockedFeatures.workerAutoAssignment);
		},

		updatePopulationDisplayFast: function () {
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in;
			if (!isActive) return;
			if (GameGlobals.gameState.uiStatus.isBlocked) return;

			let camp = this.playerLocationNodes.head.entity;
			let campComponent = camp.get(CampComponent);
			if (!campComponent) return;
			
			let maxPopulation = this.getCampMaxPopulation();

			let isPopulationMaxed = campComponent.population >= maxPopulation;
			let populationChangePerSec = campComponent.populationChangePerSec || 0;
			let populationChangePerSecWithoutCooldown = campComponent.populationChangePerSecWithoutCooldown || 0;
			
			let isOnPopulationDecreaseCooldown = campComponent.populationDecreaseCooldown;

			let populationProgressLabelKey = populationChangePerSec >= 0 && !isOnPopulationDecreaseCooldown ? "ui.camp.population_next_worker_progress_label" : "ui.camp.population_worker_leaving_progress_label";

			GameGlobals.uiFunctions.setText(this.elements.populationProgressLabel, populationProgressLabelKey);
			
			let isPopulationStill = populationChangePerSecWithoutCooldown === 0 && !isOnPopulationDecreaseCooldown;

			let secondsToChange = 0;
			let progress = 0;

			let populationOverflow = (campComponent.population - Math.floor(campComponent.population));
			if (populationChangePerSecWithoutCooldown > 0) {
				progress = populationOverflow;
				secondsToChange = (1 - populationOverflow) / populationChangePerSec;
			} else if(populationChangePerSec < 0 || isOnPopulationDecreaseCooldown) {
				let secondsToLoseOnePop = 1 / -populationChangePerSecWithoutCooldown + CampConstants.POPULATION_DECREASE_COOLDOWN;
				secondsToChange = (campComponent.populationDecreaseCooldown || 0) + (populationOverflow / -populationChangePerSecWithoutCooldown);
				progress = secondsToChange / secondsToLoseOnePop;

				let hint = this.getPopulationDecreaseHint();
				if (hint) this.elements.populationDecreaseHint.text("People are leaving because of: " + hint);
			}

			let progressLabel = UIConstants.getTimeToNum(secondsToChange);
			
			if (populationChangePerSec === 0) progressLabel = "no change";
			if (isOnPopulationDecreaseCooldown) progressLabel = "cooldown";

			this.elements.populationProgressBar.toggleClass("warning", populationChangePerSec < 0);
			this.elements.populationProgressBar.data("progress-percent", progress * 100);
			this.elements.populationProgressBar.data("animation-length", 500);
			this.elements.populationProgressBarLabel.text(progressLabel);

			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationReputationRequirementLabel, null, (maxPopulation > 0 && !isPopulationMaxed) || populationChangePerSecWithoutCooldown < 0, 200, 200);
			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationProgressBar, null, campComponent.population > 0 && !isPopulationStill, 200, 200);
			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationProgressLabel, null, campComponent.population > 0 && !isPopulationStill, 200, 200);
			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationDetailsContainer, null, campComponent.population >= 1, 200, 200);
			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationAutoassignedLabel, null, GameGlobals.gameState.unlockedFeatures.workerAutoAssignment, 200, 200);
			GameGlobals.uiFunctions.slideToggleIf(this.elements.workersTable, null, campComponent.population >= 1, 200, 200);
			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationDecreaseHint, null, populationChangePerSecWithoutCooldown < 0);
			
			this.updatePopulationDisplayRobots();
		},

		updatePopulationDisplayRobots: function () {
			let camp = this.playerLocationNodes.head.entity;
			let resources = camp.get(ResourcesComponent);

			let robots = resources.resources.robots || 0;
			let maxRobots = GameGlobals.campHelper.getRobotStorageCapacity(camp);

			GameGlobals.uiFunctions.slideToggleIf(this.elements.populationRobotsContainer, null, robots > 0, 200, 200);

			if (robots <= 0) return;

			GameGlobals.uiFunctions.updateText(this.elements.populationRobotsLabel, Math.floor(robots) + " / " + maxRobots);

			let campResourceAcc = this.playerLocationNodes.head.entity.get(ResourceAccumulationComponent);
			let robotBonus = GameGlobals.campBalancingHelper.getWorkerRobotBonus(robots);
			let robotSources = campResourceAcc.getSources(resourceNames.robots);
			
			let robotCalloutContent = "";

			for (let i in robotSources) {
				let source = robotSources[i];
				if (source.amount != 0) {
					robotCalloutContent += UIConstants.getResourceAccumulationSourceText(source) + "<br/>";
				}
			}
			
			robotCalloutContent += "<br/>worker resource production: +" + UIConstants.roundValue(robotBonus * 100, true, false) + "%";
			UIConstants.updateCalloutContent(this.elements.populationRobotsContainer, robotCalloutContent);
			
			let robotsAccumulationRaw = campResourceAcc.getChange(resourceNames.robots);
			let robotsAccumulation = robots <= maxRobots || robotsAccumulationRaw < 0 ? robotsAccumulationRaw : 0;
			this.updateChangeIndicator(this.elements.populationRobotsChangeIndicator, robotsAccumulation);
		},

		updateChangeIndicator: function (indicator, accumulation) {
			indicator.toggleClass("indicator-increase", accumulation > 0);
			indicator.toggleClass("indicator-even", accumulation === 0);
			indicator.toggleClass("indicator-decrease", accumulation < 0);
		},

		updateAssignedWorkers: function (campComponent) {
			var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
				
			for (let key in CampConstants.workerTypes) {
				var def = CampConstants.workerTypes[key];
				UIConstants.updateCalloutContent("#in-assign-" + key + " .in-assign-worker-desc .info-callout-target", this.getWorkerDescription(def), true);
			}
			
			for (let key in CampConstants.workerTypes) {
				let def = CampConstants.workerTypes[key];
				let maxWorkers = GameGlobals.campHelper.getMaxWorkers(this.playerLocationNodes.head.entity, key);
				let showMax = maxWorkers >= 0;
				let isAutoAssigned = campComponent.autoAssignedWorkers[key] || false;
				if (maxWorkers < 0) maxWorkers = GameGlobals.campHelper.getCampMaxPopulation(this.playerLocationNodes.head.entity);
				this.updateWorkerStepper(campComponent, "#stepper-" + def.id, def.id, maxWorkers, showMax, isAutoAssigned);
			}
		},

		updateWorkerMaxDescriptions: function () {
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var posComponent = this.playerPosNodes.head.position;
            var campOrdinal = GameGlobals.gameState.getCampOrdinal(posComponent.level);
            var workshops = GameGlobals.levelHelper.getWorkshopsByResourceForCamp(campOrdinal);
			
			for (var key in CampConstants.workerTypes) {
				var def = CampConstants.workerTypes[key];
				var maxWorkers = GameGlobals.campHelper.getMaxWorkers(this.playerLocationNodes.head.entity, key);
				if (maxWorkers <= 0) continue;
				var num = def.getLimitNum(improvements, workshops);
				var text = def.getLimitText(num);
				UIConstants.updateCalloutContent("#in-assign-" + def.id + " .in-assign-worker-limit .info-callout-target", text, true);
			}
		},

		updateCharacters: function () {
			this.updateCharactersSelection();
			this.updateCharactersDisplay();
		},

		updateCharactersSelection: function () {
			let campComponent = this.playerLocationNodes.head.entity.get(CampComponent);

			if (!campComponent) return;

			let improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			let population = campComponent.population;
			let hasCampfire = improvements.getCount(improvementNames.campfire);

			let validCharacters = GameGlobals.campHelper.getValidCampCharacters(campComponent);

			if (!hasCampfire || population < 1 || validCharacters.length < 1) {
				campComponent.displayedCharacters = [];
				return;
			}

			let currentCharacters = campComponent.displayedCharacters || [];

			let isCurrentSelectionValid = currentCharacters.length > 0;

			for (let i = 0; i < currentCharacters.length; i++) {
				let currentCharacter = currentCharacters[i];
				if (validCharacters.indexOf(currentCharacter) < 0) {
					isCurrentSelectionValid = false;
					break;
				}
			}

			let maxNumCharacters = 1;
			if (population > 4) maxNumCharacters = 2;
			if (population > 16) maxNumCharacters = 3;
			if (population > 32) maxNumCharacters = 4;
			if (population > 60) maxNumCharacters = 5;
			maxNumCharacters = Math.min(maxNumCharacters, validCharacters.length);
			let minCharacters = Math.max(1, Math.floor(maxNumCharacters / 2));

			if (currentCharacters.length < minCharacters || currentCharacters.length > maxNumCharacters) isCurrentSelectionValid = false;

			let timestamp = new Date().getTime();
			if (timestamp - campComponent.displayedCharactersRefreshTimestamp > 1000 * 60 * 10) isCurrentSelectionValid = false;

			if (isCurrentSelectionValid) return;

			let numCharacters = MathUtils.randomIntBetween(minCharacters, maxNumCharacters);

			let currentNumCharacters = currentCharacters.length;
			let keepNumCharacters = Math.max(0, Math.min(currentNumCharacters - 1, numCharacters - 1));

			let characters = [];
			let validCharactersRemaining = validCharacters.slice();
			let charactersToKeep = MathUtils.randomElements(currentCharacters, keepNumCharacters);

			for (let i = 0; i < numCharacters; i++) {
				let character;
				if (charactersToKeep[i] && validCharacters.indexOf(charactersToKeep[i]) >= 0) {
					character = charactersToKeep[i];
				} else {
					character = MathUtils.randomElement(validCharacters);
				}

				validCharactersRemaining.splice(validCharactersRemaining.indexOf(character), 1);
				characters.push(character);
			}

			campComponent.displayedCharacters = characters;

			log.i("selected displayed characters: " + characters.join(","));
		},

		updateCharactersDisplay: function () {
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.in) return;
			let sector = this.playerLocationNodes.head.entity;
			let campComponent = sector.get(CampComponent);
			if (!campComponent) return;

			let characterData = campComponent.displayedCharacters || [];
			UIList.update(this.characterList, characterData);
				GameGlobals.uiFunctions.createButtons("#in-characters");
		},

		createCharacterListItem: function () {
			let li = {};
			let $root = $("<li>" + UIConstants.getNPCDiv(null, null, null) + "</li>");
			li.$root = $root;
			li.$container = $root.find("div.npc-container");
			return li;
		},

		updateCharacterListItem: function (li, data) {
			let characterType = data;
			let setting = DialogueConstants.dialogueSettings.interact;
			let dialogueSource = CharacterConstants.getDialogueSource(characterType);
			let talkActionID = "start_in_npc_dialogue_" + characterType + "_" + dialogueSource.id + "_" + setting;
			UIConstants.updateNPCDiv(li.$container, characterType, setting, talkActionID);
		},

		initImprovements: function () {
			var $table = $("#in-improvements table");
			var trs = "";
			this.elements.improvementRows = {};
			
			let improvementIDs = Object.keys(ImprovementConstants.improvements).sort(this.sortImprovements);
			
			for (let i = 0; i < improvementIDs.length; i++) {
				let key = improvementIDs[i];
				let def = ImprovementConstants.improvements[key];
				let name = improvementNames[key];
				if (getImprovementType(name) !== improvementTypes.camp) continue;
				let tds = "";
				let buildAction = "build_in_" + key;
				let improveAction = "improve_in_" + key;
				let hasImproveAction = PlayerActionConstants.hasAction(improveAction);
				let useAction = "use_in_" + key;
				let hasUseAction = PlayerActionConstants.hasAction(useAction);
				let useActionExtra = "use_in_" + key + "_2";
				let hasUseActionExtra = PlayerActionConstants.hasAction(useActionExtra);
				let dismantleAction = "dismantle_in_" + key;
				let canBeDismantled = def.canBeDismantled || false;
				
				let buildButton = "<button class='action action-build action-location' action='" + buildAction +"'>" + "" + "</button>";
				var useButton = "";
				if (hasUseAction) {
					useButton = "<button class='action action-use action-location btn-narrow' action='" + useAction + "'>" + def.useActionName + "</button>";
				}
				let useButton2 = "";
				if (hasUseActionExtra) {
					useButton2 = "<button class='action action-use2 action-location btn-narrow' action='" + useActionExtra + "'>" + def.useActionName2 + "</button>";
				}
				let improveButton = "";
				if (hasImproveAction) {
					improveButton = "<button class='action action-improve btn-glyph-big' action='" + improveAction + "'></button>";
				}
				let dismantleButton = "";
				if (canBeDismantled) {
					dismantleButton = "<button class='action action-dismantle btn-glyph-big' action='" + dismantleAction + "'>×</button>";
				}
				let repairButton = "<button class='action action-repair btn-narrow' action='repair_in_" + key + "'>Repair</button>";
				let damagedIcon = "<img src='img/eldorado/icon-gear-warning.png' class='icon-damaged icon-ui-generic icon-centered' alt='Building damaged' title='Building damaged' />"
				
				tds += "<td>" + buildButton + "</td>";
				tds += "<td><span class='improvement-badge improvement-count'>0</span></td>";
				tds += "<td style='position:relative'><span class='improvement-badge improvement-level'>0</span>";
				tds += "</td>";
				tds += "<td>" + improveButton + "" + damagedIcon + "</td>";
				tds += "<td>" + dismantleButton + "</td>";
				tds += "<td>" + useButton + "" + useButton2 + "" + repairButton + "</td>";
				trs += "<tr id='in-improvements-" + key + "'>" + tds + "</tr>";
			}
			let ths = "<tr class='header-mini'><th></th><th>count</th><th>lvl</th><th></th><th></th><th></th></tr>"
			$table.append(ths);
			$table.append(trs);
			
			// TODO save elements already in the previous loop
			let result = [];
			$.each($("#in-improvements tr"), function () {
				if ($(this).hasClass("header-mini")) return;
				var id = $(this).attr("id");
				var buildAction = $(this).find("button.action-build").attr("action");
				if (!buildAction) {
					log.w("In improvement tr without action name: #" + id);
					log.i($(this))
					return;
				}
				let improveAction = $(this).find("button.action-improve").attr("action");
				let improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(buildAction);
				if (!improvementName) return;
				let btnBuild = $(this).find(".action-build");
				let btnUse = $(this).find(".action-use");
				let btnUse2 = $(this).find(".action-use2");
				let btnImprove = $(this).find(".action-improve");
				let btnDismantle = $(this).find(".action-dismantle");
				let btnRepair = $(this).find(".action-repair");
				let iconDamaged = $(this).find(".icon-damaged");
				let count = $(this).find(".improvement-count")
				let level = $(this).find(".improvement-level")
				result.push({ tr: $(this), btnBuild: btnBuild, btnUse: btnUse, btnUse2: btnUse2, btnImprove: btnImprove, btnDismantle: btnDismantle, btnRepair: btnRepair, iconDamaged: iconDamaged, count: count, level: level, id: id, action: buildAction, improveAction: improveAction, improvementName: improvementName });
			});
			this.elements.improvementRows = result;
		},
		
		initWorkers: function () {
			let $table = $("#in-assign-workers");
			let trs = "";
			
			for (let key in CampConstants.workerTypes) {
				let def = CampConstants.workerTypes[key];
				let tds = "";
				let displayName = CampConstants.getWorkerDisplayName(key);
				tds += "<td class='in-assign-worker-desc'><div class='info-callout-target info-callout-target-small'>" + displayName + "</div></td>";
				tds += "<td><div class='stepper' id='stepper-" + def.id + "'></div></td>";
				tds += "<td class='in-assign-worker-limit'><div class='info-callout-target info-callout-target-small'></div></td>"
				tds += "<td class='in-assign-worker-auto'><input type='checkbox' id='in-assing-worker-auto-" + def.id + "' class='in-assign-workers-auto-toggle' title='Auto-assign worker' /></td>"
				
				trs += "<tr id='in-assign-" + key + "'>" + tds + "</tr>";
			}
			
			$table.append(trs);
			
			$("#in-assign-workers .in-assign-workers-auto-toggle").change({ sys: this }, this.onAutoAssignWorkerToggled);
		},

		updateImprovements: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head) return;
			var isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in;
			var campCount = GameGlobals.gameState.numCamps;

			let improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			let hasTradePost = improvements.getCount(improvementNames.tradepost) > 0;
			let hasDeity = GameGlobals.tribeHelper.hasDeity();
			let isSmallLayout = $("body").hasClass("layout-small");

			var availableBuildingCount = 0;
			var visibleBuildingCount = 0;

			for (let i = 0; i < this.elements.improvementRows.length; i++) {
				var elem = this.elements.improvementRows[i];
				var buildAction = elem.action;
				var id = elem.id;
				var improveAction = elem.improveAction;
				var improvementName = elem.improvementName;
				var improvementID = ImprovementConstants.getImprovementID(improvementName);
				var requirementCheck = GameGlobals.playerActionsHelper.checkRequirements(buildAction, false, null);
				var buildActionEnabled = requirementCheck.value >= 1;
				var showActionDisabledReason = false;
				if (!buildActionEnabled) {
					switch (requirementCheck.baseReason) {
						case PlayerActionConstants.DISABLED_REASON_LOCKED_RESOURCES:
						case PlayerActionConstants.DISABLED_REASON_NOT_REACHABLE_BY_TRADERS:
						case PlayerActionConstants.DISABLED_REASON_IN_PROGRESS:
						case PlayerActionConstants.DISABLED_REASON_EXPOSED:
							showActionDisabledReason = true;
					}
				}
				var actionAvailable = GameGlobals.playerActionsHelper.checkAvailability(buildAction, false);
				var existingImprovements = improvements.getCount(improvementName);
				
				var useAction = "use_in_" + improvementID;
				var useActionExtra = "use_in_" + improvementID + "_2";
				var hasUseActionExtra = PlayerActionConstants.hasAction(useActionExtra);
				var useActionAvailable = GameGlobals.playerActionsHelper.isRequirementsMet(useAction, null, [ PlayerActionConstants.DISABLED_REASON_BUSY ]);
				var useAction2Available = hasUseActionExtra && GameGlobals.playerActionsHelper.isRequirementsMet(useActionExtra, null, [ PlayerActionConstants.DISABLED_REASON_BUSY ]);
				
				var improvementLevel = improvements.getLevel(improvementName);
				var maxImprovementLevel = GameGlobals.campHelper.getCurrentMaxImprovementLevel(improvementName);
				var majorImprovementLevel = GameGlobals.campHelper.getCurrentMajorImprovementLevel(improvements, improvementName);
				var isNextLevelMajor = GameGlobals.campHelper.getNextMajorImprovementLevel(improvements, improvementName) > majorImprovementLevel;
				
				elem.count.text(existingImprovements);
				elem.count.toggleClass("badge-disabled", existingImprovements < 1);
				elem.level.text(improvementLevel);
				elem.level.toggleClass("badge-disabled", existingImprovements < 1 || !improveAction || maxImprovementLevel <= 1);
				
				elem.btnBuild.find(".btn-label").text(Text.t(ImprovementConstants.getImprovementDisplayNameKey(improvementID, improvementLevel)));
				elem.btnImprove.find(".btn-label").text(isNextLevelMajor ? "▲" : "△")

				var commonVisibilityRule = (buildActionEnabled || existingImprovements > 0 || showActionDisabledReason);
				var specialVisibilityRule = true;
				// TODO get rid of these & move to requirements
				// TODO check TR ids after improvements table remake
				if (id === "in-improvements-shrine") specialVisibilityRule = hasDeity;
				if (id === "in-improvements-tradepost") specialVisibilityRule = campCount > 1;
				if (id === "in-improvements-market") specialVisibilityRule = hasTradePost;
				if (id === "in-improvements-inn") specialVisibilityRule = hasTradePost;
				let isVisible = specialVisibilityRule && commonVisibilityRule;
				let showUseAction2 = (useAction2Available || GameGlobals.playerActionsHelper.isInProgress(useActionExtra)) && !GameGlobals.playerActionsHelper.isInProgress(useAction);
				let showUseAction1 = useActionAvailable || !showUseAction2;
				let isDamaged = improvements.isDamaged(improvementName);
				
				GameGlobals.uiFunctions.toggle(elem.tr, isVisible);
				GameGlobals.uiFunctions.toggle(elem.btnUse, existingImprovements > 0 && showUseAction1 && !isDamaged);
				GameGlobals.uiFunctions.toggle(elem.btnUse2, existingImprovements > 0 && !showUseAction1 && !isDamaged);
				GameGlobals.uiFunctions.toggle(elem.btnImprove, existingImprovements > 0 && maxImprovementLevel > 1 && !isDamaged);
				GameGlobals.uiFunctions.toggle(elem.btnDismantle, !isSmallLayout && existingImprovements > 0);
				GameGlobals.uiFunctions.toggle(elem.btnRepair, isDamaged);
				GameGlobals.uiFunctions.toggle(elem.iconDamaged, isDamaged);
				
				if (isDamaged) {
					// TODO turn it into a normal callout
					// TODO explain effect (reduced defences / production)
					let numBuilt = improvements.getCount(improvementName);
					let numDamaged = improvements.getNumDamaged(improvementName);
					let damageDescription = "Building damaged";
					if (numBuilt > 1) {
						damageDescription += " (" + numDamaged + "/" + numBuilt + ")";
					}
					elem.iconDamaged.attr("alt", damageDescription);
					elem.iconDamaged.attr("title", damageDescription);
					
				}
				
				if (isVisible) visibleBuildingCount++;
				if (actionAvailable) availableBuildingCount++;
			}

			this.availableBuildingCount = availableBuildingCount;
			if (isActive) this.lastShownAvailableBuildingCount = this.availableBuildingCount;
			this.visibleBuildingCount = visibleBuildingCount;
			if (isActive) this.lastShownVisibleBuildingCount = this.visibleBuildingCount;
		},

		updateEvents: function (isActive) {
			isActive = isActive && !GameGlobals.gameState.uiStatus.isBlocked;
			let campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
			let caravansComponent = this.playerLocationNodes.head.entity.get(OutgoingCaravansComponent);

			let hasEvents = false;
			let hasOther = false;

			let showEvents = campComponent.population >= 1 || GameGlobals.gameState.numCamps > 1;
			GameGlobals.uiFunctions.toggle("#in-occurrences", showEvents);
			
			// Camp actions (buildings, projects)
			let campActions = this.getCampActionData();
			UIList.update(this.campActionList, campActions);
			if (campActions.length > 0) hasEvents = true;

			// Camp occurrences (raids, traiders, visitors)
			let campOccurrences = this.getCampOccurrencesData();
			UIList.update(this.campOccurrencesList, campOccurrences);
			if (campOccurrences.length > 0) hasEvents = true;

			// Miscellaneous
			let campMisc = this.getCampMiscEventsData();
			UIList.update(this.campMiscEventsList, campMisc);
			if (campMisc.length > 0) hasEvents = true;
			
			// Outgoing caravans
			var numCaravans = caravansComponent.outgoingCaravans.length;
			hasOther = hasOther || numCaravans > 0;
			if (isActive && showEvents) {
				GameGlobals.uiFunctions.toggle("#in-occurrences-outgoing-caravans-container", numCaravans > 0);
				UIState.refreshState(this, "outgoing-caravans-num", numCaravans, function () {
					$("#in-occurrences-outgoing-caravans-container").empty();
					for (let i = 0; i < numCaravans; i++) {
						var bar = '';
						bar += '<div id="in-occurrences-outgoing-caravans-' + i + '" class="progress-wrap progress">';
						bar += '<div class="progress-bar progress"></div>';
						bar += '<span class="progress progress-label">Outgoing caravan</span>';
						bar += '</div>';
						$("#in-occurrences-outgoing-caravans-container").append(bar);
					}
					GlobalSignals.elementCreatedSignal.dispatch();
				});
				for (let i = 0; i < numCaravans; i++) {
					var caravan = caravansComponent.outgoingCaravans[i];
					// TODO fix to use game time (and check other usages)
					var duration = caravan.returnDuration * 1000;
					var timeLeft = caravan.returnTimeStamp - new Date().getTime();
					$("#in-occurrences-outgoing-caravans-" + i).data("progress-percent", (1 - timeLeft / duration) * 100);
				}
			}

			GameGlobals.uiFunctions.toggle("#in-occurrences-empty", showEvents && !hasEvents && !hasOther);
			
			this.currentEvents = campOccurrences.length;
			if (isActive) this.lastShownEvents = this.currentEvents;
		},
		
		getCampActionData: function () {
			let playerPos = this.playerPosNodes.head.position;
			let playerActionComponent = this.playerPosNodes.head.entity.get(PlayerActionComponent);
			let actions = playerActionComponent.getAllActions();
			let result = [];
			for (let i = 0; i < actions.length; i++) {
				let actionVO = actions[i];
				let action = actionVO.action;
				if (actionVO.isBusy) continue;
				
				let baseActionID = PlayerActionConstants.getBaseActionID(action);
				if (baseActionID == "send_caravan") continue; // shown separately
				
				let improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(action, true);
				let improvementType = getImprovementType(improvementName);
				if (improvementType == improvementTypes.camp && actionVO.level != playerPos.level) continue;
				
				let isProject = improvementName && ImprovementConstants.isProject(improvementName);
				let percent = playerActionComponent.getActionCompletionPercentage(action, actionVO.level);
				if (percent < 100) {
					result.push({ action: action, improvementName: improvementName, percent: percent });
				}
			}
			return result;
		},

		getCampOccurrencesData: function () {
			let sector = this.playerLocationNodes.head.entity;
			let eventTimers = sector.get(CampEventTimersComponent);

			let result = [];

			for (let key in OccurrenceConstants.campOccurrenceTypes) {
				let event = OccurrenceConstants.campOccurrenceTypes[key];
				let duration = OccurrenceConstants.getDuration(event);
				if (duration <= 0) continue;
				let hasEvent = GameGlobals.campHelper.hasEvent(sector, event);
				if (!hasEvent) continue;
				let isEventEnding = duration <= 10 || eventTimers.getEventTimeLeft(event) < 5;

				let percent = eventTimers.getEventTimePercentage(event);
				if (percent < 100) {
					result.push({ event: event, percent: percent, isEnding : isEventEnding });
				}
			}

			return result;
		},

		getCampMiscEventsData: function () {
			let result = [];

			let campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			for (let i = 0; i < campComponent.disabledPopulation.length; i++) {
				let pop = campComponent.disabledPopulation[i];
				if (pop.num > 0) {
					let percent = Math.round((pop.initialTimer - pop.timer) / pop.initialTimer * 100);
					let label = "disabled workers (" + pop.num + ")";
					if (pop.reason == CampConstants.DISABLED_POPULATION_REASON_DISEASE) label = "disease (" + pop.num + ")";
					let isNegative = true;
					result.push({ id: "disabled-worker-" + i, label: label, percent: percent, isNegative: isNegative });
				}
			}
			return result;
		},

		updateStats: function () {
			var campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			if (!campComponent) return;
			
			var levelComponent = this.playerLevelNodes.head.level;
			let sector = this.playerLocationNodes.head.entity;

			var improvements = sector.get(SectorImprovementsComponent);
			var soldiers = sector.get(CampComponent).assignedWorkers.soldier || 0;
			var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
			var raidDanger = GameGlobals.campHelper.getCampRaidDanger(sector);
			var raidDefence = OccurrenceConstants.getRaidDefencePoints(improvements, soldiers, soldierLevel);

			let inGameFoundingDate = UIConstants.getInGameDate(campComponent.foundedTimeStamp);
			let showCalendar = this.tribeUpgradesNodes.head.upgrades.hasUpgrade(GameGlobals.upgradeEffectsHelper.getUpgradeIdForUIEffect(UpgradeConstants.upgradeUIEffects.calendar));
			$("#in-demographics-general-age .value").text(inGameFoundingDate);
			GameGlobals.uiFunctions.toggle("#in-demographics-general-age", showCalendar);
			
			let availableLuxuryResources = GameGlobals.campHelper.getAvailableLuxuryResources(sector);
			let availableLuxuryResourcesInfoText = availableLuxuryResources.map(res => TribeConstants.getLuxuryDisplayName(res)).join(", ");
			$("#in-demographics-general-luxuries .value").text(availableLuxuryResources.length);
			UIConstants.updateCalloutContent($("#in-demographics-general-luxuries .info-icon"), availableLuxuryResourcesInfoText, true);
			GameGlobals.uiFunctions.toggle("#in-demographics-general-luxuries", availableLuxuryResources.length > 0);

			let showRaid = raidDanger > 0 || raidDefence > CampConstants.CAMP_BASE_DEFENCE || campComponent.population > 1;
			if (showRaid) {
				let showRaidWarning = raidDanger > CampConstants.REPUTATION_PENALTY_DEFENCES_THRESHOLD;
				let defenceS = OccurrenceConstants.getRaidDefenceString(improvements, soldiers, soldierLevel);
				$("#in-demographics-raid-danger .value").text(Math.round(raidDanger * 100) + "%");
				$("#in-demographics-raid-danger .value").toggleClass("warning", showRaidWarning);
				UIAnimations.animateOrSetNumber($("#in-demographics-raid-defence .value"), true, raidDefence, "", false, Math.round);
				UIConstants.updateCalloutContent("#in-demographics-raid-danger", this.getRaidDangerCalloutContent());
				UIConstants.updateCalloutContent("#in-demographics-raid-defence", defenceS);
				var hasLastRaid = campComponent.lastRaid && campComponent.lastRaid.isValid();
				if (hasLastRaid) {
					$("#in-demographics-raid-last .value").text(this.getLastRaidDescription(sector, campComponent, campComponent.lastRaid));
				}
				GameGlobals.uiFunctions.toggle("#in-demographics-raid-last", hasLastRaid);
			}
			GameGlobals.uiFunctions.toggle("#in-demographics-raid", showRaid);

			let showDisease = campComponent.population > 1;
			if (showDisease) {
				let storage = GameGlobals.resourcesHelper.getCurrentCampStorage(sector);
				let hasHerbs = storage.resources.getResource(resourceNames.herbs) > 0;
				let hasMedicine = storage.resources.getResource(resourceNames.medicine) > 0;
				let diseaseChance = OccurrenceConstants.getDiseaseOutbreakChance(campComponent.population, hasHerbs, hasMedicine) * 100;
				UIConstants.updateCalloutContent("#in-demographics-disease-chance", this.getDiseaseChanceCalloutContent());
				UIAnimations.animateOrSetNumber($("#in-demographics-disease-chance .value"), true, diseaseChance, "%", false, Math.round);
			}
			GameGlobals.uiFunctions.toggle("#in-demographics-disease", showDisease);

			var showLevelStats = GameGlobals.gameState.numCamps > 1;
			if (showLevelStats) {
				var levelComponent = this.playerLevelNodes.head.level;
				var hasUnlockedTrade = this.hasUpgrade(GameGlobals.upgradeEffectsHelper.getUpgradeToUnlockBuilding(improvementNames.tradepost));
				$("#in-demographics-level-population .value").text(UIConstants.getFactorLabel(levelComponent.habitability));
				$("#in-demographics-level-danger .value").text(UIConstants.getFactorLabel(levelComponent.raidDangerFactor));
				$("#in-demographics-trade-network").toggle(hasUnlockedTrade);
				if (hasUnlockedTrade) {
					var hasAccessToTradeNetwork = GameGlobals.resourcesHelper.hasAccessToTradeNetwork(this.playerLocationNodes.head.entity);
					$("#in-demographics-trade-network .value").text(hasAccessToTradeNetwork ? "yes" : "no");
					$("#in-demographics-trade-network .value").toggleClass("warning", !hasAccessToTradeNetwork);
				}
			}

			GameGlobals.uiFunctions.toggle("#in-demographics-level", showLevelStats);
			GameGlobals.uiFunctions.toggle("#in-demographics", showCalendar || showRaid || showLevelStats);
		},
		
		saveAutoAssignSettings: function () {
			if (!GameGlobals.gameState.unlockedFeatures.workerAutoAssignment) return;
			if (this.playerLocationNodes.head == null) return;
			let campComponent = this.playerLocationNodes.head.entity.get(CampComponent);
			for (let workerType in CampConstants.workerTypes) {
				let $checkbox = $("#in-assing-worker-auto-" + workerType);
				campComponent.autoAssignedWorkers[workerType] = $checkbox.is(':checked');
			}
		},
		
		getLastRaidDescription: function (sector, campComponent, raidVO) {
			let result = "(none)";
			if (campComponent.lastRaid.wasVictory) {
				result = "Camp defended.";
			} else {
				let resourcesLost = campComponent.lastRaid.resourcesLost;
				let defendersLost = campComponent.lastRaid.defendersLost;
				if (resourcesLost && resourcesLost.getTotal() > 0) {
					var resLog = TextConstants.getLogResourceText(resourcesLost);
					var resS = TextConstants.createTextFromLogMessage(resLog.msg, resLog.replacements, resLog.values);
					result = "Camp attacked, lost: " + resS + ".";
				} else {
					result = "Camp attacked, nothing left to steal.";
				}
				
				if (defendersLost > 0) {
					result += ". " + defendersLost + " defenders were killed.";
				}
			}
			
			if (raidVO.damagedBuilding != null) {
				let improvements = sector.get(SectorImprovementsComponent);
				let improvementID = ImprovementConstants.getImprovementID(raidVO.damagedBuilding);
				let displayName = ImprovementConstants.getImprovementDisplayName(improvementID, improvements.getLevel(raidVO.damagedBuilding));
				if (raidVO.damagedBuilding == improvementNames.fortification) {
					result += " Fortifications were damaged.";
				} else if (improvements.getCount(raidVO.damagedBuilding) == 1) {
					result += " The " + displayName + " was damaged.";
				} else {
					result += " " + Text.addArticle(displayName) + " was damaged.";
				}
			}
			
			result += " (" + UIConstants.getTimeSinceText(campComponent.lastRaid.timestamp) + " ago)";
			
			return result;
		},

		getWorkerDescription: function (def) {
			let workerLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel(def.id, this.tribeUpgradesNodes.head.upgrades);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var productionS = "";
			var generalConsumptionS =
				"<br/><span class='warning'>water -" + UIConstants.roundValue(GameGlobals.campHelper.getWaterConsumptionPerSecond(1), true, true) + "/s</span>" +
				"<br/><span class='warning'>food -" + UIConstants.roundValue(GameGlobals.campHelper.getFoodConsumptionPerSecond(1), true, true) + "/s</span>";
			var specialConsumptionS = "";
			switch (def.id) {
				case CampConstants.workerTypes.scavenger.id:
					productionS = "metal +" + UIConstants.roundValue(GameGlobals.campHelper.getMetalProductionPerSecond(1, improvements), true, true) + "/s";
					break;
				case CampConstants.workerTypes.trapper.id:
					productionS = "food +" + UIConstants.roundValue(GameGlobals.campHelper.getFoodProductionPerSecond(1, improvements), true, true) + "/s";
					break;
				case CampConstants.workerTypes.water.id:
					productionS = "water +" + UIConstants.roundValue(GameGlobals.campHelper.getWaterProductionPerSecond(1, improvements), true, true) + "/s";
					break;
				case CampConstants.workerTypes.ropemaker.id:
					productionS = "rope +" + UIConstants.roundValue(GameGlobals.campHelper.getRopeProductionPerSecond(1, improvements), true, true) + "/s";
					break;
				case CampConstants.workerTypes.chemist.id:
					productionS = "fuel +" + UIConstants.roundValue(GameGlobals.campHelper.getFuelProductionPerSecond(1, improvements), true, true) + "/s";
					break;
				case CampConstants.workerTypes.rubbermaker.id:
					productionS = "rubber +" + UIConstants.roundValue(GameGlobals.campHelper.getRubberProductionPerSecond(1, improvements), true, true) + "/s";
					break;
				case CampConstants.workerTypes.gardener.id:
					productionS = "herbs +" + UIConstants.roundValue(GameGlobals.campHelper.getHerbsProductionPerSecond(1, improvements), true, true) + "/s";
					break;
				case CampConstants.workerTypes.apothecary.id:
					productionS = "medicine +" + UIConstants.roundValue(GameGlobals.campHelper.getMedicineProductionPerSecond(1, improvements), true, true) + "/s";
					specialConsumptionS = "<br/><span class='warning'>herbs -" + GameGlobals.campHelper.getHerbsConsumptionPerSecond(1) + "/s</span>";
					break;
				case CampConstants.workerTypes.concrete.id:
					productionS = "concrete +" + UIConstants.roundValue(GameGlobals.campHelper.getConcreteProductionPerSecond(1, improvements), true, true) + "/s";
					specialConsumptionS = "<br/><span class='warning'>metal -" + GameGlobals.campHelper.getMetalConsumptionPerSecondConcrete(1) + "/s</span>";
					break;
				case CampConstants.workerTypes.toolsmith.id:
					productionS = "tools +" + UIConstants.roundValue(GameGlobals.campHelper.getToolsProductionPerSecond(1, improvements), true, true) + "/s";
					specialConsumptionS = "<br/><span class='warning'>metal -" + GameGlobals.campHelper.getMetalConsumptionPerSecondSmith(1) + "/s</span>";
					break;
				case CampConstants.workerTypes.robotmaker.id:
					let robotVal = GameGlobals.campHelper.getRobotsProductionPerSecond(1, improvements);
					let robotValDivisor = robotVal < 0.01 ? 10000 : null;
					productionS = "robots +" + UIConstants.roundValue(robotVal, true, true, robotValDivisor) + "/s";
					specialConsumptionS = "<br/><span class='warning'>tools -" + GameGlobals.campHelper.getToolsConsumptionPerSecondRobots(1) + "/s</span>";
					break;
				case CampConstants.workerTypes.scientist.id:
					productionS = "evidence +" + UIConstants.roundValue(GameGlobals.campHelper.getEvidenceProductionPerSecond(1, improvements), true, true, 1000) + "/s";
					break;
				case CampConstants.workerTypes.cleric.id:
					productionS = "hope +" + UIConstants.roundValue(GameGlobals.campHelper.getHopeProductionPerSecond(1, improvements), true, true, 100000) + "/s";
					break;
				case CampConstants.workerTypes.soldier.id:
					var soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);
					let barracksLevel = improvements.getLevel(improvementNames.barracks);
					productionS = "camp defence +" + CampConstants.getSoldierDefence(soldierLevel, barracksLevel);
					break;
				default:
					log.w("no description defined for worker type: " + def.id);
					break;
			}
			return "Level " + workerLevel + "<br/>" + productionS + generalConsumptionS + specialConsumptionS;
		},

		getPopulationDecreaseHint: function () {
			let camp = this.playerLocationNodes.head.entity;
			let reputationComponent = camp.get(ReputationComponent);
			if (!reputationComponent) return null;
			if (!reputationComponent.targetValueSources) return null;
			
			let mainSource = null;
			for (let i in reputationComponent.targetValueSources) {
				let source = reputationComponent.targetValueSources[i];
				if (source.amount > 0) continue;
				if (source.source == CampConstants.REPUTATION_SOURCE_LEVEL_POP) continue;
				if (!mainSource || (mainSource.amount > source.amount) || mainSource.isStatic && !source.isStatic) {
					mainSource = source;
				}
			}

			if (!mainSource) return null;

			return mainSource.source;
		},

		getRaidDangerCalloutContent: function () {
			let levelComponent = this.playerLevelNodes.head.level;
			let sector = this.playerLocationNodes.head.entity;
			let improvements = sector.get(SectorImprovementsComponent);
			let soldiers = sector.get(CampComponent).assignedWorkers.soldier || 0;
			let soldierLevel = GameGlobals.upgradeEffectsHelper.getWorkerLevel("soldier", this.tribeUpgradesNodes.head.upgrades);

			let dangerPoints = OccurrenceConstants.getRaidDangerPoints(improvements, levelComponent.raidDangerFactor);
			let defencePoints = OccurrenceConstants.getRaidDefencePoints(improvements, soldiers, soldierLevel);

			let result = Text.t("ui.camp.raid_danger_description");
			result += "<hr/>";
			result += "Danger points: " + dangerPoints + "<br/>";
			result += "Defence points: " + defencePoints + "<br/>";

			return result;
		},

		getDiseaseChanceCalloutContent: function () {
			let sector = this.playerLocationNodes.head.entity;
			let campComponent = sector.get(CampComponent);

			let storage = GameGlobals.resourcesHelper.getCurrentCampStorage(sector);
			let hasHerbs = storage.resources.getResource(resourceNames.herbs) > 0;
			let hasMedicine = storage.resources.getResource(resourceNames.medicine) > 0;

			let result = "Risk that a disease occurring in the camp turns into an outbreak";
			result += "<hr/>";
			result += "Population: " + Math.round(OccurrenceConstants.getDiseaseOutbreakChance(campComponent.population, false, false) * 100) + "%<br/>";

			if (hasMedicine) {
				result += "Medicine: -" + ((1 - OccurrenceConstants.getDiseaseMedicineFactor()) * 100) + "%<br/>";
			} else if (hasHerbs) {
				result += "Herbs: -" + ((1 - OccurrenceConstants.getDiseaseHerbsFactor()) * 100) + "%<br/>";
			}

			return result;
		},

		sortImprovements: function (a, b) {
			
			let getImprovementSortScore = function (improvementID) {
				let def = ImprovementConstants.improvements[improvementID];
				
				if (def.sortScore) return def.sortScore;
				
				let useAction = "use_in_" + improvementID;
				if (PlayerActionConstants.hasAction(useAction)) return 100;
				
				let improveAction = "improve_in_" + improvementID;
				if (PlayerActionConstants.hasAction(improveAction)) return 10;
				
				var buildAction = "build_in_" + improvementID;
				let max = GameGlobals.campBalancingHelper.getMaxImprovementCountPerSector(improvementID, buildAction);
				if (max == 1) return 1;
				
				return 2;
			};
			
			let scoreA = getImprovementSortScore(a);
			let scoreB = getImprovementSortScore(b);
			
			return scoreB - scoreA;
		},
		
		createCampActionListItem: function () {
			let li = {};
			let div = "<div class='progress-wrap progress' data-animation-length='50'><div class='progress-bar progress'></div><span class='progress progress-label'></span></div>";
			li.$root = $(div);
			li.$label = li.$root.find("span.progress-label");
			return li;
		},
		
		updateCampActionListItem: function (li, data) {
			let action = data.action;
			let baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			
			let displayName = baseActionID.replaceAll("_", " ");
			
			if (data.improvementName) {
				displayName = "Build " + ImprovementConstants.getImprovementDisplayName(data.improvementName);
			}
			
			li.$root.data("progress-percent", data.percent);
			li.$label.html(displayName);
		},

		updateCampOccurrenceListItem: function (li, data) {
			let event = data.event;
			let displayName = Text.t("ui.camp.event_" + event + "_name");
			let isNegative = OccurrenceConstants.isNegative(event);
			
			li.$root.data("progress-percent", data.percent);
			li.$root.toggleClass("warning", isNegative);

			li.$label.html(displayName);
			li.$label.toggleClass("event-ending", data.isEnding);
		}, 

		updateCampMiscEventListItem: function (li, data) {
			let displayName = data.label;
			li.$root.data("progress-percent", data.percent);
			li.$root.toggleClass("warning", data.isNegative);
			li.$label.html(displayName);
		},
		
		isCampActionListItemDataSame: function (d1, d2) {
			return d1.action == d2.action;
		},

		isCampOccurrenceListItemDataSame: function (d1, d2) {
			return d1.event == d2.event;
		},

		onTabChanged: function () {
			if (GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.in) {
				this.refresh();
			}
		},

		onImprovementBuilt: function () {
			this.refresh();
		},

		onPlayerPositionChanged: function () {
			this.refresh();
			this.updateCharacters();
		},

		onCampRenamed: function () {
			this.refresh();
		},

		onPopulationChanged: function (entity) {
			if (!this.playerLocationNodes.head) return;
			if (this.playerLocationNodes.head.entity === entity) {
				this.refresh();
				this.updateCharacters();
			}
		},

		onWorkersAssigned: function (entity) {
			if (!this.playerLocationNodes.head) return;
			if (this.playerLocationNodes.head.entity === entity) {
				this.refresh();
				this.updateCharacters();
			}
		},

		onCampEventEnded: function () {
			if (!this.playerLocationNodes.head) return;
			this.refresh();
		},
		
		onAutoAssignWorkerToggled: function (e) {
			if (!GameGlobals.gameState.unlockedFeatures.workerAutoAssignment) return;
			e.data.sys.saveAutoAssignSettings();
			e.data.sys.refresh();
		},

		onGameShown: function () {
			this.refresh();
		},

		hasUpgrade: function (upgradeID) {
			if (!upgradeID) return true;
			return this.tribeUpgradesNodes.head.upgrades.hasUpgrade(upgradeID);
		},

	});

	return UIOutCampSystem;
});
