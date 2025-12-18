<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { store } from "../rune/store.svelte";

    let graphDiv;

    function drawGraph() {
        console.log("drawGraph");

        // ########### SETUP ###########

        const data = store.filtered_graph_data;

        // a revoir pour rendre responsive
        const width = 1100;
        const height = 800;
        const margin = { top: 20, right: 110, bottom: 80, left: 90 };

        const wrapper = d3
            .select(graphDiv)
            .style("position", "relative")
            .style("width", width + "px")
            .style("height", height + "px");
        // .style("border", "1px solid #ccc");

        wrapper.selectAll("*").remove();

        // ########### SVG ###########

        const svg = wrapper
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const tooltip = wrapper
            .append("div")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("font-size", "15px")
            .style("font-weight", "regular")
            .style("display", "none")
            .style("z-index", "10000")
            .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)");

        // guidelines
        const guideGroup = svg.append("g").attr("class", "guides");

        const guideLineX = guideGroup
            .append("line")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "1 5")
            .style("display", "none");

        const guideLineY = guideGroup
            .append("line")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "1 5")
            .style("display", "none");

        const guideLineDir = guideGroup
            .append("line")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "1 5")
            .style("display", "none");

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

        const dirLabel = guideGroup
            .append("text")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .style("display", "none");

        // axes
        const x = d3
            .scaleLinear()
            .range([margin.left, width - margin.right])
            .domain([0, 1]);
        const y = d3
            .scaleLinear()
            .range([height - margin.bottom, margin.top])
            .domain([0, d3.max(data, (d) => d.feature_importance)])
            .nice();

        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5));

        svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(7));

        // titres
        svg.append("text")
            .attr("x", (margin.left + width - margin.right) / 2)
            .attr("y", height - 6)
            .attr("text-anchor", "middle")
            .attr("font-size", 18)
            .text("Deterministic effect");

        svg.append("text")
            .attr("transform", `rotate(-90)`)
            .attr("x", -(margin.top + height - margin.bottom) / 2)
            .attr("y", 18)
            .attr("text-anchor", "middle")
            .attr("font-size", 18)
            .text("Feature importance");

        const minColor = "#007FFA";
        const midColor = "#FFFFFF";
        const maxColor = "#FF0047";

        // direction
        const legendW = 10;
        const legendH = height - margin.top - margin.bottom;
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
        gradient
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", minColor);
        gradient
            .append("stop")
            .attr("offset", "50%")
            .attr("stop-color", midColor);
        gradient
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", maxColor);

        // rectangle gradiant
        svg.append("rect")
            .attr("class", "direction-legend")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendW)
            .attr("height", legendH)
            .attr("fill", "url(#directionGrad)");

        const dirScale = d3.scaleLinear().domain([-1, 1]).range([legendH, 0]);
        svg.append("g")
            .attr("class", "dir-axis")
            .attr("transform", `translate(${legendX + legendW},${legendY})`)
            .call(d3.axisRight(dirScale).ticks(5))
            .call((g) => g.select(".domain").remove());

        // titre
        svg.append("text")
            .attr("class", "direction-title")
            .attr("x", legendX + legendW + 8)
            .attr("y", legendY + legendH / 2 - 60)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr(
                "transform",
                `rotate(90, ${legendX + legendW + 8}, ${legendY + legendH / 2})`,
            )
            .attr("font-size", 18)
            .text("Direction");

        const colorScale = d3
            .scaleLinear()
            .domain([-1, 0, 1])
            .range([minColor, midColor, maxColor]);

        // traits violets
        const mergeLinesGroup = svg.append("g").attr("class", "merge-lines");

        // traits selected
        const mergeSelectedLinksGroup = svg
            .append("g")
            .attr("class", "merge-selected-links");

        function updateMergeSelectedLinks() {
            mergeSelectedLinksGroup.selectAll("*").remove();

            data.forEach((d) => {
                if (d.isMerge) {
                    // check si toutes les enfants sont sélectionnés
                    const allChildrenSelected = d.children.every((c) =>
                        store.selectedFeatures.includes(c),
                    );
                    if (allChildrenSelected) {
                        d.children.forEach((childName) => {
                            const child = data.find(
                                (x) => x.feature === childName,
                            );
                            mergeSelectedLinksGroup
                                .append("line")
                                .attr("x1", x(d.deterministic_effect))
                                .attr("y1", y(d.feature_importance))
                                .attr("x2", x(child.deterministic_effect))
                                .attr("y2", y(child.feature_importance))
                                .attr("stroke", store.colorStroke + 60)
                                .attr("stroke-width", 2)
                                .attr("stroke-opacity", 0.5);
                        });
                    }
                }
            });
        }

        // ########### FONCTIONS HOVER ###########

        function hoverCircle(d) {
            // tooltip
            tooltip
                .style("display", "block")
                .html(`<div><b>${d.feature}</b></div>`);

            const cx = x(d.deterministic_effect);
            const cy = y(d.feature_importance);

            tooltip.style("left", cx + 15 + "px").style("top", cy - 17 + "px");

            // lignes guidelines
            guideLineY
                .attr("x1", cx)
                .attr("x2", cx)
                .attr("y1", cy)
                .attr("y2", height - margin.bottom)
                .style("display", "block");

            guideLineX
                .attr("x1", margin.left)
                .attr("x2", cx)
                .attr("y1", cy)
                .attr("y2", cy)
                .style("display", "block");

            guideLineDir
                .attr("x1", cx)
                .attr("x2", legendX)
                .attr("y1", cy)
                .attr("y2", legendY + dirScale(d.direction))
                .style("display", "block");

            xLabel
                .attr("x", cx)
                .attr("y", height - margin.bottom + 35)
                .attr("text-anchor", "middle")
                .text(d.deterministic_effect.toFixed(2))
                .style("display", "block");

            yLabel
                .attr("x", margin.left - 30)
                .attr("y", cy + 4)
                .attr("text-anchor", "end")
                .text(d.feature_importance.toFixed(2))
                .style("display", "block");

            dirLabel
                .attr("x", legendX + legendW + 32)
                .attr("y", legendY + dirScale(d.direction))
                .text(d.direction.toFixed(2))
                .style("display", "block");

            // ###### LOGIQUE LINKS ######

            mergeLinesGroup.selectAll("*").remove();

            let allLinks = [];

            function linkAllSubsets(rootMerge, level = 0) {
                const children = rootMerge.children;
                const total = children.length;

                for (let k = total - 1; k >= 1; k--) {
                    const candidates = data.filter((other) => {
                        if (other.feature === rootMerge.feature) return false;

                        if (k === 1 && !other.isMerge) {
                            return children.includes(other.feature);
                        }

                        if (!other.isMerge) return false;
                        if (other.children.length !== k) return false;

                        return other.children.every((c) =>
                            children.includes(c),
                        );
                    });

                    candidates.forEach((sub) => {
                        allLinks.push({
                            parent: rootMerge,
                            child: sub,
                            level: level,
                        });

                        if (sub.isMerge) {
                            linkAllSubsets(sub, level + 1);
                        }
                    });
                }
            }

            function isParentOf(parent, child) {
                if (!parent.isMerge) return false;
                if (child.isMerge) {
                    return child.children.every((c) =>
                        parent.children.includes(c),
                    );
                }
                return parent.children.includes(child.feature);
            }

            function removeDuplicateLinks(links) {
                const seen = new Set();
                return links.filter(({ parent, child }) => {
                    const key = parent.feature + "→" + child.feature;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }

            function filterLinks(links) {
                return links.filter((linkA) => {
                    const A = linkA.parent;
                    const E = linkA.child;

                    const hasLowerLink = links.some((linkB) => {
                        const P = linkB.parent;
                        return P !== A && isParentOf(A, P) && linkB.child === E;
                    });

                    return !hasLowerLink;
                });
            }

            if (d.isMerge) {
                allLinks = [];
                linkAllSubsets(d);

                allLinks = removeDuplicateLinks(allLinks);

                const finalLinks = filterLinks(allLinks);

                finalLinks.forEach(({ parent, child, level }) => {
                    const opacity = 0.6 * Math.pow(0.5, level);

                    mergeLinesGroup
                        .append("line")
                        .attr("x1", x(parent.deterministic_effect))
                        .attr("y1", y(parent.feature_importance))
                        .attr("x2", x(child.deterministic_effect))
                        .attr("y2", y(child.feature_importance))
                        .attr("stroke", store.colorSelectedStroke)
                        .attr("stroke-width", 2)
                        .attr("stroke-opacity", opacity);
                });
            }

            // highlight du point
            const pointH = points.filter((x) => x.feature === d.feature);

            pointH
                .select("circle, rect")
                // .attr("stroke", "black")
                .attr("stroke-width", 5);

            points
                .select("circle, rect")
                .attr("stroke", (d) => {
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
            tooltip.style("display", "none");

            guideLineX.style("display", "none");
            guideLineY.style("display", "none");
            guideLineDir.style("display", "none");

            xLabel.style("display", "none");
            yLabel.style("display", "none");
            dirLabel.style("display", "none");

            mergeLinesGroup.selectAll("*").remove();

            points
                .select("circle, rect")
                .attr("stroke", (d) => {
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

        const points = svg
            .append("g")
            .attr("class", "p-group")
            .selectAll("g")
            .data(data)
            .join("g")
            .attr(
                "transform",
                (d) =>
                    `translate(${x(d.deterministic_effect)}, ${y(d.feature_importance)})`,
            )
            .style("cursor", "pointer")
            .on("click", (event, d) => {
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

                updateMergeSelectedLinks();
            })
            .on("mouseenter", (event, d) => {
                store.hoveredGraph = [d.feature];
                hoverCircle(d);
            })
            .on("mouseleave", () => {
                store.hoveredGraph = [];
                cleanHoverCircle();
            });

        points.each(function (d) {
            const g = d3.select(this);

            if (d.isMerge) {
                g.append("rect")
                    .attr("x", -7)
                    .attr("y", -7)
                    .attr("width", store.pointSize * 2)
                    .attr("height", store.pointSize * 2)
                    .attr("fill", colorScale(d.direction))
                    .attr("stroke", store.colorStroke)
                    .attr("stroke-opacity", 1);
            } else {
                g.append("circle")
                    .attr("r", store.pointSize)
                    .attr("fill", colorScale(d.direction))
                    .attr("stroke", store.colorStroke)
                    .attr("stroke-opacity", 1);
            }

            if (!store.hideLabels) {
                g.append("text")
                    .attr("y", store.pointSize + 15) // sous le point
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .attr("fill", "#333")
                    .attr("pointer-events", "none") // ne gêne pas hover/click
                    .text(d.feature);
            }

            updateMergeSelectedLinks();
        });

        function externalHover(featureName) {
            const d = data.find((x) => x.feature === featureName);
            if (d) hoverCircle(d);
        }

        function externalClear() {
            cleanHoverCircle();
        }

        return {
            points,
            externalHover,
            externalClear,
        };
    }

    let graphApi = null;

    onMount(() => {
        graphApi = drawGraph();
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
</script>

<div bind:this={graphDiv} class="graph"></div>
