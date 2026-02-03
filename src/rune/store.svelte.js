import { create_data, findInterestingMerges } from "../functions/create_data";

class Store {
    // vis
    selectedFeatures = $state([]);
    merges = $state([]);
    clickedFeature = $state(null);
    hoveredGraph = $state([]);
    hoveredMatrix = $state([]);
    hideLabels = $state(false);
    pointSize = $state(10);
    downloadGraphSvg = () => { };
    graphWidthPercentage = $state(50);
    isLassoActive = $state(false);
    expertMode = $state(false);

    isSelectedNew = $derived.by(() => {
        const selected = this.selectedFeatures;

        // Pas assez de features pour créer un merge
        if (selected.length < 2) return false;

        const selectedSorted = [...selected].sort();

        return !this.merges.some(merge => {
            if (merge.length !== selectedSorted.length) return false;

            const mergeSorted = [...merge].sort();

            return mergeSorted.every(
                (value, index) => value === selectedSorted[index]
            );
        });
    });


    // datasets
    x = $state([]);
    y = [];
    sv = $state([]);
    graph_data = $state([]);

    // other
    allFeatures = [];
    hiddenFeatures = $state([]);
    filtered_graph_data = $derived.by(() =>
        this.graph_data.filter(d =>
            !this.hiddenFeatures.includes(d.feature)
        )
    );

    maxExpertDirection = $derived.by(() =>
        Math.max(...this.filtered_graph_data.map(d => Math.abs(d.expert_direction)))
    );

    recomendedMerges = $state(null);

    // colors
    colorStroke = "#a1a1a1";
    colorSelectedStroke = "#d451fc";
    colorHoveredStroke = "#707070";
    colorClickedStroke = "#e04338";
    minColor = "#007FFA";
    midColor = "#FFFFFF";
    maxColor = "#FF0047";
    primary = "#9b00caff";
    // secondaryColor = "#007FFA";


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


        // y
        const yKeys = Object.keys(data.y[0]);
        const yKey = yKeys[0];
        this.y = data.y.map(r => +r[yKey]);

        // sv 
        this.sv = data.sv;

        // others
        this.allFeatures = keys;

        create_data(this.allFeatures)
        // this.recomendedMerges = findInterestingMerges();

    }

}

export let store = new Store();
