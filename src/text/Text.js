// Central hub for getting any user-facing text
// Handles translation and language selection (WIP), building texts from templates, capitalization etc

define(function () {
	let Text = {
		
		isDebugMode: false,
		language: null,
		defaultTexts: {},
		currentTexts: {},

		t: function (key, options) {
			if (!key) return "";

			let isDebugMode = this.isDebugMode;

			let wrap = function (text) { return isDebugMode ? ("|" + text + "|") : text };

			let hasKey = this.hasKey(key);

			if (!hasKey) {
				log.w("no such text key: [" + key + "]");
				return wrap(key);
			}

			let text = this.getText(key);

			return wrap(text);
		},

		setTexts: function (json) {
			let lookup = {};
			for (var category in json) {
				for (var group in json[category]) {
					for (var key in json[category][group]) {
						let flatKey = category + "." + group + "." + key;
						lookup[flatKey] = json[category][group][key];
					}
				}
			}

			this.defaultTexts = lookup;
		},

		hasKey: function (key, skipFallback) {
			if (this.currentTexts[key]) return true;
			if (!skipFallback && this.defaultTexts[key]) return true;
			return false;
		},

		getText: function (key, skipFallback) {
			if (this.currentTexts[key]) return this.currentTexts[key];
			log.w("no text found for key [" + key + "] in current texts");
			if (!skipFallback) {
				if (this.defaultTexts[key]) return this.defaultTexts[key];
				log.w("no text found for key [" + key + "] in default texts");
			}
			return null;
		},
		
		irregularPlurals: {
			wildlife: "wildlife"
		},
		
		capitalize: function (string) {
			for (let i = 0; i < string.length; i++) {
				var c = string.charAt(i);
				if (c == "[" || c == "]" || c == "(" || c == ")") continue;
				return string.substr(0, i) + c.toUpperCase() + string.substr(i + 1);
			}
			return string;
		},
		
		getArticle: function (s) {
			return this.language.getIndefiniteArticle(s);
		},
		
		isPlural: function (s) {
			if (s[s.length - 1] === "s") {
				if (s[s.length - 1] === "e") return true;
				// can't tell
				return null;
			}
			return false;
		},
		
		pluralify: function (s) {
			let irregular = this.getIrregularPlural(s);
			if (irregular) return irregular;
			
			if (s.endsWith("roach")) {
				return s + "es";
			} else if (s[s.length - 1] !== "s") {
				return s + "s";
			} else {
				return s;
			}
		},
		
		depluralify: function (s) {
			if (s[s.length - 1] === "s") {
				return s.substr(0, s.length - 1);
			}
			
			return s;
		},
		
		addArticle: function (s) {
			if (this.isPlural(s)) return s;
			return this.getArticle(s) + " " + s;
		},
		
		getIrregularPlural: function (s) {
			let parts = s.split(" ");
			let w = parts[parts.length - 1];
			if (Object.keys(this.irregularPlurals).indexOf(w) >= 0) {
				parts[parts.length - 1] = this.irregularPlurals[w];
				return parts.join(" ");
			}
			return null;
		}
		
	};
	return Text;
});
