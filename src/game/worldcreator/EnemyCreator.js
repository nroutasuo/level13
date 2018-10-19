define([
    'ash',
    'game/GameGlobals',
    'game/constants/EnemyConstants',
    'game/constants/PerkConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/constants/WorldCreatorConstants',
    'game/components/player/ItemsComponent',
    'game/vos/EnemyVO'
], function (
    Ash,
    GameGlobals,
    EnemyConstants,
    PerkConstants,
    ItemConstants,
    FightConstants,
    WorldCreatorConstants,
    ItemsComponent,
    EnemyVO
) {
    var EnemyCreator = Ash.Class.extend({
        
        constructor: function () {},
        
        createEnemies: function () {
            var c = EnemyConstants;
            var definitions = EnemyConstants.enemyDefinitions;
            definitions.global.push(this.createEnemy("huge rat", "global", [c.nPest, c.nAnimal], [c.gPack, c.gMob, c.gHorde], [c.aInfest], [c.dCleared], 0, 5, 0.75));
            definitions.global.push(this.createEnemy("poisonous centipede", "global", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [c.dCleared], 1, 3, 0.4, 50));
            definitions.global.push(this.createEnemy("giant centipede", "global", [c.nPest, c.nAnimal],  [c.gSwarm],[c.aInfest], [c.dCleared], 1, 2, 0.4, 30));
            definitions.global.push(this.createEnemy("radioactive cockroach", "global", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aCover, c.aOverrun], [c.dCleared], 2, 3, 0.1));
            definitions.global.push(this.createEnemy("cave bat", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 2, 5, 0.4, 20));
            definitions.global.push(this.createEnemy("ghost bat", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 3, 6, 0.8, 50));
            definitions.global.push(this.createEnemy("vampire bat", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 3, 5, 0.7, 70));
            definitions.global.push(this.createEnemy("poisonous spider", "global", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled], 4, 5, 0.8, 20));
            definitions.global.push(this.createEnemy("gigantic spider", "global", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled], 4, 5, 0.8, 20));
            definitions.global.push(this.createEnemy("ratsnake", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gCluster], [c.aInfest, c.aOverrun], [c.dKilled, c.dCleared], 5, 5, 0.6, 50));
            definitions.global.push(this.createEnemy("albino salamander", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gMob, c.gHorde], [c.aInfest], [c.dKilled], 6, 5, 0.6, 50));
            definitions.global.push(this.createEnemy("fire salamander", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gMob, c.gHorde], [c.aInfest], [c.dKilled], 6, 5, 0.6, 50));
            definitions.global.push(this.createEnemy("duskboar", "global", [c.nAnimal], [c.gPack], [c.aInfest, c.aGuard], [c.dCleared], 7, 4, 0.4, 50));
            definitions.global.push(this.createEnemy("rusted guard bot", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 8, 5, 0.5, 65));
            definitions.global.push(this.createEnemy("ancient guard bot", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 9, 5, 0.3, 65));
            definitions.global.push(this.createEnemy("robot from a forgotten war", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aGuard, c.aInfest], [c.dDisabled], 9, 5, 0.5, 60));
            definitions.global.push(this.createEnemy("drone from a forgotten war", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aGuard, c.aInfest], [c.dDisabled], 10, 5, 0.5, 60));
            definitions.global.push(this.createEnemy("malfunctioning fire door", "global", [c.nBot], [], [c.aGuard], [c.dDisabled], 11, 7, 0.1, 65));
            definitions.global.push(this.createEnemy("antagonistic fire door", "global", [c.nBot], [], [c.aGuard], [c.dDisabled], 12, 7, 0.2, 50));
            definitions.global.push(this.createEnemy("territorial sewer varanid", "global", [c.nAnimal], [c.gPack, c.gGang], [c.aGuard], [c.dKilled, c.dDrive], 13, 8, 0.7, 85));
            definitions.global.push(this.createEnemy("predatory sewer varanid", "global", [c.nAnimal], [c.gPack, c.gGang], [c.aGuard], [c.dKilled, c.dDrive], 14, 8, 0.8, 85));
            definitions.global.push(this.createEnemy("haywire guard bot 1", "global", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 12, 5, 0.2, 50));
            definitions.global.push(this.createEnemy("haywire guard bot 2", "global", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 13, 5, 0.7, 50));
            definitions.global.push(this.createEnemy("haywire guard bot 3", "global", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 15, 5, 0.6, 50));
            definitions.earth.push(this.createEnemy("wasp", "earth", [c.nAnimal], [c.gSwarm], [c.aInfest], [c.dDrive], 3, 5, 0.75));
            definitions.earth.push(this.createEnemy("bee", "earth", [c.nAnimal], [c.gSwarm], [c.aInfest], [c.dDrive], 4, 5, 0.25, 70));
            definitions.earth.push(this.createEnemy("spirit of earth", "earth", [], [], [c.aGuard], [c.dDrive], 5, 5, 0.2, 25));
            definitions.earth.push(this.createEnemy("spirit of wind", "earth", [], [], [c.aGuard], [c.dDrive], 5, 8, 0.8, 35));
            definitions.earth.push(this.createEnemy("spirit of fire", "earth", [], [], [c.aGuard], [c.dDrive], 5, 6, 0.6, 45));
            definitions.earth.push(this.createEnemy("spirit of sun", "earth", [], [], [c.aGuard], [c.dDrive], 5, 6, 0.2, 55));
            definitions.earth.push(this.createEnemy("vengeful dryad", "earth", [], [c.gMob], [c.aGuard], [c.dDrive], 6, 8, 0.5, 90));
            definitions.earth.push(this.createEnemy("vampire", "earth", [], [], [], [c.dDrive], 7, 8, 0.8, 90));
            definitions.earth.push(this.createEnemy("ape", "earth", [c.nAnimal], [c.gPack, c.gGang, c.gMob], [c.aGuard], [c.dDrive], 7, 5, 0.5));
            definitions.earth.push(this.createEnemy("bear", "earth", [c.nAnimal], [], [], [c.dDrive], 8, 6, 0.6));
            definitions.earth.push(this.createEnemy("drove of boars", "earth", [c.nAnimal], [], [], [c.dDrive], 8, 5, 0.8));
            definitions.inhabited.push(this.createEnemy("security bot", "inhabited", [c.nBot], [c.gMob], [c.aPatrol, c.aGuard], [c.dDisabled], 3, 5, 0.3));
            definitions.inhabited.push(this.createEnemy("rabid dog", "inhabited", [c.nPest, c.nAnimal], [c.gPack], [c.aInfest], [c.dKilled], 4, 5, 0.6));
            definitions.inhabited.push(this.createEnemy("leaking gas pipe", "inhabited", [], [], [], [c.dCleared], 5, 4, 0.2, 75));
            definitions.inhabited.push(this.createEnemy("mugger", "inhabited", [c.nGangster], [c.gGang], [c.aInfest], [c.dDrive], 10, 5, 0.5, 15));
            definitions.inhabited.push(this.createEnemy("doomsayer", "inhabited", [], [c.gMob], [c.aPatrol], [c.dDrive], 13, 4, 0.6, 45));
            definitions.inhabited.push(this.createEnemy("armed gangster", "inhabited", [c.nGangster], [c.gMob, c.gGang], [c.aPatrol, c.aGuard, c.aInfest], [], 14, 6, 0.8, 75));
            definitions.inhabited.push(this.createEnemy("sector emergency system", "inhabited", [c.nBot], [], [c.aGuard], [], 15, 5, 0.7, 25));
            definitions.sunlit.push(this.createEnemy("thorny bush", "sunlit", [c.nPest], [c.gCluster], [c.aInfest, c.aCover], [], 2, 5, 0.5));
            definitions.sunlit.push(this.createEnemy("overgrown nettle", "sunlit", [c.nPest], [c.gCluster], [c.aInfest, c.aCover], [], 3, 5, 0.25));
            definitions.sunlit.push(this.createEnemy("hawk", "sunlit", [c.nPest, c.nAnimal], [c.gFlock, c.gPack], [c.aInfest], [], 3, 9, 0.3, 50));
            definitions.sunlit.push(this.createEnemy("a group of seagulls", "sunlit", [c.nPest, c.nAnimal], [c.gFlock], [c.aInfest], [], 10, 6, 0.8, 20));
            definitions.sunlit.push(this.createEnemy("scorpion", "sunlit", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [], 12, 5, 0.7));
            definitions.sunlit.push(this.createEnemy("territorial magpie", "sunlit", [c.nPest, c.nAnimal], [], [c.aInfest], [], 13, 4, 0.7, 35));
            definitions.sunlit.push(this.createEnemy("great black pelican", "sunlit", [c.nPest, c.nAnimal], [], [c.aInfest, c.aGuard], [c.dKilled, c.dDrive], 15, 5, 0.5, 35));
            definitions.urban.push(this.createEnemy("swarm of pidgeons", "urban", [c.nPest, c.nAnimal], [c.gFlock, c.gSwarm], [c.aInfest], [c.dDrive], 9, 5, 0.75, 10));
            definitions.urban.push(this.createEnemy("agitated murder of crows", "urban", [c.nPest, c.nAnimal], [c.gFlock, c.gSwarm], [c.aInfest], [c.dDrive], 10, 5, 0.3));
            definitions.urban.push(this.createEnemy("aggressive raccoon", "urban", [c.nPest, c.nAnimal], [], [], [], 11, 5, 0.6, 40));
            definitions.urban.push(this.createEnemy("escaped pet boa", "urban", [c.nAnimal], [], [c.aInfest], [], 12, 7, 0.5, 85));
            definitions.urban.push(this.createEnemy("military bot", "urban", [c.nBot], [c.gMob], [c.aPatrol, c.aGuard], [c.dDisabled], 13, 5, 0.8, 85));
            definitions.urban.push(this.createEnemy("escaped zoo panther", "urban", [c.nAnimal, c.aGuard], [c.gPack, c.gMob], [], [], 14, 8, 0.8, 90));
            definitions.urban.push(this.createEnemy("injured zoo panther", "urban", [c.nAnimal], [c.gPack, c.gMob], [], [], 15, 8, 0.6, 95));
        },

        // Enemy definitions (level: level ordinal, difficulty: 1-10, attRatio: 0-1, rarity: 0-100)
        createEnemy: function (name, type, nouns, groupN, activeV, defeatedV, campOrdinal, normalizedDifficulty, attRatio, rarity) {
            var reqStr = this.getRequiredStrength(campOrdinal, 0, 20);
            var reqStrPrev = this.getRequiredStrength(campOrdinal - 1, 0, 20);
            var reqStrNext = this.getRequiredStrength(campOrdinal + 1, 0, 20);
            var statsMin = Math.max(0, reqStr - (reqStr - reqStrPrev) * 0.5);
            var statsMax = Math.max(2, reqStr + (reqStrNext - reqStr) * 0.5);
            if (reqStr === reqStrNext) {
                statsMax = Math.max(2, reqStr + (reqStr - reqStrPrev) * 0.5);
            }

            var stats = statsMin + (statsMax - statsMin) / 10 * normalizedDifficulty;
            var att = Math.max(1, Math.round(stats * attRatio));
            var def = Math.max(1, Math.round(stats * (1 - attRatio)));
            return new EnemyVO(name, type, nouns, groupN, activeV, defeatedV, att, def, rarity);
        },
        

        // get enemies by type (string) and difficulty (1-15 (campOrdinal))
        // by default will also include enemies of one difficulty lower, if restrictDifficulty, then not
        // will return at least one enemy; if no matching enemy exists, one with lower difficulty is returned
        getEnemies: function (type, difficulty, restrictDifficulty) {
            var enemies = [];
            if (difficulty <= 0) return enemies;

            if (!EnemyConstants.enemyDifficulties) this.saveEnemyDifficulties();

            var enemy;
            var enemyDifficulty;
            var enemyList = [];
            if (type) {
                enemyList = EnemyConstants.enemyDefinitions[type];
            } else {
                for (var type in EnemyConstants.enemyTypes) {
                    enemyList = enemyList.concat(EnemyConstants.enemyDefinitions[type]);
                }
            }
            
            for (var i = 0; i < enemyList.length; i++) {
                enemy = enemyList[i];
                enemyDifficulty = Math.max(EnemyConstants.enemyDifficulties[enemy.id], 1);
                if (enemyDifficulty === difficulty)
                    enemies.push(enemy);
                if (enemyDifficulty === difficulty - 1 && difficulty > 1 && !restrictDifficulty)
                    enemies.push(enemy);
            }

            if (enemies.length <= 0) {
                return this.getEnemies(type, difficulty - 1, restrictDifficulty);
            }

            return enemies;
        },
        
        saveEnemyDifficulties: function () {
            EnemyConstants.enemyDifficulties = {};
            var enemy;
            var enemyDifficulty;
            for (var type in EnemyConstants.enemyTypes) {
                for (var i = 0; i < EnemyConstants.enemyDefinitions[type].length; i++) {
                    enemy = EnemyConstants.enemyDefinitions[type][i];
                    enemyDifficulty = this.getEnemyDifficultyLevel(enemy);
                    EnemyConstants.enemyDifficulties[enemy.id] = enemyDifficulty;
                }
            }
        },

        // get the difficulty level (1-15, corresponding to camp ordinal) of a given enemy
        getEnemyDifficultyLevel: function (enemy) {
            var enemyStats = enemy.att + enemy.def;
            var campDifficulty;
            for (var i = 1; i <= WorldCreatorConstants.CAMPS_TOTAL; i++) {
                campDifficulty = this.getRequiredStrength(i);
                if (campDifficulty > enemyStats) return i;
            }
            return WorldCreatorConstants.CAMPS_TOTAL;
        },
        
        getRequiredStrength: function (campOrdinal) {
            if (campOrdinal < 1)
                return 1;
            if (campOrdinal === 1)
                return FightConstants.FIGHT_PLAYER_BASE_ATT + FightConstants.FIGHT_PLAYER_BASE_DEF;
            var typicalStrength = this.getTypicalStrength(campOrdinal);
            var typicalStrengthPrevious = this.getTypicalStrength(campOrdinal - 1);
            return Math.ceil((typicalStrength + typicalStrengthPrevious) / 2);
        },

        getTypicalStrength: function (campOrdinal) {
            var typicalHealth = 50;
            var healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus).effect;
            if (campOrdinal > 0)
                typicalHealth = 100;
            if (campOrdinal >= WorldCreatorConstants.CAMPS_BEFORE_GROUND)
                typicalHealth = typicalHealth * healthyPerkFactor;

            var typicalItems = new ItemsComponent();
            var typicalWeapon = ItemConstants.getDefaultWeapon(campOrdinal);
            var typicalClothing = GameGlobals.itemsHelper.getBestClothing(campOrdinal, ItemConstants.itemBonusTypes.fight_def);

            if (typicalWeapon)
                typicalItems.addItem(typicalWeapon, false);
            else
                console.log("WARN: No typical weapon for camp ordinal " + campOrdinal);

            if (typicalClothing.length > 0) {
                for ( var i = 0; i < typicalClothing.length; i++ ) {
                    typicalItems.addItem(typicalClothing[i], false);
                }
            }

            var numFollowers = FightConstants.getMaxFollowers(campOrdinal);
            for (var f = 0; f < numFollowers; f++)
                typicalItems.addItem(ItemConstants.getFollower(13, campOrdinal));
            
            typicalItems.autoEquipAll();

            var typicalStamina = {};
            typicalStamina.health = typicalHealth;
            return FightConstants.getPlayerStrength(typicalStamina, typicalItems);
        },
    });

    return EnemyCreator;
});