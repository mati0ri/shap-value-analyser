<script>
    import { store } from "../rune/store.svelte";
    import { cleanGhost, create_data } from "../functions/create_data";

    function handleMerge() {
        const selected = store.selectedFeatures;

        if (selected.length <= 1) {
            alert("At least 2 features must be selected.");
            return;
        }

        if (mergeExists) {
            alert("This combination already exists.");
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

    function handleKeyboardShortcuts(event) {
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
        } else if (key === "l") {
            store.isLassoActive = !store.isLassoActive;
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
    let showDataset = $state(false);

    function toggleShortcuts() {
        showShortcuts = !showShortcuts;
        if (showShortcuts) {
            showAxesInfo = false;
            showDataset = false;
        }
    }

    function toggleAxesInfo() {
        showAxesInfo = !showAxesInfo;
        if (showAxesInfo) {
            showShortcuts = false;
            showDataset = false;
        }
    }

    function toggleDataset() {
        showDataset = !showDataset;
        if (showDataset) {
            showShortcuts = false;
            showAxesInfo = false;
        }
    }

    async function loadStudy(studyName) {
        showDataset = false;
        try {
            const res = await fetch(`/api/study?study=${studyName}`);
            if (!res.ok) throw new Error("Failed to load study");

            const data = await res.json();
            store.initialize(data, studyName);
        } catch (err) {
            console.error(err);
            alert("Error loading study: " + err.message);
        }
    }
</script>

<svelte:window onkeydown={handleKeyboardShortcuts} />

<div class="toolbar">
    <!-- Section Dataset -->
    <div class="toolbar-section" style="position: relative;">
        <div class="section-header">
            <img src="/icones/study.svg" alt="" class="section-icon" />
            <span class="section-title">Dataset</span>
        </div>
        <div class="toolbar-group">
            <button
                class="toolbar-btn"
                onclick={() => (store.isUploadPopupOpen = true)}
                title="Upload Dataset"
            >
                <img src="/icones/upload.svg" alt="import" class="icon" />
                <span>Upload</span>
            </button>
            <button
                class="toolbar-btn"
                onclick={toggleDataset}
                title="Select Example Dataset"
                class:active={showDataset}
            >
                <img src="/icones/table.svg" alt="demos" class="icon" />
                <span>Examples</span>
            </button>
        </div>

        {#if showDataset}
            <div class="dropdown-content">
                <button
                    class="shortcut-item"
                    style="width: 100%; text-align:left; background:none; border:none; cursor:pointer;"
                    onclick={() =>
                        loadStudy("Bio-allFeatures-withoutHumanFootprints")}
                >
                    <img src="/icones/file.svg" alt="demo" class="icon" />
                    <span class="desc">Bio</span>
                </button>
                <button
                    class="shortcut-item"
                    style="width: 100%; text-align:left; background:none; border:none; cursor:pointer;"
                    onclick={() => loadStudy("Titanic")}
                >
                    <img src="/icones/file.svg" alt="demo" class="icon" />
                    <span class="desc">Titanic</span>
                </button>
                <button
                    class="shortcut-item"
                    style="width: 100%; text-align:left; background:none; border:none; cursor:pointer;"
                    onclick={() => loadStudy("Bio10")}
                >
                    <img src="/icones/file.svg" alt="demo" class="icon" />
                    <span class="desc">Bio10</span>
                </button>
                <button
                    class="shortcut-item"
                    style="width: 100%; text-align:left; background:none; border:none; cursor:pointer;"
                    onclick={() => loadStudy("Bio100-10")}
                >
                    <img src="/icones/file.svg" alt="demo" class="icon" />
                    <span class="desc">Bio100-10</span>
                </button>
                <button
                    class="shortcut-item"
                    style="width: 100%; text-align:left; background:none; border:none; cursor:pointer;"
                    onclick={() => loadStudy("Test")}
                >
                    <img src="/icones/file.svg" alt="demo" class="icon" />
                    <span class="desc">Test</span>
                </button>
                <button
                    class="shortcut-item"
                    style="width: 100%; text-align:left; background:none; border:none; cursor:pointer;"
                    onclick={() => loadStudy("California")}
                >
                    <img src="/icones/file.svg" alt="demo" class="icon" />
                    <span class="desc">California</span>
                </button>
                <button
                    class="shortcut-item"
                    style="width: 100%; text-align:left; background:none; border:none; cursor:pointer;"
                    onclick={() => loadStudy("Turnover")}
                >
                    <img src="/icones/file.svg" alt="demo" class="icon" />
                    <span class="desc">Turnover</span>
                </button>
            </div>
        {/if}
    </div>

    <div class="separator"></div>

    <!-- Section Selection -->
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
            <button
                class="toolbar-btn"
                onclick={() => (store.isLassoActive = !store.isLassoActive)}
                title="Toggle Lasso Selection (l)"
                class:active={store.isLassoActive}
            >
                <img src="/icones/lasso.svg" alt="lasso" class="icon" />
                <span>Lasso</span>
            </button>
        </div>
    </div>

    <div class="separator"></div>

    <!-- Section Display -->
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
                <label for="pointSizeSlider">Radius</label>
                <input
                    id="pointSizeSlider"
                    type="range"
                    min="5"
                    max="15"
                    step="1"
                    bind:value={store.pointSize}
                />
            </div>

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

            <div class="separator-small"></div>

            <div class="mode-toggle">
                <span
                    class="mode-label"
                    class:active={!store.expertMode}
                    onclick={() => (store.expertMode = false)}
                    title="Classic">Monotonic</span
                >
                <div
                    class="toggle-switch"
                    onclick={() => (store.expertMode = !store.expertMode)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) =>
                        (e.key === "Enter" || e.key === " ") &&
                        (store.expertMode = !store.expertMode)}
                >
                    <div
                        class="toggle-thumb"
                        class:active={store.expertMode}
                    ></div>
                </div>
                <span
                    class="mode-label"
                    class:active={store.expertMode}
                    onclick={() => (store.expertMode = true)}
                    title="Expert">Linear</span
                >
            </div>
        </div>
    </div>

    <div class="separator"></div>

    <!-- Section Export -->
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
                <img src="/icones/graph.svg" alt="export svg" class="icon" />
                <span>SVG</span>
            </button>
        </div>
    </div>

    <div class="separator"></div>

    <!-- Section Help -->
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
                    <span class="key">L</span>
                    <span class="desc">Toggle Lasso</span>
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
        height: auto;
        min-height: 56px;
        background-color: var(--light-grey);
        border-bottom: 1px solid #d1d1d1;
        display: flex;
        align-items: center;
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
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    }

    .toolbar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
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

    .toolbar-btn {
        background-color: transparent;
        border: 1px solid transparent;
        border-radius: 4px;
        padding: 5px 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        color: #323130;
        transition: all 0.1s ease-in-out;
        white-space: nowrap;
    }

    .toolbar-btn:hover {
        background-color: #d8d8d8;
    }

    .toolbar-btn:active {
        background-color: #c6c6c6;
    }

    .toolbar-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
    }

    .toolbar-btn.primary {
        background-color: var(--primary-color);
        color: white;
        border-color: transparent;
    }
    .toolbar-btn.primary:hover {
        background-color: var(--primary-color);
        opacity: 0.65;
        color: white;
    }

    .icon {
        width: 16px;
        height: 16px;
        display: block;
    }

    .separator {
        width: 1px;
        height: 32px;
        background-color: #c8c6c4;
        margin: 0 8px;
        align-self: center;
    }

    .separator-small {
        width: 1px;
        height: 20px;
        background-color: #c8c6c4;
        margin: 0 4px;
        align-self: center;
    }

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
        color: #323130;
        white-space: nowrap;
        position: relative;
        top: -1px;
    }

    input[type="range"] {
        height: 4px;
        width: 80px;
        border-radius: 2px;
        accent-color: var(--primary-color);
        cursor: pointer;
    }

    .dropdown-content {
        position: absolute;
        top: 100%;
        left: 0;
        background-color: rgb(244, 244, 244);
        border: 1px solid #e1dfdd;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        padding: 8px;
        z-index: 1000;
        min-width: 180px;
        margin-bottom: 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        text-align: left;

        transform-origin: bottom left;
        animation: slideIn 0.15s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(5px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .dropdown-content button:hover,
    .shortcut-item:hover {
        background-color: var(--light-grey);
        border-radius: 2px;
    }

    .dropdown-content.axes-info {
        min-width: 300px;
        width: 400px;
        right: 0;
        left: auto;
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
        padding: 6px 8px;
        cursor: pointer;
        transition: background-color 0.1s ease;
    }

    .key {
        display: inline-block;
        min-width: 24px;
        height: 24px;
        line-height: 24px;
        text-align: center;
        background-color: var(--light-grey);
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
        background-color: #c6c6c6;
    }

    .mode-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 8px;
    }

    .mode-label {
        color: #999999;
        cursor: pointer;
        transition: color 0.2s;
        text-align: center;
        position: relative;
        top: -1px;
    }

    .mode-label.active {
        color: #201f1e;
    }

    .toggle-switch {
        width: 36px;
        height: 20px;
        background-color: #c5c5c5;
        border-radius: 10px;
        position: relative;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .toggle-switch:hover {
        background-color: #a19f9d;
    }

    .toggle-thumb {
        width: 16px;
        height: 16px;
        background-color: white;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.2s;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .toggle-thumb.active {
        transform: translateX(16px);
    }
</style>
