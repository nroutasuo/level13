define(['ash'], function (Ash) {
    
    var PerkVO = Ash.Class.extend({
	
		id: "",
		name: "",
		type: "",
		effect: 0,
		icon: "",
        
        effectTimer: -1,
	
        constructor: function (id, name, type, effect, icon) {
			this.id = id;
			this.name = name;
			this.type = type;
			this.effect = effect;
			this.icon = icon;
        },
	
		clone: function() {
			return new PerkVO(this.id, this.name, this.type, this.effect, this.icon);    
		},
    });

    return PerkVO;
});
