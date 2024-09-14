// utils for keeping track of when a UI system needs to refresh some part of it
define(function () {

	let UIState = {
		
		// Refresh UI state if needed based on a value the UI depends on.
		// Saves current state AND calls the refresh function only if the state has changed since last refresh.
		// system: UIOut system responsible for displaying the state
		// stateID: id for the state (must be unique for the system)
		// value: current value
		// func: function to apply if state has changed since last refresh
		refreshState: function (system, stateID, value, func) {
			if (!system.uiStates) system.uiStates = {};

			let oldVal = system.uiStates[stateID];
			system.uiStates[stateID] = value;

			if (value !== oldVal) {
				func.apply(system, [ value ]);
			}
		},

		refreshStateDelayedFeedback: function (system, stateID, value, delay, func) {
			if (!system.uiTimeouts) system.uiTimeouts = {};

			UIState.refreshState(system, stateID, value, () => {
				let oldTimeoutID = system.uiTimeouts[stateID] || null;

				if (oldTimeoutID) window.clearTimeout(oldTimeoutID);

				if (delay <= 0) {
					func.apply(system, [ value ]);
				} else {
					let newTimeoutID = window.setTimeout(() => { func.apply(system, [value ]); }, delay);

					system.uiTimeouts[stateID] = newTimeoutID;
				}
			});
		}
		
	};

	return UIState;
});
