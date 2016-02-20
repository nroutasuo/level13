// Helper functions for the WorldCreator - stuff that may be useful outside of world creation as well
define([
	'ash',
	'game/worldcreator/WorldCreatorRandom',
	'game/constants/WorldCreatorConstants',
	'game/constants/LevelConstants',
], function (Ash, WorldCreatorRandom, WorldCreatorConstants, LevelConstants) {

    var WorldCreatorHelper = {
		
		getSectorType: function (seed, level, x, y) {
            var sector = x + y + 2000;
			var topLevel = this.getHighestLevel(seed);
			var sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE;
			if (level > topLevel - 5) {
				// Recent mostly residential and commercial area
				sectorType = WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (WorldCreatorRandom.random(seed*level*sector+5) < 0.3) sectorType = WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL;
				if (WorldCreatorRandom.random(seed*level*sector+5) < 0.05) sectorType = WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL;
			} else if (level > topLevel - 7) {
				// Recent industrial and maintenance area
				sectorType = WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (WorldCreatorRandom.random(seed*level*sector+2) < 0.4) sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE;
				if (WorldCreatorRandom.random(seed*level*sector+2) < 0.15) sectorType = WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL;
			} else if (level > topLevel - 10) {
				// Recent slums & maintenance
				sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE;
				if (WorldCreatorRandom.random(seed*level*sector+5) < 0.3) sectorType = WorldCreatorConstants.SECTOR_TYPE_SLUM;
			} else {
				// Old levels: mix of slum, maintenance, and everything else
				sectorType = WorldCreatorConstants.SECTOR_TYPE_SLUM;
				if (WorldCreatorRandom.random(seed*level*sector*4) < 0.4) sectorType = WorldCreatorConstants.SECTOR_TYPE_INDUSTRIAL;
				if (WorldCreatorRandom.random(seed*level*sector*4) < 0.3) sectorType = WorldCreatorConstants.SECTOR_TYPE_MAINTENANCE;
				if (WorldCreatorRandom.random(seed*level*sector*4) < 0.2) sectorType = WorldCreatorConstants.SECTOR_TYPE_RESIDENTIAL;
				if (WorldCreatorRandom.random(seed*level*sector*4) < 0.1) sectorType = WorldCreatorConstants.SECTOR_TYPE_COMMERCIAL;
			}
			return sectorType;
		},
		
		getBottomLevel: function (seed) {
			return 3 - Math.ceil(WorldCreatorRandom.random(seed)*6);
		},
		
		getHighestLevel: function (seed) {
            var bottomLevel = this.getBottomLevel(seed);
			return Math.max(bottomLevel+WorldCreatorConstants.LEVEL_NUMBER_MIN-1, 14+WorldCreatorConstants.CAMPS_AFTER_GROUND);
		},
		
		getLevelOrdinal: function(seed, level) {
			if (level > 13) {
                var bottomLevel = this.getBottomLevel(seed);
                var bottomLevelOrdinal = this.getLevelOrdinal(seed, bottomLevel);
                return bottomLevelOrdinal + (level - 13);
			} else {
                return -level + 14;
            }
		},
		
		getLevelOrdinalFromCampOrdinal: function (campOrdinal) {
			var levelOrdinal = 1;
			// TODO calculate level ordinal from camp ordinal
			return levelOrdinal;
		},
		
		getCampOrdinal: function (seed, level) {
            var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);
			var levelOrdinal = this.getLevelOrdinal(seed, level);
			var ordinal = 0;
			for (var i = 0; i < levelOrdinal; i++) {
				if (camplessLevelOrdinals.indexOf(i) < 0) ordinal++;
			}
			return ordinal;
		},
        
        isCampableLevel: function (seed, level) {
            var camplessLevelOrdinals = this.getCamplessLevelOrdinals(seed);            
            var levelOrdinal = this.getLevelOrdinal(seed, level);
            return camplessLevelOrdinals.indexOf(levelOrdinal) < 0;
        },
        
        getNotCampableReason: function (seed, level) {
            if (this.isCampableLevel(seed, level)) return null;
            var rand = WorldCreatorRandom.random(seed % 4 + level + level * 8 + 88);
            if (rand < 0.33) return LevelConstants.UNCAMPABLE_LEVEL_TYPE_RADIATION;
            if (rand < 0.66 && level < 16) return LevelConstants.UNCAMPABLE_LEVEL_TYPE_SUPERSTITION;
            return LevelConstants.UNCAMPABLE_LEVEL_TYPE_POLLUTION;
        },
		
		getCamplessLevelOrdinals: function (seed) {
            var camplessLevelOrdinals = [];
            
            var camplessLvlFreq;
            var camplessLvlFreqSmall;
            var camplessLvlFreqBig;
            var numCamplessLvls;
            var groundLvlOrdinal = this.getLevelOrdinal(seed, this.getBottomLevel(seed));
			var totalLevels = this.getHighestLevel(seed) - this.getBottomLevel(seed) + 1;
			
			// before ground
			numCamplessLvls = groundLvlOrdinal - WorldCreatorConstants.CAMPS_BEFORE_GROUND;
			camplessLvlFreq = (groundLvlOrdinal-3)/(numCamplessLvls);
			camplessLvlFreqSmall = camplessLvlFreq < 2 ? 1 : camplessLvlFreq;
			camplessLvlFreqBig = Math.max(2, camplessLvlFreq);
			for (var i = 1; i <= numCamplessLvls; i++) {
				 if(i == 1)
					camplessLevelOrdinals.push(groundLvlOrdinal - Math.floor(camplessLvlFreqSmall));
				 else if(i == 2)
					camplessLevelOrdinals.push(Math.ceil(groundLvlOrdinal - camplessLvlFreqSmall * 2));
				 else
					camplessLevelOrdinals.push(Math.ceil(camplessLevelOrdinals[camplessLevelOrdinals.length-1] - camplessLvlFreqBig));
			}
			
			// after ground	
			var numLevelsAfterGround = totalLevels - groundLvlOrdinal;
			numCamplessLvls = numLevelsAfterGround - WorldCreatorConstants.CAMPS_AFTER_GROUND;
			camplessLvlFreq = (numLevelsAfterGround-1)/(numCamplessLvls);
			camplessLvlFreqSmall = camplessLvlFreq < 2 ? 1 : camplessLvlFreq;
			camplessLvlFreqBig = Math.max(2, camplessLvlFreq);
			for (var i = 1; i <= numCamplessLvls; i++) {
				 if(i == 1)
					camplessLevelOrdinals.push(groundLvlOrdinal + 1);
				 else if(i == 2)
					camplessLevelOrdinals.push(Math.ceil(groundLvlOrdinal + camplessLvlFreqSmall));
				 else
					camplessLevelOrdinals.push(Math.floor(camplessLevelOrdinals[camplessLevelOrdinals.length-1] + camplessLvlFreqBig));
			}
			
			return camplessLevelOrdinals;
		},
		
		isDarkLevel: function (seed, level) {
			return !this.isEarthLevel(seed, level) && !this.isSunLevel(seed, level);
		},
		
		isEarthLevel: function( seed, level ) {
			var lowest = this.getBottomLevel(seed, level);
			return level <= Math.min(lowest + 5, 3);
		},
		
		isSunLevel: function( seed, level ) {
			var highest = this.getHighestLevel(seed, level);
			return level >= highest - 5;
		},
        
    };

    return WorldCreatorHelper;
});
