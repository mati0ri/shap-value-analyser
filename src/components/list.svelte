<script>
    import { store } from "../rune/store.svelte";
    import { untrack } from "svelte";
    import { deleteMerge, renameMerge } from "../functions/create_data";
    import {
        create_data,
        cleanGhost,
        deleteFeature,
        renameFeature,
    } from "../functions/create_data";

    let container;

    // Remove D3 width/height logic, rely on CSS flex
    // let width = $state(550);
    // let height = $state(650);

    function toggleHidden(feature) {
        const hidden = store.hiddenFeatures;
        const i = hidden.indexOf(feature);

        if (i === -1) {
            hidden.push(feature);
        } else {
            hidden.splice(i, 1);
        }
    }

    const data = $derived.by(() => store.graph_data.filter((d) => !d.isGhost));

    // Split data into simple and merge features for ordered rendering if needed
    // The original logic sorted: simple features then merge features.
    // Let's preserve that order.
    const simpleFeatures = $derived(data.filter((d) => !d.isMerge));
    const mergeFeatures = $derived(data.filter((d) => d.isMerge));

    // Combine them to iterate easily or iterate separately to insert the separator
    // Actually, iterating separately allows easier insertion of the separator line.

    function handleFeatureClick(featureName) {
        const selected = store.selectedFeatures;
        const f = data.find((x) => x.feature === featureName);

        if (!f) {
            const i = selected.indexOf(featureName);
            i === -1 ? selected.push(featureName) : selected.splice(i, 1);
        } else {
            if (f.isMerge) {
                f.children.forEach((child) => {
                    if (!selected.includes(child)) selected.push(child);
                });
            } else {
                const i = selected.indexOf(f.feature);
                i === -1 ? selected.push(f.feature) : selected.splice(i, 1);
            }
        }

        if (selected.length >= 2) {
            create_data([selected], true);
        } else {
            cleanGhost();
        }
    }

    // Drag Handlers
    function handleDragStart(event, featureName) {
        event.dataTransfer.setData("text/plain", featureName);
        event.dataTransfer.setData("application/visu-axis", "list"); // Mark source as list
        event.dataTransfer.effectAllowed = "copy";

        // Create custom helper for visual feedback
        const helper = document.createElement("div");
        helper.id = "list-drag-helper";
        helper.innerText = featureName;
        helper.style.position = "fixed";
        helper.style.background = "white";
        helper.style.padding = "5px";
        helper.style.border = "1px solid #ccc";
        helper.style.borderRadius = "4px";
        helper.style.fontWeight = "bold";
        helper.style.zIndex = "9999";
        helper.style.pointerEvents = "none";
        // Initial position
        helper.style.left = event.clientX + "px";
        helper.style.top = event.clientY + "px";
        document.body.appendChild(helper);

        // Hide default ghost
        const emptyImg = new Image();
        emptyImg.src =
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        event.dataTransfer.setDragImage(emptyImg, 0, 0);

        // We can't set cursor on the element itself during drag easily with native DnD
        // because the browser controls it, but we can try setting body cursor or rely on drop zones.
    }

    function handleDrag(event) {
        if (event.clientX === 0 && event.clientY === 0) return; // Ignore invalid end events

        const helper = document.getElementById("list-drag-helper");
        if (helper) {
            helper.style.left = event.clientX + 10 + "px";
            helper.style.top = event.clientY + 10 + "px";

            // Visual feedback
            const target = document.elementFromPoint(
                event.clientX,
                event.clientY,
            );
            if (
                target &&
                (target.closest(".x-axis-drop") ||
                    target.closest(".y-axis-drop"))
            ) {
                helper.style.border = "2px solid #4CAF50"; // Green border
            } else {
                helper.style.border = "1px solid #ccc";
            }
        }
    }

    function handleDragEnd(event) {
        const helper = document.getElementById("list-drag-helper");
        if (helper) {
            document.body.removeChild(helper);
        }
    }

    function handleMouseEnter(featureName) {
        store.hoveredMatrix = [featureName];
    }

    function handleMouseLeave() {
        store.hoveredMatrix = [];
    }

    // Reset scroll position when dataset changes
    $effect(() => {
        const _ = store.datasetId; // Dependency to trigger effect
        untrack(() => {
            if (container) {
                container.scrollTop = 0;
            }
        });
    });
</script>

<div class="matrix-wrapper">
    <div class="header-info">
        <span class="dataset-name">
            {store.datasetName} dataset :
        </span>
        <span class="instance-count">
            {store.raw_x.length} instances
        </span>
    </div>
    <h3 class="features-title">Features</h3>

    <div class="list-container" bind:this={container}>
        <!-- Simple Features -->
        {#each simpleFeatures as item (item.feature)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="list-row"
                class:selected={store.selectedFeatures.includes(item.feature)}
                class:hovered={store.hoveredMatrix.includes(item.feature) ||
                    store.hoveredGraph.includes(item.feature)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, item.feature)}
                ondrag={(e) => handleDrag(e)}
                ondragend={(e) => handleDragEnd(e)}
                onclick={() => handleFeatureClick(item.feature)}
                onmouseenter={() => handleMouseEnter(item.feature)}
                onmouseleave={handleMouseLeave}
            >
                <div class="row-bg"></div>
                <span class="feature-name">{item.feature}</span>

                <div class="button-group">
                    <!-- Hide/Show -->
                    <button
                        class="icon-btn"
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleHidden(item.feature);
                        }}
                        title={store.hiddenFeatures.includes(item.feature)
                            ? "Show"
                            : "Hide"}
                    >
                        <img
                            src={store.hiddenFeatures.includes(item.feature)
                                ? "/icones/eye-closed.svg"
                                : "/icones/eye-open.svg"}
                            alt="visibility"
                            style="opacity: {store.hiddenFeatures.includes(
                                item.feature,
                            )
                                ? 0.5
                                : 1}"
                        />
                    </button>

                    <!-- Delete -->
                    <button
                        class="icon-btn"
                        onclick={(e) => {
                            e.stopPropagation();
                            deleteFeature(item.feature);
                        }}
                        title="Delete"
                    >
                        <img src="/icones/delete.svg" alt="delete" />
                    </button>

                    <!-- Rename -->
                    <button
                        class="icon-btn"
                        onclick={(e) => {
                            e.stopPropagation();
                            renameFeature(item.feature);
                        }}
                        title="Rename"
                    >
                        <img src="/icones/rename.svg" alt="rename" />
                    </button>
                </div>
            </div>
        {/each}

        <!-- Separator -->
        <div class="separator-container">
            <div class="separator-line"></div>
            {#if mergeFeatures.length === 0}
                <span class="separator-text"
                    >merged features will appear here</span
                >
            {/if}
        </div>

        <!-- Merge Features -->
        {#each mergeFeatures as item (item.feature)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="list-row"
                class:selected={item.children.every((c) =>
                    store.selectedFeatures.includes(c),
                )}
                class:hovered={store.hoveredMatrix.includes(item.feature) ||
                    store.hoveredGraph.includes(item.feature)}
                draggable="true"
                ondragstart={(e) => handleDragStart(e, item.feature)}
                onclick={() => handleFeatureClick(item.feature)}
                onmouseenter={() => handleMouseEnter(item.feature)}
                onmouseleave={handleMouseLeave}
            >
                <div class="row-bg"></div>
                <span class="feature-name">{item.feature}</span>

                <div class="button-group">
                    <!-- Hide/Show -->
                    <button
                        class="icon-btn"
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleHidden(item.feature);
                        }}
                        title={store.hiddenFeatures.includes(item.feature)
                            ? "Show"
                            : "Hide"}
                    >
                        <img
                            src={store.hiddenFeatures.includes(item.feature)
                                ? "/icones/eye-closed.svg"
                                : "/icones/eye-open.svg"}
                            alt="visibility"
                            style="opacity: {store.hiddenFeatures.includes(
                                item.feature,
                            )
                                ? 0.5
                                : 1}"
                        />
                    </button>

                    <!-- Delete Merge -->
                    <button
                        class="icon-btn"
                        onclick={(e) => {
                            e.stopPropagation();
                            deleteMerge(item.feature);
                        }}
                        title="Delete Merge"
                    >
                        <img src="/icones/delete.svg" alt="delete" />
                    </button>

                    <!-- Rename Merge -->
                    <button
                        class="icon-btn"
                        onclick={(e) => {
                            e.stopPropagation();
                            renameMerge(item.feature);
                        }}
                        title="Rename Merge"
                    >
                        <img src="/icones/rename.svg" alt="rename" />
                    </button>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .matrix-wrapper {
        flex: 0 0 20%;
        height: 100%;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 10px 0px 0 0px;
        box-sizing: border-box;
    }

    .header-info {
        margin-bottom: 8px;
    }

    .dataset-name {
        font-size: 16px;
        font-weight: bold;
        color: black;
    }

    .instance-count {
        font-size: 15px;
        font-weight: normal;
        color: black;
    }

    .features-title {
        margin: 0 0 10px 0;
        font-size: 16px;
        font-weight: bold;
    }

    .list-container {
        flex: 1;
        width: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        position: relative;
    }

    .list-row {
        height: 40px;
        display: flex;
        align-items: center;
        padding-left: 20px; /* Indent text */
        cursor: grab;
        position: relative;
        user-select: none;
        -webkit-user-select: none;
    }

    .list-row:active {
        cursor: grabbing;
    }

    /* Backgrounds */
    .row-bg {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
        transition: background-color 0.1s;
    }

    .list-row.selected .row-bg {
        background-color: rgba(199, 30, 255, 0.1);
    }

    .list-row.hovered .row-bg {
        background-color: rgba(200, 200, 200, 0.2);
    }

    /* Text */
    .feature-name {
        font-size: 15px;
        color: black;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none; /* Let clicks pass through to row */
    }

    .list-row.selected .feature-name {
        color: #d451fc; /* store.colorSelectedStroke */
        /* font-weight: bold; */
    }

    /* Buttons */
    .button-group {
        display: flex;
        align-items: center;
        margin-right: 15px;
    }

    .icon-btn {
        background: transparent; /* Light grey or transparent */
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        margin-left: 5px;
    }

    .icon-btn:hover {
        background-color: #d1d1d1;
    }

    .icon-btn img {
        width: 20px;
        height: 20px;
        pointer-events: none;
    }

    /* Separator */
    .separator-container {
        position: relative;
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 20px;
    }

    .separator-line {
        position: absolute;
        left: 0; /* padding - 150 logic from before? Just full width is cleaner */
        right: 0;
        top: 50%;
        height: 1px;
        background-color: #a1a1a1; /* store.colorStroke */
        z-index: -1;
    }

    .separator-text {
        background: var(--background-color, white); /* Cover line behind text */
        padding-right: 10px;
        font-size: 14px;
        color: grey;
        font-style: italic;
    }
</style>
