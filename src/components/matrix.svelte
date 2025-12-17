<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";
    import { onMount } from "svelte";
    import { deleteMerge } from "../functions/create_data";
    import { renameMerge } from "../functions/create_data";

    let container;

    let width = 600;
    let height = 700;
    let padding = 100;

    function toggleHidden(feature) {
        const hidden = store.hiddenFeatures;
        const i = hidden.indexOf(feature);

        if (i === -1) {
            hidden.push(feature);
        } else {
            hidden.splice(i, 1);
        }
    }

    function drawMatrix() {
        const data = store.graph_data;

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

        d3.select(container).selectAll("*").remove();

        const svg = d3
            .select(container)
            .append("svg")
            .attr("width", width + 140)
            .attr("height", height);

        // band scales
        const x = d3.scaleBand().domain(colLabels).range([padding, width]);
        const y = d3.scaleBand().domain(rowLabels).range([padding, height]);

        // color scale
        const minColor = "#007FFA";
        const midColor = "#FFFFFF";
        const maxColor = "#FF0047";

        const colorScale = d3
            .scaleLinear()
            .domain([-1, 0, 1])
            .range([minColor, midColor, maxColor]);

        // Labels colonnes
        svg.append("g")
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
            .text((d) => d);

        // Labels lignes
        svg.append("g")
            .attr("transform", `translate(${padding - 8}, 0)`)
            .selectAll("text")
            .data(rowLabels)
            .join("text")
            .attr("x", 0)
            .attr("y", (d) => y(d) + y.bandwidth() / 2 + 4)
            .attr("text-anchor", "end")
            .attr("font-size", "15px")
            .text((d) => (d.length > 6 ? d.slice(0, 6) + "..." : d));

        // Boutons hide / show (pour simples + merges)
        svg.append("g")
            .selectAll("g")
            .data(rowLabels)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${width + 5}, ${y(d) + y.bandwidth() / 2 - 10})`,
            )
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                toggleHidden(feature);
                drawMatrix(); // redraw immédiat
            })
            .each(function (d) {
                const g = d3.select(this);

                const isHidden = store.hiddenFeatures.includes(d);

                // fond vert
                g.append("rect")
                    .attr("width", 30)
                    .attr("height", 30)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .attr("fill", isHidden ? "#cfcfcf" : store.colorStroke); // gris si hidden

                // icône
                g.append("image")
                    .attr("href", isHidden ? "/icones/eye-closed.svg" : "/icones/eye-open.svg")
                    .attr("width", 24)
                    .attr("height", 24)
                    .attr("x", 3)
                    .attr("y", 4);
            });

        // Boutons delete
        svg.append("g")
            .selectAll("g")
            .data(mergeFeatures)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${width + 40}, ${y(d) + y.bandwidth() / 2 - 10})`,
            ) // centré verticalement
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                deleteMerge(feature);
            })
            .each(function (d) {
                const g = d3.select(this);
                // fond rouge
                g.append("rect")
                    .attr("width", 30)
                    .attr("height", 30)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .attr("fill", store.colorStroke);

                // icône SVG
                g.append("image")
                    .attr("href", "/icones/delete.svg")
                    .attr("width", 20)
                    .attr("height", 20)
                    .attr("x", 5)
                    .attr("y", 4);
            });

        // Boutons rename
        svg.append("g")
            .selectAll("g")
            .data(mergeFeatures)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${width + 75}, ${y(d) + y.bandwidth() / 2 - 10})`,
            )
            .attr("cursor", "pointer")
            .on("click", (event, feature) => {
                renameMerge(feature);
            })
            .each(function (d) {
                const g = d3.select(this);
                // fond bleu
                g.append("rect")
                    .attr("width", 30)
                    .attr("height", 30)
                    .attr("rx", 5)
                    .attr("ry", 5)
                    .attr("fill", store.colorStroke);

                // icône SVG
                g.append("image")
                    .attr("href", "/icones/rename.svg")
                    .attr("width", 20)
                    .attr("height", 20)
                    .attr("x", 5)
                    .attr("y", 5);
            });

        // groupe pour les liens simples → merges
        const simpleToMergeLinksGroup = svg
            .append("g")
            .attr("class", "simple-to-merge-links");

        function updateSimpleToMergeLinks() {
            simpleToMergeLinksGroup.selectAll("*").remove();

            // parcourir toutes les features simples
            data.filter((d) => !d.isMerge).forEach((simpleFeature) => {
                const featureName = simpleFeature.feature;

                // chercher tous les merges contenant cette feature
                data.filter(
                    (d) => d.isMerge && d.children.includes(featureName),
                ).forEach((merge) => {
                    // positions des cercles
                    const rowSimple = featureName;
                    const rowMerge = merge.feature;

                    const col = featureName; // la colonne correspond à la feature simple
                    const xPos = x(col) + x.bandwidth() / 2;

                    const ySimple = y(rowSimple) + y.bandwidth() / 2;
                    const yMerge = y(rowMerge) + y.bandwidth() / 2;

                    simpleToMergeLinksGroup
                        .append("line")
                        .attr("x1", xPos)
                        .attr("y1", ySimple)
                        .attr("x2", xPos)
                        .attr("y2", yMerge)
                        .attr("stroke", store.colorStroke)
                        .attr("stroke-width", 2)
                        .attr("stroke-opacity", 0.8);
                });
            });
        }

        // ligne de séparation simples / merges
        const separatorY =
            y(simpleFeatures[simpleFeatures.length - 1]) + y.bandwidth();

        svg.append("line")
            .attr("x1", padding - 70) // dépasse à gauche pour inclure les labels
            .attr("x2", width) // dépasse légèrement à droite
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
        const rowStriping = svg.append("g").attr("class", "row-striping");

        rowLabels.forEach((feature, index) => {
            if (index % 2 === 1) {
                // impaire (0-indexé donc 1, 3, 5...)
                rowStriping
                    .append("rect")
                    .attr("x", padding)
                    .attr("y", y(feature))
                    .attr("width", width - padding)
                    .attr("height", y.bandwidth())
                    .attr("fill", "rgba(100,100,100,0.05)") // 10% gris
                    .attr("pointer-events", "none"); // ne bloque rien
            }
        });

        const cellGroup = svg
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
            .attr("r", Math.min(x.bandwidth(), y.bandwidth()) * 0.2)
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
                if (!f) return "lightblue";

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
        cellGroup
            .select(".event-catcher")
            .on("mouseenter", (event, d) => {
                hoverRow(d.row);
                store.hoveredMatrix = [d.row];
            })
            .on("mouseleave", (event, d) => {
                clearRow();
                store.hoveredMatrix = [];
            })
            .on("click", (event, d) => {
                const selected = store.selectedFeatures;
                const f = d.fullData;

                if (!f) return;

                if (f.isMerge) {
                    f.children.forEach((child) => {
                        if (!selected.includes(child)) selected.push(child);
                    });
                } else {
                    const i = selected.indexOf(f.feature);
                    i === -1 ? selected.push(f.feature) : selected.splice(i, 1);
                }

                updateSimpleToMergeLinks();
            });

        function hoverRow(rowName) {
            svg.selectAll(".hover-bg")
                .filter(function (d) {
                    return d.row === rowName;
                })
                .attr("fill", "rgba(199, 30, 255, 0.1)");
        }

        function clearRow() {
            svg.selectAll(".hover-bg").attr("fill", "rgba(200,200,200,0)");
        }

        updateSimpleToMergeLinks();

        return {
            hoverRow,
            clearRow,
        };
    }

    let matrixApi = null;

    onMount(() => {
        matrixApi = drawMatrix();
    });

    $effect(() => {
        if (!matrixApi) return;

        if (store.hoveredGraph.length === 0) {
            matrixApi.clearRow();
        } else {
            matrixApi.hoverRow(store.hoveredGraph[0]);
        }
    });

    $effect(() => {
        matrixApi = drawMatrix();
    });
</script>

<!-- <div style="background-color: lightgrey;">
    <div bind:this={container}></div>
</div> -->
<div bind:this={container}></div>
