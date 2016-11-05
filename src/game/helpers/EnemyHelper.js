define([
    'ash',
    'game/constants/EnemyConstants',
    'game/constants/PerkConstants',
    'game/constants/ItemConstants',
    'game/constants/FightConstants',
    'game/constants/WorldCreatorConstants',
    'game/constants/PlayerActionConstants',
    'game/components/player/ItemsComponent',
    'game/vos/EnemyVO'
], function (
    Ash,
    EnemyConstants,
    PerkConstants,
    ItemConstants,
    FightConstants,
    WorldCreatorConstants,
    PlayerActionConstants,
    ItemsComponent,
    EnemyVO
) {
    var EnemyHelper = Ash.Class.extend({
        
        itemsHelper: null,
        
        constructor: function (itemsHelper) {
            this.itemsHelper = itemsHelper;
        },
        
        createEnemies: function () {
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("huge rat", "inhabited", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dCleared], 1, 5, 0.75));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("poisonous centipede", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dCleared], 1, 4, 0.4, 50));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("giant centipede", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dCleared], 2, 2, 0.4, 30));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("radioactive cockroach", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest, EnemyConstants.aCover], [EnemyConstants.dCleared], 2, 3, 0.1));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("cave bat", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dCleared, EnemyConstants.dDrive], 3, 5, 0.6, 20));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("vampire bat", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dCleared, EnemyConstants.dDrive], 4, 5, 0.7, 70));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("poisonous spider", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest, EnemyConstants.aGuard], [EnemyConstants.dKilled], 5, 5, 0.8, 20));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("gigantic spider", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest, EnemyConstants.aGuard], [EnemyConstants.dKilled], 6, 5, 0.8, 20));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("albino salamander", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dKilled], 7, 5, 0.6, 50));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("fire salamander", "global", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dKilled], 8, 5, 0.6, 50));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("duskboar", "global", [EnemyConstants.nAnimal], [EnemyConstants.aInfest, EnemyConstants.aGuard], [EnemyConstants.dCleared], 9, 4, 0.4, 50));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("rusted guard bot", "global", [EnemyConstants.nPest, EnemyConstants.nBot], [EnemyConstants.aPatrol, EnemyConstants.aGuard, EnemyConstants.aInfest], [EnemyConstants.dDisabled], 10, 5, 0.5, 65));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("ancient guard bot", "global", [EnemyConstants.nPest, EnemyConstants.nBot], [EnemyConstants.aPatrol, EnemyConstants.aGuard, EnemyConstants.aInfest], [EnemyConstants.dDisabled], 11, 5, 0.3, 65));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("robot from a forgotten war", "global", [EnemyConstants.nPest, EnemyConstants.nBot], [EnemyConstants.aGuard, EnemyConstants.aInfest], [EnemyConstants.dDisabled], 12, 5, 0.5, 60));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("drone from a forgotten war", "global", [EnemyConstants.nPest, EnemyConstants.nBot], [EnemyConstants.aGuard, EnemyConstants.aInfest], [EnemyConstants.dDisabled], 13, 5, 0.5, 60));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("malfunctioning fire door", "global", [EnemyConstants.nBot], [EnemyConstants.aGuard], [EnemyConstants.dDisabled], 14, 7, 0.1, 65));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("antagonistic fire door", "global", [EnemyConstants.nBot], [EnemyConstants.aGuard], [EnemyConstants.dDisabled], 15, 7, 0.2, 50));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("territorial sewer varanid", "global", [EnemyConstants.nAnimal], [EnemyConstants.aGuard], [EnemyConstants.dKilled, EnemyConstants.dDrive], 16, 8, 0.7, 85));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("predatory sewer varanid", "global", [EnemyConstants.nAnimal], [EnemyConstants.aGuard], [EnemyConstants.dKilled, EnemyConstants.dDrive], 17, 8, 0.8, 85));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("haywire guard bot 1", "global", [EnemyConstants.nBot], [EnemyConstants.aPatrol, EnemyConstants.aGuard, EnemyConstants.aInfest], [EnemyConstants.dDisabled], 18, 5, 0.2, 50));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("haywire guard bot 2", "global", [EnemyConstants.nBot], [EnemyConstants.aPatrol, EnemyConstants.aGuard, EnemyConstants.aInfest], [EnemyConstants.dDisabled], 19, 5, 0.7, 50));
            EnemyConstants.enemyDefinitions.global.push(this.createEnemy("haywire guard bot 3", "global", [EnemyConstants.nBot], [EnemyConstants.aPatrol, EnemyConstants.aGuard, EnemyConstants.aInfest], [EnemyConstants.dDisabled], 20, 5, 0.6, 50));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("wasp", "earth", [EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dDrive], 5, 5, 0.75));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("bee", "earth", [EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dDrive], 6, 5, 0.25, 70));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("spirit of earth", "earth", [], [EnemyConstants.aGuard], [EnemyConstants.dDrive], 7, 5, 0.2, 25));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("spirit of wind", "earth", [], [EnemyConstants.aGuard], [EnemyConstants.dDrive], 8, 8, 0.8, 35));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("spirit of fire", "earth", [], [EnemyConstants.aGuard], [EnemyConstants.dDrive], 9, 6, 0.6, 45));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("spirit of sun", "earth", [], [EnemyConstants.aGuard], [EnemyConstants.dDrive], 10, 6, 0.2, 55));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("vengeful dryad", "earth", [], [EnemyConstants.aGuard], [EnemyConstants.dDrive], 11, 8, 0.5, 90));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("vampire", "earth", [], [], [EnemyConstants.dDrive], 12, 8, 0.8, 90));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("ape", "earth", [EnemyConstants.nAnimal], [EnemyConstants.aGuard], [EnemyConstants.dDrive], 13, 5, 0.5));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("bear", "earth", [EnemyConstants.nAnimal], [], [EnemyConstants.dDrive], 14, 6, 0.6));
            EnemyConstants.enemyDefinitions.earth.push(this.createEnemy("drove of boars", "earth", [EnemyConstants.nAnimal], [], [EnemyConstants.dDrive], 15, 5, 0.8));
            EnemyConstants.enemyDefinitions.inhabited.push(this.createEnemy("security bot", "inhabited", [EnemyConstants.nBot], [EnemyConstants.aPatrol, EnemyConstants.aGuard], [EnemyConstants.dDisabled], 14, 5, 0.3));
            EnemyConstants.enemyDefinitions.inhabited.push(this.createEnemy("rabid dog", "inhabited", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dKilled], 15, 5, 0.6));
            EnemyConstants.enemyDefinitions.inhabited.push(this.createEnemy("leaking gas pipe", "inhabited", [], [], [EnemyConstants.dCleared], 16, 4, 0.2, 75));
            EnemyConstants.enemyDefinitions.inhabited.push(this.createEnemy("mugger", "inhabited", [EnemyConstants.nGangster], [EnemyConstants.aInfest], [EnemyConstants.dDrive], 17, 5, 0.5, 15));
            EnemyConstants.enemyDefinitions.inhabited.push(this.createEnemy("doomsayer", "inhabited", [], [EnemyConstants.aPatrol], [EnemyConstants.dDrive], 18, 4, 0.6, 45));
            EnemyConstants.enemyDefinitions.inhabited.push(this.createEnemy("armed gangster", "inhabited", [EnemyConstants.nGangster], [EnemyConstants.aPatrol, EnemyConstants.aGuard, EnemyConstants.aInfest], [], 19, 6, 0.8, 75));
            EnemyConstants.enemyDefinitions.inhabited.push(this.createEnemy("sector emergency system", "inhabited", [EnemyConstants.nBot], [EnemyConstants.aGuard], [], 20, 5, 0.7, 25));
            EnemyConstants.enemyDefinitions.sunlit.push(this.createEnemy("thorny bush", "sunlit", [EnemyConstants.nPest], [EnemyConstants.aInfest, EnemyConstants.aCover], [], 1, 5, 0.5));
            EnemyConstants.enemyDefinitions.sunlit.push(this.createEnemy("overgrown nettle", "sunlit", [EnemyConstants.nPest], [EnemyConstants.aInfest, EnemyConstants.aCover], [], 2, 5, 0.25));
            EnemyConstants.enemyDefinitions.sunlit.push(this.createEnemy("hawk", "sunlit", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [], 3, 5, 0.3, 50));
            EnemyConstants.enemyDefinitions.sunlit.push(this.createEnemy("a group of seagulls", "sunlit", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [], 4, 6, 0.8, 20));
            EnemyConstants.enemyDefinitions.sunlit.push(this.createEnemy("scorpion", "sunlit", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [], 5, 5, 0.7));
            EnemyConstants.enemyDefinitions.sunlit.push(this.createEnemy("territorial magpie", "sunlit", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [], 6, 4, 0.7, 35));
            EnemyConstants.enemyDefinitions.sunlit.push(this.createEnemy("great black pelican", "sunlit", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest, EnemyConstants.aGuard], [EnemyConstants.dKilled, EnemyConstants.dDrive], 9, 5, 0.5, 35));
            EnemyConstants.enemyDefinitions.urban.push(this.createEnemy("swarm of pidgeons", "urban", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dDrive], 14, 5, 0.75, 10));
            EnemyConstants.enemyDefinitions.urban.push(this.createEnemy("agitated murder of crows", "urban", [EnemyConstants.nPest, EnemyConstants.nAnimal], [EnemyConstants.aInfest], [EnemyConstants.dDrive], 15, 5, 0.3));
            EnemyConstants.enemyDefinitions.urban.push(this.createEnemy("aggressive raccoon", "urban", [EnemyConstants.nPest, EnemyConstants.nAnimal], [], [], 16, 5, 0.6, 40));
            EnemyConstants.enemyDefinitions.urban.push(this.createEnemy("escaped pet boa", "urban", [EnemyConstants.nAnimal], [EnemyConstants.aInfest], [], 17, 7, 0.5, 85));
            EnemyConstants.enemyDefinitions.urban.push(this.createEnemy("military bot", "urban", [EnemyConstants.nBot], [EnemyConstants.aPatrol, EnemyConstants.aGuard], [EnemyConstants.dDisabled], 18, 5, 0.8, 85));
            EnemyConstants.enemyDefinitions.urban.push(this.createEnemy("escaped zoo panther", "urban", [EnemyConstants.nAnimal, EnemyConstants.aGuard], [], [], 19, 8, 0.8, 90));
            EnemyConstants.enemyDefinitions.urban.push(this.createEnemy("injured zoo panther", "urban", [EnemyConstants.nAnimal], [], [], 20, 8, 0.6, 95));
        },

        // Enemy definitions (level: level ordinal, difficulty: 1-10, attRatio: 0-1, rarity: 0-100)
        createEnemy: function (name, type, nouns, activeV, defeatedV, level, normalizedDifficulty, attRatio, rarity) {
            var reqStr = this.getRequiredStrength(level, 0, 20);
            var reqStrPrev = this.getRequiredStrength(level - 1, 0, 20);
            var reqStrNext = this.getRequiredStrength(level + 1, 0, 20);
            var statsMin = Math.max(0, reqStr - (reqStr - reqStrPrev) * 0.5);
            var statsMax = Math.max(2, reqStr + (reqStrNext - reqStr) * 0.5);
            if (reqStr === reqStrNext) {
                statsMax = Math.max(2, reqStr + (reqStr - reqStrPrev) * 0.5);
            }

            var stats = statsMin + (statsMax - statsMin) / 10 * normalizedDifficulty;
            var att = Math.max(1, Math.round(stats * attRatio));
            var def = Math.max(1, Math.round(stats * (1 - attRatio)));
            return new EnemyVO(name, type, nouns, activeV, defeatedV, att, def, rarity);
        },
        

        // get enemies by type (string) and difficulty (1-maxLevelOrdinal)
        // by default will also include enemies of one difficulty lower, if restrictDifficulty, then not
        // will return at least one enemy; if no matching enemy exists, one with lower difficulty is returned
        getEnemies: function (type, difficulty, restrictDifficulty, groundLevelOrdinal, totalLevels) {
            var enemies = [];
            if (difficulty <= 0)
                return enemies;

            if (EnemyConstants.enemyDifficultiesGroundLevelOrdinal !== groundLevelOrdinal || EnemyConstants.enemyDifficultiesTotalLevels !== totalLevels) {
                this.saveEnemyDifficulties(groundLevelOrdinal, totalLevels);
            }

            var enemy;
            var enemyDifficulty;
            var enemyList = [];
            if (type) {
                enemyList = EnemyConstants.enemyDefinitions[type];
            } else {
                for (var type in EnemyConstants.enemyTypes)
                    enemyList = enemyList.concat(EnemyConstants.enemyDefinitions[type]);
            }
            
            for (var i = 0; i < enemyList.length; i++) {
                enemy = enemyList[i];
                if (enemy && typeof enemy !== "undefined") {
                    enemyDifficulty = Math.max(EnemyConstants.enemyDifficulties[enemy.id], 1);
                    if (enemyDifficulty === difficulty)
                        enemies.push(enemy);
                    if (enemyDifficulty === difficulty - 1 && difficulty > 1 && !restrictDifficulty)
                        enemies.push(enemy);
                } else {
                    console.log("WARN: Enemy defintions missing for type " + type);
                    console.log(EnemyConstants.enemyDefinitions[type]);
                }
            }

            if (enemies.length <= 0) {
                return this.getEnemies(type, difficulty - 1, restrictDifficulty, groundLevelOrdinal, totalLevels);
            }

            return enemies;
        },
        
        saveEnemyDifficulties: function (groundLevelOrdinal, totalLevels) {
            var enemy;
            var enemyDifficulty;
            for (var type in EnemyConstants.enemyTypes) {
                for (var i = 0; i < EnemyConstants.enemyDefinitions[type].length; i++) {
                    enemy = EnemyConstants.enemyDefinitions[type][i];

                    enemyDifficulty = this.getEnemyDifficultyLevel(enemy, groundLevelOrdinal, totalLevels);
                    EnemyConstants.enemyDifficulties[enemy.id] = enemyDifficulty;
                }
            }
            EnemyConstants.enemyDifficultiesGroundLevelOrdinal = groundLevelOrdinal;
            EnemyConstants.enemyDifficultiesTotalLevels = totalLevels;
        },

        getEnemyDifficultyLevel: function (enemy, groundLevelOrdinal, totalLevels) {
            var stats = enemy.att + enemy.def;
            var level = 0;
            var levelDifficulty;
            for (var i = 1; i < totalLevels; i++) {
                levelDifficulty = this.getRequiredStrength(i, groundLevelOrdinal, totalLevels);
                if (levelDifficulty > stats) return level;
                level = i;
            }
            return WorldCreatorConstants.LEVEL_NUMBER_MAX;
        },
        
        getRequiredStrength: function (levelOrdinal, groundLevelOrdinal, totalLevels) {
            if (levelOrdinal < 1)
                return 1;
            if (levelOrdinal === 1)
                return FightConstants.FIGHT_PLAYER_BASE_ATT + FightConstants.FIGHT_PLAYER_BASE_DEF;
            var typicalStrength = this.getTypicalStrength(levelOrdinal, groundLevelOrdinal, totalLevels);
            var typicalStrengthPrevious = this.getTypicalStrength(levelOrdinal - 1, groundLevelOrdinal, totalLevels);
            return Math.ceil((typicalStrength + typicalStrengthPrevious) / 2);
        },

        getTypicalStrength: function (levelOrdinal, groundLevelOrdinal, totalLevels) {
            var typicalHealth = 50;
            var healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus).effect;
            if (levelOrdinal > 1)
                typicalHealth = 100;
            if (levelOrdinal >= groundLevelOrdinal)
                typicalHealth = typicalHealth * healthyPerkFactor;

            var typicalItems = new ItemsComponent();
            var typicalWeapon = ItemConstants.getDefaultWeapon(levelOrdinal, totalLevels);
            var typicalClothing = this.itemsHelper.getDefaultClothing(levelOrdinal, totalLevels);

            if (typicalWeapon)
                typicalItems.addItem(typicalWeapon, false);
            else
                console.log("WARN: No typical weapon for level ordinal " + levelOrdinal);

            if (typicalClothing.length > 0) {
                // console.log("TYPICAL CLOTHING level " + levelOrdinal)
                for ( var i = 0; i < typicalClothing.length; i++ ) {
                    // console.log("- " + typicalClothing[i].name)
                    typicalItems.addItem(typicalClothing[i], false);
                }
            } else
                console.log("WARN: No typical clothing for level ordinal " + levelOrdinal);

            var numCamps = Math.floor(15 / 20 * levelOrdinal);
            var numFollowers = FightConstants.getMaxFollowers(numCamps);
            for ( var f = 0; f < numFollowers; f++ )
                typicalItems.addItem(ItemConstants.getFollower(13, numCamps));

            var typicalStamina = {};
            typicalStamina.health = typicalHealth;
            return FightConstants.getPlayerStrength(typicalStamina, typicalItems);
        },
    });

    return EnemyHelper;
});