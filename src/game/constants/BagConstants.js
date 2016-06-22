define(['ash', 'game/constants/ItemConstants'], function (Ash, ItemConstants) {

    var BagConstants = {

        // TODO define item capacities and also show them clearly to the user
        getItemCapacity: function (itemVO) {
            if (itemVO.type === ItemConstants.itemTypes.bag) return 0;
            if (itemVO.type === ItemConstants.itemTypes.uniqueEquipment) return 0;
            if (itemVO.type === ItemConstants.itemTypes.exploration) return 1;
            if (itemVO.type === ItemConstants.itemTypes.ingredient) return 1;
            if (itemVO.type === ItemConstants.itemTypes.shoes) return 1;
            return 2;
        },
        
        getResourcesCapacity: function (resourcesVO) {
            return resourcesVO.getTotal();
        },
        
        getResourceCapacity: function (resourceName) {
            return 1;
        }

    };
    
    return BagConstants;
});