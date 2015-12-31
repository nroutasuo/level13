// Contains a list of messages to be shown in the log
define(
['ash', 'game/vos/LogMessageVO'], 
function (Ash, LogMessageVO) {
    var LogMessagesComponent = Ash.Class.extend({
	
		messages: [],
		messagesPendingMovement: [],
		
		constructor: function () {
			this.messages = [];
			this.messagesPendingMovement = [];
			this.hasNewMessages = true;
		},
			
		addMessage: function (message, replacements, values, visibleLevel, visibleSector, visibleInCamp) {
			var isPending = Boolean(visibleLevel || visibleSector || visibleInCamp);
			var newMsg = new LogMessageVO(message, replacements, values);
			
			if (!isPending) {
				this.addMessageImmediate(newMsg);
			} else {
				newMsg.setPending(visibleLevel, visibleSector, visibleInCamp);
				this.messagesPendingMovement.push(newMsg);
			}
		},
		
		addMessageImmediate: function (message) {
			this.hasNewMessages = true;
			var combined = this.combineMessagesCheck(message);
			if (!combined) this.messages.push(message);
		},
		
		removeMessage: function (message) {
			this.messages.splice(this.messages.indexOf(message), 1);
		},
		
		showPendingMessage: function (message) {
			// why no work? message.setPendingOver();
			this.messagesPendingMovement.splice(this.messagesPendingMovement.indexOf(message), 1);
			this.addMessageImmediate(message);
		},
		
		combineMessagesCheck: function (newMsg) {
			var prevMsg = this.messages[this.messages.length-1];
			if (!prevMsg) return false;
			
			var isCombineTime = newMsg.time.getTime() - prevMsg.time.getTime() < 1000 * 15;
			if (isCombineTime) {
				// Combine with previous single message?
				if (!prevMsg.loadedFromSave && newMsg.message == prevMsg.message) {
					this.combineMessages(prevMsg, newMsg);
					return true;
				}
				
				// Combine with previous pair of messages?
				var prev2Msg = this.messages[this.messages.length - 2];
				if (prev2Msg && !prev2Msg.loadedFromSave && newMsg.message === prev2Msg.message && newMsg.replacements.length === 0) {
					var prev3Msg = this.messages[this.messages.length-3];
					if (!prev3Msg.loadedFromSave && prevMsg.message === prev3Msg.message) {
						this.combineMessages(prev2Msg, newMsg);
						this.combineMessages(prev3Msg, prevMsg);
						this.removeMessage(prevMsg);
						return true;
					}
				}
			}
			
			return false;
		},
		
		combineMessages: function (oldMsg, newMgs) {
			var oldVal;
			var newVal;
			for (var i = 0; i < oldMsg.values.length; i++) {
				oldVal = oldMsg.values[i];
				newVal = newMgs.values[i];
				if (typeof oldVal === 'number' && typeof newVal === 'number') {
					oldMsg.values[i] += newVal;
				} else {
					oldMsg.values[i] += ", " + newVal;
				}
			}
			oldMsg.time = newMgs.time;
			oldMsg.combined++;
			oldMsg.createText();
		}
    });

    return LogMessagesComponent;
});
