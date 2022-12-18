define([
	'ash',
	'text/Text',
	'utils/MapUtils',
	'utils/UIList',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/PlayerActionConstants',
	'game/constants/PlayerStatConstants',
	'game/constants/TextConstants',
	'game/constants/LogConstants',
	'game/constants/UIConstants',
	'game/constants/PositionConstants',
	'game/constants/LocaleConstants',
	'game/constants/LevelConstants',
	'game/constants/MovementConstants',
	'game/constants/TradeConstants',
	'game/constants/TribeConstants',
	'game/nodes/PlayerPositionNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/NearestCampNode',
	'game/components/player/VisionComponent',
	'game/components/player/StaminaComponent',
	'game/components/player/ItemsComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/MovementOptionsComponent',
	'game/components/common/PositionComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/common/CampComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/EnemiesComponent'
], function (
	Ash,
	Text, MapUtils,  UIList, GameGlobals, GlobalSignals, PlayerActionConstants, PlayerStatConstants, TextConstants,
	LogConstants, UIConstants, PositionConstants, LocaleConstants, LevelConstants, MovementConstants, TradeConstants,
	TribeConstants, PlayerPositionNode, PlayerLocationNode, NearestCampNode, VisionComponent, StaminaComponent,
	ItemsComponent, PassagesComponent, SectorControlComponent, SectorFeaturesComponent, SectorLocalesComponent,
	MovementOptionsComponent, PositionComponent, LogMessagesComponent, CampComponent, SectorImprovementsComponent,
	WorkshopComponent, SectorStatusComponent, EnemiesComponent
) {
	var UIOutLevelSystem = Ash.System.extend({

		engine: null,

		playerPosNodes: null,
		playerLocationNodes: null,
		nearestCampNodes: null,

		pendingUpdateMap: true,

		constructor: function () {
			GameGlobals.uiFunctions.toggle("#switch-out .bubble", false);

			this.elements = {};
			this.elements.sectorHeader = $("#header-sector");
			this.elements.description = $("#out-desc");
			this.elements.btnClearWorkshop = $("#out-action-clear-workshop");
			this.elements.btnNap = $("#out-action-nap");
			this.elements.btnWait = $("#out-action-wait");
			this.elements.outImprovementsTR = $("#out-improvements tr");
			
			this.initElements();

			return this;
		},

		addToEngine: function (engine) {
			this.playerPosNodes = engine.getNodeList(PlayerPositionNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);

			this.initListeners();

			this.engine = engine;
		},

		removeFromEngine: function (engine) {
			this.playerPosNodes = null;
			this.playerLocationNodes = null;
			this.engine = null;
		},
		
		initElements: function () {
			this.localeList = UIList.create($("#table-out-actions-locales"), this.createLocaleListItem, this.updateLocaleListItem, this.isLocaleListItemDataEqual);
		},

		initListeners: function () {
			var sys = this;
			GlobalSignals.playerMovedSignal.add(function () {
				if (GameGlobals.gameState.uiStatus.isHidden) return;
				sys.updateAll();
			});
			GlobalSignals.improvementBuiltSignal.add(function () {
				sys.updateAll();
			});
			GlobalSignals.inventoryChangedSignal.add(function () {
				sys.updateSectorDescription();
				sys.updateOutImprovementsVisibility();
				sys.updateDespair();
			});
			GlobalSignals.featureUnlockedSignal.add(function () {
				sys.updateUnlockedFeatures();
			});
			GlobalSignals.fightEndedSignal.add(function () {
				sys.updateSectorDescription();
				sys.updateMovementRelatedActions();
			});
			GlobalSignals.sectorScoutedSignal.add(function () {
				sys.updateAll();
			});
			GlobalSignals.sectorScavengedSignal.add(function () {
				sys.updateSectorDescription();
			});
			GlobalSignals.actionCompletedSignal.add(function () {
				sys.updateSectorDescription();
			});
			GlobalSignals.visionChangedSignal.add(function () {
				sys.updateAll();
			});
			GlobalSignals.gameShownSignal.add(function () {
				sys.updateAll();
			});
			GlobalSignals.add(this, GlobalSignals.collectorCollectedSignal, this.updateOutImprovementsStatus);
			GlobalSignals.add(this, GlobalSignals.movementBlockerClearedSignal, this.updateAll);
			GlobalSignals.add(this, GlobalSignals.slowUpdateSignal, this.slowUpdate);
			GlobalSignals.add(this, GlobalSignals.sectorRevealedSignal, this.onSectorRevealed);
			GlobalSignals.add(this, GlobalSignals.popupClosedSignal, this.updateLocales);
			GlobalSignals.add(this, GlobalSignals.buttonStateChangedSignal, this.onButtonStateChanged);
			this.rebuildVis();
			this.updateUnlockedFeatures();
		},

		update: function (time) {
			if (GameGlobals.gameState.isPaused) return;
			if (GameGlobals.gameState.uiStatus.currentTab !== GameGlobals.uiFunctions.elementIDs.tabs.out) return;

			var posComponent = this.playerPosNodes.head.position;

			if (!this.playerLocationNodes.head) return;

			if (!posComponent.inCamp) {
				if (this.pendingUpdateMap)
					this.rebuildVis();
			}
		},
		
		slowUpdate: function () {
			if (!this.playerLocationNodes.head) return;
			this.updateOutImprovementsStatus();
			this.updateLevelPageActionsSlow();
		},

		updateAll: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head) return;

			this.rebuildVis();
			this.updateLocales();
			this.updateOutImprovementsVisibility();
			this.updateMovementRelatedActions();
			this.updateStaticSectorElements();
			this.updateSectorDescription();
			this.updateLevelPageActions();
			this.updateLevelPageActionsSlow();
			this.updateUnlockedFeatures();
			this.updateOutImprovementsList();
			this.updateOutImprovementsStatus();
		},

		updateUnlockedFeatures: function () {
			GameGlobals.uiFunctions.toggle("#out-container-compass", GameGlobals.gameState.unlockedFeatures.scout);
			GameGlobals.uiFunctions.toggle("#out-container-compass-actions", GameGlobals.gameState.unlockedFeatures.scout);
			GameGlobals.uiFunctions.toggle("#minimap-background-container", GameGlobals.gameState.unlockedFeatures.scout);
			GameGlobals.uiFunctions.toggle("#minimap", GameGlobals.gameState.unlockedFeatures.scout);
		},

		updateLevelPageActionsSlow: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);

			var hasCamp = GameGlobals.levelHelper.getLevelEntityForSector(this.playerLocationNodes.head.entity).has(CampComponent);
			var hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
			var isScouted = sectorStatus.scouted;

			this.updateNap(isScouted, hasCampHere);
			this.updateWait(hasCampHere);
			this.updateDespair();
		},

		updateLevelPageActions: function (isScouted, hasCamp, hasCampHere) {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var hasCamp = GameGlobals.levelHelper.getLevelEntityForSector(this.playerLocationNodes.head.entity).has(CampComponent);
			var hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
			var isScouted = sectorStatus.scouted;
			
			var sectorLocalesComponent = this.playerLocationNodes.head.entity.get(SectorLocalesComponent);
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);

			var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
				improvements.getCount(improvementNames.passageUpElevator) +
				improvements.getCount(improvementNames.passageUpHole) > 0;
			var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
				improvements.getCount(improvementNames.passageDownElevator) +
				improvements.getCount(improvementNames.passageDownHole) > 0;
			GameGlobals.uiFunctions.toggle("#out-action-move-up", (isScouted && passagesComponent.passageUp != null) || passageUpBuilt);
			GameGlobals.uiFunctions.toggle("#out-action-move-down", (isScouted && passagesComponent.passageDown != null) || passageDownBuilt);
			GameGlobals.uiFunctions.toggle("#out-action-move-camp", hasCamp && !hasCampHere);
			GameGlobals.uiFunctions.toggle("#out-action-move-camp-details", hasCamp && !hasCampHere);

			GameGlobals.uiFunctions.toggle("#out-action-enter", hasCampHere);
			GameGlobals.uiFunctions.toggle("#out-action-scout", GameGlobals.gameState.unlockedFeatures.vision);
			GameGlobals.uiFunctions.toggle("#out-action-use-spring", isScouted && featuresComponent.hasSpring);
			GameGlobals.uiFunctions.toggle("#out-action-investigate", GameGlobals.gameState.unlockedFeatures.investigate);

			var showWorkshop = isScouted && workshopComponent != null && workshopComponent.isClearable && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP)
			GameGlobals.uiFunctions.toggle("#out-action-clear-workshop", showWorkshop);
			if (showWorkshop) {
				var workshopName = TextConstants.getWorkshopName(workshopComponent.resource);
				this.elements.btnClearWorkshop.find(".btn-label").text("scout " + workshopName);
			}

			GameGlobals.uiFunctions.slideToggleIf("#out-locales", null, isScouted && sectorLocalesComponent.locales.length > 0, 200, 0);
			GameGlobals.uiFunctions.slideToggleIf("#container-out-actions-movement-related", null, isScouted, 200, 0);

			// hide movement until the player makes a light
			GameGlobals.uiFunctions.toggle("#table-out-actions-movement", GameGlobals.gameState.numCamps > 0);
			GameGlobals.uiFunctions.toggle("#container-tab-two-out-actions h3", GameGlobals.gameState.numCamps > 0);
			GameGlobals.uiFunctions.toggle("#out-improvements", GameGlobals.gameState.unlockedFeatures.vision);
			GameGlobals.uiFunctions.toggle("#out-improvements table", GameGlobals.gameState.unlockedFeatures.vision);
		},

		updateNap: function (isScouted, hasCampHere) {
			if (hasCampHere) {
				GameGlobals.uiFunctions.toggle(this.elements.btnNap, false);
				return;
			}
			
			var staminaComponent = this.playerPosNodes.head.entity.get(StaminaComponent);
			var hasFirstCamp = GameGlobals.gameState.numCamps > 0;

			var costToCamp = GameGlobals.playerActionsHelper.getCosts("move_camp_level");
			var staminaToCamp = costToCamp.stamina || 10;
			var staminaCostToMove = staminaToCamp;
			var missingStamina = staminaCostToMove - staminaComponent.stamina;
			var lowStamina = missingStamina > 0 || staminaComponent.stamina <= PlayerStatConstants.STAMINA_GAINED_FROM_NAP;

			let blockedByTutorial = !hasFirstCamp && staminaComponent.stamina > 15;
			GameGlobals.uiFunctions.toggle(this.elements.btnNap, lowStamina && !blockedByTutorial);
		},
		
		updateWait: function (hasCampHere) {
			let hasFirstCamp = GameGlobals.gameState.numCamps > 0;
			let showWait = false;
			
			if (!hasCampHere && hasFirstCamp) {
				let maxResourcesToShowWait = 3;
				let resources = [ "food", "water" ];
				for (let i = 0; i < resources.length; i++) {
					let name = resources[i];
					if (!GameGlobals.gameState.unlockedFeatures.resources[name]) continue;
					if (!this.hasCollectibleResource(name, false)) continue;
					let total = Math.floor(this.getResouceInInventory(name)) + Math.floor(this.getResourceCurrentlyAvailableToCollect(name));
					if (total < maxResourcesToShowWait) showWait = true;
				}
			}
			
			GameGlobals.uiFunctions.toggle(this.elements.btnWait, showWait);
		},

		updateDespair: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			
			let hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
			
			var logComponent = this.playerPosNodes.head.entity.get(LogMessagesComponent);
			var posComponent = this.playerLocationNodes.head.position;
			var movementOptionsComponent = this.playerLocationNodes.head.entity.get(MovementOptionsComponent);
			var isValidDespairHunger = GameGlobals.gameState.unlockedFeatures.resources.food && !this.hasAccessToResource(resourceNames.food, false, false);
			var isValidDespairThirst = GameGlobals.gameState.unlockedFeatures.resources.water && !this.hasAccessToResource(resourceNames.water, false, false);
			var isValidDespairStamina = this.playerPosNodes.head.entity.get(StaminaComponent).stamina < PlayerActionConstants.costs.move_sector_east.stamina;
			var isValidDespairMove = !movementOptionsComponent.canMove(); // can happen in hazard sectors if you lose equipment
			var isFirstPosition = !GameGlobals.gameState.unlockedFeatures.sectors;
			var showDespair = GameGlobals.gameState.unlockedFeatures.camp && !hasCampHere && !isFirstPosition && (isValidDespairHunger || isValidDespairThirst || isValidDespairStamina || isValidDespairMove);
			
			if (this.isDespairShown === showDespair) {
				return;
			}
			
			if (showDespair) {
				this.showDespairTimeoutID = window.setTimeout(function () {
					logComponent.addMessage(LogConstants.MSG_ID_DESPAIR_AVAILABLE, LogConstants.getDespairMessage(isValidDespairHunger, isValidDespairThirst, isValidDespairStamina, isValidDespairMove));
					GameGlobals.uiFunctions.toggle("#out-action-despair", true);
				}, 1250);
				// TODO do this somewhere other than UI system - maybe a global detection if despair is available
			} else {
				if (this.showDespairTimeoutID) window.clearTimeout(this.showDespairTimeoutID);
				GameGlobals.uiFunctions.toggle("#out-action-despair", false);
			}
			this.isDespairShown = showDespair;
		},

		getDescription: function (entity, hasCampHere, hasCampOnLevel, hasVision, isScouted) {
			var position = entity.get(PositionComponent).getPosition();
			var passagesComponent = this.playerLocationNodes.head.entity.get(PassagesComponent);
			var workshopComponent = this.playerLocationNodes.head.entity.get(WorkshopComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			var localesComponent = entity.get(SectorLocalesComponent);
			var hasEnemies = enemiesComponent.hasEnemies;

			var description = "<p>";
			description += this.getTextureDescription(hasVision, entity, position, featuresComponent, sectorStatus, localesComponent);
			description += this.getFunctionalDescription(hasVision, isScouted, featuresComponent, workshopComponent, hasCampHere, hasCampOnLevel);
			description += "</p><p>";
			description += this.getStatusDescription(hasVision, isScouted, hasEnemies, featuresComponent, passagesComponent, hasCampHere, hasCampOnLevel);
			description += this.getMovementDescription(isScouted, passagesComponent, entity);
			description += "</p><p>";
			
			if (isScouted) {
				if (sectorStatus.graffiti) {
					description += "There is a graffiti here: " + sectorStatus.graffiti;
					description += "</p><p>";
				}
			}
			
			description += this.getResourcesDescription(isScouted, featuresComponent, sectorStatus);
			description += "</p>";
			return description;
		},

		getTextureDescription: function (hasVision, sector, position, featuresComponent, sectorStatus, localesComponent) {
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
			
			// sector static description
			var features = GameGlobals.sectorHelper.getTextFeatures(sector);
			var desc = TextConstants.getSectorDescription(hasVision, features) + ". ";

			// light / darkness description
			if (featuresComponent.sunlit) {
				if (hasVision) desc += "The area is swathed in relentless <span class='hl-functionality'>daylight</span>. ";
				else desc += "The area is swathed in blinding <span class='hl-functionality'>sunlight</span>. ";
			} else {
				if (sectorStatus.glowStickSeconds > -5) {
					if (sectorStatus.glowStickSeconds < 5)
						desc += "The glowstick fades out.";
					else
						desc += "A glowstick casts a sickly <span class='hl-functionality'>light</span>.";
				} else {
					if (hasVision) desc += "";
					else desc += "There is no <span class='hl-functionality'>light</span>. ";
				}
			}
			
			// locales / POIs description
			for (let i = 0; i < localesComponent.locales.length; i++) {
				var locale = localesComponent.locales[i];
				if (sectorStatus.isLocaleScouted(i)) {
					if (locale.type == localeTypes.tradingpartner) {
						var partner = TradeConstants.getTradePartner(campOrdinal);
						if (partner) {
							desc += "<span class='hl-functionality'>" + partner.name + "</span> is located here. ";
						}
					}
				}
			}

			return desc;
		},

		// Existing improvements. Workshops. Potential improvements (camp).
		getFunctionalDescription: function (hasVision, isScouted, featuresComponent, workshopComponent, hasCampHere, hasCampOnLevel) {
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);

			var description = "";

			if (isScouted && featuresComponent.hasSpring) {
				description += "There is a <span class='hl-functionality'>" + TextConstants.getSpringName(featuresComponent) + "</span> here. ";
			}

			if (isScouted) {
				var canBucket = featuresComponent.resourcesCollectable.water > 0;
				var canTrap = featuresComponent.resourcesCollectable.food > 0;
				if (canBucket && canTrap) {
					description += "Both <span class='hl-functionality'>water</span> and <span class='hl-functionality'>food</span> can be collected here. ";
				} else if (canBucket) {
					if (featuresComponent.sunlit) {
						description += "It looks like <span class='hl-functionality'>rainwater</span> could be collected here. ";
					} else {
						description += "There is a bit of <span class='hl-functionality'>water</span> leaking here that could be collected. ";
					}
				} else if (canTrap) {
					description += "It might be worthwhile to install <span class='hl-functionality'>traps</span> here. ";
				}
			}

			if (hasCampHere) description += "There is a <span class='hl-functionality'>camp</span> here. ";

			if (isScouted && workshopComponent && workshopComponent.isClearable) {
				var workshopName = TextConstants.getWorkshopName(workshopComponent.resource);
				var workshopControl = sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP);
				var workshopStatus = workshopControl ? "cleared for use" : "not cleared";
				description += "There is <span class='hl-functionality'>" + Text.addArticle(workshopName) + "</span> here (" + workshopStatus + "). ";
			}

			if (isScouted && improvements.getCount(improvementNames.greenhouse) > 0) {
				description += "There is a <span class='hl-functionality'>greenhouse</span> here. ";
			}
			
			let luxuryResource = GameGlobals.sectorHelper.getLuxuryResourceOnSector(this.playerLocationNodes.head.entity, true);
			if (isScouted && luxuryResource) {
				description += "There is a source of <span class='hl-functionality'>" + TribeConstants.getLuxuryDisplayName(luxuryResource) + "</span> here. ";
			}

			return description;
		},

		// Found resources, enemies
		getStatusDescription: function (hasVision, isScouted, hasEnemies, featuresComponent, passagesComponent, hasCampHere, hasCampOnLevel) {
			var description = "";

			if (hasVision) {
				description += this.getDangerDescription(isScouted, featuresComponent, passagesComponent, hasCampHere);
			}
			
			// Waymarks
			if (isScouted) {
				for (let i = 0; i < featuresComponent.waymarks.length; i++) {
					let waymark = featuresComponent.waymarks[i];
					description += this.getWaymarkText(waymark) + ". ";
				}
			}

			// Camp
			if (isScouted && hasVision && !hasCampHere && !hasCampOnLevel) {
				if (featuresComponent.canHaveCamp() && !hasEnemies && !passagesComponent.passageUp && !passagesComponent.passageDown)
					description += "This would be a good place for a <span class='hl-functionality'>camp</span>. ";
			}

			return description;
		},

		getResourcesDescription: function (isScouted, featuresComponent, statusComponent) {
			if (!featuresComponent) return;
			var description = "";
			if (isScouted && GameGlobals.gameState.unlockedFeatures.scavenge) {
				description += "Scavenged: " + UIConstants.roundValue(statusComponent.getScavengedPercent()) + "%<br/>";
			}
			if (isScouted && GameGlobals.gameState.unlockedFeatures.investigate) {
				description += "Investigated: " + UIConstants.roundValue(statusComponent.getInvestigatedPercent()) + "%<br/>";
			}
			if (featuresComponent.resourcesScavengable.getTotal() > 0) {
				let discoveredResources = GameGlobals.sectorHelper.getLocationDiscoveredResources();
				let knownResources = GameGlobals.sectorHelper.getLocationKnownResources();
				if (knownResources.length > 0) {
					description += "Resources found: " + TextConstants.getScaResourcesString(discoveredResources, knownResources, featuresComponent.resourcesScavengable) + " ";
				}
			}
			if (featuresComponent.itemsScavengeable.length > 0) {
				let discoveredItems = GameGlobals.sectorHelper.getLocationDiscoveredItems();
				let knownItems = GameGlobals.sectorHelper.getLocationKnownItems();
				let showIngredients = GameGlobals.sectorHelper.hasSectorVisibleIngredients();
				if (showIngredients) {
					description += "Items found: " + TextConstants.getScaItemString(discoveredItems, knownItems, featuresComponent.itemsScavengeable) + " ";
				}
			}
			return description;
		},

		getMovementDescription: function (isScouted, passagesComponent, entity) {
			var description = "";
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var position = entity.get(PositionComponent);

			// Passages up / down
			var passageUpBuilt = improvements.getCount(improvementNames.passageUpStairs) +
				improvements.getCount(improvementNames.passageUpElevator) +
				improvements.getCount(improvementNames.passageUpHole) > 0;
			var passageDownBuilt = improvements.getCount(improvementNames.passageDownStairs) +
				improvements.getCount(improvementNames.passageDownElevator) +
				improvements.getCount(improvementNames.passageDownHole) > 0;

			if (isScouted) {
				if (passagesComponent.passageUp)
					description += TextConstants.getPassageDescription(passagesComponent.passageUp, PositionConstants.DIRECTION_UP, passageUpBuilt);
				if (passagesComponent.passageDown)
					description += TextConstants.getPassageDescription(passagesComponent.passageDown, PositionConstants.DIRECTION_DOWN, passageDownBuilt);
			}

			// Blockers n/s/w/e
			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var directionName = PositionConstants.getDirectionName(direction);
				var blocker = passagesComponent.getBlocker(direction);

				if (blocker) {
					var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
					var gangComponent = GameGlobals.levelHelper.getGangComponent(position, direction);
					var blockerName = TextConstants.getMovementBlockerName(blocker, enemiesComponent, gangComponent).toLowerCase();
					if (GameGlobals.movementHelper.isBlocked(entity, direction)) {
						switch (blocker.type) {
							case MovementConstants.BLOCKER_TYPE_DEBRIS:
							case MovementConstants.BLOCKER_TYPE_WASTE_TOXIC:
							case MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE:
								description += "Passage to the " + directionName + " is blocked by <span class='hl-functionality'>" + blockerName + "</span>. ";
								break;
							default:
								description += "Passage to the " + directionName + " is blocked by a <span class='hl-functionality'>" + blockerName + "</span>. ";
								break;
						}
					} else {
						var gang = GameGlobals.levelHelper.getGang(position, direction);
						if (blocker.type == MovementConstants.BLOCKER_TYPE_DEBRIS) {
							description += "Debris to the " + directionName + " has been cleared away. ";
						} else if (blocker.type == MovementConstants.BLOCKER_TYPE_GANG) {
							if (gang) {
								description += "A " + blockerName + " to the " + directionName + " has been " + TextConstants.getUnblockedVerb(blocker.type) + ". ";
							} else {
								log.w("gang blocker but no gang component at " + position, this);
							}
						} else {
							description += "A " + blockerName + " to the " + directionName + " has been " + TextConstants.getUnblockedVerb(blocker.type) + ". ";
						}
					}
				}
			}

			return description;
		},

		getDangerDescription: function (isScouted, featuresComponent, passagesComponent, hasCampOnLevel) {
			var enemyDesc = "";

			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			var hasEnemies = enemiesComponent.hasEnemies;

			if (!isScouted) {
				enemyDesc += "You have not scouted this sector yet. ";
			}

			if (hasEnemies) {
				if (isScouted) {
					enemyDesc = "This area is " + TextConstants.getEnemyText(enemiesComponent.possibleEnemies, sectorControlComponent) + ". ";
				}
			} else if (isScouted) {
				enemyDesc += "There doesn't seem to be anything hostile around. ";
			}

			var notCampableDesc = "";
			if (isScouted) {
				if (!featuresComponent.campable) {
					var inhabited = featuresComponent.level > 10;
					switch (featuresComponent.notCampableReason) {
						case LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION:
							if (inhabited && featuresComponent.wear < 6)
								notCampableDesc = "Many entrances have big yellow warning signs on them, with the text 'KEEP OUT' and a <span class='hl-functionality'>radiation</span> sign. ";
							else if (inhabited && featuresComponent.buildingDensity > 5)
								notCampableDesc = "Walls are covered in graffiti warning about <span class='hl-functionality'>radiation</span>. ";
							else
								notCampableDesc = "There is an eerie air as if the place has been <span class='hl-functionality'>abandoned</span> in a hurry. ";
							break;

						case LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION:
							if (inhabited && featuresComponent.wear < 6)
								notCampableDesc = "Many entrances have big red warning signs on them with a <span class='hl-functionality'>skull sign</span> and the text 'KEEP OUT'. ";
							else if (inhabited && featuresComponent.buildingDensity > 5)
								notCampableDesc = "Walls are covered in graffiti warning about some kind of <span class='hl-functionality'>pollution</span>. ";
							else
								notCampableDesc = "A <span class='hl-functionality'>noxious smell</span> hangs in the air.";
							break;

						case LevelConstants.UNCAMPABLE_LEVEL_TYPE_SUPERSTITION:
							if (inhabited)
								notCampableDesc = "There aren't any signs of recent human <span class='hl-functionality'>habitation</span>. ";
							else
								notCampableDesc = "An unnerving <span class='hl-functionality'>silence</span> blankets the streets. ";
							break;
					}
				}
			}

			var hasHazards = GameGlobals.sectorHelper.hasHazards(featuresComponent, sectorStatus);
			var hazards = GameGlobals.sectorHelper.getEffectiveHazards(featuresComponent, sectorStatus);
			var hazardDesc = "";
			if (hasHazards) {
				if (hazards.radiation > 0) {
					hazardDesc += "This place is <span class='hl-functionality'>radioactive</span> (" + hazards.radiation + "). ";
				}
				if (hazards.poison > 0) {
					hazardDesc += "This place is dangerously <span class='hl-functionality'>polluted</span> (" + hazards.poison + "). ";
				}
				if (hazards.cold > 0) {
					if (hazards.cold >= 30) {
						hazardDesc += "It's very <span class='hl-functionality'>cold</span> here (" + hazards.cold + "). ";
					} else {
						hazardDesc += "It's <span class='hl-functionality'>cold</span> here (" + hazards.cold + "). ";
					}
				}
				if (hazards.debris > 0) {
					hazardDesc += "It difficult to move around here due to the amount of <span class='hl-functionality'>debris</span>.";
				}
			}

			return enemyDesc + (hasHazards ? hazardDesc : notCampableDesc);
		},

		updateOutImprovementsList: function (improvements) {
			if (!this.playerLocationNodes.head) return;
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var uiFunctions = GameGlobals.uiFunctions;
			var numVisible = 0;
			$.each(this.elements.outImprovementsTR, function () {
				var actionName = $(this).attr("btn-action");

				if (!actionName) {
					actionName = $(this).find("button.action-build").attr("action");
					$(this).attr("btn-action", actionName);
				}

				if (actionName) {
					var improvementName = GameGlobals.playerActionsHelper.getImprovementNameForAction(actionName);
					if (improvementName) {
						let actionVisible = GameGlobals.playerActionsHelper.isVisible(actionName);
						let existingImprovements = improvements.getCount(improvementName);
						$(this).find(".list-amount").text(existingImprovements);
						GameGlobals.uiFunctions.toggle($(this).find(".action-use"), existingImprovements > 0);

						var isVisible = actionVisible || existingImprovements > 0;
						GameGlobals.uiFunctions.toggle($(this), isVisible);
						if (isVisible) numVisible++;
					}
				}
			});
			GameGlobals.uiFunctions.toggle("#header-out-improvements", numVisible > 0);
		},

		updateOutImprovementsVisibility: function () {
			if (!this.playerLocationNodes.head) return;
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);

			var isScouted = sectorStatus.scouted;
			var hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);

			var collectorFood = improvements.getVO(improvementNames.collector_food);
			var collectorWater = improvements.getVO(improvementNames.collector_water);
			var hasFood = isScouted && featuresComponent.resourcesCollectable.food > 0;
			var hasWater = isScouted && featuresComponent.resourcesCollectable.water > 0;
			GameGlobals.uiFunctions.toggle("#out-improvements-collector-food", collectorFood.count > 0 || hasFood);
			GameGlobals.uiFunctions.toggle("#out-improvements-collector-water", collectorWater.count > 0 || hasWater);
			GameGlobals.uiFunctions.toggle("#out-improvements-camp", sectorStatus.canBuildCamp || hasCampHere);
		},

		updateOutImprovementsStatus: function () {
			if (!this.playerLocationNodes.head) return;
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var hasCamp = GameGlobals.levelHelper.getLevelEntityForSector(this.playerLocationNodes.head.entity).has(CampComponent);
		
			var collectorFood = improvements.getVO(improvementNames.collector_food);
			var collectorWater = improvements.getVO(improvementNames.collector_water);
			var collectorFoodCapacity = collectorFood.storageCapacity.food * collectorFood.count;
			var collectorWaterCapacity = collectorWater.storageCapacity.water * collectorWater.count;
			$("#out-improvements-collector-food .list-storage").text(
				collectorFoodCapacity > 0 ? (Math.floor(collectorFood.storedResources.food * 10) / 10) + " / " + collectorFoodCapacity : "");
			$("#out-improvements-collector-water .list-storage").text(
				collectorWaterCapacity > 0 ? (Math.floor(collectorWater.storedResources.water * 10) / 10) + " / " + collectorWaterCapacity : "");
				
			let bucketMaxLevel = GameGlobals.campHelper.getCurrentMaxImprovementLevel(improvementNames.collector_water);
			let trapMaxLevel = GameGlobals.campHelper.getCurrentMaxImprovementLevel(improvementNames.collector_food);
				
			GameGlobals.uiFunctions.toggle("#out-action-improve-bucket", collectorWaterCapacity > 0 && bucketMaxLevel > 1);
			GameGlobals.uiFunctions.toggle("#out-action-improve-trap", collectorFoodCapacity > 0 && trapMaxLevel > 1);
		},

		updateLocales: function () {
			if (!this.playerLocationNodes.head) return;

			let currentSector = this.playerLocationNodes.head.entity;
			let positionComponent = currentSector.get(PositionComponent);
			let position = positionComponent.getPosition();
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
			
			let sectorLocalesComponent = currentSector.get(SectorLocalesComponent);
			let sectorFeaturesComponent = currentSector.get(SectorFeaturesComponent);
			let sectorStatusComponent = currentSector.get(SectorStatusComponent);
			
			let data = sectorLocalesComponent.locales.map((locale, index) => {
				let isScouted = sectorStatusComponent.isLocaleScouted(index);
				let result = {};
				result.campOrdinal = campOrdinal;
				result.position = position;
				result.index = index;
				result.locale = locale;
				result.isScouted = isScouted;
				result.sectorFeaturesComponent = sectorFeaturesComponent;
				return result;
			});
			
			let numNewItems = UIList.update(this.localeList, data);
			
			if (numNewItems > 0) {
				GameGlobals.buttonHelper.updateButtonDisabledStates("#table-out-actions-locales", true);
				GameGlobals.uiFunctions.registerActionButtonListeners("#table-out-actions-locales");
				GameGlobals.uiFunctions.generateButtonOverlays("#table-out-actions-locales");
				GameGlobals.uiFunctions.generateCallouts("#table-out-actions-locales");
				GlobalSignals.elementCreatedSignal.dispatch();
			}
		},
		
		createLocaleListItem: function () {
			let li = {};
			var button = "<button class='action multiline'></button>";
			var info = "<span class='p-meta'></span";
			li.$root = $("<tr><td>" + button + "</td><td>" + info + "</td></tr>");
			li.$button = li.$root.find("button");
			li.$info = li.$root.find("span");
			return li;
		},
		
		isLocaleListItemDataEqual: function (d1, d2) {
			return d1.index == d2.index && d1.position.equals(d2.position) && d1.isScouted == d2.isScouted;
		},
		
		updateLocaleListItem: function (li, data) {
			let locale = data.locale;
			
			li.$button.attr("action", "scout_locale_" + locale.getCategory() + "_" + data.index);
			li.$button.html(TextConstants.getLocaleName(locale, data.sectorFeaturesComponent));
			
			let info = "";
			if (data.isScouted) {
				if (locale.type == localeTypes.tradingpartner) {
					let partner = TradeConstants.getTradePartner(data.campOrdinal);
					if (partner) {
						info += "Already scouted (" + partner.name + ")";
					} else {
						info += "Already scouted";
					}
				} else if (locale.luxuryResource != null) {
					info += "Already scouted (" + TribeConstants.getLuxuryDisplayName(locale.luxuryResource) + ")";
				} else {
					info += "Already scouted";
				}
			}
			li.$info.html(info);
		},

		updateMovementRelatedActions: function () {
			if (!this.playerLocationNodes.head) return;

			var currentSector = this.playerLocationNodes.head.entity;
			var movementOptionsComponent = currentSector.get(MovementOptionsComponent);
			var enemiesComponent = currentSector.get(EnemiesComponent);
			var enemiesComponent = currentSector.get(PositionComponent);
			var position = currentSector.get(PositionComponent).getPosition();
			$("#container-out-actions-movement-related").empty();

			function addBlockerActionButton(blocker, direction) {
				if (blocker.type !== MovementConstants.BLOCKER_TYPE_GAP) {
					if (!movementOptionsComponent.canMoveToDirection(direction)) {
						var action = blocker.actionBaseID + "_" + direction;
						var gangComponent = GameGlobals.levelHelper.getGangComponent(position, direction);
						var description = TextConstants.getMovementBlockerAction(blocker, enemiesComponent, gangComponent) + " (" + PositionConstants.getDirectionName(direction, true) + ")";
						var button = "<button class='action' action='" + action + "'>" + description + "</button>";
						$("#container-out-actions-movement-related").append(button);
					}
				}
			}

			for (let i in PositionConstants.getLevelDirections()) {
				var direction = PositionConstants.getLevelDirections()[i];
				var directionBlocker = GameGlobals.movementHelper.getBlocker(currentSector, direction);
				if (directionBlocker && directionBlocker.type != MovementConstants.BLOCKER_TYPE_DEBRIS) {
					addBlockerActionButton(directionBlocker, direction);
				}
			}

			GameGlobals.uiFunctions.registerActionButtonListeners("#container-out-actions-movement-related");
			GameGlobals.uiFunctions.generateButtonOverlays("#container-out-actions-movement-related");
			GameGlobals.uiFunctions.generateCallouts("#container-out-actions-movement-related");
			GameGlobals.uiFunctions.updateButtonCooldowns("#container-out-actions-movement-related");
			
			GlobalSignals.elementCreatedSignal.dispatch();
		},

		updateSectorDescription: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var sectorStatus = this.playerLocationNodes.head.entity.get(SectorStatusComponent);

			var sector = this.playerLocationNodes.head.entity;
			var vision = this.playerPosNodes.head.entity.get(VisionComponent).value;
			var hasVision = vision > PlayerStatConstants.VISION_BASE;
			var hasCamp = GameGlobals.levelHelper.getLevelEntityForSector(this.playerLocationNodes.head.entity).has(CampComponent);
			var hasCampHere = this.playerLocationNodes.head.entity.has(CampComponent);
			var isScouted = sectorStatus.scouted;

			// Header
			var features = GameGlobals.sectorHelper.getTextFeatures(sector);
			this.elements.sectorHeader.text(TextConstants.getSectorHeader(hasVision, features));

			// Description
			this.elements.description.html(this.getDescription(
				sector,
				hasCampHere,
				hasCamp,
				hasVision,
				isScouted
			));
		},

		updateStaticSectorElements: function () {
			if (this.nearestCampNodes.head) {
				var campSector = this.nearestCampNodes.head.entity;
				var path = GameGlobals.levelHelper.findPathTo(this.playerLocationNodes.head.entity, campSector, { skipBlockers: true, skipUnvisited: true });
				var len = path ? path.length : "?";
				$("#out-action-move-camp-details").text("(" + len + " blocks)");
			}
		},

		rebuildVis: function () {
			if (GameGlobals.gameState.uiStatus.isHidden) return;
			if (!this.playerLocationNodes.head) return;
			this.pendingUpdateMap = false;
			
			let mapPosition = this.playerLocationNodes.head.position.getPosition();
			GameGlobals.uiMapHelper.rebuildMapHints("minimap-background", "minimap", mapPosition);
			GameGlobals.uiMapHelper.rebuildMap("minimap", null, mapPosition, UIConstants.MAP_MINIMAP_SIZE, true, MapUtils.MAP_MODE_DEFAULT);
		},
		
		hasAccessToResource: function (resourceName, includeScavenge, includeUnbuiltCollectible) {
			if (this.getResouceInInventory(resourceName) >= 1) {
				return true;
			}
			
			var statusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var itemsComponent = this.playerPosNodes.head.entity.get(ItemsComponent);
			var isAffectedByHazard = GameGlobals.sectorHelper.isAffectedByHazard(featuresComponent, statusComponent, itemsComponent);
			
			if (!isAffectedByHazard) {
				if (includeScavenge && this.hasScavengeableResource(resourceName)) {
					return true;
				}
				if (this.hasCollectibleResource(resourceName, includeUnbuiltCollectible)) {
					return true;
				}
			}
						 
			return false;
		},
		
		getResouceInInventory: function (resourceName) {
			return GameGlobals.resourcesHelper.getCurrentStorage().resources.getResource(resourceName) || 0;
		},
		
		hasScavengeableResource: function (resourceName) {
			var discoveredResources = GameGlobals.sectorHelper.getLocationKnownResources();
			if (discoveredResources.indexOf(resourceName) > 0) {
				return true;
			}
			return false;
		},
		
		hasCollectibleResource: function (resourceName, includeUnbuilt) {
			var featuresComponent = this.playerLocationNodes.head.entity.get(SectorFeaturesComponent);
			var statusComponent = this.playerLocationNodes.head.entity.get(SectorStatusComponent);
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			
			var isScouted = statusComponent.scouted;
				
			if (isScouted && featuresComponent.resourcesCollectable.getResource(resourceName) > 0) {
				return includeUnbuilt || improvements.getVO(this.getCollectorName(resourceName)).count > 0;
			}
			if (isScouted && resourceName == resourceNames.water && featuresComponent.hasSpring) {
				return includeUnbuilt || improvements.getVO(this.getCollectorName(resourceName)).count > 0;
			}
		},
		
		getResourceCurrentlyAvailableToCollect: function (resourceName) {
			var improvements = this.playerLocationNodes.head.entity.get(SectorImprovementsComponent);
			var collectorName = this.getCollectorName(resourceName);
			var collector = improvements.getVO(collectorName);
			var availableResource = collector.storedResources[resourceName];
			return availableResource || 0;
		},
		
		getWaymarkText: function (waymarkVO) {
			let pos = waymarkVO.fromPosition;
			let sector = GameGlobals.levelHelper.getSectorByPosition(pos.level, pos.sectorX, pos.sectorY);
			let sectorFeatures = GameGlobals.sectorHelper.getTextFeatures(sector);
			return TextConstants.getWaymarkText(waymarkVO, sectorFeatures);
		},
		
		getCollectorName: function (resourceName) {
			if (resourceName == resourceNames.water) {
				return improvementNames.collector_water;
			}
			if (resourceName == resourceNames.food) {
				return improvementNames.collector_food;
			}
			return null;
		},
		
		onSectorRevealed: function () {
			this.pendingUpdateMap = true;
		},
		
		onButtonStateChanged: function (action, isEnabled) {
			switch (action) {
				case "use_out_collector_water":
				case "use_out_collector_water_one":
				case "use_out_collector_food":
				case "use_out_collector_food_one":
					this.updateOutImprovementsStatus();
					break;
			}
		},
	});

	return UIOutLevelSystem;
});
