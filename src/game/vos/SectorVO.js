define(['ash', 'game/vos/ResourcesVO'], function (Ash, ResourcesVO) {

    var SectorVO = Ash.Class.extend({
	
		position: null,
	
        constructor: function (position, isCampableLevel) {
			this.position = position;
			
            this.camp = false;
            this.campableLevel = isCampableLevel; // TODO define reasons for camping disabled: waste etc
            this.blockerRight = 0;
            this.blockerLeft = 0;
            this.locales = [];
			this.passageUp = 0;
			this.passageDown = 0;
            this.resources = new ResourcesVO();
        },
		
    });

    return SectorVO;
});
