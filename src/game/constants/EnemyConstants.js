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
		enemyDifficultiesGroundLevelOrdinal: 0,
		enemyDifficultiesTotalLevels: 0,
		enemyDifficulties: {
		},
        
        // For TextConstants: nouns and verbs to describe enemies
        nPest: "urban pests",
        nAnimal: "aggressive animals",
        nGangster: "bandits",
        nBot: "bots",
        aPatrol: "patrolled by",
        aGuard: "guarded by",
        aInfest: "infested with",
        aCover: "covered in",
        dCleared: "cleared",
        dDisabled: "disabled",
        dKilled: "killed",
        dDrive: "driven away",
        
	};
		
    
    return EnemyConstants;
    
});
