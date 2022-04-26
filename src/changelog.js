
var versions;

$.getJSON('changelog.json', function (json) {
	versions = json.versions;
	
	var html = "<h4 class='infobox-scrollable-header'>Changelog</h4>";
	html += "<div id='changelog' class='infobox infobox-scrollable'>";
	
	var html = "";
	var v;
	for (let i in versions) {
		v = versions[i];
		if (v.changes.length === 0) continue;
		html += "<div class='changelog-version'>";
		html += "<b>version " + v.version + " (" + v.phase + ")";
		if (v.final) html += " released: " + v.released + "";
		else html += " (work in progress)";
		html += "</b>";
		html += "<ul>";
		for (let j in v.changes) {
			var change = v.changes[j];
			var summary = change.summary.trim().replace(/\.$/, "");
			html += "<li class='changelog-" + change.type + "'>";
			html += "<span class='changelog-summary'>" + summary + "</span>";
			html += "</li>";
		}
		html += "</ul>";
		html += "</div>";
	}
	html += "</div>";
	
	$("#changelog-container").html(html);
})
