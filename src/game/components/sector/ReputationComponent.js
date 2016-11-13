define(['ash'], function (Ash) {
    var ReputationComponent = Ash.Class.extend({
        
        constructor: function () {
            this.value = 0;
            this.isAccumulating = false;
            this.accumulation = 0;
            this.accSources = [];
        },
        
        addChange: function(source, amount) {
            if (amount == 0) return;
            
            for (var i = 0; i < this.accSources.length; i++) {
                var change = this.accSources[i];
                if (change.source == source) {
                    change.amount += amount;
                    return;
                }
            }
            
            this.accSources.push({ source: source, amount: amount });
        },
        
    });

    return ReputationComponent;
});
