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
		MAP_SECTOR_STATUS_REVEALED_BY_MAP: "revealed-by-map",
		MAP_SECTOR_STATUS_VISITED_SCOUTED: "scouted",
		MAP_SECTOR_STATUS_VISITED_CLEARED: "cleared",
		
		SECTOR_TYPE_RESIDENTIAL: "residential",
		SECTOR_TYPE_INDUSTRIAL: "industrial",
		SECTOR_TYPE_MAINTENANCE: "maintenance",
		SECTOR_TYPE_COMMERCIAL: "commercial",
		SECTOR_TYPE_PUBLIC: "public",
		SECTOR_TYPE_SLUM: "slum",
		
		SECTOR_CONDITION_MAINTAINED: 0, // currently maintained
		SECTOR_CONDITION_RECENT: 1,     // well-kept pre-Fall
		SECTOR_CONDITION_WORN: 2,       // already in bad shape around the Fall
		SECTOR_CONDITION_ABANDONED: 3,  // already abandoned pre-Fall
		SECTOR_CONDITION_DAMAGED: 4,    // not worn out but actually damaged by something
		SECTOR_CONDITION_RUINED: 5,     // so damaged or worn it's hard to say which
		
		// TODO add locales?
		WAYMARK_TYPE_SPRING: "spring",
		WAYMARK_TYPE_CAMP: "camp",
		WAYMARK_TYPE_RADIATION: "radiation",
		WAYMARK_TYPE_POLLUTION: "pollution",
		WAYMARK_TYPE_SETTLEMENT: "settlement",
		
		HAZARD_TYPE_RADIATION: "radiation",
		HAZARD_TYPE_POLLUTION: "poison",
		HAZARD_TYPE_DEBRIS: "debris",
		
		getSectorStatus: function (sector) {
			if (!sector) return null;
			
			var statusComponent = sector.get(SectorStatusComponent);
			
			if (statusComponent.scouted) {
				var localesComponent = sector.get(SectorLocalesComponent);
				var workshopComponent = sector.get(WorkshopComponent);
				var unScoutedLocales = localesComponent.locales.length - statusComponent.getNumLocalesScouted();
				var sectorControlComponent = sector.get(SectorControlComponent);
				var hasUnclearedWorkshop = workshopComponent != null && workshopComponent.isClearable && !sectorControlComponent.hasControlOfLocale(LocaleConstants.LOCALE_ID_WORKSHOP);
				var isCleared = unScoutedLocales <= 0 && !hasUnclearedWorkshop;
				if (isCleared) {
					return this.MAP_SECTOR_STATUS_VISITED_CLEARED;
				} else {
					return this.MAP_SECTOR_STATUS_VISITED_SCOUTED;
				}
			}
			
			if (statusComponent.revealedByMap) {
				return this.MAP_SECTOR_STATUS_REVEALED_BY_MAP;
			}
			
			var isVisited = sector.has(VisitedComponent);
			if (isVisited) {
				return this.MAP_SECTOR_STATUS_VISITED_UNSCOUTED;
			} else {
				if (sector.has(RevealedComponent)) {
					return this.MAP_SECTOR_STATUS_UNVISITED_VISIBLE;
				}
			}
			
			return this.MAP_SECTOR_STATUS_UNVISITED_INVISIBLE;
		},
		
		isVisited: function (sectorStatus) {
			switch (sectorStatus) {
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED: return true;
				default: return false;
			}
		},
		
		isLBasicInfoVisible: function (sectorStatus) {
			switch (sectorStatus) {
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_UNSCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_SCOUTED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_VISITED_CLEARED: return true;
				case SectorConstants.MAP_SECTOR_STATUS_REVEALED_BY_MAP: return true;
				default: return false;
			}
		},
		
	};
	return SectorConstants;
});
