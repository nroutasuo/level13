define(['ash'], function (Ash) {

    var PlayerActionComponent = Ash.Class.extend({
        
        endTimeStampToActionDict: {},
        endTimeStampList: [],
        
        constructor: function () {
            this.endTimeStampToActionDict = {};
            this.endTimeStampList = [];
        },
        
        addAction: function (action, duration) {
            var endTimeStamp = new Date().getTime() + duration * 1000;
            this.endTimeStampToActionDict[endTimeStamp] = action;
            this.endTimeStampList.push(endTimeStamp);
            this.endTimeStampList.sort(function (a, b) {
                return a - b;
            });
        },
        
        getLastAction: function () {
            var lastTimeStamp = this.endTimeStampList[this.endTimeStampList.length - 1];
            return this.endTimeStampToActionDict[lastTimeStamp];
        },
        
        isBusy: function () {
            var now = new Date().getTime();
            var lastTimeStamp = this.endTimeStampList[this.endTimeStampList.length - 1];
            var diff = lastTimeStamp - now;
            return diff > 0;
        },
        
        getDescription: function () {
            switch (this.getLastAction()) {
                case "use_in_campfire": return "discussing";
                case "use_in_hospital": return "recovering";
                default: return this.action;
            }
        }
    });

    return PlayerActionComponent;
});
