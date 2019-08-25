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
            // global
            definitions.global.push(this.createEnemy("giant centipede", "global", [c.nPest, c.nAnimal],  [c.gSwarm],[c.aInfest], [c.dCleared], 1, 2, 0.4, 30));
            definitions.global.push(this.createEnemy("poisonous spider", "global", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled], 4, 5, 0.8, 20));
            definitions.global.push(this.createEnemy("gigantic spider", "global", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled], 4, 5, 0.8, 20));
            definitions.global.push(this.createEnemy("ratsnake", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gCluster], [c.aInfest, c.aOverrun], [c.dKilled, c.dCleared], 5, 5, 0.6, 50));
            definitions.global.push(this.createEnemy("fire salamander", "global", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gMob, c.gHorde], [c.aInfest], [c.dKilled], 6, 5, 0.6, 50));
            definitions.global.push(this.createEnemy("rusted guard bot", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 8, 5, 0.5, 65));
            definitions.global.push(this.createEnemy("ancient guard bot", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 9, 5, 0.3, 65));
            definitions.global.push(this.createEnemy("robot from a forgotten war", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aGuard, c.aInfest], [c.dDisabled], 9, 5, 0.5, 60));
            definitions.global.push(this.createEnemy("drone from a forgotten war", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aGuard, c.aInfest], [c.dDisabled], 11, 4, 0.5, 60));
            definitions.global.push(this.createEnemy("malfunctioning fire door", "global", [c.nBot], [], [c.aGuard], [c.dDisabled], 11, 7, 0.1, 65));
            definitions.global.push(this.createEnemy("antagonistic fire door", "global", [c.nBot], [], [c.aGuard], [c.dDisabled], 12, 7, 0.2, 50));
            definitions.global.push(this.createEnemy("territorial sewer varanid", "global", [c.nAnimal], [c.gPack, c.gGang], [c.aGuard], [c.dKilled, c.dDrive], 13, 8, 0.7, 85));
            definitions.global.push(this.createEnemy("predatory sewer varanid", "global", [c.nAnimal], [c.gPack, c.gGang], [c.aGuard], [c.dKilled, c.dDrive], 14, 8, 0.8, 85));
            definitions.global.push(this.createEnemy("haywire guard bot 1", "global", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 12, 5, 0.2, 50));
            definitions.global.push(this.createEnemy("haywire guard bot 2", "global", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 13, 5, 0.7, 50));
            definitions.global.push(this.createEnemy("haywire guard bot 3", "global", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 15, 5, 0.6, 50));
            definitions.global.push(this.createEnemy("agitated murder of crows", "global", [c.nPest, c.nAnimal], [c.gFlock, c.gSwarm], [c.aInfest], [c.dDrive], 10, 5, 0.3));
            definitions.global.push(this.createEnemy("military bot", "global", [c.nBot], [c.gMob], [c.aPatrol, c.aGuard], [c.dDisabled], 13, 5, 0.8, 85));
            definitions.global.push(this.createEnemy("security bot", "global", [c.nBot], [c.gMob], [c.aPatrol, c.aGuard], [c.dDisabled], 3, 5, 0.3));
            definitions.global.push(this.createEnemy("rabid dog", "global", [c.nPest, c.nAnimal], [c.gPack], [c.aInfest], [c.dKilled], 4, 5, 0.6));
            definitions.global.push(this.createEnemy("sector emergency system", "global", [c.nBot], [], [c.aGuard], [], 15, 5, 0.7, 25));
            // nohazard
            definitions.nohazard.push(this.createEnemy("huge rat", "nohazard", [c.nPest, c.nAnimal], [c.gPack, c.gMob, c.gHorde], [c.aInfest], [c.dCleared], 0, 5, 0.75));
            definitions.nohazard.push(this.createEnemy("doomsayer", "nohazard", [], [c.gMob], [c.aPatrol], [c.dDrive], 13, 4, 0.6, 45));
            definitions.nohazard.push(this.createEnemy("armed gangster", "nohazard", [c.nGangster], [c.gMob, c.gGang], [c.aPatrol, c.aGuard, c.aInfest], [], 14, 6, 0.8, 75));
            definitions.nohazard.push(this.createEnemy("escaped zoo panther", "nohazard", [c.nAnimal, c.aGuard], [c.gPack, c.gMob], [], [], 14, 8, 0.8, 90));
            definitions.nohazard.push(this.createEnemy("injured zoo panther", "nohazard", [c.nAnimal], [c.gPack, c.gMob], [], [], 15, 8, 0.6, 95));
            // cold
            definitions.cold.push(this.createEnemy("duskboar", "cold", [c.nAnimal], [c.gPack], [c.aInfest, c.aGuard], [c.dCleared], 7, 4, 0.4, 50));
            // toxic
            definitions.toxic.push(this.createEnemy("poisonous centipede", "toxic", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [c.dCleared], 1, 3, 0.4, 50));
            definitions.toxic.push(this.createEnemy("leaking gas pipe", "toxic", [], [], [], [c.dCleared], 5, 4, 0.2, 75));
            // radiation
            definitions.radiation.push(this.createEnemy("radioactive cockroach", "radiation", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aCover, c.aOverrun], [c.dCleared], 2, 3, 0.1));
            // sunlit
            definitions.sunlit.push(this.createEnemy("wasp", "sunlit", [c.nAnimal], [c.gSwarm], [c.aInfest], [c.dDrive], 3, 5, 0.75));
            definitions.sunlit.push(this.createEnemy("bee", "sunlit", [c.nAnimal], [c.gSwarm], [c.aInfest], [c.dDrive], 4, 5, 0.25, 70));
            definitions.sunlit.push(this.createEnemy("spirit of earth", "sunlit", [], [], [c.aGuard], [c.dDrive], 5, 5, 0.2, 25));
            definitions.sunlit.push(this.createEnemy("spirit of wind", "sunlit", [], [], [c.aGuard], [c.dDrive], 5, 8, 0.8, 35));
            definitions.sunlit.push(this.createEnemy("spirit of fire", "sunlit", [], [], [c.aGuard], [c.dDrive], 5, 6, 0.6, 45));
            definitions.sunlit.push(this.createEnemy("spirit of sun", "sunlit", [], [], [c.aGuard], [c.dDrive], 5, 6, 0.2, 55));
            definitions.sunlit.push(this.createEnemy("vengeful dryad", "sunlit", [], [c.gMob], [c.aGuard], [c.dDrive], 6, 8, 0.5, 90));
            definitions.sunlit.push(this.createEnemy("ape", "sunlit", [c.nAnimal], [c.gPack, c.gGang, c.gMob], [c.aGuard], [c.dDrive], 7, 5, 0.5));
            definitions.sunlit.push(this.createEnemy("bear", "sunlit", [c.nAnimal], [], [], [c.dDrive], 8, 6, 0.6));
            definitions.sunlit.push(this.createEnemy("drove of boars", "sunlit", [c.nAnimal], [], [], [c.dDrive], 8, 5, 0.8));
            definitions.sunlit.push(this.createEnemy("swarm of pidgeons", "sunlit", [c.nPest, c.nAnimal], [c.gFlock, c.gSwarm], [c.aInfest], [c.dDrive], 9, 5, 0.75, 10));
            definitions.sunlit.push(this.createEnemy("thorny bush", "sunlit", [c.nPest], [c.gCluster], [c.aInfest, c.aCover], [], 2, 2, 0.5));
            definitions.sunlit.push(this.createEnemy("overgrown nettle", "sunlit", [c.nPest], [c.gCluster], [c.aInfest, c.aCover], [], 3, 5, 0.25));
            definitions.sunlit.push(this.createEnemy("hawk", "sunlit", [c.nPest, c.nAnimal], [c.gFlock, c.gPack], [c.aInfest], [], 3, 9, 0.3, 50));
            definitions.sunlit.push(this.createEnemy("a group of seagulls", "sunlit", [c.nPest, c.nAnimal], [c.gFlock], [c.aInfest], [], 10, 3, 0.8, 20));
            definitions.sunlit.push(this.createEnemy("scorpion", "sunlit", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [], 12, 5, 0.7));
            definitions.sunlit.push(this.createEnemy("great black pelican", "sunlit", [c.nPest, c.nAnimal], [], [c.aInfest, c.aGuard], [c.dKilled, c.dDrive], 15, 5, 0.5, 35));
            // dark
            definitions.dark.push(this.createEnemy("cave bat", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 2, 5, 0.4, 20));
            definitions.dark.push(this.createEnemy("ghost bat", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 3, 6, 0.8, 50));
            definitions.dark.push(this.createEnemy("vampire bat", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 3, 5, 0.7, 70));
            definitions.dark.push(this.createEnemy("albino salamander", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gMob, c.gHorde], [c.aInfest], [c.dKilled], 6, 5, 0.6, 50));
            definitions.dark.push(this.createEnemy("vampire", "dark", [], [], [], [c.dDrive], 7, 8, 0.8, 90));
            // dense
            definitions.dense.push(this.createEnemy("escaped pet boa", "dense", [c.nAnimal], [], [c.aInfest], [], 12, 7, 0.5, 85));
            // sparse
            definitions.sparse.push(this.createEnemy("territorial magpie", "sparse", [c.nPest, c.nAnimal], [], [c.aInfest], [], 13, 4, 0.7, 35));
            // water
            definitions.water.push(this.createEnemy("mugger", "water", [c.nGangster], [c.gGang], [c.aInfest], [c.dDrive], 10, 5, 0.5, 15));
            definitions.water.push(this.createEnemy("aggressive raccoon", "water", [c.nPest, c.nAnimal], [], [], [], 11, 5, 0.6, 40));
        },

        // Enemy definitions (level: level ordinal, difficulty: 1-10, attRatio: 0-1, rarity: 0-100)
        createEnemy: function (name, type, nouns, groupN, activeV, defeatedV, campOrdinal, normalizedDifficulty, attRatio, rarity) {
            var reqStr = this.getRequiredStrength(campOrdinal, 2);
            var reqStrPrev = this.getRequiredStrength(campOrdinal, 1);
            var reqStrNext = this.getRequiredStrength(campOrdinal, 3);
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

        // get the difficulty level (1-3*15, corresponding to camp ordinal and step) of a given enemy
        getEnemyDifficultyLevel: function (enemy) {
            var enemyStats = enemy.att + enemy.def;
            var requiredStats;
            var max = this.getDifficulty(WorldCreatorConstants.CAMPS_TOTAL, WorldCreatorConstants.CAMP_STEP_END);
            for (var i = 1; i <= max; i++) {
                var campOrdinal = this.getCampOrdinalFromDifficulty(i);
                var step = this.getStepFromDifficulty(i);
                requiredStats = this.getRequiredStrength(campOrdinal, step);
                if (requiredStats > enemyStats) return i;
            }
            return max;
        },
        
        getCampOrdinalFromDifficulty: function (difficulty) {
            return Math.ceil(difficulty/3);
        },
        
        getStepFromDifficulty: function (difficulty) {
            return difficulty - (this.getCampOrdinalFromDifficulty(difficulty) - 1)*3;
        },
        
        getDifficulty: function (campOrdinal, step) {
            return (campOrdinal - 1)*3+step;
        },
        
        getRequiredStrength: function (campOrdinal, step) {
            if (campOrdinal < 1)
                return 1;
            var prevOrdinal = campOrdinal;
            var prevStep = step - 1;
            if (prevStep < WorldCreatorConstants.CAMP_STEP_START) {
                prevOrdinal = campOrdinal - 1;
                prevStep = WorldCreatorConstants.CAMP_STEP_END;
            }
            var typicalStrength = this.getTypicalStrength(campOrdinal, step);
            var typicalStrengthPrevious = this.getTypicalStrength(prevOrdinal, prevStep);
            return Math.ceil((typicalStrength + typicalStrengthPrevious) / 2);
        },

        getTypicalStrength: function (campOrdinal, step) {
            // health
            var typicalHealth = 50;
            var healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus).effect;
            if (campOrdinal > 0)
                typicalHealth = 100;
            if (campOrdinal >= WorldCreatorConstants.CAMPS_BEFORE_GROUND)
                typicalHealth = typicalHealth * healthyPerkFactor;

            // items
            var typicalItems = new ItemsComponent();
            var typicalWeapon = ItemConstants.getDefaultWeapon(campOrdinal, step);
            var typicalClothing = GameGlobals.itemsHelper.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.fight_def);

            if (typicalWeapon)
                typicalItems.addItem(typicalWeapon, false);

            if (typicalClothing.length > 0) {
                for ( var i = 0; i < typicalClothing.length; i++ ) {
                    typicalItems.addItem(typicalClothing[i], false);
                }
            }

            // followers
            var numFollowers = FightConstants.getMaxFollowers(campOrdinal);
            for (var f = 0; f < numFollowers; f++)
                typicalItems.addItem(ItemConstants.getFollower(13, campOrdinal));
            
            typicalItems.autoEquipAll();

            var typicalStamina = {};
            typicalStamina.health = typicalHealth;
            var result = FightConstants.getPlayerStrength(typicalStamina, typicalItems);
            return result;
        },
    });

    return EnemyCreator;
});
