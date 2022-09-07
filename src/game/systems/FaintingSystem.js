// Checks hunger & thirst when exploring and determines when, and how, the player faints
define([
	'ash',
	'utils/MathUtils',
	'game/GameGlobals',
	'game/GlobalSignals',
	'game/constants/GameConstants',
	'game/constants/PlayerActionConstants',
	'game/constants/LogConstants',
	'game/constants/PositionConstants',
	'game/nodes/player/PlayerResourcesNode',
	'game/nodes/player/PlayerStatsNode',
	'game/nodes/sector/SectorNode',
	'game/nodes/PlayerLocationNode',
	'game/nodes/NearestCampNode',
	'game/nodes/LastVisitedCampNode',
	'game/components/common/PositionComponent',
	'game/components/common/VisitedComponent',
	'game/components/common/CampComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/MovementOptionsComponent',
	'game/components/player/DeityComponent',
	'game/components/player/PlayerActionResultComponent',
	'game/components/common/LogMessagesComponent',
	'game/systems/PlayerPositionSystem'
], function (Ash,
	MathUtils,
	GameGlobals,
	GlobalSignals,
	GameConstants,
	PlayerActionConstants,
	LogConstants,
	PositionConstants,
	PlayerResourcesNode,
	PlayerStatsNode,
	SectorNode,
	PlayerLocationNode,
	NearestCampNode,
	LastVisitedCampNode,
	PositionComponent,
	VisitedComponent,
	CampComponent,
	SectorFeaturesComponent,
	SectorStatusComponent,
	MovementOptionsComponent,
	DeityComponent,
	PlayerActionResultComponent,
	LogMessagesComponent,
	PlayerPositionSystem
) {
	var FaintingSystem = Ash.System.extend({
		
		playerResourcesNodes: null,
		playerStatsNodes: null,
		playerLocationNodes: null,
		lastVisitedCampNodes: null,
		nearestCampNodes: null,
		sectorNodes: null,

		constructor: function () { },

		addToEngine: function (engine) {
			this.engine = engine;
			this.playerResourcesNodes = engine.getNodeList(PlayerResourcesNode);
			this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
			this.lastVisitedCampNodes = engine.getNodeList(LastVisitedCampNode);
			this.nearestCampNodes = engine.getNodeList(NearestCampNode);
			this.sectorNodes = engine.getNodeList(SectorNode);
		},

		removeFromEngine: function (engine) {
			this.engine = null;
			this.playerResourcesNodes = null;
			this.playerStatsNodes = null;
			this.playerLocationNodes = null;
			this.lastVisitedCampNodes = null;
			this.nearestCampNodes = null;
			this.sectorNodes = null;
		},
		
		despair: function () {
			if (this.isInCampOrCampSector()) return;
			
			var hasFood = this.playerResourcesNodes.head.resources.resources.getResource(resourceNames.food) >= 1;
			var hasWater = this.playerResourcesNodes.head.resources.resources.getResource(resourceNames.water) >= 1;
			var hasStamina = this.playerStatsNodes.head.stamina.stamina > PlayerActionConstants.costs.move_sector_east.stamina;
			var canMove = this.playerLocationNodes.head.entity.get(MovementOptionsComponent).canMove();
			
			if (hasFood && hasWater && hasStamina && canMove) {
				this.log("You rest a bit, eat and drink some. Then you decide to continue.");
				return;
			}
			
			var hasDeity = this.playerStatsNodes.head.entity.has(DeityComponent);
			let hasFollowers = this.playerStatsNodes.head.followers.getParty().length > 0;
			var hasLastVisitedCamp = this.lastVisitedCampNodes.head !== null;
			var hasCampOnLevel = this.nearestCampNodes.head !== null;
			
			// TODO rework texts
			// TODO check distance to camp / safety - if fainted 1-2 tiles away from camp, be saved by workers
			
			var msgAdjective = hasWater ? (hasFood ? "exhausted" : "hungry") : "thirsty";
			var msgMain = "";
			var msgLog = "";
			
			// rescued by campers: back to nearest camp, keep items, get injured
			if (hasCampOnLevel && this.lastVisitedCampNodes.head && this.lastVisitedCampNodes.head.camp.population >= 1 && Math.random() < 0.2) {
				msgMain = "Weak and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>You wake up back in camp. Some of the scavengers found you and brought you home.";
				msgLog = "The world fades. You wake up back in camp.";
				this.fadeOut(msgMain, msgLog, true, this.lastVisitedCampNodes.head.entity, 0, 1, 0, 0);
				return;
			}
			
			// rescued by deity: back to nearest camp, keep items, maybe injured
			if (hasDeity && this.lastVisitedCampNodes.head && Math.random() < 0.1) {
				msgMain = "Weak and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>You wake up back in camp. The spirits have guided you home.";
				msgLog = "The world fades. You wake up back in camp.";
				this.fadeOut(msgMain, msgLog, true, this.lastVisitedCampNodes.head.entity, 0, 0.5, 0, 0);
				return;
			}
			
			// rescued by followers: back to nearest camp, keep items, maybe injured
			if (hasFollowers && this.lastVisitedCampNodes.head && Math.random() < 0.1) {
				let party = this.playerStatsNodes.head.followers.getParty();
				let follower = party[MathUtils.randomIntBetween(0, party.length)];
				msgMain = "Weak and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>You wake up back in camp. <span class='hl-functionality'>" + follower.name + "</span> brought you back.";
				msgLog = "The world fades. You wake up back in camp.";
				this.fadeOut(msgMain, msgLog, true, this.lastVisitedCampNodes.head.entity, 0, 0.5, 0, 0);
				return;
			}
			
			// pass out and teleport to last visited camp: lose items, back to last visited camp, injury
			if (hasLastVisitedCamp) {
				this.fadeOutToLastVisitedCamp(true, msgAdjective);
				return;
			}
			
			// pass out and teleport to nearest safe sector (with scavengable food & water)
			var sectorSafe = this.isSectorSafe(this.playerLocationNodes.head.entity);
			if (!sectorSafe) {
				this.fadeOutToOutside(msgAdjective);
				return;
			}
			
			log.w("can't faint: no known safe sector or camp");
		},
		
		fadeOutToOutside: function (msgAdjective) {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var nearestKnownSafeSector;
			var nearestKnownSafeSectorDist = 100;
			var nearestVisitedSafeSector;
			var nearestVisitedSafeSectorDist = 100;
			
			var dist;
			var isVisited;
			var isSafe;
			var isKnownSafe;
			for (var node = this.sectorNodes.head; node; node = node.next) {
				if (node.position.level === playerPosition.level) {
					isVisited = node.entity.has(VisitedComponent);
					if (!isVisited) continue;
					isSafe = this.isSectorSafe(node.entity);
					if (!isSafe) continue;
					dist = PositionConstants.getDistanceTo(playerPosition.getPosition(), node.position.getPosition());
					if (dist < nearestVisitedSafeSectorDist) {
						nearestVisitedSafeSector = node.entity;
						nearestVisitedSafeSectorDist = dist;
					}
					isKnownSafe = this.isSectorKnownSafe(node.entity);
					if (dist < nearestKnownSafeSectorDist) {
						nearestKnownSafeSector = node.entity;
						nearestKnownSafeSectorDist = dist;
					}
				}
			}
			
			var msgMain = "Weak and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>When you wake up, you find yourself back in a familiar area.";
			var msgLog = "The world fades. You wake up with no memory how you got here.";
			if (nearestKnownSafeSector) {
				this.fadeOut(msgMain, msgLog, true, nearestKnownSafeSector, 1, 0, 0, 0);
			} else if (nearestVisitedSafeSector) {
				this.fadeOut(msgMain, msgLog, true, nearestVisitedSafeSector, 1, 0, 0, 0);
			} else {
				if (GameGlobals.logWarnings) log.w("Nowhere to fade out to.");
			}
		},
		
		fadeOutToLastVisitedCamp: function (handleResults, msgAdjective) {
			if (!this.lastVisitedCampNodes.head) return;
			var msgMain = "Weak and " + msgAdjective + ", you sit to rest. Your consciousness fades.<br/>When you wake up, you find yourself back in camp.";
			var msgLog = "The world fades. You wake up with no memory how you found your way back.";
			this.fadeOut(msgMain, msgLog, handleResults, this.lastVisitedCampNodes.head.entity, 1, 1, 0.5, 0.25);
		},
		
		fadeOut: function (msg, msgLog, handleResults, sector, loseInventoryProbability, injuryProbability, loseAugmentationProbability, loseFollowerProbability) {
			var sys = this;
			
			var finalStep = function () {
				log.i("hide game", this)
				GameGlobals.uiFunctions.hideGame(false, false);
				setTimeout(function () {
					setTimeout(function () {
						log.i("show game", this)
						GameGlobals.uiFunctions.showGame(true);
					}, 750);
					GameGlobals.playerActionFunctions.passTime(60);
					sys.teleport(sector);
					sys.log(msgLog);
					sys.save();
				}, 250);
			};
			
			if (handleResults) {
				var resultVO = GameGlobals.playerActionResultsHelper.getFadeOutResults("despair", loseInventoryProbability, injuryProbability, loseAugmentationProbability, loseFollowerProbability);
				this.playerResourcesNodes.head.entity.add(new PlayerActionResultComponent(resultVO));
				var resultPopUpCallback = function (isTakeAll) {
					GameGlobals.playerActionResultsHelper.collectRewards(isTakeAll, resultVO);
					finalStep();
				};
				GameGlobals.playerActionResultsHelper.preCollectRewards(resultVO);
				GameGlobals.uiFunctions.showResultPopup("Exhaustion", msg, resultVO, resultPopUpCallback);
			} else {
				finalStep();
			}
		},
		
		teleport: function (sector) {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			var sectorPosition = sector.get(PositionComponent);
			playerPosition.level = sectorPosition.level;
			playerPosition.sectorX = sectorPosition.sectorX;
			playerPosition.sectorY = sectorPosition.sectorY;
			
			if (GameGlobals.logInfo) log.i("faint teleport " + sectorPosition);
			
			// TODO make neater way to request position update - needs to happen before enterCamp which relies on nearest camp node
			this.engine.getSystem(PlayerPositionSystem).updateSectors();
			
			setTimeout(function () {
				if (sector.has(CampComponent)) {
					GameGlobals.playerActionFunctions.enterCamp(false);
					GameGlobals.uiFunctions.showTab(GameGlobals.uiFunctions.elementIDs.tabs.in);
				} else {
					if (GameGlobals.logWarnings) log.w("Fainting target sector has no CampComponent");
				}
			}, 100);
		},
	
		log: function (msg) {
			if (!msg) return;
			var logComponent = this.playerResourcesNodes.head.entity.get(LogMessagesComponent);
			logComponent.addMessage(LogConstants.MSG_ID_FAINTED, msg);
			this.lastMsgTimeStamp = new Date().getTime();
		},
		
		save: function () {
			GlobalSignals.saveGameSignal.dispatch();
		},
		
		isSectorSafe: function (sector) {
			var featuresComponent = sector.get(SectorFeaturesComponent);
			var sectorResourcesSca = featuresComponent.resourcesScavengable;
			var sectorResourcesCo = featuresComponent.resourcesCollectable;
			return (sectorResourcesSca.getResource(resourceNames.food) > 0 || sectorResourcesCo.getResource(resourceNames.food) > 0) &&
				(sectorResourcesSca.getResource(resourceNames.water) > 0 || sectorResourcesCo.getResource(resourceNames.water) > 0);
		},
		
		isSectorKnownSafe: function (sector) {
			var discoveredResources = sector.get(SectorStatusComponent).discoveredResources;
			var knownSectorSafe = discoveredResources.indexOf(resourceNames.food) >= 0 && discoveredResources.indexOf(resourceNames.water) >= 0;
			return knownSectorSafe;
		},
		
		isInCampOrCampSector: function () {
			var playerPosition = this.playerResourcesNodes.head.entity.get(PositionComponent);
			if (playerPosition.inCamp) return true;
			if (this.playerLocationNodes.head.entity.has(CampComponent)) return true;
			return false;
		},

	});

	return FaintingSystem;
});
