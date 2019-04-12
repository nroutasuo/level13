// Helper methods related to player actions (costs, requirements, descriptions) - common definitions for all actions
define([
    'ash',
    'game/GameGlobals',
    'game/GlobalSignals',
    'game/constants/GameConstants',
    'game/constants/PlayerActionConstants',
    'game/constants/LocaleConstants',
    'game/constants/FightConstants',
    'game/components/sector/EnemiesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/FightComponent',
    'game/components/sector/FightEncounterComponent',
    'game/nodes/PlayerLocationNode',
    'game/nodes/player/PlayerStatsNode',
    'game/systems/FaintingSystem'
], function (
	Ash, GameGlobals, GlobalSignals, GameConstants, PlayerActionConstants, LocaleConstants, FightConstants,
    EnemiesComponent, SectorControlComponent, FightComponent, FightEncounterComponent,
    PlayerLocationNode, PlayerStatsNode,
    FaintingSystem
) {
    var FightHelper = Ash.Class.extend({

		playerLocationNodes: null,
        playerStatsNodes: null,

		pendingEnemies: 0,
        totalEnemies: 0,
		pendingWinCallback: null,
		pendingFleeCallback: null,
		pendingLoseCallback: null,

		constructor: function (engine) {
			this.engine = engine;
            this.playerLocationNodes = engine.getNodeList(PlayerLocationNode);
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
		},

		handleRandomEncounter: function (action, winCallback, fleeCallback, loseCallback) {
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var hasEnemies = this.hasEnemiesCurrentLocation(action);
			if (hasEnemies && GameGlobals.gameState.unlockedFeatures.camp) {
                var vision = this.playerStatsNodes.head.vision.value;
				var encounterProbability = PlayerActionConstants.getRandomEncounterProbability(baseActionID, vision);
				if (Math.random() < encounterProbability) {
					this.pendingEnemies = this.getEnemyCount(action);
                    this.totalEnemies = this.pendingEnemies;
					this.pendingWinCallback = winCallback;
					this.pendingFleeCallback = fleeCallback;
					this.pendingLoseCallback = loseCallback;
					this.initFight(action);
					return;
				}
			}

			winCallback();
		},

        hasEnemiesCurrentLocation: function(action) {
            if (!this.playerLocationNodes.head) return false;
            var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
            var localeId = FightConstants.getEnemyLocaleId(baseActionID, action);
            var enemiesComponent = this.playerLocationNodes.head.entity.get(EnemiesComponent);
            var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
            return enemiesComponent.hasEnemies || !sectorControlComponent.hasControlOfLocale(localeId);
        },

        initFight: function (action) {
            var sector = this.playerLocationNodes.head.entity;
            sector.remove(FightComponent);
            var enemiesComponent = sector.get(EnemiesComponent);
            enemiesComponent.selectNextEnemy();
            if (GameConstants.logInfo) console.log("init fight: " + action);
			sector.add(new FightEncounterComponent(enemiesComponent.getNextEnemy(), action, this.pendingEnemies, this.totalEnemies));
			GameGlobals.uiFunctions.showFight();
        },

        startFight: function () {
            if (GameConstants.logInfo) console.log("start fight");
            // TODO move to PlayerActionFunctions
            if (GameGlobals.playerActionsHelper.checkAvailability("fight", true)) {
                GameGlobals.playerActionsHelper.deductCosts("fight");
                var sector = this.playerLocationNodes.head.entity;
				var encounterComponent = sector.get(FightEncounterComponent);
				if (encounterComponent && encounterComponent.enemy) {
					sector.add(new FightComponent(encounterComponent.enemy));
				} else {
					if (GameGlobals.logWarnings) console.log("WARN: Encounter or enemy not initialized - cannot start fight.");
				}
            } else {
                if (GameGlobals.logWarnings) console.log("WARN: Can't start fight- availability check failed");
            }
        },

        endFight: function () {
            var sector = this.playerLocationNodes.head.entity;
			var encounterComponent = sector.get(FightEncounterComponent);
            var fightComponent = sector.get(FightComponent);
            if (fightComponent) {
				if (fightComponent.won) {
                    GameGlobals.playerActionResultsHelper.collectRewards(false, fightComponent.resultVO);
					sector.get(EnemiesComponent).resetNextEnemy();
					this.pendingEnemies--;
					if (this.pendingEnemies > 0) {
						this.initFight(encounterComponent.context);
						return;
					}
					if (this.pendingWinCallback) {
                        this.pendingWinCallback();
                    }
				} else {
					if (this.pendingLoseCallback) this.pendingLoseCallback();
					this.engine.getSystem(FaintingSystem).fadeOutToLastVisitedCamp(false, false);
				}
            } else {
				if (this.pendingFleeCallback) this.pendingFleeCallback();
			}
            GameGlobals.uiFunctions.popupManager.closePopup("fight-popup");
            sector.remove(FightComponent);
			this.pendingWinCallback = null;
			this.pendingFleeCallback = null;
			this.pendingLoseCallback = null;
            GlobalSignals.fightEndedSignal.dispatch();
            this.save();
        },

		getEnemyCount: function (action) {
			var sectorControlComponent = this.playerLocationNodes.head.entity.get(SectorControlComponent);
			var baseActionID = GameGlobals.playerActionsHelper.getBaseActionID(action);
			var localeId = FightConstants.getEnemyLocaleId(baseActionID, action);
			switch (baseActionID) {
				case "clear_workshop":
				case "fight_gang":
					return sectorControlComponent.getCurrentEnemies(localeId);
				default: return 1;
			}
		},

        save: function () {
            GlobalSignals.saveGameSignal.dispatch();
        },

    });

    return FightHelper;
});
