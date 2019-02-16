// utils for keeping track of when a UI system needs to refresh some part of it
define(function () {

    var UIState = {
        
        // Saves current state AND returns a boolean telling the caller if the UI dependent on sthat state should be updated (state has changed).
        // system: UIOut system responsible for displaying the state
        // stateID: system-unique id for the state
        // value: current value
        // return: true if state has changed and UI requires an update, otherwise false
        refreshState: function (system, stateID, value) {
            if (!system.uiStates) system.uiStates = {};
            var oldVal = system.uiStates[stateID];
            system.uiStates[stateID] = value;
            return value !== oldVal;
        }
        
    };

    return UIState;
});
