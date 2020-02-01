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
            definitions.global.push(this.createEnemy("giant centipede", "giant centipede", "global", [c.nPest, c.nAnimal],  [c.gSwarm],[c.aInfest], [c.dCleared], 1, 0, 0.4, 0.9, 30));
            definitions.global.push(this.createEnemy("huge rat", "huge rat", "global", [c.nPest, c.nAnimal], [c.gPack, c.gMob, c.gHorde], [c.aInfest], [c.dCleared], 1, 5, 0.9, 0.75));
            definitions.global.push(this.createEnemy("security bot", "security bot", "global", [c.nBot], [c.gMob], [c.aPatrol, c.aGuard], [c.dDisabled], 3, 5, 0.2, 0.3));
            definitions.global.push(this.createEnemy("giant scorpion", "giant scorpion", "global", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [], 4, 5, 0.6, 0.7));
            definitions.global.push(this.createEnemy("camel spider", "camel spider", "global", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aOverrun], [c.dCleared, c.dDrive], 5, 5, 0.3, 1, 35));
            definitions.global.push(this.createEnemy("ancient guard bot", "ancient guard bot", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 6, 5, 0.3, 0.75, 65));
            definitions.global.push(this.createEnemy("carpet viper", "carpet viper", "global", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aOverrun], [c.dCleared, c.dDrive], 7, 5, 0.3, 1, 35));
            definitions.global.push(this.createEnemy("alligator", "alligator", "global", [c.nPest, c.nAnimal], [c.gPack, c.gMob], [c.aOverrun, c.aGuard, c.aInfest], [c.dCleared, c.dKilled], 7, 5, 0.3, 0.9, 75));
            definitions.global.push(this.createEnemy("rusted guard bot", "rusted guard bot", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 9, 5, 0.5, 0.8, 65));
            definitions.global.push(this.createEnemy("robot from a forgotten war", "robot from a forgotten war", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aGuard, c.aInfest], [c.dDisabled], 9, 5, 0.5, 0.9, 60));
            definitions.global.push(this.createEnemy("aggressive alligator", "aggressive alligator", "global", [c.nPest, c.nAnimal], [c.gPack, c.gMob], [c.aOverrun, c.aGuard, c.aInfest], [c.dCleared, c.dKilled], 10, 5, 0.3, 0.8, 75));
            definitions.global.push(this.createEnemy("drone from a forgotten war", "drone from a forgotten war", "global", [c.nPest, c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aGuard, c.aInfest], [c.dDisabled], 11, 4, 0.5, 1.25, 60));
            definitions.global.push(this.createEnemy("malfunctioning fire door", "malfunctioning fire door", "global", [c.nBot], [], [c.aGuard], [c.dDisabled], 11, 6, 0.1, 0.5, 65));
            definitions.global.push(this.createEnemy("antagonistic fire door", "antagonistic fire door", "global", [c.nBot], [], [c.aGuard], [c.dDisabled], 12, 7, 0.2, 0.5, 50));
            // nohazard
            definitions.nohazard.push(this.createEnemy("rabid dog", "rabid dog", "nohazard", [c.nPest, c.nAnimal], [c.gPack], [c.aInfest], [c.dKilled], 2, 8, 1.25, 0.6));
            definitions.nohazard.push(this.createEnemy("gigantic spider", "gigantic spider", "nohazard", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled], 4, 5, 0.8, 1, 20));
            definitions.nohazard.push(this.createEnemy("fire salamander", "fire salamander", "nohazard", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gMob, c.gHorde], [c.aInfest], [c.dKilled], 6, 5, 0.6, 1, 50));
            definitions.nohazard.push(this.createEnemy("tiger snake", "tiger snake", "nohazard", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aOverrun], [c.dCleared, c.dDrive], 7, 5, 0.3, 1, 35));
            definitions.nohazard.push(this.createEnemy("haywire guard bot 1", "haywire guard bot 1", "nohazard", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 12, 5, 0.2, 0.8, 50));
            definitions.nohazard.push(this.createEnemy("haywire guard bot 2", "haywire guard bot 2", "nohazard", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 13, 5, 0.7, 0.8, 50));
            definitions.nohazard.push(this.createEnemy("doomsayer", "doomsayer", "nohazard", [], [c.gMob], [c.aPatrol], [c.dDrive], 13, 3, 0.6, 0.9, 45));
            definitions.nohazard.push(this.createEnemy("armed gangster", "armed gangster", "nohazard", [c.nGangster], [c.gMob, c.gGang], [c.aPatrol, c.aGuard, c.aInfest], [], 14, 6, 0.8, 1, 75));
            definitions.nohazard.push(this.createEnemy("escaped zoo panther", "escaped zoo panther", "nohazard", [c.nAnimal, c.aGuard], [c.gPack, c.gMob], [], [], 14, 8, 0.8, 1.1, 90));
            definitions.nohazard.push(this.createEnemy("injured zoo panther", "injured zoo panther", "nohazard", [c.nAnimal], [c.gPack, c.gMob], [], [], 15, 8, 0.6, 1.1, 95));
            definitions.nohazard.push(this.createEnemy("haywire guard bot 3", "haywire guard bot 3", "nohazard", [c.nBot], [c.gGang, c.gSwarm, c.gMob], [c.aPatrol, c.aGuard, c.aInfest], [c.dDisabled], 15, 5, 0.6, 1.1, 50));
            // cold
            definitions.cold.push(this.createEnemy("goshawk", "goshawk", "cold", [c.nAnimal, c.nPest], [c.gFlock], [c.aInfest, c.aGuard], [c.dCleared], 2, 4, 0.4, 1.1, 50));
            definitions.cold.push(this.createEnemy("grey adder", "grey adder", "cold", [c.nAnimal, c.nPest], [c.gFlock], [c.aInfest, c.aGuard], [c.dCleared], 3, 2, 0.4, 1, 50));
            definitions.cold.push(this.createEnemy("albatross", "albatross", "cold", [c.nAnimal, c.nPest], [c.gFlock], [c.aInfest, c.aGuard], [c.dCleared], 4, 4, 0.4, 0.9, 50));
            definitions.cold.push(this.createEnemy("night scorpion", "night scorpion", "cold", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [], 5, 5, 1, 0.7));
            definitions.cold.push(this.createEnemy("condor", "condor", "cold", [c.nAnimal, c.nPest], [c.gFlock], [c.aInfest, c.aGuard], [c.dCleared], 6, 4, 0.4, 1, 50));
            definitions.cold.push(this.createEnemy("duskboar", "duskboar", "cold", [c.nAnimal], [c.gPack], [c.aInfest, c.aGuard], [c.dCleared], 7, 4, 0.4, 1, 50));
            definitions.cold.push(this.createEnemy("grizzly bear", "grizzly bear", "cold", [c.nAnimal], [c.gPack], [c.aInfest, c.aGuard], [c.dCleared], 8, 6, 0.4, 0.8, 50));
            definitions.cold.push(this.createEnemy("wolly monkey", "wolly monkey", "cold", [c.nAnimal], [c.gPack], [c.aInfest, c.aGuard], [c.dCleared], 9, 7, 0.4, 1, 50));
            definitions.cold.push(this.createEnemy("a group of seagulls", "a group of seagulls", "cold", [c.nPest, c.nAnimal], [c.gFlock], [c.aInfest], [], 10, 3, 0.8, 1, 20));
            definitions.cold.push(this.createEnemy("giant snow owl", "giant snow owl", "cold", [c.nAnimal], [c.gFlock], [c.aInfest, c.aGuard], [c.dCleared], 10, 7, 0.4, 1, 50));
            definitions.cold.push(this.createEnemy("dire boar", "dire boar", "cold", [c.nAnimal], [c.gPack], [c.aInfest, c.aGuard], [c.dCleared], 11, 4, 0.4, 1, 75));
            // toxic
            definitions.toxic.push(this.createEnemy("poisonous centipede", "poisonous centipede", "toxic", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [c.dCleared], 1, 5, 0.4, 0.8, 50));
            definitions.toxic.push(this.createEnemy("poisonous spider", "poisonous spider", "toxic", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled], 4, 5, 0.8, 1, 20));
            definitions.toxic.push(this.createEnemy("leaking gas pipe", "leaking gas pipe", "toxic", [], [], [], [c.dCleared], 5, 4, 0.2, 0.5, 75));
            definitions.toxic.push(this.createEnemy("toxic spider", "toxic spider", "toxic", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled], 6, 5, 0.8, 1, 20));
            // radiation
            definitions.radiation.push(this.createEnemy("radioactive centipede", "radioactive centipede", "radiation", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aCover, c.aOverrun], [c.dCleared], 2, 3, 0.8, 0.1));
            definitions.radiation.push(this.createEnemy("radioactive cockroach", "radioactive cockroach", "radiation", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aCover, c.aOverrun], [c.dCleared], 3, 2, 0.9, 0.1));
            definitions.radiation.push(this.createEnemy("mutant spider", "mutant spider", "radiation", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aGuard], [c.dKilled, c.dCleared], 5, 5, 0.3, 1, 20));
            definitions.radiation.push(this.createEnemy("mutant dog", "mutant dog", "radiation", [c.nPest, c.nAnimal], [c.gPack], [c.aInfest], [c.dKilled, c.dDrive], 9, 5, 1.1, 0.6));
            definitions.radiation.push(this.createEnemy("towering mutant dog", "towering mutant dog", "radiation", [c.nPest, c.nAnimal], [c.gPack], [c.aInfest], [c.dKilled, c.dDrive], 11, 5, 1.1, 0.7));
            // sunlit
            definitions.sunlit.push(this.createEnemy("wasp", "wasp", "sunlit", [c.nAnimal], [c.gSwarm], [c.aInfest], [c.dDrive], 0, 1, 0.75, 1.5, 10));
            definitions.sunlit.push(this.createEnemy("bee", "bee", "sunlit", [c.nAnimal], [c.gSwarm], [c.aInfest], [c.dDrive], 1, 4, 0.25, 1.5, 70));
            definitions.sunlit.push(this.createEnemy("thorny bush", "thorny bush", "sunlit", [c.nPest], [c.gCluster], [c.aInfest, c.aCover], [], 2, 2, 0.8, 0.5));
            definitions.sunlit.push(this.createEnemy("overgrown nettle", "overgrown nettle", "sunlit", [c.nPest], [c.gCluster], [c.aInfest, c.aCover], [], 3, 5, 0.8, 0.25));
            definitions.sunlit.push(this.createEnemy("hawk", "hawk", "sunlit", [c.nPest, c.nAnimal], [c.gFlock, c.gPack], [c.aInfest], [], 3, 9, 0.3, 1.1, 50));
            definitions.sunlit.push(this.createEnemy("skunk", "skunk", "sunlit", [c.nPest, c.nAnimal], [c.gGang, c.gPack], [c.aOverrun], [c.dDrive, c.dCleared], 4, 9, 0.3, 1, 50));
            definitions.sunlit.push(this.createEnemy("fire scorpion", "fire scorpion", "sunlit", [c.nPest, c.nAnimal], [c.gSwarm, c.gMob], [c.aInfest], [], 6, 5, 1, 0.7));
            definitions.sunlit.push(this.createEnemy("bear", "bear", "sunlit", [c.nAnimal], [], [], [c.dDrive], 8, 6, 0.8, 0.6));
            definitions.sunlit.push(this.createEnemy("drove of boars", "drove of boars", "sunlit", [c.nAnimal], [], [], [c.dDrive], 8, 5, 1, 0.8));
            definitions.sunlit.push(this.createEnemy("swarm of pidgeons", "swarm of pidgeons", "sunlit", [c.nPest, c.nAnimal], [c.gFlock, c.gSwarm], [c.aInfest], [c.dDrive], 9, 5, 0.75, 1.1, 10));
            definitions.sunlit.push(this.createEnemy("great black pelican", "great black pelican", "sunlit", [c.nPest, c.nAnimal], [], [c.aInfest, c.aGuard], [c.dKilled, c.dDrive], 15, 5, 0.5, 0.9, 35));
            // dark
            definitions.dark.push(this.createEnemy("cockroach", "cockroach", "dark", [c.nPest, c.nAnimal], [c.gSwarm], [c.aInfest, c.aCover, c.aOverrun], [c.dCleared], 0, 1, 0.4, 1, 10));
            definitions.dark.push(this.createEnemy("cave bat", "cave bat", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 2, 4, 0.4, 1.1, 20));
            definitions.dark.push(this.createEnemy("ghost bat", "ghost bat", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 3, 6, 0.8, 1, 50));
            definitions.dark.push(this.createEnemy("vampire bat", "vampire bat", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 3, 5, 0.7, 1, 70));
            definitions.dark.push(this.createEnemy("albino salamander", "albino salamander", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gMob, c.gHorde], [c.aInfest], [c.dKilled], 6, 5, 0.6, 1, 50));
            definitions.dark.push(this.createEnemy("vampire", "vampire", "dark", [], [], [], [c.dDrive], 7, 8, 0.9, 1.1, 90));
            definitions.dark.push(this.createEnemy("giant albino salamander", "giant albino salamander", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gMob, c.gHorde], [c.aInfest], [c.dKilled], 9, 5, 0.6, 1, 50));
            definitions.dark.push(this.createEnemy("great vampire bat", "great vampire bat", "dark", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gFlock, c.gHorde], [c.aInfest], [c.dCleared, c.dDrive], 10, 5, 0.7, 1, 70));
            // dense
            definitions.dense.push(this.createEnemy("ratsnake", "ratsnake", "dense", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gCluster], [c.aInfest, c.aOverrun], [c.dKilled, c.dCleared], 5, 5, 0.6, 1, 50));
            definitions.dense.push(this.createEnemy("fierce snake", "fierce snake", "dense", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gCluster], [c.aInfest, c.aOverrun], [c.dKilled, c.dCleared], 8, 5, 0.6, 1, 50));
            definitions.dense.push(this.createEnemy("death adder", "death adder", "dense", [c.nPest, c.nAnimal], [c.gPack, c.gSwarm, c.gCluster], [c.aInfest, c.aOverrun], [c.dKilled, c.dCleared], 10, 5, 0.6, 1, 50));
            definitions.dense.push(this.createEnemy("escaped pet boa", "escaped pet boa", "dense", [c.nAnimal], [], [c.aInfest], [], 12, 7, 0.5, 0.9, 85));
            definitions.dense.push(this.createEnemy("territorial sewer varanid", "territorial sewer varanid", "dense", [c.nAnimal], [c.gPack, c.gGang], [c.aGuard], [c.dKilled, c.dDrive], 13, 8, 0.7, 0.8, 85));
            definitions.dense.push(this.createEnemy("predatory sewer varanid", "predatory sewer varanid", "dense", [c.nAnimal], [c.gPack, c.gGang], [c.aGuard], [c.dKilled, c.dDrive], 14, 5, 0.8, 0.8, 85));
            // sparse
            definitions.sparse.push(this.createEnemy("aggressive magpie", "aggressive magpie", "sparse", [c.nPest, c.nAnimal], [], [c.aInfest], [], 4, 4, 0.7, 1.2, 50));
            definitions.sparse.push(this.createEnemy("territorial magpie", "territorial magpie", "sparse", [c.nPest, c.nAnimal], [], [c.aInfest], [], 5, 4, 0.7, 1.2, 35));
            definitions.global.push(this.createEnemy("agitated murder of crows", "agitated murder of crows", "global", [c.nPest, c.nAnimal], [c.gFlock, c.gSwarm], [c.aInfest], [c.dDrive], 10, 5, 1.25, 1.3));
            definitions.global.push(this.createEnemy("military bot", "military bot", "global", [c.nBot], [c.gMob], [c.aPatrol, c.aGuard], [c.dDisabled], 13, 5, 0.8, 1.2, 85));
            definitions.global.push(this.createEnemy("advanced military bot", "advanced military bot", "global", [c.nBot], [c.gMob], [c.aPatrol, c.aGuard], [c.dDisabled], 14, 5, 0.8, 1.2, 85));
            // water
            definitions.water.push(this.createEnemy("mugger", "mugger", "water", [c.nGangster], [c.gGang], [c.aInfest], [c.dDrive], 10, 5, 0.5, 0.9, 15));
            definitions.water.push(this.createEnemy("threathening mugger", "threathening mugger", "water", [c.nGangster], [c.gGang], [c.aInfest], [c.dDrive], 11, 5, 0.5, 0.9, 15));
            definitions.water.push(this.createEnemy("aggressive raccoon", "aggressive raccoon", "water", [c.nPest, c.nAnimal], [], [], [], 11, 5, 0.6, 1, 40));
            definitions.water.push(this.createEnemy("robber", "robber", "water", [c.nGangster], [c.gGang, c.gMob], [c.aPatrol, c.aGuard], [c.dKilled], 12, 5, 0.5, 1, 50));
            definitions.water.push(this.createEnemy("mean robber", "mean robber", "water", [c.nGangster], [c.gGang, c.gMob], [c.aPatrol, c.aGuard], [c.dKilled], 13, 5, 0.5, 1, 50));
            // magic
            definitions.magic.push(this.createEnemy("spirit of earth", "spirit of earth", "magic", [], [], [c.aGuard], [c.dDrive], 5, 5, 0.2, 1.1, 25));
            definitions.magic.push(this.createEnemy("spirit of wind", "spirit of wind", "magic", [], [], [c.aGuard], [c.dDrive], 5, 8, 0.8, 1.1, 35));
            definitions.magic.push(this.createEnemy("spirit of fire", "spirit of fire", "magic", [], [], [c.aGuard], [c.dDrive], 5, 6, 0.6, 1.1, 45));
            definitions.magic.push(this.createEnemy("spirit of sun", "spirit of sun", "magic", [], [], [c.aGuard], [c.dDrive], 5, 6, 0.2, 1.1, 55));
            definitions.magic.push(this.createEnemy("vengeful dryad", "vengeful dryad", "magic", [], [c.gMob], [c.aGuard], [c.dDrive], 6, 8, 0.5, 1.1, 90));
        },

        // Enemy definitions (level: level ordinal, difficulty: 1-10, attRatio: 0-1, speed 0.5-1.5, rarity: 0-100)
        createEnemy: function (id, name, type, nouns, groupN, activeV, defeatedV, campOrdinal, normalizedDifficulty, attRatio, speed, rarity) {
            var reqStr = this.getRequiredStrength(campOrdinal, 2);
            var reqStrPrev = this.getRequiredStrength(campOrdinal, 1);
            var reqStrNext = this.getRequiredStrength(campOrdinal, 3);
            var strengthMin = Math.max(0, reqStr - (reqStr - reqStrPrev) * 0.5);
            var strengthMax = Math.max(2, reqStr + (reqStrNext - reqStr) * 0.5);
            if (reqStr === reqStrNext) {
                strengthMax = Math.max(2, reqStr + (reqStr - reqStrPrev) * 0.5);
            }
            
            attRatio = Math.max(0.3, attRatio);
            attRatio = Math.min(0.7, attRatio);
            
            // log.i("createEnemy " + name + " campOrdinal:" + campOrdinal + ", normalizedDifficulty: " + normalizedDifficulty + " strengthMin: " + strengthMin + ", strengthMax: " + strengthMax)
            
            var strength = strengthMin + (strengthMax - strengthMin) / 10 * normalizedDifficulty;
            var hp = Math.round(100 + ((1-attRatio) - 0.5) * 50 + (normalizedDifficulty - 5)/10 * 50 + (campOrdinal - 5) * 5);
            var stats = strength * 100 / hp;
            var def = Math.max(campOrdinal, Math.round(stats * (1 - attRatio)));
            var att = Math.max(campOrdinal, Math.round(stats * attRatio));
            // log.i("createEnemy " + name + " " + strength + " -> " + FightConstants.getStrength(att, def, hp) + " | " + hp + " " + att + " " + def);
            return new EnemyVO(id, name, type, nouns, groupN, activeV, defeatedV, att, def, hp, speed, rarity);
        },

        // get enemies by type (string) and difficulty (campOrdinal and step)
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
            var enemyStats = FightConstants.getStrength(enemy.att, enemy.def, enemy.maxHP);
            var requiredStats;
            var max = this.getDifficulty(WorldCreatorConstants.CAMPS_TOTAL, WorldCreatorConstants.CAMP_STEP_END);
            for (var i = 1; i <= max; i++) {
                var campOrdinal = this.getCampOrdinalFromDifficulty(i);
                var step = this.getStepFromDifficulty(i);
                requiredStats = this.getRequiredStrength(campOrdinal, step);
                if (requiredStats >= enemyStats) return i;
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
            var prevOrdinal = campOrdinal;
            var prevStep = step - 1;
            if (prevStep < WorldCreatorConstants.CAMP_STEP_START) {
                prevOrdinal = campOrdinal - 1;
                prevStep = WorldCreatorConstants.CAMP_STEP_END;
            }
            var typicalStrength = this.getTypicalStrength(campOrdinal, step);
            var typicalStrengthPrevious = this.getTypicalStrength(prevOrdinal, prevStep);
            var result = Math.ceil((typicalStrength + typicalStrengthPrevious) / 2);
            return result;
        },

        getTypicalStrength: function (campOrdinal, step) {
            if (campOrdinal < 0) campOrdinal = 0;
            
            // health
            var typicalHealth = 100;
            var healthyPerkFactor = PerkConstants.getPerk(PerkConstants.perkIds.healthBonus).effect;
            if (campOrdinal >= WorldCreatorConstants.CAMPS_BEFORE_GROUND)
                typicalHealth = typicalHealth * healthyPerkFactor;
            if (campOrdinal < 1)
                typicalHealth = 50;

            // items
            var typicalItems = new ItemsComponent();
            var typicalWeapon = ItemConstants.getDefaultWeapon(campOrdinal, step);
            var typicalClothing = GameGlobals.itemsHelper.getBestClothing(campOrdinal, step, ItemConstants.itemBonusTypes.fight_def, 3);

            if (typicalWeapon)
                typicalItems.addItem(typicalWeapon, false);

            if (typicalClothing.length > 0) {
                for ( var i = 0; i < typicalClothing.length; i++ ) {
                    typicalItems.addItem(typicalClothing[i], false);
                }
            }

            // followers
            var numFollowers = FightConstants.getTypicalFollowers(campOrdinal);
            for (var f = 0; f < numFollowers; f++)
                typicalItems.addItem(ItemConstants.getFollower(13, campOrdinal));
            
            typicalItems.autoEquipAll();

            var typicalStamina = {};
            typicalStamina.health = typicalHealth;
            typicalStamina.maxHP = typicalHealth;
            var result = FightConstants.getPlayerStrength(typicalStamina, typicalItems);
            // log.i("typical strength: campOrdinal: " + campOrdinal + ", step: " + step + " -> " + result + " | " + numFollowers + " " + typicalHealth);
            return result;
        },
        
        sortByDifficulty: function (a, b) {
            if (!EnemyConstants.enemyDifficulties) this.saveEnemyDifficulties();
            var diff1 = EnemyConstants.enemyDifficulties[a.id];
            var diff2 = EnemyConstants.enemyDifficulties[b.id];
            return diff2-diff1;
        }
    });

    return EnemyCreator;
});
