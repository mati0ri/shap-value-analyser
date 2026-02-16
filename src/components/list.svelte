<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";
    import { onMount, untrack } from "svelte";
    import { deleteMerge } from "../functions/create_data";
    import { renameMerge } from "../functions/create_data";
    import {
        create_data,
        cleanGhost,
        deleteFeature,
        renameFeature,
    } from "../functions/create_data";
    import { addButtonColumn } from "../utils/matrix/buttons";

    let container;

    let width = $state(500);
    let height = $state(650);
    let padding = 10;
    const rightMargin = 100; // Garder de l'espace a droite pour les boutons
    let scrollTop = 0;
    const ROW_HEIGHT = 35;
    let marginBottom = 0; // pixel perfect pour alignement avec le bas du graphe

    function handleScroll(event) {
        event.preventDefault();
        const maxScroll = Math.max(
            0,
            store.graph_data.filter((d) => !d.isGhost).length * ROW_HEIGHT -
                (height - padding),
        );
        scrollTop = Math.max(0, Math.min(maxScroll, scrollTop + event.deltaY));
        updateScroll();
    }

    // Use a variable to hold the update function for reactivity
    let updateScroll = () => {};

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

    function drawMatrix() {
        if (!data) return;

        // tri simple vs merge
        const simpleFeatures = data
            .filter((d) => !d.isMerge)
            .map((d) => d.feature);
        const mergeFeatures = data
            .filter((d) => d.isMerge)
            .map((d) => d.feature);

        const rowLabels = [...simpleFeatures, ...mergeFeatures];

        const n = rowLabels.length;
        const totalContentHeight = n * ROW_HEIGHT;

        d3.select(container).selectAll("*").remove();

        // Ajout du listener de scroll sur le container
        d3.select(container).on("wheel", handleScroll);

        const svg = d3
            .select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("position", "absolute")
            .style("top", "0")
            .style("left", "0");

        const matrixWidth = width - rightMargin;

        // band scales

        const y = d3
            .scaleBand()
            .domain(rowLabels)
            .range([0, totalContentHeight]);

        // color scale
        const minColor = "#007FFA";
        const midColor = "#FFFFFF";
        const maxColor = "#FF0047";

        const colorScale = d3
            .scaleLinear()
            .domain([-1, 0, 1])
            .range([minColor, midColor, maxColor]);

        // la zone de scrolling
        const clipHeight = Math.max(0, height - padding);
        svg.append("defs")
            .append("clipPath")
            .attr("id", "matrix-scroll-clip")
            .append("rect")
            .attr("x", 0)
            .attr("y", padding)
            .attr("width", width)
            .attr("height", clipHeight);

        // ########## SCROLLING BODY ##########
        const scrollBody = svg
            .append("g")
            .attr("class", "matrix-body")
            .attr("clip-path", "url(#matrix-scroll-clip)");

        const contentGroup = scrollBody.append("g");

        // Row Backgrounds (Group for easy selection)
        const rowGroups = contentGroup
            .append("g")
            .selectAll("g")
            .data(rowLabels)
            .join("g")
            .attr("transform", (d) => `translate(0, ${y(d)})`)
            .attr("cursor", "pointer")
            .on("click", (event, d) => {
                handleFeatureClick(d);
            })
            .on("mouseenter", (event, d) => {
                store.hoveredMatrix = [d];
            })
            .on("mouseleave", () => {
                store.hoveredMatrix = [];
            });

        rowGroups.append("title").text((d) => d);

        // Selection Background Rect
        rowGroups
            .append("rect")
            .attr("width", matrixWidth)
            .attr("height", ROW_HEIGHT)
            .attr("fill", "transparent")
            .attr("class", "selection-bg");

        // Hover Background Rect
        rowGroups
            .append("rect")
            .attr("width", matrixWidth)
            .attr("height", ROW_HEIGHT)
            .attr("fill", "transparent")
            .attr("class", "hover-bg");

        // Row Labels
        rowGroups
            .append("text")
            .attr("x", 10)
            .attr("y", ROW_HEIGHT / 2)
            .attr("dominant-baseline", "middle")
            .attr("text-anchor", "start")
            .attr("font-size", "15px")
            .text((d) => (d.length > 10 ? d.slice(0, 10) + "..." : d));

        // Drag Behavior
        rowGroups.call(
            d3
                .drag()
                .on("start", (event, d) => {
                    store.draggingFeature = d;
                    // Create a ghost element appended to body to escape overflow:hidden
                    const ghost = d3
                        .select("body")
                        .append("div")
                        .attr("class", "drag-ghost")
                        .style("position", "absolute")
                        .style("left", event.sourceEvent.pageX + "px")
                        .style("top", event.sourceEvent.pageY + "px")
                        .style("padding", "5px 10px")
                        .style("background", "white")
                        .style("border", "1px solid #ccc")
                        .style("border-radius", "4px")
                        .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
                        .style("pointer-events", "none") // Important for elementFromPoint
                        .style("z-index", 1000)
                        .text(d);
                })
                .on("drag", (event) => {
                    d3.select(".drag-ghost")
                        .style("left", event.sourceEvent.pageX + "px")
                        .style("top", event.sourceEvent.pageY + "px");
                })
                .on("end", (event, d) => {
                    store.draggingFeature = null;
                    d3.select(".drag-ghost").remove();

                    // Check drop
                    const dropTarget = document.elementFromPoint(
                        event.sourceEvent.pageX,
                        event.sourceEvent.pageY,
                    );

                    if (dropTarget) {
                        const dropZone = dropTarget.closest(".drop-zone");
                        if (dropZone) {
                            const zoneType =
                                dropZone.getAttribute("data-zone-type");
                            if (zoneType === "x") {
                                store.draggedFeatureX = d;
                                // If we start fresh x-axis, reset color axis?
                                // User said: "If a feature is already dragged on the x axis, allow dragging on the y axis"
                                // So we keep it flexible.
                            } else if (zoneType === "color") {
                                store.draggedFeatureY = d;
                            }
                        }
                    }
                }),
        );

        const buttonSize = 25;

        // Boutons hide / show
        addButtonColumn(contentGroup, rowLabels, {
            x: matrixWidth + 5,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => {
                toggleHidden(feature);
                drawMatrix();
            },
            getIcon: (d) =>
                store.hiddenFeatures.includes(d)
                    ? "/icones/eye-closed.svg"
                    : "/icones/eye-open.svg",
            getFill: (d) =>
                store.hiddenFeatures.includes(d)
                    ? "#b8b8b8"
                    : "var(--light-grey)",
        });

        // Boutons delete pour features simples
        addButtonColumn(contentGroup, simpleFeatures, {
            x: matrixWidth + buttonSize + 10,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => deleteFeature(feature),
            getIcon: "/icones/delete.svg",
        });

        // Boutons rename pour features simples
        addButtonColumn(contentGroup, simpleFeatures, {
            x: matrixWidth + 2 * buttonSize + 15,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => renameFeature(feature),
            getIcon: "/icones/rename.svg",
        });

        // Boutons delete pour merges
        addButtonColumn(contentGroup, mergeFeatures, {
            x: matrixWidth + buttonSize + 10,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => deleteMerge(feature),
            getIcon: "/icones/delete.svg",
        });

        // Boutons rename pour merges
        addButtonColumn(contentGroup, mergeFeatures, {
            x: matrixWidth + 2 * buttonSize + 15,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => renameMerge(feature),
            getIcon: "/icones/rename.svg",
        });

        // ligne de séparation simples / merges
        const separatorY =
            y(simpleFeatures[simpleFeatures.length - 1]) + y.bandwidth();

        contentGroup
            .append("line")
            .attr("x1", padding - 150)
            .attr("x2", matrixWidth + 140)
            .attr("y1", separatorY)
            .attr("y2", separatorY)
            .attr("stroke", store.colorStroke)
            .attr("stroke-width", 1)
            .attr("pointer-events", "none");

        if (mergeFeatures.length === 0) {
            contentGroup
                .append("text")
                .attr("x", 0)
                .attr("y", separatorY + ROW_HEIGHT / 2)
                .attr("dominant-baseline", "middle")
                .attr("text-anchor", "start")
                .attr("font-size", "12px")
                .attr("fill", "grey")
                .attr("font-style", "italic")
                .attr("class", "static-text")
                .text("merged features will appear here");
        }

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

        function updateHighlights() {
            const selectedFeatures = new Set(store.selectedFeatures || []);
            const hoveredFeatures = new Set([
                ...(store.hoveredGraph || []),
                ...(store.hoveredMatrix || []),
            ]);

            // check si un merge est hovered -> highlight ses enfants
            if (store.hoveredMatrix.length > 0) {
                const h = store.hoveredMatrix[0];
                const fm = data.find((d) => d.feature === h && d.isMerge);
                if (fm) {
                    fm.children.forEach((c) => hoveredFeatures.add(c));
                }
            }
            if (store.hoveredGraph.length > 0) {
                const h = store.hoveredGraph[0];
                const fm = data.find((d) => d.feature === h && d.isMerge);
                if (fm) {
                    fm.children.forEach((c) => hoveredFeatures.add(c));
                }
            }

            // check si un merge est selected -> highlight ses enfants
            data.filter((d) => d.isMerge).forEach((m) => {
                if (store.selectedFeatures.includes(m.feature)) {
                    m.children.forEach((c) => selectedFeatures.add(c));
                }
            });

            // Update Selection Backgrounds
            contentGroup
                .selectAll(".selection-bg")
                .attr("fill", (d) =>
                    selectedFeatures.has(d)
                        ? "rgba(199, 30, 255, 0.1)"
                        : "transparent",
                );

            // Update Hover Backgrounds
            contentGroup
                .selectAll(".hover-bg")
                .attr("fill", (d) =>
                    hoveredFeatures.has(d)
                        ? "rgba(200, 200, 200, 0.2)"
                        : "transparent",
                );

            // Update Text Color/Weight if needed (optional based on user request "whole row highlight")
            // Keeping text black but bold on selection might be nice, or just rely on bg
            contentGroup
                .selectAll("text:not(.static-text)")
                .attr("font-weight", "normal")
                .attr("fill", (d) =>
                    selectedFeatures.has(d)
                        ? store.colorSelectedStroke
                        : "black",
                );
        }

        function updateScrollLogic() {
            // Apply transform to content group
            contentGroup.attr(
                "transform",
                `translate(0, ${padding - scrollTop})`,
            );

            // Update Scrollbar Thumb
            const visibleRatio = clipHeight / totalContentHeight;
            if (visibleRatio >= 1) {
                scrollTrack.style("display", "none");
                scrollThumb.style("display", "none");
            } else {
                scrollTrack.style("display", "block");
                scrollThumb.style("display", "block");
                const thumbHeight = Math.max(20, clipHeight * visibleRatio);
                const scrollRange = totalContentHeight - clipHeight;
                const scrollRatio =
                    scrollRange > 0 ? scrollTop / scrollRange : 0;
                // thumb travel range
                const trackEffectiveHeight = clipHeight - thumbHeight;
                const thumbY = padding + scrollRatio * trackEffectiveHeight;

                scrollThumb.attr("y", thumbY).attr("height", thumbHeight);
            }
        }
        updateScroll = updateScrollLogic;

        // Add Scrollbar
        const scrollBarWidth = 6;
        const scrollTrack = svg
            .append("rect")
            .attr("x", width - 10)
            .attr("y", padding)
            .attr("width", scrollBarWidth)
            .attr("height", clipHeight)
            .attr("fill", "#f0f0f0")
            .attr("rx", 3);

        const scrollThumb = svg
            .append("rect")
            .attr("x", width - 10)
            .attr("width", scrollBarWidth)
            .attr("fill", "#ccc")
            .attr("rx", 3);

        // Initial update
        updateScroll();

        return {
            updateHighlights,
            updateHighlights,
        };
    }

    let matrixApi = null;

    onMount(() => {
        matrixApi = drawMatrix();
    });

    $effect(() => {
        if (!matrixApi) return;
        const _deps = [
            store.hoveredGraph,
            store.selectedFeatures,
            store.hoveredMatrix,
        ];
        matrixApi.updateHighlights();
    });

    $effect(() => {
        matrixApi = drawMatrix();
    });

    $effect(() => {
        // Monitor dataset changes to reset scroll
        // access it to track dependency
        const _ = store.datasetId;
        untrack(() => {
            scrollTop = 0;
            updateScroll();
        });
    });
</script>

<div
    class="matrix-wrapper"
    style="flex: 0 0 12%; height: 100%; min-width: 200px; display: flex; flex-direction: column; overflow: hidden; padding: 10px 0px 0 0px; box-sizing: border-box;"
>
    <div style="margin-bottom: 8px;">
        <span style="font-size: 16px; font-weight: bold; color: black;">
            {store.datasetName} :
        </span>
        <span style="font-size: 15px; font-weight: normal; color: black;">
            {store.raw_x.length} instances
        </span>
    </div>
    <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">
        Features
    </h3>
    <div
        bind:this={container}
        bind:clientWidth={width}
        bind:clientHeight={height}
        style="flex: 1; width: 100%; overflow: hidden; position: relative;"
    ></div>
</div>
