define(function () {
	
	let FileUtils = {
	
		saveTextToFile: function (fileName, saveText) {
		    // file setting
		    const text = saveText;
		    const name = fileName + ".txt";
		    const type = "text/plain";

		    // create file
		    const a = document.createElement("a");
		    const file = new Blob([text], { type: type });
		    a.href = URL.createObjectURL(file);
		    a.download = name;
		    document.body.appendChild(a);
		    a.click();
		    a.remove();
		},

		saveJsonObjToFile: function (fileName, saveObj) {
		    // file setting
		    const text = JSON.stringify(saveObj);
		    const name = fileName + ".json";
		    const type = "text/plain";

		    // create file
		    const a = document.createElement("a");
		    const file = new Blob([text], { type: type });
		    a.href = URL.createObjectURL(file);
		    a.download = name;
		    document.body.appendChild(a);
		    a.click();
		    a.remove();
		}
	};

	return FileUtils;
});
