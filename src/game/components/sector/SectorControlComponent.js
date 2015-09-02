// Current sector control status & wins needed
define(['ash'], function (Ash) {
    
    var SectorControlComponent = Ash.Class.extend({
        
        maxUndefeatedEnemies: 0,
        currentUndefeatedEnemies: 0,
        defeatedEnemies: 0,
        
        lastWinTimeStamp: 0,
        lastSpawnTimeStamp: 0,
        
        constructor: function (enemies) {
            this.maxUndefeatedEnemies = enemies;
            this.currentUndefeatedEnemies = enemies;
            this.defeatedEnemies = 0;
        },
        
        hasControl: function () {
            return this.currentUndefeatedEnemies <= 0;
        },
        
        addWin: function () {
            this.defeatedEnemies++;
            this.currentUndefeatedEnemies--;
            this.lastWinTimeStamp = new Date().getTime();
        },
        
        spawn: function () {
            if (this.currentUndefeatedEnemies < this.maxUndefeatedEnemies) {
                this.currentUndefeatedEnemies++;
                this.lastSpawnTimeStamp = new Date().getTime();
            }
        }
        
    });

    return SectorControlComponent;
});
