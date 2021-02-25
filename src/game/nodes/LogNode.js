define([
	'ash', 'game/components/common/LogMessagesComponent'
], function(Ash, LogMessagesComponent) {
	var LogNode = Ash.Node.create({
		logMessages : LogMessagesComponent
	});

	return LogNode;
});
