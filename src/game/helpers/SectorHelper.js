// Singleton with helper methods for level entities
define([
	'ash',
	'game/GameGlobals',
	'game/constants/GameConstants',
	'game/constants/ItemConstants',
	'game/constants/LocaleConstants',
	'game/constants/PerkConstants',
	'game/constants/PositionConstants',
	'game/constants/SectorConstants',
	'game/constants/ExplorationConstants',
	'game/constants/MovementConstants',
	'game/constants/TextConstants',
	'game/constants/TradeConstants',
	'game/nodes/sector/SectorNode',
	'game/nodes/PlayerLocationNode',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/common/RevealedComponent',
	'game/components/common/VisitedComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/type/LevelComponent',
], function (
	Ash,
	GameGlobals,
	GameConstants,
	ItemConstants,
	LocaleConstants,
	PerkConstants,
	PositionConstants,
	SectorConstants,
	ExplorationConstants,
	MovementConstants,
	TextConstants,
	TradeConstants,
	SectorNode,
	PlayerLocationNode,
	CampComponent,
	PositionComponent,
	RevealedComponent,
	VisitedComponent,
	PassagesComponent,
	SectorControlComponent,
	SectorStatusComponent,
	SectorFeaturesComponent,
	SectorLocalesComponent,
	SectorImprovementsComponent,
	WorkshopComponent,
	LevelComponent
) {
	let SectorHelper = Ash.Class.extend({
		
		engine: null,
		sectorNodes: null,
		playerLocationNodes: null,
		
		constructor: function (engine) {
			this.engine = engine;
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
		},

		getCurrentActionSector: function (sector) {
			if (sector) return sector;
			if (this.playerLocationNodes && this.playerLocationNodes.head) return this.playerLocationNodes.head.entity;
			if (this.sectorNodes.head) return this.sectorNodes.head.entity;
			return null;
		},

		getCurrentActionPosition: function (sector) {
			sector = this.getCurrentActionSector(sector);
			return sector ? sector.get(PositionComponent) : null;
		},

		isVisited: function (sector) {
			if (!sector) return false;
			let statusComponent = sector.get(SectorStatusComponent);
			return statusComponent.visited || sector.has(VisitedComponent);
		},

		isRevealed: function (sector) {
			if (!sector) return false;
			let status = this.getSectorStatus(sector);
			return status !== SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
		},
		
		getTextFeatures: function (sector) {
			var position = sector.get(PositionComponent).getPosition();
			var featuresComponent = sector.get(SectorFeaturesComponent);
			var levelOrdinal = GameGlobals.gameState.getLevelOrdinal(position.level);
			var campOrdinal = GameGlobals.gameState.getCampOrdinal(position.level);
			var levelEntity = GameGlobals.levelHelper.getLevelEntityForSector(sector);
			var levelComponent = levelEntity.get(LevelComponent);
			var hasCamp = sector.has(CampComponent);
			var hasGrove = false;
			
			var sectorLocalesComponent = sector.get(SectorLocalesComponent);
			var locales = sectorLocalesComponent.locales;
			for (let i = 0; i < locales.length; i++) {
				if (locales[i].type == localeTypes.grove) {
					hasGrove = true;
				}
			}
			
			var features = Object.assign({}, featuresComponent);
			features.level = position.level;
			features.sectorX = position.sectorX;
			features.sectorY = position.sectorY;
			features.levelOrdinal = levelOrdinal;
			features.campOrdinal = campOrdinal;
			features.condition = featuresComponent.getCondition();
			features.habitability = levelComponent.habitability;
			features.raidDangerFactor = levelComponent.raidDangerFactor;
			features.isSurfaceLevel = position.level == GameGlobals.gameState.getSurfaceLevel();
			features.isGroundLevel = position.level == GameGlobals.gameState.getGroundLevel();
			features.hasCamp = hasCamp;
			features.hasGrove = hasGrove;
			features.radiation = featuresComponent.hazards.radiation;
			features.poison = featuresComponent.hazards.poison;
			features.debris = featuresComponent.hazards.debris;
			features.flooded = featuresComponent.hazards.flooded;
			return features;
		},
		
		canExploreSector: function (sectorEntity, itemsComponent) {
			let featuresComponent = sectorEntity.get(SectorFeaturesComponent);
			var statusComponent = sectorEntity.get(SectorStatusComponent);
			return !this.isAffectedByHazard(featuresComponent, statusComponent, itemsComponent);
		},
		
		getEffectiveHazardValue: function (sectorFeatures, sectorStatus, hazard) {
			var hazards = this.getEffectiveHazards(sectorFeatures, sectorStatus);
			return hazards[hazard] || 0;
		},
		
		getEffectiveHazards: function (sectorFeatures, sectorStatus) {
			let result = sectorFeatures.hazards.clone();
			result.radiation = Math.max(0, result.radiation - sectorStatus.getHazardReduction("radiation"));
			result.poison = Math.max(0, result.poison - sectorStatus.getHazardReduction("poison"));
			result.cold = Math.max(0, result.cold - sectorStatus.getHazardReduction("cold"));
			result.flooded = Math.max(0, result.flooded - sectorStatus.getHazardReduction("flooded"));
			result.territory = Math.max(0, result.territory - sectorStatus.getHazardReduction("territory"));
			return result;
		},
		
		hasHazards: function (sectorFeatures, sectorStatus) {
			let hazards = this.getEffectiveHazards(sectorFeatures, sectorStatus);
			return hazards.hasHazards();
		},
		
		hasSeriousHazards: function (level, sectorFeatures, sectorStatus) {
			let hazards = this.getEffectiveHazards(sectorFeatures, sectorStatus);
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(level);
			let campOrdianl2 = campOrdinal - 1;
			
			if (hazards.radiation > 0 && hazards.radiation > GameGlobals.itemsHelper.getMaxHazardRadiationForLevel(campOrdianl2, 0, false)) return true;
			if (hazards.poison > 0 && hazards.poison > GameGlobals.itemsHelper.getMaxHazardPoisonForLevel(campOrdianl2, 0, false)) return true;
			if (hazards.cold > 0 && hazards.cold > GameGlobals.itemsHelper.getMaxHazardColdForLevel(campOrdianl2, 0, false)) return true;
			if (hazards.debris > 0) return true;
			if (hazards.flooded > 0) return true;
			
			return false;
		},
		
		isSectorAffectedByHazard: function (sector, itemsComponent) {
			return this.isAffectedByHazard(sector.get(SectorFeaturesComponent), sector.get(SectorStatusComponent), itemsComponent);
		},
			
		isAffectedByHazard: function (featuresComponent, statusComponent, itemsComponent) {
			var hazards = this.getEffectiveHazards(featuresComponent, statusComponent);
			if (hazards.hasHazards() && this.getHazardDisabledReason(featuresComponent, statusComponent, itemsComponent) !== null) {
				return true;
			}
			return false;
		},
		
		getHazardDisabledReason: function (featuresComponent, statusComponent, itemsComponent) {
			if (GameConstants.cheatModeHazards) return null;
			var hazards = this.getEffectiveHazards(featuresComponent, statusComponent);
			if (hazards.radiation > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_radiation))
				return "area too radioactive";
			if (hazards.poison > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_poison))
				return "area too polluted";
			if (hazards.cold > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_cold))
				return "area too cold";
			if (hazards.flooded > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_water))
				return "area too flooded";
			return null;
		},
		
		getLuxuryResourceOnSector: function (sector, onlyFound) {
			let sectorLocalesComponent = sector.get(SectorLocalesComponent);
			let sectorStatusComponent = sector.get(SectorStatusComponent);
			for (let i = 0; i < sectorLocalesComponent.locales.length; i++) {
				let locale = sectorLocalesComponent.locales[i];
				let isScouted = sectorStatusComponent.isLocaleScouted(i);
				if (locale.luxuryResource && (isScouted || !onlyFound)) {
					return locale.luxuryResource;
				}
			}
			return null;
		},
		
		isBeaconActive: function (position) {
			let beacon = GameGlobals.levelHelper.getNearestBeacon(position);
			let beaconPos = beacon ? beacon.get(PositionComponent) : null;
			let dist = beaconPos ? PositionConstants.getDistanceTo(position, beaconPos) : -1;
			return dist >= 0 && dist < ExplorationConstants.BEACON_RADIUS;
		},
		
		getBeaconMovementBonus: function (sector, perksComponent) {
			let isActive = GameGlobals.sectorHelper.isBeaconActive(sector.get(PositionComponent).getPosition());
			if (!isActive) return 1;
			var perkBonus = PerkConstants.getPerk(PerkConstants.perkIds.lightBeacon).effect;
			if (perkBonus === 0) {
				perkBonus = 1;
			} else {
				perkBonus = 1 - perkBonus / 100;
			}
			return perkBonus;
		},

		getHazardsMovementMalus: function (sector) {
			return this.getDebrisMovementMalus(sector) * this.getFloodedMovementMalus(sector);
		},
		
		getDebrisMovementMalus: function (sector) {
			let featuresComponent = sector.get(SectorFeaturesComponent);
			return featuresComponent.hazards.debris > 0 ? 2 : 1;
		},

		getFloodedMovementMalus: function (sector) {
			let featuresComponent = sector.get(SectorFeaturesComponent);
			return featuresComponent.hazards.flooded > 0 ? 2 : 1;
		},
		
		canHaveBeacon: function (sector) {
			return GameGlobals.playerActionsHelper.isRequirementsMet("build_out_beacon", sector);
		},

		getNumUnscoutedLocales: function (sector) {
			let statusComponent = sector.get(SectorStatusComponent);
			let localesComponent = sector.get(SectorLocalesComponent);
			return localesComponent.locales.length - statusComponent.getNumLocalesScouted();
		},

		getNumVisibleUnscoutedLocales: function (sector) {
			if (!sector) return 0;
			let statusComponent = sector.get(SectorStatusComponent);
			if (!statusComponent.scouted) return 0;
			let localesComponent = sector.get(SectorLocalesComponent);
			return localesComponent.locales.length - statusComponent.getNumLocalesScouted();
		},

		isLocaleVisible: function (sector, localeVO) {
			if (localeVO.type == localeTypes.grove) {
				let forcedExplorerID = GameGlobals.explorerHelper.getForcedExplorerID();
				if (forcedExplorerID == "gambler") {
					let explorerVO = GameGlobals.playerHelper.getExplorerByID(forcedExplorerID);
					return !explorerVO || explorerVO.inParty;
				}
			}
			return true;
		},
				
		hasSectorKnownResource: function (sector, resourceName, min) {
			min = min || 1;
			
			let sectorStatus = sector.get(SectorStatusComponent);
			if (!sectorStatus.scouted && !this.isInDetectionRange(sector, ItemConstants.itemBonusTypes.detect_supplies)) {
				return false;
			}
			
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			if (sectorFeatures.resourcesCollectable.getResource(resourceName) >= min) {
				return true;
			}
			
			let knownResources = GameGlobals.sectorHelper.getLocationKnownResources(sector);
			if (knownResources.indexOf(resourceName) >= 0) {
				if (sectorFeatures.resourcesScavengable.getResource(resourceName) >= min) {
					return true;
				}
			}
			
			if (resourceName == resourceNames.water == sectorFeatures.hasSpring) {
				return true;
			}
			
			return false;
		},
		
		getLocationDiscoveredResources: function (sector) {
			var resources = [];
			sector = sector ? sector : this.playerLocationNodes.head.entity;
			var sectorStatus = sector.get(SectorStatusComponent);
			var sectorFeatures = sector.get(SectorFeaturesComponent);
			var missingResources = [];
			
			for (let i = 0; i < sectorStatus.discoveredResources.length; i++) {
				var res = sectorStatus.discoveredResources[i];
				if (sectorFeatures.resourcesScavengable[res] > 0) {
					resources.push(res);
				} else {
					log.w("Resource in discovered resources not found on sector.");
					missingResources.push(res);
				}
			}
			
			for (let j = 0; j < missingResources.length; j++) {
				sectorStatus.discoveredResources.splice(sectorStatus.discoveredResources.indexOf(missingResources[j]), 1);
			}
			
			resources.sort(this.resourceSortFunc);
			
			return resources;
		},
		
		getLocationKnownResources: function (sector) {
			sector = sector ? sector : this.playerLocationNodes.head.entity;
			if (this.isInDetectionRange(sector, ItemConstants.itemBonusTypes.detect_supplies)) {
				return this.getLocationScavengeableResources(sector);
			} else {
				return this.getLocationDiscoveredResources(sector);
			}
		},
		
		getLocationScavengeableResources: function (sector) {
			sector = sector ? sector : this.playerLocationNodes.head.entity;
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			return sectorFeatures.resourcesScavengable.getNames();
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
		
		getCollectorName: function (resourceName) {
			if (resourceName == resourceNames.water) {
				return improvementNames.collector_water;
			}
			if (resourceName == resourceNames.food) {
				return improvementNames.collector_food;
			}
			return null;
		},
		
		resourceSortFunc: function (a, b) {
			if (a === b) return 0;
			if (a === resourceNames.metal) return -1;
			if (b === resourceNames.metal) return 1;
			if (a === resourceNames.water) return -1;
			if (b === resourceNames.water) return 1;
			if (a === resourceNames.food) return -1;
			if (b === resourceNames.food) return 1;
			if (a === resourceNames.fuel) return -1;
			if (b === resourceNames.fuel) return 1;
			return 0;
		},
		
		hasSectorVisibleIngredients: function (sector) {
			sector = sector ? sector : this.playerLocationNodes.head.entity;
		 	if (this.getLocationKnownItems(sector).length > 0) {
				return true;
			}
			let sectorStatus = sector.get(SectorStatusComponent);
			if (sectorStatus.scouted && this.getLocationScavengeableItems(sector).length > 0) {
				return true;
			}
			return false;
		},
		
		getSectorStatus: function (sector) {
			if (!sector) return null;
			
			var statusComponent = sector.get(SectorStatusComponent);
			
			if (statusComponent.scouted) {
				var workshopComponent = sector.get(WorkshopComponent);
				var unScoutedLocales = this.getNumUnscoutedLocales(sector);
				var sectorControlComponent = sector.get(SectorControlComponent);
				var hasUnclearedWorkshop = workshopComponent != null && workshopComponent.isClearable && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP);
				let canBeInvestigated = this.canBeInvestigated(sector);
				let isCleared = unScoutedLocales <= 0 && !hasUnclearedWorkshop && !canBeInvestigated;
				
				if (isCleared) {
					return SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED;
				} else {
					return SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED;
				}
			}
			
			if (statusComponent.revealedByMap) {
				return SectorConstants.MAP_SECTOR_STATUS_REVEALED_BY_MAP;
			}
			
			var isVisited = this.isVisited(sector);
			if (isVisited) {
				return SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED;
			} else {
				if (sector.has(RevealedComponent)) {
					return SectorConstants.MAP_SECTOR_STATUS_UNVISITED_VISIBLE;
				}
			}
			
			return SectorConstants.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
		},
		
		canBeInvestigated: function (sector, ignoreScoutedStatus) {
			if (!GameGlobals.gameState.isFeatureUnlocked("investigate")) return false;
			let statusComponent = sector.get(SectorStatusComponent);
			let featuresComponent = sector.get(SectorFeaturesComponent);
			return (ignoreScoutedStatus || statusComponent.scouted) && (featuresComponent.isInvestigatable || statusComponent.isFallbackInvestigateSector) && statusComponent.getInvestigatedPercent() < 100;
		},

		getNumUnexaminedSpots: function (sector) {
			let featuresComponent = sector.get(SectorFeaturesComponent);

			let result = 0;
			for (let i = 0; i < featuresComponent.examineSpots.length; i++) {
				let spotID = featuresComponent.examineSpots[i];
				if (!GameGlobals.levelHelper.isExamineSpotExamined(sector, spotID)) {
					result++;
				}
			}

			return result;
		},
		
		getLocationDiscoveredItems: function (sector) {
			var items = [];
			sector = sector ? sector : this.playerLocationNodes.head.entity;
			var sectorStatus = sector.get(SectorStatusComponent);
			var sectorFeatures = sector.get(SectorFeaturesComponent);
			var missingItems = [];
			
			for (let i = 0; i < sectorStatus.discoveredItems.length; i++) {
				var itemID = sectorStatus.discoveredItems[i];
				if (sectorFeatures.itemsScavengeable.indexOf(itemID) >= 0) {
					items.push(itemID);
				} else {
					log.w("Item in discovered items not found on sector.");
					missingItems.push(itemID);
				}
			}
			
			for (let j = 0; j < missingItems.length; j++) {
				sectorStatus.discoveredItems.splice(sectorStatus.discoveredItems.indexOf(missingItems[j]), 1);
			}
			
			return items;
		},
		
		getLocationKnownItems: function (sector) {
			sector = sector ? sector : this.playerLocationNodes.head.entity;
			if (this.isInDetectionRange(sector, ItemConstants.itemBonusTypes.detect_ingredients)) {
				return this.getLocationScavengeableItems(sector);
			} else {
				return this.getLocationDiscoveredItems(sector);
			}
		},
		
		getLocationScavengeableItems: function (sector) {
			sector = sector ? sector : this.playerLocationNodes.head.entity;
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			return sectorFeatures.itemsScavengeable;
		},

		getPOIData: function (sector, poiType, isScouted) {
			let sectorPosition = sector.get(PositionComponent);
			let sectorFeatures = sector.get(SectorFeaturesComponent);
			let sectorStatus = sector.get(SectorStatusComponent);
			let sectorLocales = sector.get(SectorLocalesComponent);
			let passagesComponent = sector.get(PassagesComponent);

			if (isScouted !== null && typeof isScouted !== "undefined") {
				if (isScouted && !sectorStatus.scouted) return null;
				if (!isScouted && sectorStatus.scouted) return null;
			}
			
			let campOrdinal = GameGlobals.gameState.getCampOrdinal(sectorPosition.level);

			switch (poiType) {
				case "campable":
					if (sectorFeatures.campable) return {};
					break;
				case "settlement":
					if (sectorLocales.hasLocale(localeTypes.tradingpartner)) {
						let partner = TradeConstants.getTradePartner(campOrdinal);
						return { nameTextKey: partner.name };
					}
					break;
				case "spring":
					if (sectorFeatures.hasSpring) {
						let springName = TextConstants.getSpringName(sectorFeatures);
						return { nameTextKey: springName };
					}
					break;
				case "grove":
					if (sectorLocales.hasLocale(localeTypes.grove)) {
						return { nameTextKey: "grove" };
					}
					break;
				case "ingredients": 
					if (sectorFeatures.itemsScavengeable.length > 0) return {};
					break;
				case "hazard_pollution": 
					if (sectorFeatures.hazards.poison > 0) return {};
					break;
				case "hazard_radiation": 
					if (sectorFeatures.hazards.radiation > 0) return {};
					break;
				case "hazard_cold": 
					if (sectorFeatures.hazards.cold > 0) return {};
					break;
				case "hazard_debris": 
					if (sectorFeatures.hazards.debris > 0) return {};
					break;
				case "hazard_flooded": 
					if (sectorFeatures.hazards.flooded > 0) return {};
					break;
				case "hazard_territory": 
					if (sectorFeatures.hazards.territory > 0) return {};
					break;
				case "blocker_debris": 
					if (this.hasBlockingBlockerInAnyDirection(sector, MovementConstants.BLOCKER_TYPE_DEBRIS)) return {};
					break;
				case "blocker_explosives": 
					if (this.hasBlockingBlockerInAnyDirection(sector, MovementConstants.BLOCKER_TYPE_EXPLOSIVES)) return {};
					break;
				case "blocker_gap": 
					if (this.hasBlockingBlockerInAnyDirection(sector, MovementConstants.BLOCKER_TYPE_GAP)) return {};
					break;
				case "blocker_gate": 
					if (this.hasBlockingBlockerInAnyDirection(sector, MovementConstants.BLOCKER_TYPE_TOLL_GATE)) return {};
					break;
				case "blocker_waste": 
					if (this.hasBlockingBlockerInAnyDirection(sector, MovementConstants.BLOCKER_TYPE_WASTE_RADIOACTIVE)) return {};
					if (this.hasBlockingBlockerInAnyDirection(sector, MovementConstants.BLOCKER_TYPE_WASTE_TOXIC)) return {};
					break;
				case "passage":
					if (passagesComponent.hasLevelPassage()) return {};
					break;
				case "center":
					if (Math.abs(sectorPosition.sectorX) <= 1 && Math.abs(sectorPosition.sectorY) <= 1) return {};
					break;
				case "poi":
					if (this.getNumUnscoutedLocales(sector) > 0) return {};
					if (this.getNumUnexaminedSpots(sector) > 0) return {};
					if (passagesComponent.hasLevelPassage()) return {};
					break;
				default:
					log.w("no such poi type defined: " + poiType);
					break;
			}

			return null;
		},

		hasBlockingBlockerInAnyDirection: function (sector, blockerType) {
			let passagesComponent = sector.get(PassagesComponent);

			for (let i in PositionConstants.getLevelDirections()) {
				let direction = PositionConstants.getLevelDirections()[i];
				let blocker = passagesComponent.getBlocker(direction);

				if (!blocker) continue;
				if (blocker.type != blockerType) continue;
				if (!GameGlobals.movementHelper.isBlocked(sector, direction)) continue;

				return true;
			}

			return false;
		},
		
		isInDetectionRange: function (sector, itemBonusType) {
			if (!this.playerLocationNodes.head) return false;
			let detectionRange = GameGlobals.playerHelper.getCurrentBonus(itemBonusType);
			if (detectionRange <= 0) return false;
			let sectorPos = sector.get(PositionComponent);
			let playerPos = this.playerLocationNodes.head.position;
			let distance = PositionConstants.getDistanceTo(sectorPos, playerPos);
			return distance < (detectionRange + 1);
		},
		
		getDangerFactor: function (sectorEntity) {
			if (!sectorEntity) return 1;
			let levelEntity = GameGlobals.levelHelper.getLevelEntityForSector(sectorEntity);
			let levelComponent = levelEntity.get(LevelComponent);
			let sectorStatus = sectorEntity.get(SectorStatusComponent);
			let sectorFeatures = sectorEntity.get(SectorFeaturesComponent);
			let hazards = this.getEffectiveHazards(sectorFeatures, sectorStatus);

			let result = 1;
			if (!levelComponent.isCampable) {
				result *= 2;
			}
			if (hazards.territory > 0) {
				result *= 2;
			}

			return result;
		}
		
	});
	
	return SectorHelper;
});
