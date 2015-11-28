// Helper methods related to player actions (costs, requirements, descriptions) - common definitions for all actions
define([
    'ash',
    'game/constants/PlayerActionConstants',
    'game/constants/LocaleConstants',
    'game/constants/FightConstants',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/FightComponent',
    'game/components/sector/FightEncounterComponent',
    'game/nodes/PlayerLocationNode',
    'game/systems/FaintingSystem',
    'game/systems/SaveSystem'
], function (
	Ash, PlayerActionConstants, LocaleConstants, FightConstants, EnemiesComponent, SectorControlComponent, FightComponent, FightEncounterComponent, PlayerLocationNode, FaintingSystem, SaveSystem
) {
    var FightHelper = Ash.Class.extend({
		
		uiFunctions: null,
		playerActionsHelper: null,
		
		playerLocationNodes: null,
		
		pendingWinCallback: null,
		pendingFleeCallback: null,
		pendingLoseCallback: null,
		
		constructor: function (engine, playerActionsHelper) {
			this.playerActionsHelper = playerActionsHelper;
			this.engine = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
		},

		handleRandomEncounter: function (action, winCallback, fleeCallback, loseCallback) {
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
			
			var localeId = FightConstants.getEnemyLocaleId(action);
			var hasEnemies = enemiesComponent.hasEnemies() && !sectorControlComponent.hasControlOfLocale(localeId);
			if (hasEnemies) {
				var encounterProbability =  PlayerActionConstants.getRandomEncounterProbability(this.playerActionsHelper.getBaseActionID(action));
				if (Math.random() < encounterProbability) {
					this.pendingWinCallback = winCallback;
					this.pendingFleeCallback = fleeCallback;
					this.pendingLoseCallback = loseCallback;
					this.initFight(action);
					return;
				}
			}

			winCallback();
		},
        
        initFight: function (action) {
            var sector = this.playerLocationNodes.head.entity;
            var enemiesComponent = sector.get(EnemiesComponent);
            enemiesComponent.selectNextEnemy();
			sector.add(new FightEncounterComponent(enemiesComponent.getNextEnemy(), this.playerActionsHelper.getBaseActionID(action)));
			this.uiFunctions.showFight();
        },
        
        startFight: function () {
            if (this.playerActionsHelper.checkAvailability("fight", true)) {
                this.playerActionsHelper.deductCosts("fight");
                var sector = this.playerLocationNodes.head.entity;
				var encounterComponent = sector.get(FightEncounterComponent);
				if (encounterComponent && encounterComponent.enemy) {
					sector.add(new FightComponent(encounterComponent.enemy));
				} else {
					console.log("WARN: Encounter or enemy not initialized - cannot start fight.");
				}
            }
        },
        
        endFight: function () {
            var sector = this.playerLocationNodes.head.entity;
            if (sector.has(FightComponent)) {
				if (sector.get(FightComponent).won) {
					sector.get(EnemiesComponent).resetNextEnemy();
					if (this.pendingWinCallback) this.pendingWinCallback();
				} else {
					if (this.pendingLoseCallback) this.pendingLoseCallback();
					this.engine.getSystem(FaintingSystem).fadeOutToLastVisitedCamp(false, false);
				}
            } else {
				if (this.pendingFleeCallback) this.pendingFleeCallback();
			}
            sector.remove(FightComponent);
			this.pendingWinCallback = null;
			this.pendingFleeCallback = null;
			this.pendingLoseCallback = null;
            this.save();
        },
        
        save: function () {
            var saveSystem = this.engine.getSystem(SaveSystem);
            saveSystem.save();
        },
        
    });

    return FightHelper;
});