define([], function () {
	
	let FlowUtils = {
		
		// execute an array of tasks (functions) in order, waiting a frame before each
		executeTasksInSteps: function (tasks, cb, errorcb) {
			FlowUtils.executeTaskInSteps(tasks, 0, cb, errorcb);
		},
		
		// execute an array of tasks (functions) in order, waiting a frame before each, starting from index i
		executeTaskInSteps: function (tasks, i, cb, errorcb) {
			if (tasks.length == 0 || i >= tasks.length) {
				cb();
				return;
			}
			
			setTimeout(() => {
				try {
					tasks[i]();
					FlowUtils.executeTaskInSteps(tasks, i + 1, cb, errorcb);
				} catch (ex) {
					errorcb(ex);
				}
			}, 1);
		},
		
	};

	return FlowUtils;
});
