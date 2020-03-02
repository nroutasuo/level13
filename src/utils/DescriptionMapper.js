// maps a number of properties to text descriptions, for example sector features to a sector description
// add descriptions with properties required to match them
// get description with an object
// - returns description whose properties all match that of the object
// - if several match, returns most specific description (most properties)

define(function () {
    var DescriptionMapper = {
        
        descriptions: {},
        
        add: function (type, props, text) {
            if (!this.descriptions[type]) this.descriptions[type] = [];
            this.descriptions[type].push({ props: props, text: text})
        },
        
        get: function (type, props) {
            if (!this.descriptions[type]) {
                log.w("no such description type: " + type);
                return "";
            }
            
            var topMatch = null;
            var topMatchNum = 0;
            for (var i = 0; i < this.descriptions[type].length; i++) {
                var desc = this.descriptions[type][i];
                if (this.matches(props, desc)) {
                    var num = Object.keys(desc.props).length;
                    if (!topMatch || topMatchNum < num) {
                        topMatch = desc;
                        topMatchNum = num;
                    }
                }
            }
            
            if (!topMatch) {
                log.w("no description found with type " + type);
                return "";
            }
            
            return topMatch.text;
        },
        
        matches: function (props, desc) {
            for (var [key, value] of Object.entries(desc.props)) {
                // test for simple value
                if (props[key] === value) continue;
                // test for range
                if (value.length && value.length == 2) {
                    if (props[key] >= value[0] && props[key] <= value[1]) continue;
                }
                return false;
            }
            return true;
        },
        
    };
    return DescriptionMapper;
});
