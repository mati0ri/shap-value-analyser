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
    import { addButtonColumn } from "../utils/matrix/buttons";
    import { drawSimpleToMergeLinks } from "../utils/matrix/links";

    let container;

    let width = $state(550);
    let height = $state(650);
    let padding = 100;
    const rightMargin = 125; // Garder de l'espace a droite pour les boutons
    let scrollTop = 0;
    const ROW_HEIGHT = 40;
    let marginBottom = 49; // pixel perfect pour alignement avec le bas du graphe

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

        // Boutons hide / show
        addButtonColumn(contentGroup, rowLabels, {
            x: matrixWidth + 10,
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
            x: matrixWidth + 45,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => deleteFeature(feature),
            getIcon: "/icones/delete.svg",
        });

        // Boutons rename pour features simples
        addButtonColumn(contentGroup, simpleFeatures, {
            x: matrixWidth + 80,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => renameFeature(feature),
            getIcon: "/icones/rename.svg",
        });

        // Boutons delete pour merges
        addButtonColumn(contentGroup, mergeFeatures, {
            x: matrixWidth + 45,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => deleteMerge(feature),
            getIcon: "/icones/delete.svg",
        });

        // Boutons rename pour merges
        addButtonColumn(contentGroup, mergeFeatures, {
            x: matrixWidth + 80,
            y,
            rowHeight: ROW_HEIGHT,
            buttonSize,
            onClick: (event, feature) => renameMerge(feature),
            getIcon: "/icones/rename.svg",
        });

        // groupe pour traits verticaux entre simple et merges
        const simpleToMergeLinksGroup = contentGroup
            .append("g")
            .attr("class", "simple-to-merge-links");

        function updateSimpleToMergeLinks() {
            drawSimpleToMergeLinks(simpleToMergeLinksGroup, data, {
                xScale: x,
                yScale: y,
                strokeColor: store.colorStroke,
            });
        }

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
                    .attr("fill", "rgba(100,100,100,0.03)")
                    .attr("pointer-events", "none");
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
            .attr("fill", "rgba(200,200,200,0)")
            .attr("class", "hover-bg")
            .attr("pointer-events", "none");

        // pour les “cases intéressantes”, ajouter un point
        const interestingCells = cellGroup.filter(
            (d) => d.isDiagonal || d.isMergeChild,
        );

        interestingCells
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
            .attr("fill", "#e0e0e0")

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

        interestingCells
            .append("image")
            .attr("href", "/icones/arrow.svg")
            .attr("width", Math.min(x.bandwidth() * 0.5, y.bandwidth() * 0.5))
            .attr("height", Math.min(x.bandwidth() * 0.5, y.bandwidth() * 0.5))
            .attr(
                "x",
                (x.bandwidth() -
                    Math.min(x.bandwidth() * 0.5, y.bandwidth() * 0.5)) /
                    2,
            )
            .attr(
                "y",
                (y.bandwidth() -
                    Math.min(x.bandwidth() * 0.5, y.bandwidth() * 0.5)) /
                    2,
            )
            .attr("transform", (d) => {
                const cx = x.bandwidth() / 2;
                const cy = y.bandwidth() / 2;
                const dir = d.fullData ? d.fullData.direction : 0;
                // dir 1 -> -45deg (UP-RIGHT)
                // dir -1 -> +45deg (DOWN-RIGHT)
                const angle = -dir * 45;
                return `rotate(${angle}, ${cx}, ${cy})`;
            })
            .attr("pointer-events", "none");

        cellGroup
            .append("rect")
            .attr("class", "event-catcher")
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("fill", "transparent")
            .attr("pointer-events", "all");

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

            // Backgrounds
            svg.selectAll(".hover-bg").attr("fill", (d) =>
                targets.has(d.row)
                    ? "rgba(199, 30, 255, 0.1)"
                    : "rgba(200,200,200,0)",
            );

            // Row Labels
            contentGroup
                .selectAll("text")
                .attr("font-weight", (d) =>
                    targets.has(d) ? "bold" : "normal",
                )
                .attr("fill", (d) =>
                    targets.has(d) ? store.colorSelectedStroke : null,
                );

            // Column Labels
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
