define(['ash',
    'game/GameGlobals',
	'game/constants/LocaleConstants',
    'game/components/common/VisitedComponent',
    'game/components/common/RevealedComponent',
    'game/components/sector/SectorStatusComponent',
    'game/components/sector/SectorLocalesComponent',
    'game/components/sector/SectorControlComponent',
    'game/components/sector/improvements/WorkshopComponent',
], function (Ash, GameGlobals, LocaleConstants, VisitedComponent, RevealedComponent, SectorStatusComponent, SectorLocalesComponent, SectorControlComponent, WorkshopComponent) {
    
    var SectorConstants = {
		
		MAP_SECTOR_STATUS_UNVISITED_INVISIBLE: "unvisited-invisible",
		MAP_SECTOR_STATUS_UNVISITED_VISIBLE: "unvisited-seen",
		MAP_SECTOR_STATUS_VISITED_UNSCOUTED: "visited",
		MAP_SECTOR_STATUS_VISITED_SCOUTED: "scouted",
		MAP_SECTOR_STATUS_VISITED_CLEARED: "cleared",
		
		getSectorStatus: function (sector) {
			if (!sector) return null;
			
			var isVisited = sector.has(VisitedComponent);
			if (isVisited) {
				var statusComponent = sector.get(SectorStatusComponent);
				var isScouted = statusComponent.scouted;
				if (isScouted) {
					var localesComponent = sector.get(SectorLocalesComponent);
					var workshopComponent = sector.get(WorkshopComponent);
					var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
					var sectorControlComponent = sector.get(SectorControlComponent);
					var hasUnclearedWorkshop = workshopComponent != null && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP);
					var isCleared = unScoutedLocales === 0 && !hasUnclearedWorkshop;
					if (isCleared) {
						return this.MAP_SECTOR_STATUS_VISITED_CLEARED;
					} else {
						return this.MAP_SECTOR_STATUS_VISITED_SCOUTED;
					}
				} else {
					return this.MAP_SECTOR_STATUS_VISITED_UNSCOUTED;
				}
			} else {
				if (sector.has(RevealedComponent)) {
					return this.MAP_SECTOR_STATUS_UNVISITED_VISIBLE;
				} else {
					return this.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
				}
			}
		},
        
    };
    return SectorConstants;
});
