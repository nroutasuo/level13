define(function () {
	
	var ColorConstants = {
		
		// Any colors that are defined in .less should be kept in sync with the value in .less
		
		colors: {
			dark: {
				bg_page: "#202220",
				bg_page_vision_level_0: "#121312",
				bg_page_vision_level_1: "#121312",
				bg_page_vision_level_2: "#161816",
				bg_page_vision_level_3: "#1b1d1b",
				bg_page_vision_level_4: "#202220",
				bg_box_1: "#282a28",
				bg_element_1: "#2f322f",
				bg_warning: "#e6464626",
				bg_warning_stronger: "#e6464659",
				border_highlight: "#888",
				map_background_hole: "#141414",
				map_background_district: "#1a1b1a",
				map_background_default: "#202220",
				map_background_surface: "#202220",
				map_stroke_grid: "#292b29",
				map_stroke_sector: "#ddee66",
				map_stroke_sector_hazard: "#ee4444",
				map_stroke_sector_cold: "#42e0f5",
				map_stroke_sector_flooded: "#8a71f0",
				map_stroke_sector_debris: "#999999",
				map_stroke_sector_poison: "#ee6944",
				map_stroke_sector_radiation: "#ee4485",
				map_stroke_sector_territory: "#ee4444",
				map_stroke_sector_sunlit: "#ffee11",
				map_stroke_sector_lit: "#ddcc1133",
				map_stroke_districts: "#3d3d3d",
				map_stroke_movementlines: "#3d3d3d",
				map_fill_sector_unvisited: "#3d3d3d",
				map_fill_sector_unscouted: "#686868",
				map_fill_sector_scouted: "#999999",
				map_fill_sector_cleared: "#c6c6c6",
				map_fill_sector_cold: "#42e0f5",
				map_fill_sector_flooded: "#8a71f0",
				map_fill_sector_debris: "#999999",
				map_fill_sector_poison: "#ee6944",
				map_fill_sector_radiation: "#ee4485",
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
			dusky: {
				bg_page: "#7c7c7c",
				bg_page_vision_level_0: "#7c7c7c",
				bg_page_vision_level_1: "#7c7c7c",
				bg_page_vision_level_2: "#7c7c7c",
				bg_page_vision_level_3: "#7c7c7c",
				bg_page_vision_level_4: "#7c7c7c",
				bg_element_1: "#c5c5c5",
			},
			sunlit: {
				bg_page: "#fdfdfd",
				bg_page_vision_level_0: "#fdfdfd",
				bg_page_vision_level_1: "#fdfdfd",
				bg_page_vision_level_2: "#fdfdfd",
				bg_page_vision_level_3: "#fdfdfd",
				bg_page_vision_level_4: "#fdfdfd",
				bg_box_1: "#efefef",
				bg_element_1: "#e6e6e6",
				bg_warning: "#fa000026",
				bg_warning_stronger: "#fa000059",
				border_highlight: "#888",
				map_background_hole: "#9f9f9f",
				map_background_district: "#fff",
				map_background_default: "#e8e8e8",
				map_background_surface: "#fffff7",
				map_stroke_grid: "#efefef",
				map_stroke_sector: "#ddee66",
				map_stroke_sector_hazard: "#ee4444",
				map_stroke_sector_poison: "#ee6944",
				map_stroke_sector_radiation: "#EE4485",
				map_stroke_sector_territory: "#ee4444",
				map_stroke_sector_cold: "#42e0f5",
				map_stroke_sector_flooded: "#8a71f0",
				map_stroke_sector_debris: "#ee4444",
				map_stroke_sector_sunlit: "#ffee11",
				map_stroke_sector_lit: "#eedd11cc",
				map_stroke_districts: "#ccc",
				map_stroke_movementlines: "#ccc",
				map_fill_sector_unvisited: "#d0d0d0",
				map_fill_sector_unscouted: "#aaa",
				map_fill_sector_scouted: "#7E7E7E",
				map_fill_sector_cleared: "#555",
				map_fill_sector_cold: "#42e0f5",
				map_fill_sector_flooded: "#8a71f0",
				map_fill_sector_debris: "#999999",
				map_fill_sector_poison: "#ee6944",
				map_fill_sector_radiation: "#EE4485",
				map_stroke_gang: "#dd0000",
				map_stroke_blocker: "#dd0000",
				techtree_arrow: "#999",
				techtree_arrow_dimmed: "#ccc",
				techtree_node_unlocked: "#999",
				techtree_node_available: "#ccc",
				techtree_node_default: "#ccc",
				techtree_node_dimmed: "#eee",
				campvis_building_lit_bg: "#fcee4e",
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
				res_rope: "#c8974b",
				transparent: "#00000000",
			}
		},
		
		getColor: function (theme, name) {
			if (typeof theme === "boolean") theme = theme ? "sunlit" : "dark";
			let color = this.colors[theme][name];

			if (!color && theme == "dusky") {
				return this.getColor("sunlit", name);
			}

			if (!color) {
				debugger
				log.w("No such color: " + name);
				return "#000";
			}
			return color;
		},
		
		getGlobalColor: function (name) {
			let color = this.colors.global[name];
			if (!color) {
				log.w("No such color: " + name);
				return "#000";
			}
			return color;
		},

		getColorWithAlpha: function (colorString, opacity) {
			// Match rgb or rgba
			const rgbaRegex = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/;
			const match = colorString.match(rgbaRegex);

			if (!match) {
				log.w("Invalid RGB(A) format. Expected format: rgb(r, g, b) or rgba(r, g, b, a)");
				return colorString;
			}

			const [, r, g, b] = match;

			// Clamp opacity between 0 and 1
			const alpha = Math.max(0, Math.min(1, opacity));

			return `rgba(${r}, ${g}, ${b}, ${alpha})`;
		}
		
	};
	return ColorConstants;
});
