// builds texts (user-facing strings) out of text templates and text parameters
// templates can contain variables which can be replaced by parameters provided

// template: "A former [a-sectortype] sector where [n-buildings] and [n-buildings] lie in ruins"
// params: { a-sectortype: "industrial", n-buildings: [ "factories", "warehouses" ] }
// result: "A former industrial sector wheere factories and warehouses lie in ruins"

define(function () {
	var TextBuilder = {
		
		// predefined variables
		VAR_INDEFINITE_ARTICLE: "A",
		
		isDebugMode: false,
		language: null,
		
		build: function (template, params) {
			let result = template;
			var vars = template.match(/\[\S*\]/g);
			if (vars) {
				// 1dt pass: replace custom variables
				var replacedVars = {};
				for (let i = 0; i < vars.length; i++) {
					var v = vars[i].substring(1, vars[i].length - 1);
					if (this.isPredefinedVar(v)) continue;
					if (!replacedVars[v]) replacedVars[v] = 0;
					var var_ordinal = replacedVars[v] || 0;
					var replacement = this.getNextParam(v, params, var_ordinal);
					if (!replacement) {
						log.w("no replacement found: " + v + " in " + template);
					}
					if (this.isDebugMode) replacement = this.parametrify(replacement);
					result = result.replace(vars[i], replacement);
					replacedVars[v]++;
				}
				// 2nd pass: replace standard vars (may depend on the result of the 1st pass)
				for (let i = 0; i < vars.length; i++) {
					var v = vars[i].substring(1, vars[i].length - 1);
					if (!this.isPredefinedVar(v)) continue;
					if (!replacedVars[v]) replacedVars[v] = 0;
					var var_ordinal = replacedVars[v] || 0;
					var word_ordinal = this.getWordOrdinal(v, var_ordinal, result);
					var replacement = this.getPredefinedParam(v, word_ordinal, result);
					if (this.isDebugMode) replacement = this.parametrify(replacement);
					result = result.replace(vars[i], replacement);
					replacedVars[v]++;
				}
			}
			return result;
		},
		
		isPredefinedVar: function (v) {
			return v == this.VAR_INDEFINITE_ARTICLE;
		},
		
		getPredefinedParam: function (v, word_ordinal, sentence) {
			var words = sentence.split(" ");
			if (v == this.VAR_INDEFINITE_ARTICLE) {
				var next_word = this.deparametrify(words[word_ordinal + 1]);
				return this.language.getIndefiniteArticle(next_word);
			}
			return null;
		},
		
		getNextParam: function (v, params, var_ordinal) {
			var p = params[v];
			let t = typeof p;
			let result = "";
			if (t == "string") {
				result = p;
			} else if (t == "object") {
				var index = var_ordinal % p.length;
				result = p[index];
			}
			return result;
		},
		
		getWordOrdinal: function (word, word_repeat_ordinal, sentence) {
			word_repeat_ordinal = word_repeat_ordinal || 0;
			var word_alt = this.parametrify(word).toLowerCase();
			var words = sentence.split(" ");
			var repeats = 0;
			for (let i = 0; i < words.length; i++) {
				var w = words[i];
				if (w.toLowerCase() == word.toLowerCase() || w.toLowerCase() == word_alt) {
					if (word_repeat_ordinal <= repeats) {
						return i;
					}
					repeats++;
				}
			}
			return -1;
		},
		
		parametrify: function (word) {
			return "[" + word + "]";
		},
		
		deparametrify: function (word) {
			return word.replace("[", "").replace("]", "");
		},
		
	};
	return TextBuilder;
});
