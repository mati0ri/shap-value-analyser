<script>
    import { store } from "../rune/store.svelte";
    import { cleanGhost, create_data } from "../functions/create_data";

    $inspect(store.filtered_graph_data);

    function handleMerge() {
        const selected = store.selectedFeatures;

        if (selected.length === 0) {
            console.log("Aucune feature sélectionnée.");
            return;
        }

        const uniqueSelected = [...new Set(selected)];

        const sortedSelected = [...uniqueSelected].sort();

        const alreadyExists = store.merges.some(
            (m) =>
                m.length === sortedSelected.length &&
                [...m].sort().every((v, i) => v === sortedSelected[i]),
        );

        if (alreadyExists) {
            console.log("Cette combinaison existe déjà.");
            return;
        }

        store.merges = [...store.merges, sortedSelected];

        create_data([sortedSelected]);

        store.selectedFeatures = [];

        console.log("Merge ajouté !");
    }

    function unselectAllFeatures() {
        store.selectedFeatures = [];
        cleanGhost();
    }

    function exportCSV() {
        const data = store.filtered_graph_data;
        if (!data || data.length === 0) return;

        const headers = [
            "feature",
            "feature_importance",
            "deterministic_effect",
            "direction",
        ];

        const csvRows = [
            headers.join(","),
            ...data.map((row) =>
                headers
                    .map((fieldName) => JSON.stringify(row[fieldName] || ""))
                    .join(","),
            ),
        ];

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "graph_data_export.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
</script>

<div class="footer">
    {#if store.selectedFeatures.length > 1}
        {#if store.isSelectedNew == true}
            <div>
                <button class="merge" onclick={handleMerge}>
                    <img src="/icones/merge.svg" alt="merge" class="icon" />
                    Merge {store.selectedFeatures.length} features
                </button>
            </div>
        {/if}
        <div>
            <button class="unselect" onclick={unselectAllFeatures}>
                <img src="/icones/unselect.svg" alt="unselect" class="icon" />
                Unselect all
            </button>
        </div>
    {:else}
        <p>Select 2 features or more to start merging</p>
    {/if}
    <div>
        <button
            class="unselect"
            onclick={(store.hideLabels = !store.hideLabels)}
        >
            {store.hideLabels ? "Show" : "Hide"} labels
        </button>
    </div>
    <div class="slider-container">
        <label for="pointSizeSlider">Point radius</label>
        <input
            id="pointSizeSlider"
            type="range"
            min="2"
            max="12"
            step="1"
            bind:value={store.pointSize}
        />
    </div>
    <div>
        <button class="export" onclick={exportCSV}>
            <img src="/icones/export.svg" alt="export" class="icon" />
            Export CSV
        </button>
    </div>
    <div>
        <button class="export" onclick={() => store.downloadGraphSvg()}>
            <img src="/icones/export.svg" alt="export" class="icon" />
            Export SVG
        </button>
    </div>
</div>

<style>
    .footer {
        height: 100px;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 30px;
    }

    button.merge {
        background-color: #999999;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 14px;
    }

    button.merge:hover {
        background-color: #777777;
    }

    button.unselect {
        background-color: white; /* gris */
        color: #999999;
        border: 2px solid #999999;
        border-radius: 5px; /* pas d'arrondi */
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 14px;
    }

    button.unselect:hover {
        background-color: #eeeeee;
    }

    .icon {
        width: 16px;
        height: 16px;
    }

    .slider-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 14px;
    }

    button.export {
        background-color: white; /* gris */
        color: #999999;
        border: 2px solid #999999;
        border-radius: 5px; /* pas d'arrondi */
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 14px;
    }

    button.export:hover {
        background-color: #eeeeee;
    }
</style>
