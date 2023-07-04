define([
	'ash',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/UIConstants',
	'game/constants/PositionConstants',
	'game/nodes/PlayerLocationNode',
	'game/vos/TabCountsVO',
	'utils/StringUtils',
	'utils/UIList',
], function (Ash, GameGlobals, GlobalSignals, UIConstants, PositionConstants, PlayerLocationNode, TabCountsVO, StringUtils, UIList) {
	
	let UIOutProjectsSystem = Ash.System.extend({
		
		playerLocationNodes: null,

		bubbleNumber: -1,
		tabCounts: null,
		
		constructor: function () {
			this.initElements();
			return this;
		},
		
		initElements: function () {
			this.tabCounts = new TabCountsVO();
			this.elements = {};
			this.elements.tabHeader = $("#tab-header h2");
			this.elements.bubble = $("#switch-projects .bubble");
			this.elements.hiddenImprovementsMsg = $("#in-improvements-hidden-message");
			
			this.availableLevelProjectList = UIList.create("#in-improvements-level table", this.createProjectListItem, (li, project) => { this.updateProjectListItem(li, project, true) }, this.isProjectListItemDataEqual);
			this.availableColonyProjectList = UIList.create("#in-improvements-colony table", this.createProjectListItem, (li, project) => { this.updateProjectListItem(li, project, true) }, this.isProjectListItemDataEqual);
			this.builtLevelProjectList = UIList.create("#in-improvements-level-built table", this.createProjectListItem, (li, project) => { this.updateProjectListItem(li, project, false) }, this.isProjectListItemDataEqual);
			this.builtColonyProjectList = UIList.create("#in-improvements-colony-built table", this.createProjectListItem, (li, project) => { this.updateProjectListItem(li, project, false) }, this.isProjectListItemDataEqual);
			
			let sys = this;
			$("#in-improvements-reset-hidden").click(function () {
				sys.resetHidden();
			});
		},

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			
			GlobalSignals.add(this, GlobalSignals.upgradeUnlockedSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.sectorScoutedSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.improvementBuiltSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.playerPositionChangedSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.movementBlockerClearedSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.tabChangedSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.projectHiddenSignal, this.refresh);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
		},

		removeFromEngine: function (engine) {
			GlobalSignals.removeAll(this);
			this.engine = null;
			this.playerLocationNodes = null;
		},

		update: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.projects;
			if (!this.playerLocationNodes.head) return;
			
			this.updateBubble();
			
			if (!isActive) return;
			if (GameGlobals.gameState.isLaunchStarted) return;
		},
		
		slowUpdate: function () {
			if (GameGlobals.gameState.isLaunchStarted) return;
			this.updateAvailableProjects(false);
			this.updateContainers();
		},
		
		refresh: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.projects;
			
			if (isActive) {
				this.elements.tabHeader.text("Building projects");
			}
			
			this.updateAvailableProjects(true);
			this.updateBuiltProjects(true);
			this.updateHiddenMsg();
			this.updateContainers();
		},
		
		updateBubble: function () {
			var newBubbleNumber =
				(this.tabCounts.current.available.regular - this.tabCounts.lastShown.available.regular) +
				(this.tabCounts.current.visible.regular - this.tabCounts.lastShown.visible.regular) +
				(this.tabCounts.current.available.colony - this.tabCounts.lastShown.available.colony) +
				(this.tabCounts.current.visible.colony - this.tabCounts.lastShown.visible.colony);
			if (GameGlobals.endingHelper.isReadyForLaunch())
				newBubbleNumber = 1;
			if (this.bubbleNumber === newBubbleNumber)
				return;
			
			GameGlobals.uiFunctions.updateBubble("#switch-projects .bubble", this.bubbleNumber, newBubbleNumber);
			this.bubbleNumber = newBubbleNumber;
		},
		
		updateAvailableProjects: function (updateTables) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head) return;
			
			let isActive = GameGlobals.gameState.uiStatus.currentTab === GameGlobals.uiFunctions.elementIDs.tabs.projects;
			let availableRegular = 0;
			let visibleRegular = 0;
			let hiddenRegular = 0;
			let availableColony = 0;
			let visibleColony = 0;
			let hiddenColony = 0;
			
			if (!GameGlobals.gameState.uiStatus.hiddenProjects) GameGlobals.gameState.uiStatus.hiddenProjects = [];
			
			let projects = GameGlobals.levelHelper.getAvailableProjectsForCamp(this.playerLocationNodes.head.entity);
			
			let isHidden = function (project) {
				let projectID = project.getID();
				return GameGlobals.gameState.uiStatus.hiddenProjects.indexOf(projectID) >= 0;
			}
			
			if (updateTables) {
				let numCreated1 = UIList.update(this.availableLevelProjectList, projects.filter(project => !project.isColonyProject() && !isHidden(project)));
				let numCreated2 = UIList.update(this.availableColonyProjectList, projects.filter(project => project.isColonyProject()));
				
				if (numCreated1 > 0 || numCreated2 > 0) {
					GameGlobals.uiFunctions.registerCustomButtonListeners("#in-improvements-level", "navigation", this.onMapLinkButtonClicked);
					GameGlobals.uiFunctions.registerCustomButtonListeners("#in-improvements-level", "hide-project", this.onHideProjectButtonClicked);
					
					GameGlobals.uiFunctions.registerActionButtonListeners("#in-improvements-level");
					GameGlobals.uiFunctions.generateButtonOverlays("#in-improvements-level");
					GameGlobals.uiFunctions.generateCallouts("#in-improvements-level");
					
					GameGlobals.uiFunctions.registerActionButtonListeners("#in-improvements-colony");
					GameGlobals.uiFunctions.generateButtonOverlays("#in-improvements-colony");
					GameGlobals.uiFunctions.generateCallouts("#in-improvements-colony");
					
					// TODO fix better, now forcing an update after ovelays generated but build into UIList
					UIList.update(this.availableLevelProjectList, projects.filter(project => !project.isColonyProject() && !isHidden(project)));
					UIList.update(this.availableColonyProjectList, projects.filter(project => project.isColonyProject()));
				}
			}
			
			for (let i = 0; i < projects.length; i++) {
				let project = projects[i];
				let action = project.action;
				let sectorEntity = GameGlobals.levelHelper.getSectorByPosition(project.level, project.position.sectorX, project.position.sectorY);
				let actionAvailable = GameGlobals.playerActionsHelper.checkAvailability(action, false, sectorEntity);
				let isColonyProject = project.isColonyProject();
				let projectID = project.getID();
				let isHidden = GameGlobals.gameState.uiStatus.hiddenProjects.indexOf(projectID) >= 0;
				
				if (isColonyProject) {
					if (isHidden) hiddenColony++;
					if (!isHidden) visibleColony++;
					if (!isHidden && actionAvailable) availableColony++;
				} else {
					if (isHidden) hiddenRegular++;
					if (!isHidden) visibleRegular++;
					if (!isHidden && actionAvailable) availableRegular++;
				}
			}
			
			GameGlobals.uiFunctions.toggle("#container-in-improvements-level-hidden", hiddenRegular > 0);
			
			this.tabCounts.updateCounts({ regular: visibleRegular, colony: visibleColony }, { regular: availableRegular, colony: availableColony }, isActive);
		},
		
		updateBuiltProjects: function (updateTables) {
			if (!this.playerLocationNodes.head) return;
			let projects = GameGlobals.levelHelper.getBuiltProjectsForCamp(this.playerLocationNodes.head.entity);
			
			projects.sort((a, b) => { return b.level - a.level; });
			
			if (updateTables) {
				let numCreated1 = UIList.update(this.builtLevelProjectList, projects.filter(project => !project.isColonyProject()));
				let numCreated2 = UIList.update(this.builtColonyProjectList, projects.filter(project => project.isColonyProject()));
				
				if (numCreated1) {
					GameGlobals.uiFunctions.registerCustomButtonListeners("#in-improvements-level-built", "navigation", this.onMapLinkButtonClicked);
				}
			}
			
			let numProjectsColony = 0;
			let numProjectsOther = 0;
			
			for (let i = 0; i < projects.length; i++) {
				let project = projects[i];
				let isColonyProject = project.isColonyProject();
				
				if (isColonyProject) numProjectsColony++;
				if (!isColonyProject) numProjectsOther++;
			}
			
			this.numBuiltColonyProjects = numProjectsColony;
			
			GameGlobals.uiFunctions.toggle("#header-in-improvements-colony-built", numProjectsColony > 0);
			GameGlobals.uiFunctions.toggle("#header-in-improvements-level-built", numProjectsOther > 0);
		},
		
		updateHiddenMsg: function () {
			let numHidden = GameGlobals.gameState.uiStatus.hiddenProjects.length;
			this.elements.hiddenImprovementsMsg.text(numHidden + " projects hidden");
		},
		
		updateContainers: function () {
			let visibleColonyProjects = this.tabCounts.current.visible.colony + (this.numBuiltColonyProjects || 0);
				
			GameGlobals.uiFunctions.toggle("#in-improvements-level-empty-message", this.tabCounts.lastShown.visible.regular <= 0);
			GameGlobals.uiFunctions.toggle("#container-in-improvements-colony", visibleColonyProjects > 0 || GameGlobals.endingHelper.isReadyForLaunch() || GameGlobals.gameState.isLaunched);
		},
		
		resetHidden: function () {
			GameGlobals.gameState.uiStatus.hiddenProjects = [];
			this.refresh();
		},
		
		createProjectListItem: function () {
			let tr = "<tr>";
			
			tr += "<td class='label'></td>";
			tr += "<td class='list-description'></td>";
			tr += "<td class='minwidth'><button class='btn-mini btn-meta hide-project'>hide</button></td>";
			tr += "<td class='minwidth'><button class='btn-mini navigation'>map</button></td>";
			
			let btnAction = "<button class='action action-build action-level-project multiline'></button>";
			tr += "<td style='width:138px;text-align:right;' class='bg-reset'>" + btnAction + "</td>";
						
			tr += "</tr>";
			
			let li = {};
			li.$root = $(tr);
			li.$tdName = li.$root.children("td.label");
			li.$tdDescription = li.$root.children("td.list-description");
			li.$btnHide = li.$root.find("button.hide-project");
			li.$btnMap = li.$root.find("button.navigation");
			li.$btnAction = li.$root.find("button.action");
			return li;
		},
		
		updateProjectListItem: function (li, project, isAvailable) {
			let projectID = project.getID();
			let sector = project.level + "." + project.sector + "." + project.direction;
			let name = project.name;
			let actionLabel = project.actionLabel;
			let action = project.action;
				
			// TODO define building projects directions/links better and don't rely on improvement names
			name = name.replace(" Up", "");
			name = name.replace(" Down", "");
			
			let info = this.getProjectInfoText(project, isAvailable);
			
			li.$tdDescription.attr("colspan", isAvailable ? 1 : 4);
			li.$btnHide.css("display", isAvailable ? "initial" : "none");
			li.$btnMap.css("display", isAvailable ? "initial" : "none");
			li.$btnAction.css("display", isAvailable ? "initial" : "none");
			
			li.$root.toggleClass("current", this.isCurrentLevel(project));
			li.$tdName.html(name);
			li.$tdDescription.html(info);
			li.$btnHide.data("project", projectID);
			li.$btnMap.data("sector", sector);
			li.$btnAction.attr("action", action);
			li.$btnAction.attr("sector", sector);
			li.$btnAction.attr("id", "btn-" + action + "-" + sector);
			li.$btnAction.find(".btn-label").html(actionLabel);
			
			GameGlobals.uiFunctions.toggle(li.$btnHide, isAvailable && !project.isColonyProject() && UIConstants.canHideProject(projectID));
			GameGlobals.uiFunctions.toggle(li.$btnMap, isAvailable && !project.isColonyProject());
			GameGlobals.uiFunctions.toggle(li.$btnAction, isAvailable);
		},
		
		isProjectListItemDataEqual: function (project1, project2) {
			return project1.getID() == project2.getID();
		},
		
		getProjectInfoText: function (project, isAvailable) {
			let position = project.position.getPosition();
			let location = position.getInGameFormat();
			let showLevel = GameGlobals.gameState.unlockedFeatures.levels;
			
			let info = "at " + location + " on level " + project.level;
			
			let isPassage = project.improvement && project.improvement.isPassage();
			if (isPassage) {
				var levels = this.getProjectLevels(project);
				info = "connecting levels <span class='hl-functionality'>" + levels[0] + "</span> and <span class='hl-functionality'>" + levels[1] + "</span> at " + location;
			}
			
			if (project.action == "clear_debris_e" || project.action == "clear_debris_l" || project.action == "bridge_gap") {
				let neighbourPosition = PositionConstants.getPositionOnPath(project.position.getPosition(), project.direction, 1);
				let neighbourLocation = neighbourPosition.getInGameFormat();
				info = "between " + location + " and " + neighbourLocation + " on level " + project.level;
			}
			
			if (project.improvement && project.improvement.name == improvementNames.greenhouse && !isAvailable) {
				let level = position.level;
				let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
				let campLevel = GameGlobals.gameState.getLevelForCamp(campOrdinal);
				let campNode = GameGlobals.campHelper.getCampNodeForLevel(campLevel);
				let numWorkers = campNode.camp.assignedWorkers.gardener || 0;
				info += " (used by " + numWorkers + " Gardeners at camp on level " + campLevel + ")";
			}
			
			return info;
		},
		
		isCurrentLevel: function (project) {
			var levels = this.getProjectLevels(project);
			var currentLevel = this.playerLocationNodes.head.position.level;
			for (let i = 0; i < levels.length; i++) {
				if (levels[i] == currentLevel) return true;
			}
			return false;
		},
		
		getProjectLevels: function (project) {
			var isPassage = project.improvement && project.improvement.isPassage();
			var level = project.level;
			if (isPassage) {
				var otherLevel = project.level + 1;
				if (project.improvement.name.indexOf("Down") > 0) {
					level = project.level - 1;
					otherLevel = project.level;
				}
				return [ level, otherLevel ];
			} else {
				return [ level ];
			}
		},
		
		onHideProjectButtonClicked: function () {
			let projectID = $(this).data("project");
			if (!projectID) return;
			if (!UIConstants.canHideProject(projectID)) return;
			GameGlobals.gameState.uiStatus.hiddenProjects.push(projectID);
			GlobalSignals.projectHiddenSignal.dispatch();
		},
		
		onMapLinkButtonClicked: function () {
			let sector = $(this).data("sector");
			if (!sector) return;
			let position = StringUtils.getPosition(sector);
			GameGlobals.uiFunctions.scrollToTabTop();
			GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.map, position);
		},
		
	});

	return UIOutProjectsSystem;
});
