// maps a number of properties to text descriptions / templates, for example sector features to a sector description
// add descriptions with properties required to match them
// get description with an object
// - returns description whose properties ALL match that of the object
// - if several match, returns most specific description (most properties)
// - if several match and they are equally specific, returns a "random" one from matching (guaranteed to be the same one every time for the same properties)
// properties in descriptions may be simple (equals) or ranges (array of two values (inclusive))

define(function () {
    var DescriptionMapper = {
        
        WILDCARD: "WILDCARD",
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
            
            var bestMatches = [];
            var bestMatchesScore = 0;
            for (var i = 0; i < this.descriptions[type].length; i++) {
                var desc = this.descriptions[type][i];
                if (this.matches(props, desc)) {
                    var score = this.getMatchScore(desc);
                    if (bestMatchesScore == score) {
                        // same score, add to list
                        bestMatches.push(desc);
                    } else if (bestMatchesScore < score) {
                        // higher score, reset list
                        bestMatches = [desc];
                        bestMatchesScore = score;
                    }
                }
            }
            
            // no matches: warning
            if (bestMatches.length == 0) {
                log.w("no description found with type " + type);
                return "";
            }
            
            // single match, return that
            if (bestMatches.length == 1) {
                return bestMatches[0].text;
            }
            
            // several matches, select one in a semi-random way (same object should return the same one if called again but should be different for different objects)
            var checksum = this.getPropsChecksum(props);
            var index = checksum % bestMatches.length;
            return bestMatches[index].text;
        },
        
        matches: function (props, desc) {
            for (var [key, value] of Object.entries(desc.props)) {
                // test for simple value
                if (props[key] === value) continue;
                // test for range
                if (value.length && value.length == 2) {
                    if (props[key] >= value[0] && props[key] <= value[1]) continue;
                }
                // test for wildcard
                if (value == this.WILDCARD) continue;
                return false;
            }
            return true;
        },
        
        getMatchScore: function (desc) {
             return Object.keys(desc.props).length;
        },
        
        getPropsChecksum: function (props) {
            var result = 0;
            for (var [key, value] of Object.entries(props)) {
                var t = typeof value;
                if (t == "number") {
                    result += value;
                } else {
                    if (value) result++;
                }
            }
            return Math.round(result);
        }
        
    };
    return DescriptionMapper;
});
