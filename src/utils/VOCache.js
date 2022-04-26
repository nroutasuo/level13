define(function () {

	var VOCache = {

		caches: {},

		defaultMaxKeys: 100,

		create: function (context, maxKeys) {
			if (!maxKeys) maxKeys = this.defaultMaxKeys;
			this.caches[context] = {
				maxKeys: maxKeys,
				items: {},
				lastPruneTime: null,
			 };
		},
		
		delete: function (context) {
			this.caches[context] = {};
			delete this.caches[context];
		},
		
		clear: function (context) {
			if (!this.caches[context]) return;
			this.caches[context].items = {};
		},

		getVO: function (context, key) {
			if (!this.caches[context]) return null;
			if (!this.caches[context].items[key]) return null;
			var cached = this.caches[context].items[key];
			cached.accesstime = new Date().getTime();
			return cached.vo;
		},

		addVO: function (context, key, vo) {
			if (!this.caches[context]) this.create(context, this.defaultMaxKeys);
			this.caches[context].items[key] = {
				vo: Object.assign({}, vo),
				addtime: new Date().getTime(),
				accesstime: null
			};

			this.prune(context);
		},

		prune: function (context) {
			var cache = this.caches[context];
			if (!cache) return;
			var maxKeys = cache.maxKeys;
			var len = Object.keys(cache.items).length;
			if (len < maxKeys) return;

			var goalDeletions = maxKeys * 0.2;
			var toDelete = [];

			var now = new Date().getTime();
			if (cache.lastPruneTime && (now - cache.lastPruneTime) / 1000 < 1) {
				if (!cache.pruneWarningLogged) {
					cache.pruneWarningLogged = true;
					log.w("VO Cache " + context + " is being pruned too often. keys: " + len + "/" + cache.maxKeys);
				}
				return;
			}
			cache.pruneWarningLogged = false;

			var thresholdSecs = 60 * 5;
			while (toDelete.length < goalDeletions && thresholdSecs > 3) {
				for (var key in cache.items) {
					var item = cache.items[key];
					var timeSince = 0;
					if (item.accesstime) { timeSince = now - item.accesstime; }
					else { timeSince = now - item.addtime; }
					if (timeSince / 1000 > thresholdSecs) {
						toDelete.push(key);
					}
				}
				thresholdSecs = thresholdSecs * 0.5;
			}

			for (let i = 0; i < toDelete.length; i++) {
				var key = toDelete[i];
				delete cache.items[key];
			}

			cache.lastPruneTime = now;
		},
		
		getDefaultKey: function (...args) {
			var res = "";
			for (let i = 0; i < args.length; i++) {
				if (typeof(args[i]) == undefined || args[i] == null) {
					continue;
				}
				if (i > 0) {
					res = res + ".";
				}
				res = res + args[i];
			}
			return res;
		},
	};

	return VOCache;
});
