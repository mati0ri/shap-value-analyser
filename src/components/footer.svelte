<script>
    import { store } from "../rune/store.svelte";
    import { cleanGhost, create_data } from "../functions/create_data";

    $inspect(store.filtered_graph_data);

    function handleMerge() {
        const selected = store.selectedFeatures;

        if (selected.length <= 1) {
            alert("Au moins 2 features doivent être sélectionnées.");
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
            alert("Cette combinaison existe déjà.");
            return;
        }

        store.merges = [...store.merges, sortedSelected];

        create_data([sortedSelected]);

        store.selectedFeatures = [];
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
    function handleKeydown(event) {
        if (
            document.activeElement.tagName === "INPUT" ||
            document.activeElement.tagName === "TEXTAREA"
        ) {
            return;
        }

        const key = event.key.toLowerCase();

        if (key === "m") {
            handleMerge();
        } else if (key === "u") {
            unselectAllFeatures();
        } else if (key === "c") {
            exportCSV();
        } else if (key === "s") {
            store.downloadGraphSvg();
        } else if (key === "h") {
            store.hideLabels = !store.hideLabels;
        }
    }
    let selectedUnique = $derived([...new Set(store.selectedFeatures)]);
    let sortedSelected = $derived([...selectedUnique].sort());
    let mergeExists = $derived(
        store.merges.some(
            (m) =>
                m.length === sortedSelected.length &&
                [...m].sort().every((v, i) => v === sortedSelected[i]),
        ),
    );

    let canMerge = $derived(selectedUnique.length >= 2 && !mergeExists);
    let canUnselect = $derived(store.selectedFeatures.length > 0);

    let showShortcuts = $state(false);
    let showAxesInfo = $state(false);

    function toggleShortcuts() {
        showShortcuts = !showShortcuts;
        if (showShortcuts) showAxesInfo = false;
    }

    function toggleAxesInfo() {
        showAxesInfo = !showAxesInfo;
        if (showAxesInfo) showShortcuts = false;
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="toolbar">
    <!-- Section 1: Selection -->
    <div class="toolbar-section">
        <div class="section-header">
            <img src="/icones/selection.svg" alt="" class="section-icon" />
            <span class="section-title">Selection</span>
        </div>
        <div class="toolbar-group">
            <button
                class="toolbar-btn primary"
                onclick={handleMerge}
                title={canMerge
                    ? "Merge features (m)"
                    : "Select 2+ features to merge"}
                disabled={!canMerge}
            >
                <svg
                    viewBox="-4 -2 24 24"
                    class="icon"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M9.033 5.817v2.028c0 .074-.003.148-.008.221a1 1 0 0 0 .462.637l3.086 1.846a3 3 0 0 1 1.46 2.575v1.059a3.001 3.001 0 1 1-2-.024v-1.035a1 1 0 0 0-.487-.858L8.46 10.42a3 3 0 0 1-.444-.324 3 3 0 0 1-.443.324l-3.086 1.846a1 1 0 0 0-.487.858v1.047a3.001 3.001 0 1 1-2 0v-1.047a3 3 0 0 1 1.46-2.575l3.086-1.846a1 1 0 0 0 .462-.637A3.006 3.006 0 0 1 7 7.845V5.829a3.001 3.001 0 1 1 2.033-.012z"
                    />
                </svg>
                <span>Merge ({store.selectedFeatures.length})</span>
            </button>
            <button
                class="toolbar-btn"
                onclick={unselectAllFeatures}
                title="Unselect all (u)"
                disabled={!canUnselect}
            >
                <img src="/icones/unselect.svg" alt="unselect" class="icon" />
                <span>Unselect</span>
            </button>
        </div>
    </div>

    <div class="separator"></div>

    <!-- Section 2: Display -->
    <div class="toolbar-section">
        <div class="section-header">
            <img src="/icones/display.svg" alt="" class="section-icon" />
            <span class="section-title">Display</span>
        </div>
        <div class="toolbar-group">
            <button
                class="toolbar-btn"
                onclick={() => (store.hideLabels = !store.hideLabels)}
                title="Toggle Labels (h)"
            >
                <img
                    src={store.hideLabels
                        ? "/icones/eye-closed.svg"
                        : "/icones/eye-open.svg"}
                    alt={store.hideLabels ? "Hidden" : "Visible"}
                    class="icon"
                />
                <span>Labels</span>
            </button>

            <div class="slider-container">
                <label for="graphWidthSlider">Width</label>
                <input
                    id="graphWidthSlider"
                    type="range"
                    min="25"
                    max="75"
                    step="5"
                    bind:value={store.graphWidthPercentage}
                />
            </div>

            <div class="slider-container">
                <label for="pointSizeSlider">Radius</label>
                <input
                    id="pointSizeSlider"
                    type="range"
                    min="2"
                    max="12"
                    step="1"
                    bind:value={store.pointSize}
                />
            </div>
        </div>
    </div>

    <div class="separator"></div>

    <!-- Section 3: Export -->
    <div class="toolbar-section">
        <div class="section-header">
            <img src="/icones/data-transfer.svg" alt="" class="section-icon" />
            <span class="section-title">Export</span>
        </div>
        <div class="toolbar-group">
            <button
                class="toolbar-btn"
                onclick={exportCSV}
                title="Export CSV (c)"
            >
                <img src="/icones/table.svg" alt="export csv" class="icon" />
                <span>CSV</span>
            </button>
            <button
                class="toolbar-btn"
                onclick={() => store.downloadGraphSvg()}
                title="Export SVG (s)"
            >
                <img
                    src="/icones/graph-icon.svg"
                    alt="export svg"
                    class="icon"
                />
                <span>SVG</span>
            </button>
        </div>
    </div>

    <div class="separator"></div>

    <!-- Section 4: Help -->
    <div class="toolbar-section" style="position: relative;">
        <div class="section-header">
            <img src="/icones/help.svg" alt="" class="section-icon" />
            <span class="section-title">Help</span>
        </div>
        <div class="toolbar-group">
            <button
                class="toolbar-btn"
                onclick={toggleAxesInfo}
                title="Axis Description"
                class:active={showAxesInfo}
            >
                <img src="/icones/axis.svg" alt="axis" class="icon" />
                <span>Axis</span>
            </button>
            <button
                class="toolbar-btn"
                onclick={toggleShortcuts}
                title="Keyboard Shortcuts"
                class:active={showShortcuts}
            >
                <img src="/icones/keyboard.svg" alt="keyboard" class="icon" />
                <span>Shortcuts</span>
            </button>
        </div>

        {#if showAxesInfo}
            <div class="dropdown-content axes-info">
                <div class="info-item">
                    <strong>Axis 1 – Feature importance:</strong> Measures how much
                    a feature contributes on average to the model’s output. The concept
                    is the same as the bar plot or any other feature importance score.
                    The more the value increases, the more the feature has an influence
                    on predictions.
                </div>
                <div class="info-item">
                    <strong>Axis 2 – Deterministic effect:</strong> This metric quantifies
                    the degree to which the value of the feature is connected to
                    its effect on predictions. A high score means that the effect
                    varies systematically with the value (strong, deterministic link),
                    while a low score indicates a random or inconsistent influence.
                </div>
                <div class="info-item">
                    <strong>Axis 3 – Direction:</strong> Captures whether a feature's
                    value tends to increase or decrease predictions. Positive values
                    indicate that a high feature value tends to increase the predicted
                    value and a low feature value tends to decrease the prediction
                    value; negative values indicates that a high feature value tends
                    to decrease the predicted value and a low feature value tends
                    to increase the prediction value.
                </div>
            </div>
        {/if}

        {#if showShortcuts}
            <div class="dropdown-content">
                <div class="shortcut-item">
                    <span class="key">M</span>
                    <span class="desc">Merge features</span>
                </div>
                <div class="shortcut-item">
                    <span class="key">U</span>
                    <span class="desc">Unselect all</span>
                </div>
                <div class="shortcut-item">
                    <span class="key">H</span>
                    <span class="desc">Toggle labels</span>
                </div>
                <div class="shortcut-item">
                    <span class="key">C</span>
                    <span class="desc">Export CSV</span>
                </div>
                <div class="shortcut-item">
                    <span class="key">S</span>
                    <span class="desc">Export SVG</span>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .toolbar {
        width: 100%;
        height: auto;
        min-height: 56px; /* Increased slightly for labels */
        background-color: #f3f2f1; /* Microsoft light grey */
        border-bottom: 1px solid #e1dfdd;
        display: flex;
        align-items: center; /* Vertically center the sections */
        padding: 4px 16px;
        gap: 8px;
        font-family:
            "Segoe UI",
            "Segoe UI Web (West European)",
            -apple-system,
            BlinkMacSystemFont,
            Roboto,
            "Helvetica Neue",
            sans-serif;
        font-size: 14px;
        color: #201f1e;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .toolbar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 4px;
        padding-bottom: 2px;
    }

    .section-icon {
        width: 12px;
        height: 12px;
        opacity: 0.7;
    }

    .section-title {
        font-size: 11px;
        line-height: 1;
        color: #605e5c;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    /* Standard Toolbar Button */
    .toolbar-btn {
        background-color: transparent; /* Flat style */
        border: 1px solid transparent; /* Reserve space for border */
        border-radius: 2px;
        padding: 6px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: #323130;
        transition: all 0.1s ease-in-out;
        white-space: nowrap;
        font-size: 14px;
    }

    .toolbar-btn:hover {
        background-color: #edebe9; /* Hover grey */
        color: #201f1e;
    }

    .toolbar-btn:active {
        background-color: #e1dfdd; /* Active grey */
    }

    .toolbar-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
    }

    /* Primary Action (Merge) - Optional: Make it stand out slightly or keep flat */
    .toolbar-btn.primary {
        /* font-weight: 600; */
        color: var(--primary-color, #0078d4);
    }
    .toolbar-btn.primary:hover {
        background-color: #eff6fc; /* Light blue tint for primary */
    }

    .icon {
        width: 16px;
        height: 16px;
        display: block;
    }

    .text-icon {
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        color: #605e5c;
    }

    .toolbar-info {
        padding: 0 8px;
        color: #605e5c;
        display: flex;
        align-items: center;
        gap: 6px;
        font-style: italic;
    }

    .info-icon {
        font-style: normal;
    }

    /* Separator */
    .separator {
        width: 1px;
        height: 32px; /* Increased height to match section height */
        background-color: #c8c6c4;
        margin: 0 8px;
        align-self: center;
    }

    /* Slider styling to fit toolbar */
    .slider-container {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 8px;
        border-radius: 2px;
    }

    .slider-container:last-child {
        border-right: none;
    }

    .slider-container label {
        font-size: 13px;
        color: #323130;
        white-space: nowrap;
    }

    input[type="range"] {
        height: 4px;
        width: 80px;
        border-radius: 2px;
        accent-color: var(--primary-color, #0078d4);
        cursor: pointer;
    }

    /* Dropdowns */
    .dropdown-content {
        position: absolute;
        top: 100%;
        left: 0;
        background-color: white;
        border: 1px solid #e1dfdd;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        padding: 8px;
        z-index: 1000;
        min-width: 180px;
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        text-align: left;
    }

    .dropdown-content.axes-info {
        min-width: 300px;
        width: 400px; /* Wider for text */
        right: 0; /* Align right if it gets too wide to left, but here relative to Help section which is far right, so maybe align right edge? */
        left: auto;
        right: 0;
    }

    .info-item {
        font-size: 13px;
        line-height: 1.4;
        color: #323130;
        margin-bottom: 8px;
    }

    .info-item:last-child {
        margin-bottom: 0;
    }

    .shortcut-item {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        color: #323130;
        padding: 4px;
    }

    .key {
        display: inline-block;
        min-width: 24px;
        height: 24px;
        line-height: 24px;
        text-align: center;
        background-color: #f3f2f1;
        border: 1px solid #c8c6c4;
        border-radius: 4px;
        font-family: monospace;
        font-weight: 600;
        font-size: 12px;
        color: #201f1e;
        text-transform: uppercase;
    }

    .desc {
        flex: 1;
    }

    .toolbar-btn.active {
        background-color: #e1dfdd;
    }
</style>
