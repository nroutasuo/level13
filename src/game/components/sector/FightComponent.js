// Marker component: this sector currently has a fight happening in it
define(['ash', 'game/vos/FightItemEffectsVO'], function (Ash, FightItemEffectsVO) {
	
	var FightComponent = Ash.Class.extend({
		
		enemy: null,
		itemEffects: null,
		itemsUsed: {},
			 
		finished: false,
		fled: false,
		won: null,
		resultVO: null,
		
		nextTurnPlayer: 0,
		nextTurnEnemy: 0,
		
		constructor: function (enemy) {
			this.enemy = enemy;
			this.itemEffects = new FightItemEffectsVO();
			this.itemsUsed = {};
			this.finished = false;
			this.fled = false;
			this.won = null;
			this.resultVO = null;
			
			this.nextTurnEnemy = 0;
			this.nextTurnPlayer = 0;
		},
		
		isActive: function () {
			return !this.finished && !this.finishedPending && !this.fled;
		},
		
		addItemUsed: function (itemID) {
			if (!this.itemsUsed[itemID])
				this.itemsUsed[itemID] = 0;
			this.itemsUsed[itemID]++;
		},
	});

	return FightComponent;
});
