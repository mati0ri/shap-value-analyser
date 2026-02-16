<script>
    import * as d3 from "d3";
    import { onMount, untrack } from "svelte";
    import { store } from "../rune/store.svelte";
    import { create_data, cleanGhost } from "../functions/create_data";
    import { computeGreedyLayout } from "../utils/graph/labelLayout";
    import { computeLinks } from "../utils/graph/links";

    let graphDiv;

    let width = $state(1100);
    let height = $state(800); // Container height (bound)

    // Derived height to enforce square aspect ratio
    let svgHeight = $state(800);

    $inspect(store.filtered_graph_data);
    $inspect(store.maxExpertDirection);

    function drawGraph() {
        if (!width) return; // Wait for width

        // ########### SETUP ###########

        const data = store.filtered_graph_data;

        // responsive dimensions are bound to width/height
        const margin = { top: 20, right: 40, bottom: 55, left: 75 };

        // Enforce square aspect ratio: xAxisLen = yAxisLen
        const xAxisLen = width - margin.left - margin.right;
        const yAxisLen = xAxisLen;
        svgHeight = yAxisLen + margin.top + margin.bottom;

        const wrapper = d3.select(graphDiv);
        // .style("border", "1px solid #ccc");

        wrapper.selectAll("*").remove();

        // ########### SVG ###########

        const svg = wrapper
            .append("svg")
            .attr("width", width)
            .attr("height", svgHeight) // Use calculated height
            .style("position", "absolute")
            .style("top", "0")
            .style("left", "0");

        // Separate tooltip for icons to avoid style conflicts
        const iconTooltip = wrapper
            .append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("font-size", "15px")
            .style("display", "none")
            .style("z-index", "100")
            .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)")
            .style("width", "200px"); // Fixed width only for icon tooltips

        // axes
        // les echelles
        const x = d3
            .scaleLinear()
            .range([margin.left, width - margin.right])
            .domain([0, 1]);
        const y = d3
            .scaleLinear()
            .range([svgHeight - margin.bottom, margin.top]) // Use svgHeight
            .domain([0, d3.max(data, (d) => d.feature_importance)])
            .nice(); // pour arrondir la val max

        // dessiner les axes
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${svgHeight - margin.bottom})`) // Use svgHeight
            .call(d3.axisBottom(x).ticks(5));

        svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(7));

        // titres des axes
        svg.append("text")
            .attr("x", (margin.left + width - margin.right) / 2)
            .attr("y", svgHeight - 6) // Use svgHeight
            .attr("text-anchor", "middle")
            .attr("font-size", 18)
            .text("Deterministic effect");

        svg.append("text")
            .attr("transform", `rotate(-90)`)
            .attr("x", -(margin.top + svgHeight - margin.bottom) / 2) // Use svgHeight
            .attr("y", 28)
            .attr("text-anchor", "middle")
            .attr("font-size", 18)
            .text("Feature importance");

        // Highlight region for deterministic_effect > 0.6
        svg.append("rect")
            .attr("x", x(0.6))
            .attr("y", margin.top)
            .attr("width", x(1) - x(0.6))
            .attr("height", svgHeight - margin.top - margin.bottom) // Use svgHeight
            .attr("fill", "var(--gradient-color)")
            .attr("opacity", 0.05)
            .style("pointer-events", "none");

        svg.append("rect")
            .attr("x", x(0.8))
            .attr("y", margin.top)
            .attr("width", x(1) - x(0.8))
            .attr("height", svgHeight - margin.top - margin.bottom) // Use svgHeight
            .attr("fill", "var(--gradient-color)")
            .attr("opacity", 0.05)
            .style("pointer-events", "none");

        const maxY = y.domain()[1];

        // Highlight region for feature_importance > 60% of axis
        svg.append("rect")
            .attr("x", margin.left)
            .attr("y", margin.top)
            .attr("width", width - margin.left - margin.right)
            .attr("height", Math.max(0, y(maxY * 0.6) - margin.top))
            .attr("fill", "var(--gradient-color)")
            .attr("opacity", 0.05)
            .style("pointer-events", "none");

        // Highlight region for feature_importance > 80% of axis
        svg.append("rect")
            .attr("x", margin.left)
            .attr("y", margin.top)
            .attr("width", width - margin.left - margin.right)
            .attr("height", Math.max(0, y(maxY * 0.8) - margin.top))
            .attr("fill", "var(--gradient-color)")
            .attr("opacity", 0.05)
            .style("pointer-events", "none");

        // legende pour la direction
        const minColor = store.minColor;
        const midColor = store.midColor;
        const maxColor = store.maxColor;

        const legendW = 10;
        const legendH = svgHeight - margin.top - margin.bottom; // Use svgHeight
        const legendX = width - margin.right + 12;
        const legendY = margin.top;

        const defs = svg.append("defs");
        const gradient = defs
            .append("linearGradient")
            .attr("id", "directionGrad")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        const stops = [
            { offset: "0%", color: minColor },
            { offset: "50%", color: midColor },
            { offset: "100%", color: maxColor },
        ];

        // Arrow marker for translation arrows
        defs.append("marker")
            .attr("id", "arrow-head-grey")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 8)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z")
            .attr("fill", "#ccc");

        stops.forEach((s) => {
            gradient
                .append("stop")
                .attr("offset", s.offset)
                .attr("stop-color", s.color);
        });

        // rectangle gradiant
        // svg.append("rect")
        //     .attr("class", "direction-legend")
        //     .attr("x", legendX)
        //     .attr("y", legendY)
        //     .attr("width", legendW)
        //     .attr("height", legendH)
        //     .attr("fill", "url(#directionGrad)");

        // axe avec les ticks a droite
        const dirScale = d3
            .scaleLinear()
            .domain([-1, 1])
            .range([legendH - 1, 0]);

        // svg.append("g")
        //     .attr("class", "dir-axis")
        //     .attr("transform", `translate(${legendX + legendW},${legendY})`)
        //     .call(d3.axisRight(dirScale).ticks(5))
        //     .call((g) => g.select(".domain").remove()); // enlever la ligne de l'axe (je trouve ca plus joli)

        // titre
        // svg.append("text")
        //     .attr("class", "direction-title")
        //     .attr(
        //         "transform",
        //         `translate(${legendX + legendW + 50}, ${legendY + legendH / 2}) rotate(90)`,
        //     )
        //     .attr("text-anchor", "middle")
        //     .attr("font-size", 18)
        //     .text("Direction");

        // ########### ICONS ###########

        const iconConfig = {
            de: {
                yOffset: 35,
                size: 50,
            },
            fi: {
                xOffset: -35,
                size: 50,
            },
            // dir: {
            //     xOffset: 15,
            //     size: 50,
            // },
        };

        const iconTooltips = {
            "de-faible":
                "A low deterministic effect indicates a random or inconsistent influence between feature value and model prediction",
            "de-fort":
                "A high deterministic effect indicates a strong, consistent relationship between feature value and model prediction",
            "fi-faible":
                "A low feature importance indicates the feature has minimal impact on the model's output",
            "fi-fort":
                "A high feature importance indicates the feature has significant impact on the model's output",
            "dir-faible":
                "Negative values indicate that a high feature value tends to decrease the predicted value and a low feature value tends to increase the prediction value",
            "dir-fort":
                "Positive values indicate that a high feature value tends to increase the predicted value and a low feature value tends to decrease the prediction value",
        };

        function showIconTooltip(event, text) {
            const [mx, my] = d3.pointer(event, graphDiv);

            iconTooltip
                .style("display", "block")
                // width is already set in initialization
                .html(`<div>${text}</div>`);

            // Calculate position to keep within bounds
            const tooltipNode = iconTooltip.node();
            const bbox = tooltipNode.getBoundingClientRect();

            let tx = mx + 15;
            let ty = my + 15;

            // Check right edge
            if (tx + bbox.width > width) {
                tx = mx - bbox.width - 15;
            }

            // Check bottom edge
            if (ty + bbox.height > svgHeight) {
                ty = my - bbox.height - 15;
            }

            // Check top edge (rare but possible for top icons)
            if (ty < 0) {
                ty = my + 15;
            }

            iconTooltip.style("left", tx + "px").style("top", ty + "px");
        }

        const iconGroup = svg.append("g").attr("class", "axis-icons");

        // Helper to append icon with tooltip
        function appendIcon(href, w, h, x, y, tooltipKey) {
            iconGroup
                .append("image")
                .attr("href", href)
                .attr("width", w)
                .attr("height", h)
                .attr("x", x)
                .attr("y", y)
                .on("mouseenter", (event) =>
                    showIconTooltip(event, iconTooltips[tooltipKey]),
                )
                .on("mouseleave", () => iconTooltip.style("display", "none"));
        }

        // Deterministic Effect Icons (X Axis)
        // Faible (Low) -> 0
        appendIcon(
            "/icones/axis/de-faible.svg",
            iconConfig.de.size,
            iconConfig.de.size,
            margin.left + 10,
            svgHeight -
                margin.bottom +
                iconConfig.de.yOffset -
                iconConfig.de.size / 2,
            "de-faible",
        );

        // Fort (High) -> 1
        appendIcon(
            "/icones/axis/de-fort.svg",
            iconConfig.de.size,
            iconConfig.de.size,
            width - margin.right - iconConfig.de.size - 10,
            svgHeight -
                margin.bottom +
                iconConfig.de.yOffset -
                iconConfig.de.size / 2,
            "de-fort",
        );

        // Feature Importance Icons (Y Axis)
        // Faible (Low) -> 0 (Bottom)
        appendIcon(
            "/icones/axis/fi-faible.svg",
            iconConfig.fi.size,
            iconConfig.fi.size,
            margin.left + iconConfig.fi.xOffset - iconConfig.fi.size / 2,
            svgHeight - margin.bottom - iconConfig.fi.size - 15,
            "fi-faible",
        );

        // Fort (High) -> Max (Top)
        appendIcon(
            "/icones/axis/fi-fort.svg",
            iconConfig.fi.size,
            iconConfig.fi.size,
            margin.left + iconConfig.fi.xOffset - iconConfig.fi.size / 2,
            margin.top + 15,
            "fi-fort",
        );

        // // Direction Icons (Legend Axis)
        // // Faible (Low) -> -1 (Bottom)
        // appendIcon(
        //     "/icones/axis/dir-faible.svg",
        //     iconConfig.dir.size,
        //     iconConfig.dir.size,
        //     legendX + legendW + iconConfig.dir.xOffset,
        //     legendY + legendH - iconConfig.dir.size - 15,
        //     "dir-faible",
        // );

        // // Fort (High) -> 1 (Top)
        // appendIcon(
        //     "/icones/axis/dir-fort.svg",
        //     iconConfig.dir.size,
        //     iconConfig.dir.size,
        //     legendX + legendW + iconConfig.dir.xOffset,
        //     legendY + 15,
        //     "dir-fort",
        // );

        // ########### GUIDES & LABELS ###########
        const guideGroup = svg.append("g").attr("class", "guides");

        const guideLineX = guideGroup
            .append("line")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "1 5");

        const guideLineY = guideGroup
            .append("line")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "1 5");

        // const guideLineDir = guideGroup
        //     .append("line")
        //     .attr("stroke", "#666")
        //     .attr("stroke-width", 1)
        //     .attr("stroke-dasharray", "1 5");

        // Backgrounds for labels
        const xLabelBg = guideGroup
            .append("rect")
            .attr("fill", "var(--background-color)")
            .attr("opacity", 0.8)
            .attr("rx", 2)
            .style("display", "none");

        const yLabelBg = guideGroup
            .append("rect")
            .attr("fill", "var(--background-color)")
            .attr("opacity", 0.8)
            .attr("rx", 2)
            .style("display", "none");

        // const dirLabelBg = guideGroup
        //     .append("rect")
        //     .attr("fill", "var(--background-color)")
        //     .attr("opacity", 0.8)
        //     .attr("rx", 2)
        //     .style("display", "none");

        const xLabel = guideGroup
            .append("text")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .style("display", "none");

        const yLabel = guideGroup
            .append("text")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .style("display", "none");

        // const dirLabel = guideGroup
        //     .append("text")
        //     .attr("font-size", 14)
        //     .attr("font-weight", "bold")
        //     .style("display", "none");

        // ########### LIENS GRIS MERGES SELECTIONNES ###########

        // traits gris qui s'affichent quand des merges sont sélectionnés (ou toutes les features d'un merge = la meme chose)
        const selectedLinksGroup = svg
            .append("g")
            .attr("class", "merge-selected-links");

        function updateMergeSelectedLinks() {
            selectedLinksGroup.selectAll("*").remove();

            data.forEach((d) => {
                if (d.isMerge) {
                    const allChildrenSelected = d.children.every((c) =>
                        store.selectedFeatures.includes(c),
                    );
                    if (allChildrenSelected) {
                        const finalLinks = computeLinks(d, data);

                        finalLinks.forEach(({ parent, child }) => {
                            const px = x(
                                store.expertMode
                                    ? parent.expert_deterministic_effect
                                    : parent.deterministic_effect,
                            );
                            const py = y(parent.feature_importance);
                            const cx = x(
                                store.expertMode
                                    ? child.expert_deterministic_effect
                                    : child.deterministic_effect,
                            );
                            const cy = y(child.feature_importance);

                            selectedLinksGroup
                                .append("line")
                                .attr("x1", px)
                                .attr("y1", py)
                                .attr("x2", cx)
                                .attr("y2", cy)
                                .attr("stroke", "#d4d4d4")
                                .attr("stroke-width", 1.5);
                        });
                    }
                }
            });
        }

        // ########### FONCTIONS HOVER ###########

        // traits violets (hover sur un merge)
        const hoverMergeLinksGroup = svg
            .append("g")
            .attr("class", "merge-lines");

        function hoverCircle(d) {
            const valX = store.expertMode
                ? d.expert_deterministic_effect
                : d.deterministic_effect;
            const cx = x(valX);
            const cy = y(d.feature_importance);

            labelGroup
                .selectAll("text")
                .attr("fill", (l) =>
                    l.feature === d.feature
                        ? store.colorSelectedStroke
                        : "black",
                )
                .attr("font-weight", (l) =>
                    l.feature === d.feature ? "bold" : "normal",
                );

            // lignes guidelines
            guideLineY
                .attr("x1", cx)
                .attr("x2", cx)
                .attr("y1", cy)
                .attr("y2", svgHeight - margin.bottom)
                .style("display", "block");

            guideLineX
                .attr("x1", margin.left)
                .attr("x2", cx)
                .attr("y1", cy)
                .attr("y2", cy)
                .style("display", "block");

            // guideLineDir
            //     .attr("x1", cx)
            //     .attr("x2", legendX)
            //     .attr("y1", cy)
            //     .attr("y2", legendY + dirScale(d.direction))
            //     .style("display", "block");

            // labels guidelines
            xLabel
                .attr("x", cx)
                .attr("y", svgHeight - margin.bottom + 20)
                .attr("text-anchor", "middle")
                .text(valX.toFixed(2))
                .style("display", "block");

            const xBBox = xLabel.node().getBBox();
            xLabelBg
                .attr("x", xBBox.x - 2)
                .attr("y", xBBox.y - 1)
                .attr("width", xBBox.width + 4)
                .attr("height", xBBox.height + 2)
                .style("display", "block");

            yLabel
                .attr("x", margin.left - 7)
                .attr("y", cy + 4)
                .attr("text-anchor", "end")
                .text(d.feature_importance.toFixed(2))
                .style("display", "block");

            const yBBox = yLabel.node().getBBox();
            yLabelBg
                .attr("x", yBBox.x - 2)
                .attr("y", yBBox.y - 1)
                .attr("width", yBBox.width + 4)
                .attr("height", yBBox.height + 2)
                .style("display", "block");

            // dirLabel
            //     .attr("x", legendX + legendW + 8)
            //     .attr("y", legendY + dirScale(d.direction))
            //     .text(d.direction.toFixed(2))
            //     .style("display", "block");

            // const dirBBox = dirLabel.node().getBBox();
            // dirLabelBg
            //     .attr("x", dirBBox.x - 2)
            //     .attr("y", dirBBox.y - 1)
            //     .attr("width", dirBBox.width + 4)
            //     .attr("height", dirBBox.height + 2)
            //     .style("display", "block");

            // ###### LOGIQUE LINKS ######

            hoverMergeLinksGroup.selectAll("*").remove();

            let allLinks = [];

            if (d.isMerge) {
                const finalLinks = computeLinks(d, data);

                finalLinks.forEach(({ parent, child }) => {
                    const pbX = store.expertMode
                        ? parent.expert_deterministic_effect
                        : parent.deterministic_effect;
                    const cbX = store.expertMode
                        ? child.expert_deterministic_effect
                        : child.deterministic_effect;
                    hoverMergeLinksGroup
                        .append("line")
                        .attr("x1", x(pbX))
                        .attr("y1", y(parent.feature_importance))
                        .attr("x2", x(cbX))
                        .attr("y2", y(child.feature_importance))
                        .attr("stroke", store.colorSelectedStroke + 80)
                        .attr("stroke-width", 1.5);
                });
            }

            // highlight du point
            points
                .select("circle, path")
                .attr("stroke", (d) => {
                    if (d.isGhost) return store.colorStroke;
                    if (d.isMerge) {
                        // Merge : check si tous les enfants sont sélectionnés
                        const allChildrenSelected = d.children.every((c) =>
                            store.selectedFeatures.includes(c),
                        );
                        return allChildrenSelected
                            ? store.colorSelectedStroke
                            : store.colorStroke;
                    } else {
                        return store.selectedFeatures.includes(d.feature)
                            ? store.colorSelectedStroke
                            : store.colorStroke;
                    }
                })
                .attr("stroke-width", (d) => {
                    if (d.isGhost) return 1.5;
                    if (d.isMerge) {
                        const allChildrenSelected = d.children.every((c) =>
                            store.selectedFeatures.includes(c),
                        );
                        return allChildrenSelected ? 3 : 1.5;
                    } else {
                        return store.selectedFeatures.includes(d.feature)
                            ? 3
                            : 1.5;
                    }
                });
        }

        function cleanHoverCircle() {
            labelGroup
                .selectAll("text")
                .attr("fill", "black")
                .attr("font-weight", "normal");

            guideLineX.style("display", "none");
            guideLineY.style("display", "none");
            // guideLineDir.style("display", "none");

            xLabel.style("display", "none");
            yLabel.style("display", "none");
            // dirLabel.style("display", "none");

            xLabelBg.style("display", "none");
            yLabelBg.style("display", "none");
            // dirLabelBg.style("display", "none");

            hoverMergeLinksGroup.selectAll("*").remove();

            points
                .select("circle, rect, path")
                .attr("stroke", (d) => {
                    if (d.isGhost) return store.colorStroke;
                    if (d.isMerge) {
                        // Merge : check si tous les enfants sont sélectionnés
                        const allChildrenSelected = d.children.every((c) =>
                            store.selectedFeatures.includes(c),
                        );
                        return allChildrenSelected
                            ? store.colorSelectedStroke
                            : store.colorStroke;
                    } else {
                        return store.selectedFeatures.includes(d.feature)
                            ? store.colorSelectedStroke
                            : store.colorStroke;
                    }
                })
                .attr("stroke-width", (d) => {
                    if (d.isGhost) return 1.5;
                    if (d.isMerge) {
                        const allChildrenSelected = d.children.every((c) =>
                            store.selectedFeatures.includes(c),
                        );
                        return allChildrenSelected ? 3 : 1.5;
                    } else {
                        return store.selectedFeatures.includes(d.feature)
                            ? 3
                            : 1.5;
                    }
                });
        }

        // ########### POINTS ###########

        const labelLinesGroup = svg
            .append("g")
            .attr("class", "label-lines-group");

        const translationArrowsGroup = svg
            .append("g")
            .attr("class", "translation-arrows-group");

        const points = svg
            .append("g")
            .attr("class", "p-group")
            .selectAll("g")
            .data(data)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${x(untrack(() => store.expertMode) ? d.expert_deterministic_effect : d.deterministic_effect)}, ${y(d.feature_importance)})`,
            )
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                if (d.isGhost) return;
                const selected = store.selectedFeatures;

                if (d.isMerge) {
                    d.children.forEach((child) => {
                        if (!selected.includes(child)) selected.push(child);
                    });
                } else {
                    if (selected.includes(d.feature))
                        selected.splice(selected.indexOf(d.feature), 1);
                    else selected.push(d.feature);
                }

                if (selected.length >= 2) {
                    create_data([selected], true);
                } else {
                    cleanGhost();
                }

                updateMergeSelectedLinks();
            })
            .on("mouseenter", (event, d) => {
                if (d.isGhost) return;
                store.hoveredGraph = [d.feature];
                hoverCircle(d);
            })
            .on("mouseleave", () => {
                store.hoveredGraph = [];
                cleanHoverCircle();
            })
            .call(
                d3
                    .drag()
                    .on("start", (event, d) => {
                        if (d.isGhost) return;
                        store.draggingFeature = d.feature;
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
                            .text(d.feature);
                    })
                    .on("drag", (event) => {
                        d3.select(".drag-ghost")
                            .style("left", event.sourceEvent.pageX + "px")
                            .style("top", event.sourceEvent.pageY + "px");
                    })
                    .on("end", (event, d) => {
                        if (d.isGhost) return;
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
                                    store.draggedFeatureX = d.feature;
                                } else if (zoneType === "color") {
                                    store.draggedFeatureY = d.feature;
                                }
                            }
                        }
                    }),
            );

        const colorScale = d3
            .scaleLinear()
            .domain([-1, 0, 1])
            .range([minColor, midColor, maxColor]);

        // Préparer les données pour le layout : on simule que 'deterministic_effect' est la valeur experte si besoin
        const layoutData = data.map((d) => ({
            ...d,
            deterministic_effect: untrack(() => store.expertMode)
                ? d.expert_deterministic_effect
                : d.deterministic_effect,
        }));

        const labelLayout = computeGreedyLayout(layoutData, {
            xScale: x,
            yScale: y,
            width,
            height: svgHeight,
            margin,
            pointSize: store.pointSize,
            hideLabels: store.hideLabels,
            allFeaturesLength: store.allFeatures.length,
        });

        points.each(function (d) {
            const g = d3.select(this);

            if (d.isGhost) {
                if (store.isSelectedNew) {
                    g.append("path")
                        .attr(
                            "d",
                            d3
                                .symbol()
                                .type(d3.symbolTriangle)
                                .size(Math.pow(store.pointSize * 2, 2)),
                        )
                        .attr("fill", "#e0e0e0")
                        .attr("stroke", store.colorStroke)
                        .attr("stroke-dasharray", "4 2")
                        .attr("stroke-width", 1.5)
                        .attr("pointer-events", "none");
                }
            } else if (d.isMerge) {
                const allChildrenSelected = d.children.every((c) =>
                    store.selectedFeatures.includes(c),
                );
                g.append("path")
                    .attr(
                        "d",
                        d3
                            .symbol()
                            .type(d3.symbolTriangle)
                            .size(Math.pow(store.pointSize * 2, 2)),
                    )
                    .attr("fill", "#e0e0e0")
                    .attr(
                        "stroke",
                        allChildrenSelected
                            ? store.colorSelectedStroke
                            : store.colorStroke,
                    )
                    .attr("stroke-width", allChildrenSelected ? 3 : 1.5)
                    .attr("stroke-opacity", 1);
            } else {
                const isSelected = store.selectedFeatures.includes(d.feature);
                g.append("circle")
                    .attr("r", store.pointSize)
                    .attr("fill", "#e0e0e0")
                    .attr(
                        "stroke",
                        isSelected
                            ? store.colorSelectedStroke
                            : store.colorStroke,
                    )
                    .attr("stroke-width", isSelected ? 3 : 1.5)

                    .attr("stroke-opacity", 1);
            }

            if (!d.isGhost || store.isSelectedNew) {
                const arrowSize = store.pointSize * 1.8;
                const direction = untrack(() => store.expertMode)
                    ? d.expert_direction
                    : d.direction;
                g.append("image")
                    .attr("href", "/icones/arrow.svg")
                    .attr("width", arrowSize)
                    .attr("height", arrowSize)
                    .attr("x", -arrowSize / 2)
                    .attr("y", -arrowSize / 2)
                    .attr(
                        "transform",
                        untrack(() => store.expertMode)
                            ? `rotate(${(-direction / store.maxExpertDirection) * 45})`
                            : `rotate(${-direction * 45})`,
                    )
                    .attr("pointer-events", "none");
            }

            updateMergeSelectedLinks();
        });

        const labelGroup = svg.append("g").attr("class", "labels-group");

        const drag = d3
            .drag()
            .on("start", function (event, d) {
                d3.select(this).raise().style("cursor", "grabbing");
            })
            .on("drag", function (event, d) {
                d.x = event.x;
                d.y = event.y;
                d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);

                // Update connecting line
                const originalData = data.find(
                    (item) => item.feature === d.feature,
                );
                const valX = store.expertMode
                    ? originalData.expert_deterministic_effect
                    : originalData.deterministic_effect;
                const px = x(valX);
                const py = y(originalData.feature_importance);

                const dist = Math.sqrt(
                    Math.pow(d.x - px, 2) + Math.pow(d.y - py, 2),
                );
                const lineGroup = wrapper.select(".label-lines-group");

                let line = lineGroup.selectAll("line").filter(function () {
                    return d3.select(this).attr("data-feature") === d.feature;
                });

                if (dist > 40) {
                    if (line.empty()) {
                        line = lineGroup
                            .append("line")
                            .attr("data-feature", d.feature)
                            .attr("stroke", "#ccc")
                            .attr("stroke-dasharray", "2,2")
                            .attr("pointer-events", "none");
                    }
                    line.attr("x1", px)
                        .attr("y1", py)
                        .attr("x2", d.x)
                        .attr("y2", d.y);
                } else {
                    if (!line.empty()) line.remove();
                }
            })
            .on("end", function (event, d) {
                d3.select(this).style("cursor", "grab");
            });

        const labelsSelection = labelGroup
            .selectAll("g")
            .data(labelLayout, (d) => d.feature)
            .join("g")
            .attr("class", "label-node")
            .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
            .style("cursor", "grab")
            .call(drag);

        labelsSelection.each(function (label) {
            const g = d3.select(this);
            // Clear existing content to prevent duplicates on redraw if join logic changes or just to be safe
            g.selectAll("*").remove();

            g.append("text")
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(label.feature)
                .style("user-select", "none");

            // ligne entre le point et le label si trop éloigné
            const dist = Math.sqrt(
                Math.pow(label.x - label.anchorX, 2) +
                    Math.pow(label.y - label.anchorY, 2),
            );

            if (dist > 40) {
                labelLinesGroup
                    .append("line")
                    .attr("data-feature", label.feature)
                    .attr("x1", label.anchorX)
                    .attr("y1", label.anchorY)
                    .attr("x2", label.x)
                    .attr("y2", label.y)
                    .attr("stroke", "#ccc")
                    .attr("stroke-dasharray", "2,2");
            }
        });

        // ########### UPDATE MODE ###########

        function updateMode() {
            const isExpert = store.expertMode;

            // 1. Update Points Position
            points
                .transition()
                .duration(1000)
                .attr("transform", (d) => {
                    const valX = isExpert
                        ? d.expert_deterministic_effect
                        : d.deterministic_effect;
                    return `translate(${x(valX)}, ${y(d.feature_importance)})`;
                });

            // 2. Translation Arrows
            translationArrowsGroup.selectAll("*").remove();

            if (isExpert) {
                points.each((d) => {
                    const classicX = x(d.deterministic_effect);
                    const expertX = x(d.expert_deterministic_effect);
                    const py = y(d.feature_importance);

                    translationArrowsGroup
                        .append("line")
                        .attr("x2", classicX)
                        .attr("y2", py)
                        .attr("x1", expertX)
                        .attr("y1", py)
                        .attr("stroke", "#ccc")
                        .attr("stroke-width", 1.5)
                        .attr("stroke-dasharray", "4, 2")
                        .attr("marker-end", "url(#arrow-head-grey)");
                });
            }

            // 2. Update Arrows Rotation
            points.selectAll("image").each(function (d) {
                if (d.isGhost && !store.isSelectedNew) return;
                const dir = isExpert ? d.expert_direction : d.direction;
                d3.select(this)
                    .transition()
                    .duration(1000)
                    .attr(
                        "transform",
                        isExpert
                            ? `rotate(${(-dir / store.maxExpertDirection) * 45})`
                            : `rotate(${-dir * 45})`,
                    );
            });

            // 3. Update Labels
            // Recalculate layout with new anchors
            const newLayoutData = data.map((d) => ({
                ...d,
                deterministic_effect: isExpert
                    ? d.expert_deterministic_effect
                    : d.deterministic_effect,
            }));

            // Clean lines for relayout
            labelLinesGroup.selectAll("line").remove();

            const newLabelLayout = computeGreedyLayout(newLayoutData, {
                xScale: x,
                yScale: y,
                width,
                height: svgHeight,
                margin,
                pointSize: store.pointSize,
                hideLabels: store.hideLabels,
                allFeaturesLength: store.allFeatures.length,
            });

            const labels = labelGroup
                .selectAll("g.label-node")
                .data(newLabelLayout, (d) => d.feature);

            labels
                .transition()
                .duration(1000)
                .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

            // Re-draw connection lines after transition (or during? lines hard to transition efficiently without complex join)
            // Ideally we transition lines. Creating new lines is easier.
            // Let's just draw them at the end or try to transition.
            // Since `labelLinesGroup` was cleared, we can't transition.
            // Let's add them back immediately for new positions? No, checking distance is needed.
            // We'll skip animating lines for now or just set them at the end.
            // Simpler: Just update lines at the end of transition?
            // Actually, let's just redraw lines after calculation. They might jump.
            // Users asked for "x translation + arrow rotation".
            newLabelLayout.forEach((label) => {
                const dist = Math.sqrt(
                    Math.pow(label.x - label.anchorX, 2) +
                        Math.pow(label.y - label.anchorY, 2),
                );

                if (dist > 40) {
                    labelLinesGroup
                        .append("line") // This will jump. It's acceptable for now as lines are minor.
                        .attr("data-feature", label.feature)
                        .attr("x1", label.anchorX)
                        .attr("y1", label.anchorY)
                        .attr("x2", label.x)
                        .attr("y2", label.y)
                        .attr("stroke", "#ccc")
                        .attr("stroke-dasharray", "2,2")
                        .attr("opacity", 0)
                        .transition()
                        .duration(1000)
                        .attr("opacity", 1);
                }
            });

            // 4. Update Merges Lines (selected)
            updateMergeSelectedLinks(); // This rebuilds lines immediately, might jump.
            // To animate, we'd need to select and transition.
            // Let's leave it jumping for now as per "x translation + arrow rotation" request.
            // Actually, updateMergeSelectedLinks uses `store.expertMode` which is now updated.
            // We can perhaps improve it but let's stick to core request first.
        }

        // ########### LASSO LAYER ###########

        const lassoGroup = svg.append("g").attr("class", "lasso-group");

        const lassoPath = lassoGroup
            .append("path")
            .attr("fill", "#0078d4")
            .attr("fill-opacity", 0.1)
            .attr("stroke", "#0078d4")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        const lassoRect = lassoGroup
            .append("rect")
            .attr("width", width)
            .attr("height", svgHeight)
            .attr("fill", "transparent")
            .style("cursor", "crosshair");

        // Initial state set
        lassoRect.style("pointer-events", store.isLassoActive ? "all" : "none");

        let lassoPolygon = [];

        lassoRect.call(
            d3
                .drag()
                .on("start", () => {
                    lassoPolygon = [];
                    lassoPath.attr("d", null);
                })
                .on("drag", (event) => {
                    lassoPolygon.push([event.x, event.y]);
                    const pathGen = d3.line();
                    lassoPath.attr("d", pathGen(lassoPolygon));
                })
                .on("end", (event) => {
                    if (lassoPolygon.length < 3) {
                        lassoPolygon = [];
                        lassoPath.attr("d", null);
                        return;
                    }

                    // Close the path visually
                    lassoPath.attr("d", d3.line()(lassoPolygon) + "Z");

                    const currentSelected = [...store.selectedFeatures];
                    let newSelection = [...currentSelected];
                    let changed = false;

                    // Find points inside
                    // Data points consist of 'data' array
                    data.forEach((d) => {
                        if (d.isGhost) return;
                        const px = x(d.deterministic_effect);
                        const py = y(d.feature_importance);

                        if (d3.polygonContains(lassoPolygon, [px, py])) {
                            if (d.isMerge) {
                                d.children.forEach((child) => {
                                    if (!newSelection.includes(child)) {
                                        newSelection.push(child);
                                        changed = true;
                                    }
                                });
                            } else {
                                if (!newSelection.includes(d.feature)) {
                                    newSelection.push(d.feature);
                                    changed = true;
                                }
                            }
                        }
                    });

                    // Reset visual state and lasso mode
                    store.isLassoActive = false;
                    cleanHoverCircle();

                    if (changed) {
                        // Update store and trigger data creation (simulating click behavior)
                        store.selectedFeatures = newSelection;
                        create_data([newSelection], true);
                        updateMergeSelectedLinks();
                    }

                    // Clear lasso polygon
                    lassoPolygon = [];
                    lassoPath.attr("d", null);
                }),
        );

        function externalHover(featureName) {
            const d = data.find((x) => x.feature === featureName);
            if (d) hoverCircle(d);
        }

        function externalClear() {
            cleanHoverCircle();
        }

        function updateLassoVisuals(isActive) {
            lassoRect.style("pointer-events", isActive ? "all" : "none");
        }

        return {
            points,
            externalHover,
            externalClear,
            updateLassoVisuals,
            updateMode,
        };
    }

    function exportSVG() {
        if (!graphDiv) return;
        const svg = graphDiv.querySelector("svg");
        if (!svg) return;

        // Serialize SVG content
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svg);

        // Add white background for export only
        // Insert a white rect as the first child of the SVG
        const svgTagEnd = source.indexOf(">");
        if (svgTagEnd !== -1) {
            source =
                source.slice(0, svgTagEnd + 1) +
                '<rect width="100%" height="100%" fill="white"/>' +
                source.slice(svgTagEnd + 1);
        }

        // Add namespaces
        if (
            !source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)
        ) {
            source = source.replace(
                /^<svg/,
                '<svg xmlns="http://www.w3.org/2000/svg"',
            );
        }
        if (
            !source.match(
                /^<svg[^>]+xmlns:xlink="http\:\/\/www\.w3\.org\/1999\/xlink"/,
            )
        ) {
            source = source.replace(
                /^<svg/,
                '<svg xmlns:xlink="http://www.w3.org/1999/xlink"',
            );
        }

        // Add XML declaration
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

        // Convert svg source to URI data scheme.
        const url =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

        const link = document.createElement("a");
        link.href = url;
        link.download = "graph.svg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    let graphApi = null;

    onMount(() => {
        graphApi = drawGraph();
        store.downloadGraphSvg = exportSVG;
    });

    $effect(() => {
        if (!graphApi) return;

        if (store.hoveredMatrix.length === 0) {
            graphApi.externalClear();
        } else {
            graphApi.externalHover(store.hoveredMatrix[0]);
        }
    });

    $effect(() => {
        graphApi = drawGraph();
    });
    $effect(() => {
        if (graphApi) {
            graphApi.updateLassoVisuals(store.isLassoActive);
        }
    });

    $effect(() => {
        // Track expert mode changes
        store.expertMode;
        // Trigger transition if api exists
        if (graphApi && graphApi.updateMode) {
            graphApi.updateMode();
        }
    });
</script>

<div
    bind:this={graphDiv}
    bind:clientWidth={width}
    bind:clientHeight={height}
    style="flex: {store.graphWidthPercentage}; height: 100%; min-width: 400px; min-height: 400px; overflow-y: auto; position: relative;"
></div>
