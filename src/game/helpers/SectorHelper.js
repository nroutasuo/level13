// Singleton with helper methods for level entities
define([
	'ash',
	'game/GameGlobals',
	'game/constants/ItemConstants',
	'game/constants/PerkConstants',
	'game/constants/PositionConstants',
	'game/constants/ExplorationConstants',
	'game/nodes/sector/SectorNode',
	'game/nodes/PlayerLocationNode',
	'game/components/common/CampComponent',
	'game/components/common/PositionComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/type/LevelComponent',
], function (
	Ash,
	GameGlobals,
	ItemConstants,
	PerkConstants,
	PositionConstants,
	ExplorationConstants,
	SectorNode,
	PlayerLocationNode,
	CampComponent,
	PositionComponent,
	SectorStatusComponent,
	SectorFeaturesComponent,
	SectorLocalesComponent,
	LevelComponent
) {
	var SectorHelper = Ash.Class.extend({
		
		engine: null,
		sectorNodes: null,
		playerLocationNodes: null,
		
		constructor: function (engine) {
			this.engine = engine;
			this.sectorNodes = engine.getNodeList(SectorNode);
			this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
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
			features.levelOrdinal = levelOrdinal;
			features.campOrdinal = campOrdinal;
			features.condition = featuresComponent.getCondition();
			features.populationFactor = levelComponent.populationFactor;
			features.raidDangerFactor = levelComponent.raidDangerFactor;
			features.isSurfaceLevel = position.level == GameGlobals.gameState.getSurfaceLevel();
			features.isGroundLevel = position.level == GameGlobals.gameState.getGroundLevel();
			features.hasCamp = hasCamp;
			features.hasGrove = hasGrove;
			features.radiation = featuresComponent.hazards.radiation;
			features.poison = featuresComponent.hazards.poison;
			features.debris = featuresComponent.hazards.debris;
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
			
			return false;
		},
			
		isAffectedByHazard: function (featuresComponent, statusComponent, itemsComponent) {
			var hazards = this.getEffectiveHazards(featuresComponent, statusComponent);
			if (hazards.hasHazards() && this.getHazardDisabledReason(featuresComponent, statusComponent, itemsComponent) !== null) {
				return true;
			}
			return false;
		},
		
		getHazardDisabledReason: function (featuresComponent, statusComponent, itemsComponent) {
			var hazards = this.getEffectiveHazards(featuresComponent, statusComponent);
			if (hazards.radiation > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_radiation))
				return "area too radioactive";
			if (hazards.poison > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_poison))
				return "area too polluted";
			if (hazards.cold > itemsComponent.getCurrentBonus(ItemConstants.itemBonusTypes.res_cold))
				return "area too cold";
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
		
		getDebrisMovementMalus: function (sector) {
			let featuresComponent = sector.get(SectorFeaturesComponent);
			return featuresComponent.hazards.debris > 0 ? 2 : 1;
		},
		
		canHaveBeacon: function (sector) {
			return GameGlobals.playerActionsHelper.isRequirementsMet("build_out_beacon", sector);
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
		
		isInDetectionRange: function (sector, itemBonusType) {
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
			let result = 1;
			if (!levelComponent.isCampable) {
				result *= 2;
			}
			return result;
		}
		
	});
	
	return SectorHelper;
});
