define([
	'ash',
	'game/constants/LogConstants',
	'game/constants/PerkConstants',
	'game/constants/ItemConstants',
	'game/constants/PositionConstants',
	'game/components/player/BagComponent',
	'game/components/player/ExcursionComponent',
	'game/components/player/VisionComponent',
	'game/components/player/StaminaComponent',
	'game/components/sector/ReputationComponent',
	'game/components/player/RumoursComponent',
	'game/components/player/EvidenceComponent',
	'game/components/player/DeityComponent',
	'game/components/player/FollowersComponent',
	'game/components/player/ItemsComponent',
	'game/components/player/PerksComponent',
	'game/components/type/GangComponent',
	'game/components/type/PlayerComponent',
	'game/components/type/TribeComponent',
	'game/components/type/LevelComponent',
	'game/components/type/SectorComponent',
	'game/components/common/PositionComponent',
	'game/components/player/PlayerActionComponent',
	'game/components/common/ResourcesComponent',
	'game/components/common/CurrencyComponent',
	'game/components/common/ResourceAccumulationComponent',
	'game/components/common/VisitedComponent',
	'game/components/common/RevealedComponent',
	'game/components/common/LogMessagesComponent',
	'game/components/common/SaveComponent',
	'game/components/sector/improvements/BeaconComponent',
	'game/components/sector/improvements/SectorImprovementsComponent',
	'game/components/sector/improvements/SectorCollectorsComponent',
	'game/components/sector/improvements/WorkshopComponent',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/SectorStatusComponent',
	'game/components/sector/SectorControlComponent',
	'game/components/sector/EnemiesComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/MovementOptionsComponent',
	'game/components/sector/PassagesComponent',
	'game/components/sector/SectorFeaturesComponent',
	'game/components/sector/SectorLocalesComponent',
	'game/components/sector/LastVisitedCampComponent',
	'game/components/common/CampComponent',
	'game/components/tribe/UpgradesComponent',
	'game/components/level/LevelPassagesComponent'
], function (
	Ash,
	LogConstants,
	PerkConstants,
	ItemConstants,
	PositionConstants,
	BagComponent,
	ExcursionComponent,
	VisionComponent,
	StaminaComponent,
	ReputationComponent,
	RumoursComponent,
	EvidenceComponent,
	DeityComponent,
	FollowersComponent,
	ItemsComponent,
	PerksComponent,
	GangComponent,
	PlayerComponent,
	TribeComponent,
	LevelComponent,
	SectorComponent,
	PositionComponent,
	PlayerActionComponent,
	ResourcesComponent,
	CurrencyComponent,
	ResourceAccumulationComponent,
	VisitedComponent,
	RevealedComponent,
	LogMessagesComponent,
	SaveComponent,
	BeaconComponent,
	SectorImprovementsComponent,
	SectorCollectorsComponent,
	WorkshopComponent,
	RecruitComponent,
	TraderComponent,
	SectorStatusComponent,
	SectorControlComponent,
	EnemiesComponent,
	CampEventTimersComponent,
	OutgoingCaravansComponent,
	MovementOptionsComponent,
	PassagesComponent,
	SectorFeaturesComponent,
	SectorLocalesComponent,
	LastVisitedCampComponent,
	CampComponent,
	UpgradesComponent,
	LevelPassagesComponent
) {
	var EntityCreator = Ash.Class.extend({

		engine: null,

		constructor: function (engine) {
			this.engine = engine;
		},

		destroyEntity: function (entity) {
			this.engine.removeEntity(entity);
		},

		createPlayer: function (saveKey) {
			var player = new Ash.Entity()
				.add(new PlayerComponent())
				.add(new BagComponent(0))
				.add(new VisionComponent(0))
				.add(new ItemsComponent())
				.add(new FollowersComponent())
				.add(new PerksComponent())
				.add(new StaminaComponent(1000))
				.add(new ResourcesComponent(ItemConstants.PLAYER_DEFAULT_STORAGE))
				.add(new CurrencyComponent(0))
				.add(new ResourceAccumulationComponent(saveKey))
				.add(new RumoursComponent())
				.add(new EvidenceComponent())
				.add(new PositionComponent(13, 0, 0, false))
				.add(new LogMessagesComponent())
				.add(new PlayerActionComponent())
				.add(new SaveComponent(saveKey, [
					ResourcesComponent,
					CurrencyComponent,
					VisionComponent,
					ItemsComponent,
					FollowersComponent,
					PerksComponent,
					StaminaComponent,
					PositionComponent,
					RumoursComponent,
					EvidenceComponent,
					LogMessagesComponent,
					PlayerActionComponent,
					ExcursionComponent,
					DeityComponent
				]));

			this.engine.addEntity(player);
			return player;
		},

		createLevel: function (saveKey, pos, levelVO) {
			var level = new Ash.Entity()
				.add(new LevelComponent(pos, levelVO.isCampable, levelVO.isHard, levelVO.notCampableReason, levelVO.populationFactor, levelVO.raidDangerFactor, levelVO.minX, levelVO.maxX, levelVO.minY, levelVO.maxY))
				.add(new PositionComponent(pos))
				.add(new LevelPassagesComponent())
				.add(new SaveComponent(saveKey, [CampComponent, VisitedComponent]));
			this.engine.addEntity(level);
			return level;
		},

		createSector: function (saveKey, level, posX, posY, passageOptions, movementBlockers, sectorFeatures, locales, criticalPaths, enemies, hasRegularEnemies, localeEnemyNum) {
			var sector = new Ash.Entity()
				.add(new SectorComponent())
				.add(new ResourcesComponent(0))
				.add(new ResourceAccumulationComponent(saveKey))
				.add(new EnemiesComponent(hasRegularEnemies, enemies))
				.add(new SectorImprovementsComponent())
				.add(new PositionComponent(level, posX, posY))
				.add(new SectorControlComponent(localeEnemyNum))
				.add(new MovementOptionsComponent())
				.add(new SectorStatusComponent())
				.add(new PassagesComponent(
					passageOptions.passageUpType,
					passageOptions.passageDownType,
					movementBlockers))
				.add(new SectorFeaturesComponent(
					level,
					sectorFeatures.criticalPaths,
					sectorFeatures.zone,
					sectorFeatures.buildingDensity,
					sectorFeatures.wear,
					sectorFeatures.damage,
					sectorFeatures.sectorType,
					sectorFeatures.sunlit,
					sectorFeatures.ground,
					sectorFeatures.surface,
					sectorFeatures.hazards,
					sectorFeatures.isCamp,
					sectorFeatures.notCampableReason,
					sectorFeatures.resourcesScavengable,
					sectorFeatures.resourcesCollectable,
					sectorFeatures.itemsScavengeable,
					sectorFeatures.hasSpring,
					sectorFeatures.hasTradeConnectorSpot,
					sectorFeatures.stashes,
					sectorFeatures.waymarks
				))
				.add(new SectorLocalesComponent(locales))
				.add(new SaveComponent(saveKey, [
					ResourcesComponent,
					CampComponent,
					CurrencyComponent,
					ReputationComponent,
					OutgoingCaravansComponent,
					CampEventTimersComponent,
					SectorImprovementsComponent,
					SectorStatusComponent,
					SectorControlComponent,
					RecruitComponent,
					TraderComponent,
					VisitedComponent,
					RevealedComponent,
					LastVisitedCampComponent
				]));

			if (sectorFeatures.hasWorkshop) {
				 sector.add(new WorkshopComponent(sectorFeatures.workshopResource, sectorFeatures.hasClearableWorkshop, sectorFeatures.hasBuildableWorkshop));
			}

			this.engine.addEntity(sector);
			return sector;
		},

		createTribe: function (saveKey) {
			var tribe = new Ash.Entity()
				.add(new TribeComponent())
				.add(new ResourcesComponent(0))
				.add(new CurrencyComponent(0))
				.add(new UpgradesComponent())
				.add(new ResourceAccumulationComponent(saveKey))
				.add(new SaveComponent(saveKey, [UpgradesComponent, ResourcesComponent, CurrencyComponent]));
			this.engine.addEntity(tribe);
			return tribe;
		},
		
		createGang: function (saveKey, level, posX, posY, gangVO) {
			var gang = new Ash.Entity()
				.add(new PositionComponent(level, posX, posY))
				.add(new GangComponent(gangVO))
				.add(new SaveComponent(saveKey, [GangComponent]));
			this.engine.addEntity(gang);
			return gang;
		},

		initPlayer: function (entity) {
			var defaultInjury = PerkConstants.perkDefinitions.injury[0].clone();
			defaultInjury.startTimer = PerkConstants.TIMER_DISABLED;
			defaultInjury.removeTimer = PerkConstants.TIMER_DISABLED;
			var perksComponent = entity.get(PerksComponent);
			perksComponent.addPerk(defaultInjury);
			perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.hunger));
			perksComponent.addPerk(PerkConstants.getPerk(PerkConstants.perkIds.thirst));
			entity.add(new ExcursionComponent());

			var logComponent = entity.get(LogMessagesComponent);
			logComponent.addMessage(LogConstants.MSG_ID_START, "You are alone in a massive dark corridor, far below sunlight.");
		},
		
		syncPlayer: function (entity) {
			var inCamp = entity.get(PositionComponent).inCamp;
			if (!inCamp && !entity.has(ExcursionComponent)) {
				entity.add(new ExcursionComponent());
			}
		},

		syncSector: function (entity) {
			if (entity.has(CampComponent) && !entity.has(CampEventTimersComponent)) {
				entity.add(new CampEventTimersComponent());
			}
			if (entity.has(CampComponent) && !entity.has(ReputationComponent)) {
				entity.add(new ReputationComponent());
			}
			if (entity.has(CampComponent) && !entity.has(CurrencyComponent)) {
				entity.add(new CurrencyComponent(0));
			}
			if (entity.has(CampComponent) && !entity.has(OutgoingCaravansComponent)) {
				entity.add(new OutgoingCaravansComponent());
			}
			
			let improvementsComponent = entity.get(SectorImprovementsComponent);
			
			if (improvementsComponent.hasCollectors() && !entity.has(SectorCollectorsComponent)) {
				entity.add(new SectorCollectorsComponent());
			}
			if (improvementsComponent.getCount(improvementNames.beacon) > 0 && !entity.has(BeaconComponent)) {
				entity.add(new BeaconComponent);
			}
		},
	});

	return EntityCreator;
});
