// cache simple values until either another value changes or it's been too long
// usage: return ValueCache.getValue("ID", 5, this.otherValueThatTriggersRefresh, () => getFreshValue());

define(function () {

	var ValueCache = {

		cache: {},
		
		getValue: function (id, refreshInterval, refreshValue, refreshGetter) {
			let cached = this.getOrCreateCached(id, refreshInterval, refreshValue);
			let isFresh = this.isFresh(cached, refreshInterval, refreshValue);
			
			if (!isFresh) {
				let value = refreshGetter();
				cached.value = value;
				cached.refreshTime = this.getTimestampSeconds();
				cached.refreshValue = refreshValue;
			}
			
			return cached.value;
		},
		
		getOrCreateCached: function (id) {
			if (this.cache[id]) return this.cache[id];
			
			var vo = {
				id: id
			};
			
			this.cache[id] = vo;
			return vo;
		},
		
		isFresh: function (vo, refreshInterval, refreshValue) {
			if (!vo) return false;
			if (typeof vo.value == "undefined") return false;
			
			if (refreshInterval > 0) {
				if (!vo.refreshTime) return false;
				let now = this.getTimestampSeconds();
				let interval = now - vo.refreshTime;
				if (interval > refreshInterval) return false;
			}
			
			if (vo.refreshValue !== refreshValue) {
				return false;
			}
			
			return true;
		},
		
		getTimestampSeconds: function () {
			return new Date().getTime() / 1000;
		}
	};

	return ValueCache;
});
