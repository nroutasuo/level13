define(function () {
	
	var ColorConstants = {
		
		// Any colors that are defined in .less should be kept in sync with the value in .less
		
		colors: {
			dark: {
				bg_page: "#202220",
				bg_box_1: "#282a28",
				border_highlight: "#888",
				map_stroke_grid: "#343434",
				map_stroke_sector: "#ddee66",
				map_stroke_sector_hazard: "#ee4444",
				map_stroke_sector_cold: "#42e0f5",
				map_stroke_sector_sunlit: "#ffee11",
				map_stroke_sector_lit: "#ddcc1133",
				map_stroke_movementlines: "#3a3a3a",
				map_fill_sector_unvisited: "#3a3a3a",
				map_fill_sector_unscouted: "#666",
				map_fill_sector_scouted: "#999",
				map_fill_sector_cleared: "#ccc",
				map_stroke_gang: "#dd0000",
				map_stroke_blocker: "#dd0000",
				techtree_arrow: "#777",
				techtree_arrow_dimmed: "#555",
				techtree_node_unlocked: "#ccc",
				techtree_node_available: "#777",
				techtree_node_default: "#777",
				techtree_node_dimmed: "#444",
				campvis_building_lit_bg: "#ddd56c",
				campvis_building_z0_bg: "#aaa",
				campvis_building_z1_bg: "#888",
				campvis_building_z2_bg: "#666",
				campvis_building_z3_bg: "#444",
				campvis_building_z4_bg: "#333",
				campvis_building_z0_detail: "#888",
				campvis_building_z1_detail: "#777",
				campvis_building_z2_detail: "#666",
				campvis_building_z3_detail: "#444",
				campvis_building_z4_detail: "#333",
			},
			sunlit: {
				bg_page: "#fdfdfd",
				bg_box_1: "#efefef",
				border_highlight: "#888",
				map_stroke_grid: "#d9d9d9",
				map_stroke_sector: "#ddee66",
				map_stroke_sector_hazard: "#ee4444",
				map_stroke_sector_cold: "#42e0f5",
				map_stroke_sector_sunlit: "#ffee11",
				map_stroke_sector_lit: "#eedd11cc",
				map_stroke_movementlines: "#b0b0b0",
				map_fill_sector_unvisited: "#d0d0d0",
				map_fill_sector_unscouted: "#bbb",
				map_fill_sector_scouted: "#888",
				map_fill_sector_cleared: "#555",
				map_stroke_gang: "#dd0000",
				map_stroke_blocker: "#dd0000",
				techtree_arrow: "#999",
				techtree_arrow_dimmed: "#ccc",
				techtree_node_unlocked: "#999",
				techtree_node_available: "#ccc",
				techtree_node_default: "#ccc",
				techtree_node_dimmed: "#eee",
				campvis_building_lit_bg: "#fff",
				campvis_building_z0_bg: "#666",
				campvis_building_z1_bg: "#888",
				campvis_building_z2_bg: "#aaa",
				campvis_building_z3_bg: "#ccc",
				campvis_building_z4_bg: "#ddd",
				campvis_building_z0_detail: "#888",
				campvis_building_z1_detail: "#999",
				campvis_building_z2_detail: "#aaa",
				campvis_building_z3_detail: "#ccc",
				campvis_building_z4_detail: "#ddd",
			},
			global: {
				res_metal: "#202020",
				res_water: "#2299ff",
				res_food: "#ff6622",
				res_fuel: "#dd66cc",
				res_rubber: "#dddddd",
			}
		},
		
		getColor: function (sunlit, name) {
			var theme = sunlit ? "sunlit" : "dark";
			var color = this.colors[theme][name];
			if (!color) {
				log.w("No such color: " + name);
				return "#000";
			}
			return color;
		},
		
		getGlobalColor: function (name) {
			var color = this.colors.global[name];
			if (!color) {
				log.w("No such color: " + name);
				return "#000";
			}
			return color;
		}
		
	};
	return ColorConstants;
});
