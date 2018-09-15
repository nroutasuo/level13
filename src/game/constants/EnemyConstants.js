define(['ash',
	'game/constants/WorldCreatorConstants',
	'game/vos/EnemyVO'],
function (Ash, WorldCreatorConstants, EnemyVO) {

    var EnemyConstants = {
		
		enemyTypes: {
			urban: "urban",			// top 5 levels
			inhabited: "inhabited",	// top 10 levels
			sunlit: "sunlit",		// anywhere with sunlight
			earth: "earth",			// bottom 2 levels
			global: "global",		// any level
		},
		
		enemyDefinitions: {
			urban: [ ],
			inhabited: [ ],
			sunlit: [ ],
			earth: [ ],
			global: [ ],
		},
		
		// saved for convenience & startup speed
		enemyDifficulties: null,
        
        // For TextConstants: nouns and verbs to describe enemies
        nPest: "urban pests",
        nAnimal: "aggressive animals",
        nGangster: "bandits",
        nBot: "bots",
        
        gPack: "pack",
        gGang: "gang",
        gSwarm: "swarm",
        gMob: "mob",
        gFlock: "flock",
        gHorde: "horde",
        gCluster: "cluster",
        
        aPatrol: "patrolled by",
        aGuard: "guarded by",
        aInfest: "infested with",
        aOverrun: "overrun with",
        
        dCleared: "cleared",
        dDisabled: "disabled",
        dKilled: "killed",
        dDrive: "driven away",
        
	};
		
    
    return EnemyConstants;
    
});
