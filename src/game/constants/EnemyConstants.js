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
        
	};
		
	// For TextConstants: nouns and verbs to describe enemies
	var nPest = "urban pests";
	var nAnimal = "aggressive animals";
	var nGangster = "bandits";
	var nBot = "bots";
	
	var aPatrol = "patrolled by";
	var aGuard = "guarded by";
	var aInfest = "infested with";
	var aCover = "covered in";
	
	var dCleared = "cleared";
	var dDisabled = "disabled";
	var dKilled = "killed";
	var dDrive = "driven away";
    
    return EnemyConstants;
    
});
