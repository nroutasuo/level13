// Singleton with helper methods for saving and loading and related string manipulation
define([
	'ash',
	'game/constants/GameConstants',
	'game/components/common/CampComponent',
	'game/components/common/CurrencyComponent',
	'game/components/sector/improvements/BeaconComponent',
	'game/components/sector/ReputationComponent',
	'game/components/common/VisitedComponent',
	'game/components/common/RevealedComponent',
	'game/components/player/HopeComponent',
	'game/components/player/ExcursionComponent',
	'game/components/sector/LastVisitedCampComponent',
	'game/components/sector/OutgoingCaravansComponent',
	'game/components/sector/events/CampEventTimersComponent',
	'game/components/sector/events/DisasterComponent',
	'game/components/sector/events/DiseaseComponent',
	'game/components/sector/events/RaidComponent',
	'game/components/sector/events/TraderComponent',
	'game/components/sector/events/RecruitComponent',
	'game/components/sector/events/RefugeesComponent',
	'game/components/sector/events/VisitorComponent',
], function (Ash, GameConstants, 
	CampComponent, CurrencyComponent, BeaconComponent, ReputationComponent, VisitedComponent, RevealedComponent, HopeComponent, ExcursionComponent, LastVisitedCampComponent, OutgoingCaravansComponent, 
	CampEventTimersComponent, DisasterComponent, DiseaseComponent, RaidComponent, TraderComponent, RecruitComponent, RefugeesComponent, VisitorComponent) {

	let SaveHelper = Ash.Class.extend({

		saveKeys: {
			player: "player",
			tribe: "tribe",
			sector: "s-",
			level: "level-",
			gang: "gang-"
		},

		optionalComponents: [
			// sector: all camps
			CampComponent, CurrencyComponent, ReputationComponent, CampEventTimersComponent, OutgoingCaravansComponent,
			// sector: camp events
			DisasterComponent, DiseaseComponent, TraderComponent, RecruitComponent, RaidComponent, RefugeesComponent, VisitorComponent,
			// sector: buildings
			BeaconComponent,
			// sector: status
			VisitedComponent, RevealedComponent, LastVisitedCampComponent,
			// tribe: overall progress
			HopeComponent,
			// player: status
			ExcursionComponent
		],

		constructor: function () {},

		parseMetaStateJSON: function (json) {
			if (!json) return null;

			let result = null;
			try {
				result = JSON.parse(json);
			} catch (ex) {
				log.w("Error parsing meta state JSON. " + ex);
				return null;
			}

			return result;
		},

		// returns null if invalid, a parsed save object if valid
		parseSaveJSON: function (json) {
			if (!json) return null;

			let result = null;
			try {
				result = JSON.parse(json);
			} catch (ex) {
				log.w("Error parsing save JSON. " + ex);
				return null;
			}

			if (!result.gameState) {
				log.w("Save JSON is missing a GameState.");
				return null;
			}

			if (!result.entitiesObject) {
				log.w("Save JSON is missing an entities object.");
				return null;
			}

			return result;
		},

		loadEntity: function (entitiesObject, saveKey, entity) {
			var failedComponents = 0;
			var savedComponents = entitiesObject[saveKey];
			var existingComponents = entity.getAll();
			for (var componentKey in savedComponents) {
				var componentDefinition = componentKey;
				var component = entity.get(componentDefinition);

				// if the component has a shortened save key, compare to existing components to find the instance
				if (!component) {
					for (let i in existingComponents) {
						var existingComponent = existingComponents[i];
						if (this.isMatchingComponent(existingComponent, componentKey)) {
							component = existingComponent;
							break;
						}
					}
				}

				// if still not found, it could be an optional component
				if (!component) {
					for (let i = 0; i < this.optionalComponents.length; i++) {
						var optionalComponent = this.optionalComponents[i];
						if (componentKey == optionalComponent) {
							component = new optionalComponent();
							entity.add(component);
							break;
						}
					}
				}

				// or an optional component with a shortened save key
				if (!component) {
					for (let i = 0; i < this.optionalComponents.length; i++) {
						var optionalComponent = this.optionalComponents[i];
						if (this.isMatchingComponent(optionalComponent.prototype, componentKey)) {
							component = new optionalComponent();
							entity.add(component);
							break;
						}
					}
				}

				if (!component) {
					log.w("Component not found while loading:");
					log.i(componentKey);
					failedComponents++;
					continue;
				}

				var componentValues = savedComponents[componentKey];
				if (component.customLoadFromSave) {
					component.customLoadFromSave(componentValues, saveKey);
				} else {
					this.loadComponent(component, componentValues, saveKey);
				}
			}

			return failedComponents;
		},

		loadComponent: function (component, componentValues, saveKey) {
			// log.i(component);
			for (var valueKey in componentValues) {
				// log.i(valueKey + ": " + componentValues[valueKey]);
				if (typeof componentValues[valueKey] != 'object') {
					component[valueKey] = componentValues[valueKey];
				} else {
					if (typeof component[valueKey] == "undefined") {
						component[valueKey] = {};
					}
					for (var valueKey2 in componentValues[valueKey]) {
						var value2 = componentValues[valueKey][valueKey2];
						// log.i(valueKey2 + ": " + value2)
						if (value2 === null) {
							continue;
						} else if (typeof value2 != 'object') {
							component[valueKey][valueKey2] = value2;
						} else if (parseInt(valueKey2) >= 0 && component[valueKey] instanceof Array) {
							var valueKey2Int = parseInt(valueKey2);
							if (!component[valueKey][valueKey2Int]) {
								component[valueKey][valueKey2Int] = {};
							}
							this.loadObject(component[valueKey][valueKey2], componentValues[valueKey][valueKey2Int]);
						} else {
							if (typeof component[valueKey][valueKey2] == "undefined") {
								log.w("Error loading. Unknown value key " + valueKey2 + " for object " + valueKey + " in " + saveKey);
								continue;
							}
							this.loadObject(component[valueKey][valueKey2], value2);
						}
					}
				}
			}
		},

		loadObject: function (object, attrValues) {
			for (var attr in attrValues) {
				var value = attrValues[attr];

				if (value == null) {
					continue;
				} else if (typeof value != 'object') {
					if (attr == "loadedFromSave") {
						object[attr] = true;
					} else if (attr == "time" && this.isDate(value)) {
						object[attr] = new Date(value);
					} else {
						object[attr] = value;
					}
				} else {
					if (!object[attr]) object[attr] = new Object();
					this.loadObject(object[attr], attrValues[attr]);
				}
			}
		},

		hasManualSave: function (saveSlotID) {
			return saveSlotID && saveSlotID != GameConstants.SAVE_SLOT_LOADED && saveSlotID != GameConstants.SAVE_SLOT_BACKUP;
		},

		isCustomSaveSlot: function (saveSlotID) {
			switch (saveSlotID) {
				case GameConstants.SAVE_SLOT_USER_1: return true;
				case GameConstants.SAVE_SLOT_USER_2: return true;
				case GameConstants.SAVE_SLOT_USER_3: return true;
				default: return false;
			}
		},

		isMatchingComponent: function (existingComponent, componentSaveKey) {
			if (existingComponent.getSaveKey && existingComponent.getSaveKey() === componentSaveKey) {
				return true;
			}
			if (existingComponent.getOldSaveKey && existingComponent.getOldSaveKey() === componentSaveKey) {
				return true;
			}
			return false;
		},

		isDate: function (s) {
			return ((new Date(s) !== "Invalid Date" && !isNaN(new Date(s))));
		},

	});

	return SaveHelper;
});
