// A system that handles fights. A fight is started by creating a FightNode and ended by this system.
define([
    'ash',
    'game/constants/FightConstants',
    'game/constants/PositionConstants',
    'game/constants/EnemyConstants',
    'game/nodes/FightNode',
    'game/nodes/player/PlayerStatsNode',
    'game/components/common/PositionComponent',
    'game/components/sector/FightComponent',
    'game/components/sector/FightEncounterComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PlayerActionResultComponent',
], function (Ash, FightConstants, PositionConstants, EnemyConstants,
    FightNode, PlayerStatsNode,
    PositionComponent,
    FightComponent, FightEncounterComponent, SectorControlComponent,
    ItemsComponent, PlayerActionResultComponent) {
	
    var FightSystem = Ash.System.extend({
        
        resourcesHelper: null,
        levelHelper: null,
		playerActionResultsHelper: null,
		playerActionsHelper: null,
		occurrenceFunctions: null,
        gameState: null,
        
		fightNodes: null,
        playerStatsNodes: null,
        
        constructor: function (gameState, resourcesHelper, levelHelper, playerActionResultsHelper, playerActionsHelper, occurrenceFunctions) {
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
			this.levelHelper = levelHelper;
			this.playerActionResultsHelper = playerActionResultsHelper;
			this.playerActionsHelper = playerActionsHelper;
			this.occurrenceFunctions = occurrenceFunctions;
        },

        addToEngine: function (engine) {
			this.engine = engine;
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.fightNodes = engine.getNodeList(FightNode);
            this.fightNodes.nodeAdded.add(this.onFightNodeAdded);
        },

        removeFromEngine: function (engine) {
			this.engine = null;
            this.fightNodes.nodeAdded.remove(this.onFightNodeAdded);
            this.fightNodes = null;
            this.playerStatsNodes = null;
        },
        
        onFightNodeAdded: function (node) {
        },

        update: function (time) {
            if (!this.fightNodes || !this.fightNodes.head) return;
            if (this.fightNodes.head.fight.finished) return;
            
            var enemy = this.fightNodes.head.fight.enemy;
            var playerStamina = this.playerStatsNodes.head.stamina;
			var itemsComponent = this.playerStatsNodes.head.entity.get(ItemsComponent);
            
            if (enemy.hp < 0 || playerStamina.hp < 0) {
                this.endFight();
            }
            
            var enemyDamage =  FightConstants.getEnemyDamagePerSec(enemy, playerStamina, itemsComponent);
            var playerDamage = FightConstants.getPlayerDamagePerSec(enemy, playerStamina, itemsComponent);
            
            var secondsToComplete = Math.min(100 / enemyDamage, 100 / playerDamage);
            var timeFactor = secondsToComplete / FightConstants.FIGHT_LENGTH_SECONDS;
            
            var playerRandomDamage = enemy.attRandomFactor * playerDamage;
            
            enemy.hp -= (enemyDamage) * time * timeFactor;
            playerStamina.hp -= (playerDamage + playerRandomDamage) * time * timeFactor;
        },
        
        endFight: function () {
            var sector = this.fightNodes.head.entity;
            var enemy = this.fightNodes.head.fight.enemy;
            var playerStamina = this.playerStatsNodes.head.stamina;
            var won = playerStamina.hp > enemy.hp;
            var cleared = false;
            
            if (won) {
                var sectorControlComponent = sector.get(SectorControlComponent);
				var encounterComponent = sector.get(FightEncounterComponent);
				var baseActionID = this.playerActionsHelper.getBaseActionID(encounterComponent.context);
				var localeId = FightConstants.getEnemyLocaleId(baseActionID, encounterComponent.context);
				sectorControlComponent.addWin(localeId);
				
				var relatedSectorDirection = FightConstants.getRelatedSectorDirection(baseActionID, encounterComponent.context);
				if (relatedSectorDirection !== PositionConstants.DIRECTION_NONE) {
					var relatedSectorPosition = PositionConstants.getPositionOnPath(sector.get(PositionComponent).getPosition(), relatedSectorDirection, 1);
					var relatedSector = this.levelHelper.getSectorByPosition(relatedSectorPosition.level, relatedSectorPosition.sectorX, relatedSectorPosition.sectorY);
					var relatedSectorControlComponent = relatedSector.get(SectorControlComponent);
					var relatedSectorLocaleId = FightConstants.getEnemyLocaleId(baseActionID, encounterComponent.context, true);
					relatedSectorControlComponent.addWin(relatedSectorLocaleId);
				}
				
                cleared = sectorControlComponent.hasControl();
                if (cleared) {
                    this.occurrenceFunctions.onGainSectorControl(sector);
                }
            }
            
            this.addFightRewardsAndPenalties(won, cleared, enemy);
            
            enemy.hp = 100;
            playerStamina.hp = 100;
            this.fightNodes.head.fight.won = won;
            this.fightNodes.head.fight.finished = true;
        },
        
        addFightRewardsAndPenalties: function (won, cleared, enemy) {
            this.fightNodes.head.fight.resultVO = this.playerActionResultsHelper.getFightRewards(won);
            this.playerStatsNodes.head.entity.add(new PlayerActionResultComponent(this.fightNodes.head.fight.resultVO));
        },
        
    });

    return FightSystem;
});
