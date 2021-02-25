define(['ash', 'game/vos/EnemyVO'],
function (Ash, EnemyVO) {

	var EnemyConstants = {
		
		enemyTypes: {
			// nohazard, cold, toxic, radiation, sunlit, dark, dense, sparse, water (sectors that contain AND neighbours)
			global: "global",     // anywhere
			nohazard: "nohazard",   // sectors with no hazards
			cold: "cold",           // cold sectors
			toxic: "toxic",         // toxic sectors
			radiation: "radiation", // radiactive sectors
			sunlit: "sunlit",       // sunlit sectors
			dark: "dark",           // dark sectors
			dense: "dense",         // densely built sectors
			sparse: "sparse",       // sparsely built sectors
			water: "water",         // sectors with water (or neighbours)
			magic: "magic"          // sectors with magic (WIP)
		},
		
		enemyDefinitions: {
			global: [ ],
			nohazard: [ ],
			cold: [ ],
			toxic: [ ],
			radiation: [ ],
			sunlit: [ ],
			dark: [ ],
			dense: [ ],
			sparse: [ ],
			water: [ ],
			magic: [ ],
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
		
		getEnemy: function (enemyID) {
			for (var type in this.enemyDefinitions ) {
				for (var i in this.enemyDefinitions[type]) {
					var enemy = this.enemyDefinitions[type][i];
					if (enemy.id == enemyID) {
						return enemy;
					}
				}
			}
			log.w("no such enemy found: " + enemyID);
			return null;
		},
		
	};
		
	
	return EnemyConstants;
	
});
