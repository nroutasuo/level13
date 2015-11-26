// Current sector control status & wins needed for sector contorl (no more random encounters)
define(['ash'], function (Ash) {
    
    var SectorControlComponent = Ash.Class.extend({
        
        maxSectorEnemies: 0,
        currentSectorEnemies: 0,
        defeatedSectorEnemies: 0,
        
        maxLocaleEnemies: {},
        currentLocaleEnemies: {},
        defeatedLocaleEnemies: {},
        
        constructor: function (enemies) {
            this.maxSectorEnemies = enemies;
            this.currentSectorEnemies = enemies;
            this.defeatedSectorEnemies = 0;
        },
        
        hasControl: function () {
            return this.currentSectorEnemies <= 0;
        },
        
        addWin: function () {
            this.defeatedSectorEnemies++;
            this.currentSectorEnemies--;
        },
        
    });

    return SectorControlComponent;
});
