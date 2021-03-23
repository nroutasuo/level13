// utils for keeping track of when a UI system needs to refresh some part of it
define(function () {

	var UIState = {
		
		// Refresh UI state if needed based on a value the UI depends on.
		// Saves current state AND calls the refresh function only if the state has changed since last refresh.
		// system: UIOut system responsible for displaying the state
		// stateID: id for the state (must be unique for the system)
		// value: current value
		// func: function to apply if state has changed since last refresh
		refreshState: function (system, stateID, value, func) {
			if (!system.uiStates) system.uiStates = {};
			var oldVal = system.uiStates[stateID];
			system.uiStates[stateID] = value;
			if (value !== oldVal) {
				func.apply(system);
			}
		}
		
	};

	return UIState;
});
