define(['ash'], function (Ash) {

	var ItemBonusVO = Ash.Class.extend({
		
		bonuses: null,
		
		constructor: function (bonusDict) {
			this.bonuses = bonusDict ? bonusDict : {};
		},
		
		getTotal: function () {
			var total = 0;
			for (var key in this.bonuses) {
				if (this.bonuses[key] > 0 && this.bonuses[key] < 1)
					total += 1 - this.bonuses[key];
				else
					total += this.bonuses[key];

			}
			return total;
		},

		getBonus: function (bonusType) {
			return this.bonuses[bonusType] ? this.bonuses[bonusType] : 0;
		}
		
	});

	return ItemBonusVO;
});
