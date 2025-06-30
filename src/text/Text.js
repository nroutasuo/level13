// Central hub for getting any user-facing text
// Handles translation and language selection (WIP), building texts from templates, capitalization etc

define(function () {
	let Text = {
		
		isDebugMode: false,
		language: null, // language utility
		defaultTexts: {},
		currentLanguage: null, // language code
		currentTexts: {},

		TEXT_PARAM_WILDCARD: "wildcard",

		compose: function (textVO) {
			if (!textVO) {
				debugger
				log.w("no TextVO provided for Text.compose");
				return "";
			}

			if (!textVO.textFragments) {
				debugger
				log.w("invalid TextVO provided for Text.compose");
				return "";
			}
			
			let result = "";

			for (let i = 0; i < textVO.textFragments.length; i++) {
				if (i > 0 && textVO.delimiter) result += this.t(textVO.delimiter);
				let fragment = textVO.textFragments[i];
				if (!fragment) continue;
				if (fragment.rawText) result += fragment.rawText;
				if (fragment.textKey) result += this.t(fragment.textKey, fragment.textParams);
			}

			return result;
		},

		// key: string or TextVO
		// options: (optional) Object with textParams, or single wildcard textParam value
		t: function (key, options) {
			if (!key) {
				if (this.isDebugMode) log.w("no key provided for Text.t");
				return "";
			}
			
			if (key.textKey) {
				options = key.textParams;
				key = key.textKey;
			}

			let fallbackKey = key.replace(/_\d*_/, "_")

			if (!this.hasKey(key) && this.hasKey(fallbackKey)) {
				key = fallbackKey;
			}

			let isDebugMode = this.isDebugMode;
			let hasKey = this.hasKey(key);

			let wrap = function (text) { return isDebugMode && hasKey ? ("|" + text + "|") : text };

			if (!hasKey) {
				if (this.isDebugMode) log.w("no such text key: [" + key + "]");
			}

			let text = key;
			
			if (hasKey) {
				text = this.getText(key);
			}

			if (typeof (options) !== "object") {
				let p = options;
				options = {};
				options[this.TEXT_PARAM_WILDCARD] = p;
			}
			
			let result = this.replaceParameters(key, text, options);
			result = this.addStyles(result);

			return wrap(result);
		},

		setTexts: function (language, json) {
			if (language == "default") {
				this.setDefaultTexts(json);
			} else {
				this.setCurrentTexts(language, json);
			}
		},

		setDefaultTexts: function (json) {
			let mapping = this.getTextsFromJSON(json);
			this.defaultTexts = mapping;
		},

		setCurrentTexts: function (language, json) {
			let mapping = this.getTextsFromJSON(json);
			this.currentLanguage = language;
			this.currentTexts = mapping;
		},

		getTextsFromJSON: function (json) {
			let lookup = {};
			for (var category in json) {
				for (var group in json[category]) {
					for (var key in json[category][group]) {
						let flatKey = category + "." + group + "." + key;
						lookup[flatKey] = json[category][group][key];
					}
				}
			}
			return lookup;
		},

		hasDefaultTexts: function () {
			return Object.keys(this.defaultTexts).length > 0;
		},

		hasCurrentLanguage: function (language) {
			if (!language) return this.currentLanguage != null;
			return this.currentLanguage == language;
		},

		hasKey: function (key, skipFallback) {
			let hasLanguage = this.hasCurrentLanguage();
			skipFallback = skipFallback && hasLanguage;
			
			if (key in this.currentTexts) return true;
			if (!skipFallback && key in this.defaultTexts) return true;

			return false;
		},

		getText: function (key, skipFallback) {
			let hasLanguage = this.hasCurrentLanguage();
			skipFallback = skipFallback && hasLanguage;

			if (hasLanguage) {
				if (key in this.currentTexts) return this.currentTexts[key];
				log.w("no text found for key [" + key + "] in current texts");
			}
			if (!skipFallback) {
				if (key in this.defaultTexts) return this.defaultTexts[key];
				log.w("no text found for key [" + key + "] in default texts");
			}

			return null;
		},

		replaceParameters: function (key, text, options) {
			let result = text;

			if (!result) return result;

			options = options || {};

			let wildcard = this.TEXT_PARAM_WILDCARD;

			let regex = /{(\w+)}/ig;

			result = result.replace(regex, function(match, p) { 
				let isValidValue = (value) => value || value === 0;

				let value = "?";

				if (isValidValue(options[p])) {
					value = options[p];
				} else if (isValidValue(options[wildcard])) {
					value = options[wildcard];
				} else {
					if (this.isDebugMode) log.w("no parameter value [" + p + "] provided for key [" + key + "]");
					return value;
				}

				if (typeof value === "object") {
					value = Text.t(value.textKey, value.textParams);
				}

				if (Text.hasKey(value)) {
					value = Text.t(value, options);
				}

				return value;
			});

			return result;
		},

		addStyles: function (text) {
			let result = text;

			if (!result) return result;

			let regex = /<style='(.*?)'>(.*?)<\/style>/g;
			
			result = result.replace(regex, function(match, styleName, content) {
				return "<span class='text-style text-style-" + styleName + "'>" + content + "</span>";
			});

			return result;
		},
		
		irregularPlurals: {
			wildlife: "wildlife",
			fungi: "fungi",
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
			if (!s) return false;
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
