// Central hub for getting any user-facing text
// Handles translation (in the future), building texts from templates, capitalization etc

define(function () {
	var Text = {
		
		isDebugMode: false,
		language: null,
		
		getText: function (key) {
			return isDebugMode ? key + "|" : key;
		},
		
		capitalize: function (string) {
			for (var i = 0; i < string.length; i++) {
				var c = string.charAt(i);
				if (c == "[" || c == "]" || c == "(" || c == ")") continue;
				return string.substr(0, i) + c.toUpperCase() + string.substr(i + 1);
			}
			return string;
		},
		
		getArticle: function (s) {
			return this.language.getIndefiniteArticle(s);
		},
		
		pluralify: function (s) {
			if (s.endsWith("roach")) {
				return s + "es";
			} else if (s[s.length - 1] !== "s") {
				return s + "s";
			} else {
				return s;
			}
		},
		
		depluralify: function (s) {
			return s.substr(0, s.length - 1);
		},
		
		addArticle: function (s) {
			return this.getArticle(s) + " " + s;
		},
		
	};
	return Text;
});
