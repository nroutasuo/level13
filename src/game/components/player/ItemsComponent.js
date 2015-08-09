define(['ash', 'game/vos/ItemVO', 'game/constants/ItemConstants'],
function (Ash, ItemVO, ItemConstants) {
    var ItemsComponent = Ash.Class.extend({
        
        items: {},
        uniqueItems: {},
        selectedItem: null,
        
        constructor: function () {
            this.items = {};
            this.items[ItemConstants.itemTypes.light] = [];
            this.items[ItemConstants.itemTypes.shades] = [];
            this.items[ItemConstants.itemTypes.weapon] = [];
            this.items[ItemConstants.itemTypes.clothing] = [];
            this.items[ItemConstants.itemTypes.follower] = [];
        },
        
        addItem: function (item) {
            if (typeof this.items[item.type] == 'undefined') {
                this.items[item.type] = [];
            }
            
            this.items[item.type].push(item);
            if (item.equippable) this.autoEquip(item);
            this.uniqueItems = {};
        },
        
        discardItem: function (item) {
            if (typeof this.items[item.type] != 'undefined') {
                var typeItems = this.items[item.type];
                var splicei = -1;
                for (var i = 0; i < typeItems.length; i++) {
                    if (typeItems[i].id == item.id) {
                        splicei = i;
                        break;
                    }
                }
                if (splicei >= 0) {
                    typeItems.splice(splicei, 1);
                    if (item.equipped) {
                        var nextItem = this.getSimilar(item);
                        if(nextItem) this.equip(nextItem);
                    }
                } else {
                    console.log("WARN: Item to discard not found.");
                }
            }
            this.uniqueItems = {};
        },
        
        discardItems: function (item) {
            var count;
            do {
                this.discardItem(item);
                count = this.getCount(item);
            } while(count > 0);
        },
        
        // Equips the given item if it's better than the previous equipment
        autoEquip: function (item) {
            var shouldEquip = item.equippable;
            for (var i = 0; i < this.items[item.type].length; i++) {
                var existingItem = this.items[item.type][i];
                if (existingItem.itemID === item.itemID) continue;
                if (existingItem.equipped) {
                    var isExistingBonusBetter = existingItem.bonus >= item.bonus;
                    if (!isExistingBonusBetter) {
                        this.unequip(existingItem);
                    }
                    if (isExistingBonusBetter) {
                        shouldEquip = false;
                    }
                }
            }
            
            item.equipped = shouldEquip;
            this.uniqueItems = {};
        },
        
        // Equips the given item regardless of whether it's better than the previous equipment
        equip: function (item) {
            if (item.equippable) {
                var previousItem = this.getEquipped(item.type)[0];
                if (previousItem) {
                    this.unequip(previousItem);
                }
                item.equipped = true;
            }
            this.uniqueItems = {};
        },
        
        unequip: function (item) {
            item.equipped = false;
            this.uniqueItems = {};
        },
        
        getEquipped: function (type) {
            var equipped = [];
            for (var key in this.items) {
                if (key == type || !type) {
                    for( var i = 0; i < this.items[key].length; i++) {
                        var item = this.items[key][i];
                        if (item.equipped) equipped.push(item);
                    }
                }
            }
            return equipped.sort(this.itemSortFunction);
        },
        
        getCurrentBonus: function(type) {        
            var bonus = 0;
            for (var key in this.items) {
                if (key == type) {
                    for( var i = 0; i < this.items[key].length; i++) {
                        var item = this.items[key][i];
                        if (item.equipped) bonus += item.bonus;
                    }
                }
            }
            return bonus;
        },
        
        getAll: function() {
            var all = [];
            for (var key in this.items) {
                for( var i = 0; i < this.items[key].length; i++) {
                    all.push(this.items[key][i]);
                }
            }
            return all.sort(this.itemSortFunction);
        },
        
        getUnique: function () {
            var all = {};
            var allList = [];
            for (var key in this.items) {
                for( var i = 0; i < this.items[key].length; i++) {
                    var item = this.items[key][i];
                    var itemKey = item.id;
                    if (all[itemKey]) {
                        all[itemKey] = all[itemKey] + 1;
                    } else {
                        all[itemKey] = 1;
                        allList.push(item);
                    }
                }
            }
            this.uniqueItems = all;
            return allList.sort(this.itemSortFunction);
        },
        
        getCount: function (item) {
            if (!item) return 0;
            if (Object.keys(this.uniqueItems).length <= 0) this.getUnique();
            var itemKey = item.id;
            return this.uniqueItems[itemKey];
        },
        
        getCountByType: function(type) {
            return this.items[type].length;
        },
        
        getWeakestByType: function(type) {
            var weakest = null;
            for( var i = 0; i < this.items[type].length; i++) {
                var item = this.items[type][i];
                if(!weakest || item.bonus < weakest.bonus) weakest = item;
            }
            return weakest;
        },
        
        getItem: function(id, instanceId) {
            for (var key in this.items) {
                for( var i = 0; i < this.items[key].length; i++) {
                    var item = this.items[key][i];
                    if(id == item.id && (!instanceId || instanceId == item.itemID)) return item;
                }
            }
            return null;
        },
        
        getSimilar: function(item) {            
            for (var key in this.items) {
                for( var i = 0; i < this.items[key].length; i++) {
                    var otherItem = this.items[key][i];
                    if (item.itemID != otherItem.itemID && item.id == otherItem.id) {
                        return otherItem;
                    }
                }
            }
            return null;
        },
        
        contains: function(name) {            
            for (var key in this.items) {
                for( var i = 0; i < this.items[key].length; i++) {
                    if(this.items[key][i].name == name) return true;
                }
            }
            return false;
        },
        
        itemSortFunction: function(a, b) {
            if (!a.equipped && b.equipped) return 1;
            if (a.equipped && !b.equipped) return -1;
            if (!a.equippable && b.equippable) return 1;
            if (a.equippable && !b.equippable) return -1;
            if (a.type > b.type) return 1;
            if (a.type < b.type) return -1;
            return b.bonus - a.bonus;
        },
        
        customLoadFromSave: function(componentValues) {
            for(var key in componentValues.items) {
                for (var i in componentValues.items[key]) {
                    var itemID = componentValues.items[key][i].id;
                    var item = ItemConstants.getItemByID(itemID);
                    if (item) {
                        this.addItem(item);
                    }
                }
            }
        }
    });

    return ItemsComponent;
});
