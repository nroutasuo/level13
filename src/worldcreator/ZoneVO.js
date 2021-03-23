define(['ash'], function (Ash) {

	var ZoneVO = Ash.Class.extend({
		
		zone: 0,
		campOrdinal: 0,
		
		constructor: function (campOrdinal, zone) {
			this.campOrdinal = campOrdinal;
			this.zone = zone;
		}
		
	});
	
	return ZoneVO;
});
