<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { store } from "../rune/store.svelte";
    import { create_data, cleanGhost } from "../functions/create_data";

    let graphDiv;

    let width = $state(1100);
    let height = $state(800);

    function drawGraph() {
        if (!width || !height) return;

        // ########### SETUP ###########

        const data = store.filtered_graph_data;

        // responsive dimensions are bound to width/height
        const margin = { top: 20, right: 90, bottom: 50, left: 65 };

        const wrapper = d3.select(graphDiv);
        // .style("border", "1px solid #ccc");

        wrapper.selectAll("*").remove();

        // ########### SVG ###########

        const svg = wrapper
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("position", "absolute")
            .style("top", "0")
            .style("left", "0");

        // bulle avec le nom de la variable lors du hover
        const tooltip = wrapper
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
            .style("box-shadow", "0 2px 6px rgba(0,0,0,0.15)");

        // axes
        // les echelles
        const x = d3
            .scaleLinear()
            .range([margin.left, width - margin.right])
            .domain([0, 1]);
        const y = d3
            .scaleLinear()
            .range([height - margin.bottom, margin.top])
            .domain([0, d3.max(data, (d) => d.feature_importance)])
            .nice(); // pour arrondir la val max

        // dessiner les axes
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5));

        svg.append("g")
            .attr("class", "y-axis")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(7));

        // titres des axes
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

        // legende pour la direction
        const minColor = store.minColor;
        const midColor = store.midColor;
        const maxColor = store.maxColor;

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

        const stops = [
            { offset: "0%", color: minColor },
            { offset: "50%", color: midColor },
            { offset: "100%", color: maxColor },
        ];

        stops.forEach((s) => {
            gradient
                .append("stop")
                .attr("offset", s.offset)
                .attr("stop-color", s.color);
        });

        // rectangle gradiant
        svg.append("rect")
            .attr("class", "direction-legend")
            .attr("x", legendX)
            .attr("y", legendY)
            .attr("width", legendW)
            .attr("height", legendH)
            .attr("fill", "url(#directionGrad)");

        // axe avec les ticks a droite
        const dirScale = d3
            .scaleLinear()
            .domain([-1, 1])
            .range([legendH - 1, 0]);

        svg.append("g")
            .attr("class", "dir-axis")
            .attr("transform", `translate(${legendX + legendW},${legendY})`)
            .call(d3.axisRight(dirScale).ticks(5))
            .call((g) => g.select(".domain").remove()); // enlever la ligne de l'axe (je trouve ca plus joli)

        // titre
        svg.append("text")
            .attr("class", "direction-title")
            .attr(
                "transform",
                `translate(${legendX + legendW + 50}, ${legendY + legendH / 2}) rotate(90)`,
            )
            .attr("text-anchor", "middle")
            .attr("font-size", 18)
            .text("Direction");

        // ########### GUIDES & LABELS (Last to be on top) ###########
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

        const guideLineDir = guideGroup
            .append("line")
            .attr("stroke", "#666")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "1 5");

        // Backgrounds for labels

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

        const dirLabelBg = guideGroup
            .append("rect")
            .attr("fill", "var(--background-color)")
            .attr("opacity", 0.8)
            .attr("rx", 2)
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

        // ########### LIENS GRIS MERGES SELECTIONNES ###########

        // traits gris qui s'affichent quand des merges sont sélectionnés (ou toutes les features d'un merge = la meme chose)
        const selectedLinksGroup = svg
            .append("g")
            .attr("class", "merge-selected-links");

        // Helper functions for link calculation
        function linkAllSubsets(rootMerge, level = 0, linksArray) {
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

                    return other.children.every((c) => children.includes(c));
                });

                candidates.forEach((sub) => {
                    linksArray.push({
                        parent: rootMerge,
                        child: sub,
                        level: level,
                    });

                    if (sub.isMerge) {
                        linkAllSubsets(sub, level + 1, linksArray);
                    }
                });
            }
        }

        function isParentOf(parent, child) {
            if (!parent.isMerge) return false;
            if (child.isMerge) {
                return child.children.every((c) => parent.children.includes(c));
            }
            return parent.children.includes(child.feature);
        }

        function removeDuplicateLinks(links) {
            const seen = new Set();
            return links.filter(({ parent, child }) => {
                const key = parent.feature + "->" + child.feature;
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

        function updateMergeSelectedLinks() {
            selectedLinksGroup.selectAll("*").remove();

            data.forEach((d) => {
                if (d.isMerge) {
                    const allChildrenSelected = d.children.every((c) =>
                        store.selectedFeatures.includes(c),
                    );
                    if (allChildrenSelected) {
                        // Use the same logic as hover
                        let allLinks = [];
                        linkAllSubsets(d, 0, allLinks);
                        allLinks = removeDuplicateLinks(allLinks);
                        const finalLinks = filterLinks(allLinks);

                        finalLinks.forEach(({ parent, child }) => {
                            // Only draw if the child is also fully selected (if it's a merge) or selected (if it's a feature)
                            // Actually, if the parent is selected (all children selected),
                            // and we are drawing the substructure, we might want to see the whole structure
                            // OR we only want to see links between things that are explicitly selected?
                            // "Aim is to suppress links when not needed" -> The purple logic suppresses transitive links.
                            // The user says: "I see a ghost and grey lines... I would like these lines to be calculated the same way as the purple lines"
                            // If `d` (the root merge) is selected, then by definition all its children are selected.
                            // So `linkAllSubsets` will find all subsets which are also implicitly selected.
                            // So we can just draw them.

                            selectedLinksGroup
                                .append("line")
                                .attr("x1", x(parent.deterministic_effect))
                                .attr("y1", y(parent.feature_importance))
                                .attr("x2", x(child.deterministic_effect))
                                .attr("y2", y(child.feature_importance))
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
            const cx = x(d.deterministic_effect);
            const cy = y(d.feature_importance);

            tooltip
                .style("display", "block")
                .style("left", cx + 15 + "px")
                .style("top", cy - 17 + "px")
                .html(`<div><b>${d.feature}</b></div>`);

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

            // labels guidelines
            xLabel
                .attr("x", cx)
                .attr("y", height - margin.bottom + 20)
                .attr("text-anchor", "middle")
                .text(d.deterministic_effect.toFixed(2))
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

            dirLabel
                .attr("x", legendX + legendW + 8)
                .attr("y", legendY + dirScale(d.direction))
                .text(d.direction.toFixed(2))
                .style("display", "block");

            const dirBBox = dirLabel.node().getBBox();
            dirLabelBg
                .attr("x", dirBBox.x - 2)
                .attr("y", dirBBox.y - 1)
                .attr("width", dirBBox.width + 4)
                .attr("height", dirBBox.height + 2)
                .style("display", "block");

            // ###### LOGIQUE LINKS ######

            hoverMergeLinksGroup.selectAll("*").remove();

            let allLinks = [];

            if (d.isMerge) {
                allLinks = [];
                linkAllSubsets(d, 0, allLinks); // Pass allLinks array

                allLinks = removeDuplicateLinks(allLinks);

                const finalLinks = filterLinks(allLinks);

                finalLinks.forEach(({ parent, child }) => {
                    hoverMergeLinksGroup
                        .append("line")
                        .attr("x1", x(parent.deterministic_effect))
                        .attr("y1", y(parent.feature_importance))
                        .attr("x2", x(child.deterministic_effect))
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
            tooltip.style("display", "none");

            guideLineX.style("display", "none");
            guideLineY.style("display", "none");
            guideLineDir.style("display", "none");

            xLabel.style("display", "none");
            yLabel.style("display", "none");
            dirLabel.style("display", "none");

            xLabelBg.style("display", "none");
            yLabelBg.style("display", "none");
            dirLabelBg.style("display", "none");

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
            });

        function computeGreedyLayout(data) {
            const padding = 0;
            const obstacles = [];

            // points
            data.forEach((d) => {
                if (d.isGhost) return;
                const px = x(d.deterministic_effect);
                const py = y(d.feature_importance);
                const r = store.pointSize + 5;

                obstacles.push({
                    x: px,
                    y: py,
                    halfW: r + padding,
                    halfH: r + padding,
                    type: "point",
                });
            });

            // labels
            let labels = data
                .filter((d) => !d.isGhost && !store.hideLabels)
                .map((d) => ({
                    feature: d.feature,
                    width: d.feature.length * 7,
                    height: 14,
                    anchorX: x(d.deterministic_effect),
                    anchorY: y(d.feature_importance),
                    x: 0,
                    y: 0,
                }));

            // Tri : on place les labels de bas en haut, de gauche en droite
            labels.sort((a, b) => {
                if (Math.abs(a.anchorY - b.anchorY) > 0.001) {
                    return b.anchorY - a.anchorY;
                }
                return a.anchorX - b.anchorX;
            });

            // directions (anti-horaire depuis le sud)
            const numDirs = 128;
            const startAngle = Math.PI / 2;
            const directions = [];

            for (let i = 0; i < numDirs; i++) {
                const angle = startAngle - (i * 2 * Math.PI) / numDirs;
                let dx = Math.cos(angle);
                let dy = Math.sin(angle);

                if (Math.abs(dx) < 1e-10) dx = 0;
                if (Math.abs(dy) < 1e-10) dy = 0;

                directions.push({ dx, dy, index: i });
            }

            // placement
            const maxRadius = 250;
            const step = 1;
            const maxValidRings = store.allFeatures.length / 3;
            const kNN = Math.round(store.allFeatures.length / 4);

            labels.forEach((lbl) => {
                const halfW = lbl.width / 2;
                const halfH = lbl.height / 2;
                const pointR = store.pointSize;
                const startR = pointR + halfH + padding;

                const ringCandidates = [];

                for (let r = startR; r < maxRadius; r += step) {
                    const candidates = [];

                    for (const dir of directions) {
                        const cx = lbl.anchorX + dir.dx * r;
                        const cy = lbl.anchorY + dir.dy * r;

                        // Limites viewport
                        if (
                            cx - halfW < margin.left ||
                            cx + halfW > width - margin.right ||
                            cy - halfH < margin.top ||
                            cy + halfH > height - margin.bottom
                        ) {
                            continue;
                        }

                        // Collision check
                        let collision = false;
                        const distances = [];

                        for (const obs of obstacles) {
                            const distW = halfW + obs.halfW;
                            const distH = halfH + obs.halfH;

                            if (
                                Math.abs(cx - obs.x) < distW &&
                                Math.abs(cy - obs.y) < distH
                            ) {
                                collision = true;
                                break;
                            }

                            const dx = cx - obs.x;
                            const dy = cy - obs.y;
                            distances.push(Math.sqrt(dx * dx + dy * dy));
                        }

                        if (collision) continue;

                        // k-NN clearance
                        distances.sort((a, b) => a - b);
                        const k = Math.min(kNN, distances.length);
                        let sum = 0;
                        for (let i = 0; i < k; i++) sum += distances[i];
                        const clearance = sum / k;

                        candidates.push({
                            x: cx,
                            y: cy,
                            r,
                            clearance,
                            dirIndex: dir.index,
                        });
                    }

                    if (candidates.length > 0) {
                        ringCandidates.push(...candidates);
                        if (ringCandidates.length >= maxValidRings * numDirs) {
                            break;
                        }
                    }
                }

                // Choix global parmi les premiers rayons valides
                let best = null;
                let bestScore = -Infinity;

                for (const c of ringCandidates) {
                    // Cap du clearance pour éviter que des voisins très lointains ne repoussent le label
                    // Si on a déjà 100px de libre, pas la peine d'aller plus loin chercher 200px
                    const cappedClearance = Math.min(c.clearance, 100);
                    const score = cappedClearance - 0.6 * c.r;

                    if (score > bestScore) {
                        bestScore = score;
                        best = c;
                    }
                }

                // Fallback (rare)
                if (!best) {
                    best = {
                        x: lbl.anchorX,
                        y: lbl.anchorY + startR + 10,
                    };
                }

                lbl.x = best.x;
                lbl.y = best.y;

                // Ajouter le label comme obstacle
                obstacles.push({
                    x: lbl.x,
                    y: lbl.y,
                    halfW: halfW + padding,
                    halfH: halfH + padding,
                    type: "label",
                });
            });

            return labels;
        }

        const colorScale = d3
            .scaleLinear()
            .domain([-1, 0, 1])
            .range([minColor, midColor, maxColor]);

        const labelLayout = computeGreedyLayout(data);

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
                        .attr("fill", colorScale(d.direction))
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
                    .attr("fill", colorScale(d.direction))
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
                    .attr("fill", colorScale(d.direction))
                    .attr(
                        "stroke",
                        isSelected
                            ? store.colorSelectedStroke
                            : store.colorStroke,
                    )
                    .attr("stroke-width", isSelected ? 3 : 1.5)

                    .attr("stroke-opacity", 1);
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
                const px = x(originalData.deterministic_effect);
                const py = y(originalData.feature_importance);

                const dist = Math.sqrt(
                    Math.pow(d.x - px, 2) + Math.pow(d.y - py, 2),
                );
                const lineGroup = wrapper.select(".label-lines-group");
                // Use filter to strictly match feature name to avoid selector issues with special chars
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

        labelLayout.forEach((label) => {
            const d = data.find((item) => item.feature === label.feature);
            const g = labelGroup
                .append("g")
                .datum(label) // Bind data so drag handler receives it
                .attr("transform", `translate(${label.x}, ${label.y})`)
                .style("cursor", "grab")
                .call(drag);

            g.append("text")
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(label.feature)
                .style("user-select", "none"); // Prevent text selection while dragging

            // ligne entre le point et le label si trop éloigné
            const dist = Math.sqrt(
                Math.pow(label.x - x(d.deterministic_effect), 2) +
                    Math.pow(label.y - y(d.feature_importance), 2),
            );
            if (dist > 40) {
                labelLinesGroup
                    .append("line")
                    .attr("data-feature", label.feature) // Identifier for drag updates
                    .attr("x1", x(d.deterministic_effect))
                    .attr("y1", y(d.feature_importance))
                    .attr("x2", label.x)
                    .attr("y2", label.y)
                    .attr("stroke", "#ccc")
                    .attr("stroke-dasharray", "2,2");
            }
        });

        // ########### LASSO LAYER ###########
        // Must be on top of points but maybe below labels if we want labels draggable?
        // Actually user said "happens only in the graph component".
        // If we want to draw ON TOP of everything, append last.
        // But if labels are draggable, we need to decide precedence.
        // If lasso is ACTIVE, it should probably consume events, so on top.

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
            .attr("height", height)
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
</script>

<div
    bind:this={graphDiv}
    bind:clientWidth={width}
    bind:clientHeight={height}
    style="cursor: {store.isLassoActive
        ? 'crosshair'
        : 'default'}; flex: {store.graphWidthPercentage}; height: 100%; min-width: 400px; min-height: 400px; overflow: hidden; position: relative;"
></div>
