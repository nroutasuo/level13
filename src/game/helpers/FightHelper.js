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
		
		pendingEnemies: 0,
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
			
			var baseActionID = this.playerActionsHelper.getBaseActionID(action);
			var localeId = FightConstants.getEnemyLocaleId(baseActionID, action);
			var hasEnemies = enemiesComponent.hasEnemies() && !sectorControlComponent.hasControlOfLocale(localeId);
			if (hasEnemies) {
				var encounterProbability =  PlayerActionConstants.getRandomEncounterProbability(baseActionID);
				if (Math.random() < encounterProbability) {
					this.pendingEnemies = Math.min(this.getEnemyCount(action), sectorControlComponent.getCurrentEnemies(localeId));
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
			console.log("init fight " + action + " " + this.pendingEnemies);
            var sector = this.playerLocationNodes.head.entity;
            sector.remove(FightComponent);
			
            var enemiesComponent = sector.get(EnemiesComponent);
            enemiesComponent.selectNextEnemy();
			sector.add(new FightEncounterComponent(enemiesComponent.getNextEnemy(), action));
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
			var encounterComponent = sector.get(FightEncounterComponent);
            if (sector.has(FightComponent)) {
				if (sector.get(FightComponent).won) {
					sector.get(EnemiesComponent).resetNextEnemy();
					this.pendingEnemies--;
					if (this.pendingEnemies > 0) {
						this.initFight(encounterComponent.context);
						return;
					}
					if (this.pendingWinCallback) this.pendingWinCallback();
				} else {
					if (this.pendingLoseCallback) this.pendingLoseCallback();
					this.engine.getSystem(FaintingSystem).fadeOutToLastVisitedCamp(false, false);
				}
            } else {
				if (this.pendingFleeCallback) this.pendingFleeCallback();
			}
			
            this.uiFunctions.popupManager.closePopup("fight-popup", true);
            sector.remove(FightComponent);
			this.pendingWinCallback = null;
			this.pendingFleeCallback = null;
			this.pendingLoseCallback = null;
            this.save();
        },
		
		getEnemyCount: function (action) {
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var baseActionID = this.playerActionsHelper.getBaseActionID(action);
			var localeId = FightConstants.getEnemyLocaleId(baseActionID, action);
			switch (baseActionID) {
				case "clear_workshop":
				case "fight_gang":
					return sectorControlComponent.getCurrentEnemies(localeId);
				default: return 1;
			}
		},
        
        save: function () {
            var saveSystem = this.engine.getSystem(SaveSystem);
            saveSystem.save();
        },
        
    });

    return FightHelper;
});