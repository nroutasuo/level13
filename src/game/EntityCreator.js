define([
    'ash',
    'game/constants/PerkConstants',
    'game/constants/ItemConstants',
    'game/components/player/VisionComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/ReputationComponent',
    'game/components/player/RumoursComponent',
    'game/components/player/EvidenceComponent',
    'game/components/player/DeityComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
    'game/components/type/PlayerComponent',
    'game/components/type/TribeComponent',
    'game/components/type/LevelComponent',
    'game/components/type/SectorComponent',
    'game/components/common/PositionComponent',
    'game/components/common/ResourcesComponent',
    'game/components/common/ResourceAccumulationComponent',
    'game/components/common/VisitedComponent',
    'game/components/common/LogMessagesComponent',
    'game/components/common/SaveComponent',
    'game/components/sector/improvements/SectorImprovementsComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/events/CampEventTimersComponent',
    'game/components/sector/MovementOptionsComponent',
    'game/components/sector/PassagesComponent',
    'game/components/sector/SectorFeaturesComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/LastVisitedCampComponent',
    'game/components/sector/improvements/CampComponent',
    'game/components/tribe/UpgradesComponent',
	'game/components/level/LevelPassagesComponent',
    'game/vos/PerkVO',
], function (
    Ash,
    PerkConstants,
    ItemConstants,
    VisionComponent,
    StaminaComponent,
    ReputationComponent,
    RumoursComponent,
    EvidenceComponent,
    DeityComponent,
    ItemsComponent,
    PerksComponent,
    PlayerComponent,
    TribeComponent,
    LevelComponent,
    SectorComponent,
    PositionComponent,
    ResourcesComponent,
    ResourceAccumulationComponent,
    VisitedComponent,
    LogMessagesComponent,
    SaveComponent,
    SectorImprovementsComponent,
    SectorStatusComponent,
    SectorControlComponent,
    EnemiesComponent,
    CampEventTimersComponent,
    MovementOptionsComponent,
    PassagesComponent,
    SectorFeaturesComponent,
    SectorLocalesComponent,
    LastVisitedCampComponent,
    CampComponent,
    UpgradesComponent,
	LevelPassagesComponent,
    PerkVO
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
			.add(new VisionComponent(0))
			.add(new ItemsComponent())
			.add(new PerksComponent())
			.add(new StaminaComponent(0))
			.add(new ResourcesComponent(ItemConstants.PLAYER_DEFAULT_STORAGE))
			.add(new ResourceAccumulationComponent(saveKey))
			.add(new ReputationComponent())
			.add(new RumoursComponent())
			.add(new EvidenceComponent())
			.add(new PositionComponent(13, 2, false))
			.add(new LogMessagesComponent())
			.add(new SaveComponent(saveKey, [
					ResourcesComponent,
					VisionComponent,
					ItemsComponent,
					PerksComponent,
					StaminaComponent,
					PositionComponent,
					ReputationComponent,
					RumoursComponent,
					EvidenceComponent,
					LogMessagesComponent
				]));
			this.engine.addEntity(player);
			return player;
        },
	
		createLevel: function (pos) {
			var level = new Ash.Entity()
			.add(new LevelComponent(pos))
			.add(new PositionComponent(pos))
			.add(new LevelPassagesComponent());
			this.engine.addEntity(level);
			return level;
		},
	
		createSector: function (saveKey, level, pos, passageOptions, sectorFeatures, locales, enemies, enemyNum) {
			var sector = new Ash.Entity()
			.add(new SectorComponent())
			.add(new ResourcesComponent(0))
			.add(new ResourceAccumulationComponent(saveKey))
			.add(new EnemiesComponent(enemies))
			.add(new SectorImprovementsComponent())
			.add(new PositionComponent(level, pos))
			.add(new SectorControlComponent(enemyNum))
			.add(new MovementOptionsComponent())
			.add(new SectorStatusComponent())
			.add(new PassagesComponent(
				passageOptions.passageUp,
				passageOptions.passageDown,
				passageOptions.blockerLeft,
				passageOptions.blockerRight))
			.add(new SectorFeaturesComponent(
				level,
				sectorFeatures.buildingDensity,
				sectorFeatures.stateOfRepair,
				sectorFeatures.sectorType,
				sectorFeatures.buildingStyle,
				sectorFeatures.sunlit,
				sectorFeatures.weather,
				sectorFeatures.campable,
				sectorFeatures.resources))
			.add(new SectorLocalesComponent(locales))
			.add(new SaveComponent(saveKey, [
				ResourcesComponent,
				CampComponent,
				CampEventTimersComponent,
				SectorImprovementsComponent,
				SectorStatusComponent,
				SectorControlComponent,
				VisitedComponent,
				LastVisitedCampComponent
			]));
			
			this.engine.addEntity(sector);
			return sector;
		},
		
		createTribe: function (saveKey) {
			var tribe = new Ash.Entity()
			.add(new TribeComponent())
			.add(new ResourcesComponent(0))
			.add(new UpgradesComponent())
			.add(new ResourceAccumulationComponent(saveKey))
			.add(new SaveComponent(saveKey, [ UpgradesComponent, ResourcesComponent ]));
			this.engine.addEntity(tribe);
			return tribe;
		},
		
		initPlayer: function (entity) {
			var defaultInjury = PerkConstants.perkDefinitions.injury[0];
			var perksComponent = entity.get(PerksComponent);
			perksComponent.addPerk(defaultInjury.clone());
			
			var logComponent = entity.get(LogMessagesComponent);
			logComponent.addMessage("You are alone in a massive dark corridor, far below sunlight.");
		},
		
		syncSector: function (entity) {
			if (entity.has(CampComponent) && !entity.has(CampEventTimersComponent)) {
				entity.add(new CampEventTimersComponent());
			}
		},
    });

    return EntityCreator;
});
