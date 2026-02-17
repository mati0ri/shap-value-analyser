import { create_data, findInterestingMerges } from "../functions/create_data";

class Store {
    // vis
    selectedFeatures = $state([]);
    merges = $state([]);
    clickedFeature = $state(null);
    draggedFeatureX = $state(null);
    draggedFeatureY = $state(null);
    draggingFeature = $state(null);
    hoveredGraph = $state([]);
    hoveredMatrix = $state([]);
    hideLabels = $state(false);
    pointSize = $state(10);
    downloadGraphSvg = () => { };
    graphWidthPercentage = $state(50);
    isLassoActive = $state(false);
    expertMode = $state(false);
    isUploadPopupOpen = $state(false);
    datasetId = $state(0);

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
    raw_x = $state([]); // Store un-normalized data
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
    maxSHAP = $state(0);

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


    initialize(data, name = "Dataset") {
        // Reset state
        this.graph_data = [];
        this.merges = [];
        this.selectedFeatures = [];
        this.clickedFeature = null;
        this.draggedFeatureX = null;
        this.draggedFeatureY = null;
        this.draggingFeature = null;
        this.hoveredGraph = [];
        this.hoveredMatrix = [];
        this.hiddenFeatures = [];
        this.datasetId++;
        this.datasetName = name;


        // x normalization
        const x = data.x;
        this.raw_x = x; // Keep raw data
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

        // Calculate maxSHAP
        // Sum of absolute SHAP values for each row in sv
        if (this.sv && this.sv.length > 0) {
            const svKeys = Object.keys(this.sv[0]);
            let max = 0;

            for (const row of this.sv) {
                let rowSum = 0;

                for (const key of svKeys) {
                    rowSum += Number(row[key] || 0);
                }

                const absSum = Math.abs(rowSum);

                if (absSum > max) {
                    max = absSum;
                }
            }
            this.maxSHAP = max;
        } else {
            this.maxSHAP = 0;
        }

        this.allFeatures = keys;

        create_data(this.allFeatures)
        // this.recomendedMerges = findInterestingMerges();

    }


    instanceDistribution = $derived.by(() => {
        const features = this.selectedFeatures.length > 0 ? this.selectedFeatures : this.allFeatures;

        if (!this.maxSHAP || this.maxSHAP === 0) return Array(10).fill(0);
        if (!this.sv || this.sv.length === 0) return Array(10).fill(0);

        const binSize = this.maxSHAP / 10;
        const bins = Array(10).fill(0);

        // Iterate over all instances
        for (const row of this.sv) {
            let sum = 0;
            for (const feature of features) {
                // Ensure we access the correct SHAP column
                // Assuming keys in sv are `shap_${feature}`
                const key = `shap_${feature}`;
                // If the key doesn't exist, we might need to handle it, but based on context it should.
                // However, simpler way might be to check if key exists or just map.
                // But let's stick to the assumption.
                sum += Number(row[key] || 0);
            }
            const absSum = Math.abs(sum);

            // Determine bin index
            let binIndex = Math.floor(absSum / binSize);
            // Clamp to last bin if equals max
            if (binIndex >= 10) binIndex = 9;

            bins[binIndex]++;
        }

        return bins;
    });

}

export let store = new Store();
