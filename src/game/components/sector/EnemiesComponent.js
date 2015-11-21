// Information about the enemies in a given sector & sector control status
define(['ash'], function (Ash) {
    
    var EnemiesComponent = Ash.Class.extend({
        
        nextEnemy: null,
        possibleEnemies: [],
        
        constructor: function (possibleEnemies) {
            this.possibleEnemies = possibleEnemies;
        },
        
        hasEnemies: function () {
            return this.possibleEnemies.length > 0;
        },
        
        selectNextEnemy: function () {
            if (this.possibleEnemies.length < 1) {
                this.nextEnemy = null;
            } else {
                if (!this.nextEnemy) {
                    var index = Math.floor(Math.random() * this.possibleEnemies.length);
                    this.nextEnemy = this.possibleEnemies[index].clone();
                } else {
                    this.nextEnemy = this.nextEnemy.clone();
                }
            }
            return this.nextEnemy;
        },
        
        getNextEnemy: function () {
            if (!this.nextEnemy) this.selectNextEnemy();
            return this.nextEnemy;
        },
        
        resetNextEnemy: function () {
            this.nextEnemy = null;
        },
    });

    return EnemiesComponent;
});
