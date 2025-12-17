import { create_data } from "../functions/create_data";

class Store {
    // vis
    selectedFeatures = $state([]);
    merges = $state([]);
    clickedFeature = $state(null);
    hoveredGraph = $state([]);
    hoveredMatrix = $state([]);

    
    // datasets
    x = $state([]);
    y = [];
    sv = $state([]);
    graph_data = $state([]);


    // other
    allFeatures = [];

    // colors
    colorStroke = "#a1a1a1";
    colorSelectedStroke = "#d451fc";
    colorHoveredStroke = "#707070";
    colorClickedStroke = "#e04338";

    initialize(data) {

        // x normalization
        const x = data.x;
        const keys = Object.keys(x[0]);

        const stats = keys.map(key => {
            const values = x.map(d => d[key]);
            return {
                key,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });

        this.x = x.map(row => {
            const newRow = {};
            for (const { key, min, max } of stats) {
                const value = row[key];
                newRow[key] = (value - min) / (max - min);
            }
            return newRow;
        });

        // Other init
        this.y = data.y.map(r => +r.survived);
        this.sv = data.sv;
        this.allFeatures = keys;
        create_data(this.allFeatures)
    }

}

export let store = new Store();
