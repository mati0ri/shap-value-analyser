<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";
    import { onMount } from "svelte";
    import { deleteMerge } from "../functions/create_data";
    import { renameMerge } from "../functions/create_data";
    import {
        create_data,
        cleanGhost,
        deleteFeature,
        renameFeature,
    } from "../functions/create_data";

    let container;

    let width = $state(550);
    let height = $state(650);
    let padding = 100;
    const rightMargin = 125; // Reserve space for buttons
    let scrollTop = 0;
    const ROW_HEIGHT = 40;
    let marginBottom = 49; // Adjustable margin bottom

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
        const colLabels = [...simpleFeatures];

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
        const x = d3
            .scaleBand()
            .domain(colLabels)
            .range([padding, matrixWidth]);
        // Y scale is now purely calculation based, not range based on height
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

        // DEFINE CLIPPING PATH for the scrolling body
        // The clipping area starts at `padding` (below headers) and goes down to `height`
        const clipHeight = Math.max(0, height - padding);
        svg.append("defs")
            .append("clipPath")
            .attr("id", "matrix-scroll-clip")
            .append("rect")
            .attr("x", 0)
            .attr("y", padding)
            .attr("width", width)
            .attr("height", clipHeight);

        // ########## HEADERS (Fixed) ##########
        const headerGroup = svg.append("g").attr("class", "matrix-headers");

        // Labels colonnes
        headerGroup
            .append("g")
            .attr("transform", `translate(0, ${padding - 8})`)
            .selectAll("text")
            .data(colLabels)
            .join("text")
            .attr("x", (d) => x(d) + x.bandwidth() / 2)
            .attr("y", 0)
            .attr("font-size", "15px")
            .attr("text-anchor", "start")
            .attr("transform", (d) => {
                const xPos = x(d) + x.bandwidth() / 2;
                return `rotate(-45, ${xPos}, 0)`;
            })
            .text((d) => d)
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

        // ########## SCROLLING BODY ##########
        const scrollBody = svg
            .append("g")
            .attr("class", "matrix-body")
            .attr("clip-path", "url(#matrix-scroll-clip)");

        // The inner group that actually moves
        const contentGroup = scrollBody.append("g");

        // Labels lignes
        contentGroup
            .append("g")
            .attr("transform", `translate(${padding - 8}, 0)`)
            .selectAll("text")
            .data(rowLabels)
            .join("text")
            .attr("x", 0)
            .attr("y", (d) => y(d) + y.bandwidth() / 2 + 4)
            .attr("text-anchor", "end")
            .attr("font-size", "15px")
            .text((d) => (d.length > 7 ? d.slice(0, 7) + "..." : d))
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

        const buttonSize = 30;

        // Boutons hide / show (pour simples + merges)
        contentGroup
            .append("g")
            .selectAll("g")
            .data(rowLabels)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${matrixWidth + 10}, ${y(d) + (ROW_HEIGHT - buttonSize) / 2})`,
            )
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                toggleHidden(feature);
                drawMatrix(); // redraw immédiat
            })
            .on("mouseenter", function () {
                d3.select(this).select("rect").attr("fill", "#d1d1d1");
            })
            .on("mouseleave", function (event, d) {
                const isHidden = store.hiddenFeatures.includes(d);
                d3.select(this)
                    .select("rect")
                    .attr("fill", isHidden ? "#b8b8b8" : "var(--light-grey)");
            })
            .each(function (d) {
                const g = d3.select(this);

                const isHidden = store.hiddenFeatures.includes(d);

                // fond vert/gris
                g.append("rect")
                    .attr("width", buttonSize)
                    .attr("height", buttonSize)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("fill", isHidden ? "#b8b8b8" : "var(--light-grey)");

                // icône
                g.append("image")
                    .attr(
                        "href",
                        isHidden
                            ? "/icones/eye-closed.svg"
                            : "/icones/eye-open.svg",
                    )
                    .attr("width", 18)
                    .attr("height", 18)
                    .attr("x", 6)
                    .attr("y", 6);
            });

        // Boutons delete pour features simples
        contentGroup
            .append("g")
            .selectAll("g")
            .data(simpleFeatures)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${matrixWidth + 45}, ${y(d) + (ROW_HEIGHT - buttonSize) / 2})`,
            )
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                deleteFeature(feature);
            })
            .on("mouseenter", function () {
                d3.select(this).select("rect").attr("fill", "#d1d1d1");
            })
            .on("mouseleave", function () {
                d3.select(this)
                    .select("rect")
                    .attr("fill", "var(--light-grey)");
            })
            .each(function (d) {
                const g = d3.select(this);
                // fond rouge
                g.append("rect")
                    .attr("width", buttonSize)
                    .attr("height", buttonSize)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("fill", "var(--light-grey)");

                // icône SVG
                g.append("image")
                    .attr("href", "/icones/delete.svg")
                    .attr("width", 20)
                    .attr("height", 20)
                    .attr("x", 5)
                    .attr("y", 4);
            });

        // Boutons rename pour features simples
        contentGroup
            .append("g")
            .selectAll("g")
            .data(simpleFeatures)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${matrixWidth + 80}, ${y(d) + (ROW_HEIGHT - buttonSize) / 2})`,
            )
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                renameFeature(feature);
            })
            .on("mouseenter", function () {
                d3.select(this).select("rect").attr("fill", "#d1d1d1");
            })
            .on("mouseleave", function () {
                d3.select(this)
                    .select("rect")
                    .attr("fill", "var(--light-grey)");
            })
            .each(function (d) {
                const g = d3.select(this);
                // fond bleu
                g.append("rect")
                    .attr("width", buttonSize)
                    .attr("height", buttonSize)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("fill", "var(--light-grey)");

                // icône SVG
                g.append("image")
                    .attr("href", "/icones/rename.svg")
                    .attr("width", 20)
                    .attr("height", 20)
                    .attr("x", 5)
                    .attr("y", 5);
            });

        // Boutons delete pour merges
        contentGroup
            .append("g")
            .selectAll("g")
            .data(mergeFeatures)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${matrixWidth + 45}, ${y(d) + (ROW_HEIGHT - buttonSize) / 2})`,
            )
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                deleteMerge(feature);
            })
            .on("mouseenter", function () {
                d3.select(this).select("rect").attr("fill", "#d1d1d1");
            })
            .on("mouseleave", function () {
                d3.select(this)
                    .select("rect")
                    .attr("fill", "var(--light-grey)");
            })
            .each(function (d) {
                const g = d3.select(this);
                // fond rouge
                g.append("rect")
                    .attr("width", buttonSize)
                    .attr("height", buttonSize)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("fill", "var(--light-grey)");

                // icône SVG
                g.append("image")
                    .attr("href", "/icones/delete.svg")
                    .attr("width", 20)
                    .attr("height", 20)
                    .attr("x", 5)
                    .attr("y", 4);
            });

        // Boutons rename pour merges
        contentGroup
            .append("g")
            .selectAll("g")
            .data(mergeFeatures)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${matrixWidth + 80}, ${y(d) + (ROW_HEIGHT - buttonSize) / 2})`,
            )
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                renameMerge(feature);
            })
            .on("mouseenter", function () {
                d3.select(this).select("rect").attr("fill", "#d1d1d1");
            })
            .on("mouseleave", function () {
                d3.select(this)
                    .select("rect")
                    .attr("fill", "var(--light-grey)");
            })
            .each(function (d) {
                const g = d3.select(this);
                // fond bleu
                g.append("rect")
                    .attr("width", buttonSize)
                    .attr("height", buttonSize)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("fill", "var(--light-grey)");

                // icône SVG
                g.append("image")
                    .attr("href", "/icones/rename.svg")
                    .attr("width", 20)
                    .attr("height", 20)
                    .attr("x", 5)
                    .attr("y", 5);
            });

        // groupe pour les liens simples → merges
        const simpleToMergeLinksGroup = contentGroup
            .append("g")
            .attr("class", "simple-to-merge-links");

        function updateSimpleToMergeLinks() {
            simpleToMergeLinksGroup.selectAll("*").remove();

            // parcourir toutes les features simples
            data.filter((d) => !d.isMerge).forEach((simpleFeature) => {
                const featureName = simpleFeature.feature;

                // chercher tous les merges contenant cette feature
                const relevantMerges = data.filter(
                    (d) => d.isMerge && d.children.includes(featureName),
                );

                if (relevantMerges.length > 0) {
                    // Trouver le merge le plus bas (max Y)
                    let maxY = -1;

                    relevantMerges.forEach((merge) => {
                        const yPos = y(merge.feature) + y.bandwidth() / 2;
                        if (yPos > maxY) {
                            maxY = yPos;
                        }
                    });

                    const col = featureName;
                    const xPos = x(col) + x.bandwidth() / 2;
                    const ySimple = y(featureName) + y.bandwidth() / 2;

                    simpleToMergeLinksGroup
                        .append("line")
                        .attr("x1", xPos)
                        .attr("y1", ySimple)
                        .attr("x2", xPos)
                        .attr("y2", maxY)
                        .attr("stroke", store.colorStroke)
                        .attr("stroke-width", 2)
                        .attr("stroke-opacity", 0.8);
                }
            });
        }

        // ligne de séparation simples / merges
        const separatorY =
            y(simpleFeatures[simpleFeatures.length - 1]) + y.bandwidth();

        contentGroup
            .append("line")
            .attr("x1", padding - 150) // dépasse à gauche pour inclure les labels
            .attr("x2", matrixWidth + 140) // dépasse légèrement à droite
            .attr("y1", separatorY)
            .attr("y2", separatorY)
            .attr("stroke", store.colorStroke)
            .attr("stroke-width", 1)
            .attr("pointer-events", "none");

        // cellules
        const cellsData = rowLabels.flatMap((row, r) =>
            colLabels.map((col, c) => {
                const isDiagonal = r === c && r < simpleFeatures.length;

                let isMergeChild = false;
                if (r >= simpleFeatures.length) {
                    const mergeIndex = r - simpleFeatures.length;
                    const merge = data.find(
                        (d) =>
                            d.isMerge &&
                            d.feature === mergeFeatures[mergeIndex],
                    );
                    if (merge && merge.children.includes(col))
                        isMergeChild = true;
                }

                const fullData = data.find((x) => x.feature === row);

                return { row, col, isDiagonal, isMergeChild, fullData };
            }),
        );

        // fond 1 ligne sur 2
        const rowStriping = contentGroup
            .append("g")
            .attr("class", "row-striping");

        rowLabels.forEach((feature, index) => {
            if (index % 2 === 1) {
                rowStriping
                    .append("rect")
                    .attr("x", padding)
                    .attr("y", y(feature))
                    .attr("width", matrixWidth - padding)
                    .attr("height", y.bandwidth())
                    .attr("fill", "rgba(100,100,100,0.03)") // 10% gris
                    .attr("pointer-events", "none"); // ne bloque rien
            }
        });

        const cellGroup = contentGroup
            .append("g")
            .selectAll("g")
            .data(cellsData)
            .join("g")
            .attr("transform", (d) => `translate(${x(d.col)}, ${y(d.row)})`)
            .attr("data-row", (d) => d.row);

        cellGroup
            .append("rect")
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("fill", "rgba(200,200,200,0)") // transparent par défaut
            .attr("class", "hover-bg")
            .attr("pointer-events", "none"); // ne bloque pas les clics

        // pour les “cases intéressantes”, ajouter un point
        cellGroup
            .filter((d) => d.isDiagonal || d.isMergeChild)
            .append("circle")
            .attr("cx", x.bandwidth() / 2)
            .attr("cy", y.bandwidth() / 2)
            .attr("r", Math.min(x.bandwidth() * 0.3, y.bandwidth() * 0.3))
            .attr("stroke", store.colorStroke)
            .attr("stroke-opacity", 1)
            .attr("stroke-width", (d) => {
                const selected = store.selectedFeatures;
                const f = d.fullData;

                const isSelected =
                    f &&
                    (selected.includes(f.feature) ||
                        (f.isMerge &&
                            f.children.every((c) => selected.includes(c))));

                return isSelected ? 4 : 1.5;
            })
            .attr("class", "gold-point")
            .attr("fill", (d) => {
                const f = d.fullData;
                if (!f) return "green";

                return colorScale(f.direction);
            })

            .attr("stroke", (d) => {
                const selected = store.selectedFeatures;
                const f = d.fullData;

                const isSelected =
                    f &&
                    (selected.includes(f.feature) ||
                        (f.isMerge &&
                            f.children.every((c) => selected.includes(c))));

                return isSelected
                    ? store.colorSelectedStroke
                    : store.colorStroke;
            });

        cellGroup
            .append("rect")
            .attr("class", "event-catcher")
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("fill", "transparent")
            .attr("pointer-events", "all");

        // événements : tu peux les attacher au rect ou au cercle — par exemple au rect :
        // Helper to handle selection
        function handleFeatureClick(featureName) {
            const selected = store.selectedFeatures;
            const f = data.find((x) => x.feature === featureName);

            // Fallback for click on simple feature column (which might map to a hidden row but still valid col)
            // or just simple feature

            if (!f) {
                // Try simpler logic if not found in filtered data directly (e.g. maybe hidden)
                // But generally data drives the labels.
                // Assuming featureName is valid.
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

            updateSimpleToMergeLinks();
        }

        cellGroup
            .select(".event-catcher")
            .on("mouseenter", (event, d) => {
                store.hoveredMatrix = [d.row];
            })
            .on("mouseleave", (event, d) => {
                store.hoveredMatrix = [];
            })
            .on("click", (event, d) => {
                // If clicking a cell, we usually selecting the row feature?
                // Or if it is diagonal/merge-child, we select the feature at that intersection.
                // The previous logic used d.fullData which comes from the row.
                // "return { row, col, isDiagonal, isMergeChild, fullData };"

                // Wait, original logic used `d.fullData` which is the row feature.
                // So clicking a cell toggles the ROW feature.
                // Let's preserve that.
                if (d.fullData) {
                    handleFeatureClick(d.fullData.feature);
                }
            });

        function updateHighlights() {
            const targets = new Set([
                ...(store.selectedFeatures || []),
                ...(store.hoveredGraph || []),
                ...(store.hoveredMatrix || []),
            ]);

            // 1. Backgrounds
            svg.selectAll(".hover-bg").attr("fill", (d) =>
                targets.has(d.row)
                    ? "rgba(199, 30, 255, 0.1)"
                    : "rgba(200,200,200,0)",
            );

            // 2. Row Labels
            contentGroup
                .selectAll("text")
                .attr("font-weight", (d) =>
                    targets.has(d) ? "bold" : "normal",
                )
                .attr("fill", (d) =>
                    targets.has(d) ? store.colorSelectedStroke : null,
                );

            // 3. Column Labels
            const activeColumns = new Set();
            targets.forEach((featureName) => {
                const fd = data.find((x) => x.feature === featureName);
                if (fd) {
                    if (fd.isMerge) {
                        fd.children.forEach((c) => activeColumns.add(c));
                    } else {
                        activeColumns.add(fd.feature);
                    }
                } else if (colLabels.includes(featureName)) {
                    // Fallback for simple features not explicitly in data object (if applicable)
                    activeColumns.add(featureName);
                }
            });

            headerGroup
                .selectAll("text")
                .attr("font-weight", (d) =>
                    activeColumns.has(d) ? "bold" : "normal",
                )
                .attr("fill", (d) =>
                    activeColumns.has(d) ? store.colorSelectedStroke : null,
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

        updateSimpleToMergeLinks();

        return {
            updateHighlights,
        };
    }

    let matrixApi = null;

    onMount(() => {
        matrixApi = drawMatrix();
    });

    $effect(() => {
        if (!matrixApi) return;
        // Trigger on changes to hoveredGraph, selectedFeatures, or hoveredMatrix
        // Reading them registers the dependency.
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
</script>

<div
    bind:this={container}
    bind:clientWidth={width}
    bind:clientHeight={height}
    style="flex: {100 -
        store.graphWidthPercentage}; height: calc(100% - {marginBottom}px); min-width: 400px; min-height: 400px; overflow: hidden; position: relative;"
></div>
