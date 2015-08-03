// A system that handles fights. A fight is started by creating a FightNode and ended by this system.
define([
    'ash',
    'game/constants/FightConstants',
    'game/constants/EnemyConstants',
    'game/nodes/FightNode',
    'game/nodes/PlayerStatsNode',
    'game/components/common/PositionComponent',
    'game/components/sector/FightComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/EnemiesComponent',
    'game/components/player/StaminaComponent',
    'game/components/player/ItemsComponent',
    'game/components/player/PerksComponent',
], function (Ash, FightConstants, EnemyConstants,
    FightNode, PlayerStatsNode,
    PositionComponent,
    FightComponent, SectorControlComponent, EnemiesComponent,
    StaminaComponent, ItemsComponent, PerksComponent) {
	
    var FightSystem = Ash.System.extend({
        
        resourcesHelper: null,
		playerActionResultsHelper: null,
		occurrenceFunctions: null,
        gameState: null,
        
		fightNodes: null,
        playerStatsNodes: null,
        
        constructor: function (gameState, resourcesHelper, playerActionResultsHelper, occurrenceFunctions) {
            this.gameState = gameState;
            this.resourcesHelper = resourcesHelper;
			this.playerActionResultsHelper = playerActionResultsHelper;
			this.occurrenceFunctions = occurrenceFunctions;
        },

        addToEngine: function (engine) {
            this.playerStatsNodes = engine.getNodeList(PlayerStatsNode);
            this.fightNodes = engine.getNodeList(FightNode);
            this.fightNodes.nodeAdded.add(this.onFightNodeAdded);
        },

        removeFromEngine: function (engine) {
            this.fightNodes.nodeAdded.remove(this.onFightNodeAdded);
            this.fightNodes = null;
            this.playerStatsNodes = null;
        },
        
        onFightNodeAdded: function(node) {
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
            
            var secondsToComplete = Math.min(100/enemyDamage, 100/playerDamage);
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
                sectorControlComponent.addWin();
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
            var playerItems = this.playerStatsNodes.head.entity.get(ItemsComponent);
            var positionComponent = this.fightNodes.head.entity.get(PositionComponent);
            var levelOrdinal = this.gameState.getLevelOrdinal(positionComponent.level);
            var enemyDifficulty = EnemyConstants.getEnemyDifficultyLevel(enemy);
            
            // Determine rewards and penalties
            this.fightNodes.head.fight.rewards.resources = FightConstants.getRewardResources(won);
            if (won) {
                this.fightNodes.head.fight.rewards.items = this.playerActionResultsHelper.getRewardItems(0.1, 50, playerItems, levelOrdinal);
            } else {
				this.fightNodes.head.fight.rewards.items = [];
			}
            this.fightNodes.head.fight.rewards.reputation = FightConstants.getRewardReputation(won, cleared, enemyDifficulty);
            this.fightNodes.head.fight.penalties.items = FightConstants.getPenaltyFollowers(won);
            this.fightNodes.head.fight.injuries = FightConstants.getPenaltyInjuries(won);
            
            // Add rewards and penalties
            var currentStorage = this.resourcesHelper.getCurrentStorage(true);
            currentStorage.addResources(this.fightNodes.head.fight.rewards.resources);
            
            this.playerStatsNodes.head.reputation.value += this.fightNodes.head.fight.rewards.reputation;
             
            for(var i=0; i < this.fightNodes.head.fight.rewards.items.length; i++) {
                var item = this.fightNodes.head.fight.rewards.items[i];
                playerItems.addItem(item);
            }
            
            var playerPerks = this.playerStatsNodes.head.entity.get(PerksComponent);
            for(var i=0; i < this.fightNodes.head.fight.injuries.length; i++) {
                var injury = this.fightNodes.head.fight.injuries[i];
                playerPerks.addPerk(injury);
            }
            
            // TODO lost followers
        },
        
    });

    return FightSystem;
});
