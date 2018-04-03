define(['ash',], function (Ash) {

    var GlobalSignals = {
        
        // ui events
        gameShownSignal: new Ash.Signals.Signal(),
        tabChangedSignal: new Ash.Signals.Signal(),        
        calloutsGeneratedSignal: new Ash.Signals.Signal(),        
        popupOpenedSignal: new Ash.Signals.Signal(),
        popupClosedSignal: new Ash.Signals.Signal(),
        elementToggled: new Ash.Signals.Signal(),
        
        // player actions
        playerMovedSignal: new Ash.Signals.Signal(),
        sectorScoutedSignal: new Ash.Signals.Signal(),
        improvementBuiltSignal: new Ash.Signals.Signal(),
        upgradeUnlockedSignal: new Ash.Signals.Signal(),
        featureUnlockedSignal: new Ash.Signals.Signal(),
        inventoryChangedSignal: new Ash.Signals.Signal(),
        launcedSignal: new Ash.Signals.Signal(),
        
        // stats changes
        visionChangedSignal: new Ash.Signals.Signal(),
        healthChangedSignal: new Ash.Signals.Signal(),
        
        add: function (system, signal, listener) {
            if (!system.signalBindings)
                system.signalBindings = [];
            var binding = signal.add(listener);
            system.signalBindings.push(binding);
        },
        
        removeAll: function (system) {
            if (!system.signalBindings) return;
            for (var i = 0; i < system.signalBindings.length; i++)
                system.signalBindings[i].detach();
            system.signalBindings = [];
        }
        
    };

    return GlobalSignals;
});
