<script>
    import * as d3 from "d3";
    import { onMount } from "svelte";
    import { store } from "../rune/store.svelte";
    import { create_data, cleanGhost } from "../functions/create_data";

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

        // guidelines (pointillés vers la axes au hover)
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

        const xLabel = guideGroup
            .append("text")
            .attr("font-size", 14)
            .attr("font-weight", "bold");

        const yLabel = guideGroup
            .append("text")
            .attr("font-size", 14)
            .attr("font-weight", "bold");

        const dirLabel = guideGroup
            .append("text")
            .attr("font-size", 14)
            .attr("font-weight", "bold");

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
                `translate(${legendX + legendW + 70}, ${legendY + legendH / 2}) rotate(90)`,
            )
            .attr("text-anchor", "middle")
            .attr("font-size", 18)
            .text("Direction");

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
                        d.children.forEach((childName) => {
                            const child = data.find(
                                (x) => x.feature === childName,
                            );
                            selectedLinksGroup
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

            hoverMergeLinksGroup.selectAll("*").remove();

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

            if (d.isMerge) {
                allLinks = [];
                linkAllSubsets(d);

                allLinks = removeDuplicateLinks(allLinks);

                const finalLinks = filterLinks(allLinks);

                finalLinks.forEach(({ parent, child, level }) => {
                    const opacity = 0.6 * Math.pow(0.5, level);

                    hoverMergeLinksGroup
                        .append("line")
                        .attr("x1", x(parent.deterministic_effect))
                        .attr("y1", y(parent.feature_importance))
                        .attr("x2", x(child.deterministic_effect))
                        .attr("y2", y(child.feature_importance))
                        .attr("stroke", store.colorSelectedStroke)
                        .attr("stroke-width", 1.5)
                        .attr("stroke-opacity", opacity);
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

        function computeForce(data) {
            // noeuds pour les labels (mobiles)
            const labels = data
                .filter((d) => !d.isGhost && !store.hideLabels)
                .map((d) => {
                    const px = x(d.deterministic_effect);
                    const py = y(d.feature_importance);
                    return {
                        type: "label",
                        feature: d.feature,
                        x: px,
                        y: py + store.pointSize + 15,
                        anchorX: px,
                        anchorY: py + store.pointSize + 15,
                        width: d.feature.length * 6, // moyenne
                        height: 14,
                    };
                });

            // noeuds pour les points (fixes)
            const pointsNodes = data
                .filter((d) => !d.isGhost)
                .map((d) => ({
                    type: "point",
                    // fx et fy figent la position
                    fx: x(d.deterministic_effect),
                    fy: y(d.feature_importance),
                    radius: store.pointSize + 5, // marge de sécurité
                }));

            const allNodes = [...labels, ...pointsNodes];

            const simulation = d3
                .forceSimulation(allNodes)

                // attraction au point d'ancrage
                .force(
                    "x",
                    d3
                        .forceX((d) => (d.type === "label" ? d.anchorX : d.fx))
                        .strength(1),
                )
                .force(
                    "y",
                    d3
                        .forceY((d) => (d.type === "label" ? d.anchorY : d.fy))
                        .strength(1),
                )

                // répulsion
                .force(
                    "charge",
                    d3
                        .forceManyBody()
                        // .strength((d) => (d.type === "label" ? -10 : -20)),
                        .strength(-1),
                )

                // collision
                // on définit un rayon de collision différent selon si c'est un point ou un label
                .force(
                    "collide",
                    d3
                        .forceCollide((d) => {
                            if (d.type === "point") return d.radius;
                            return Math.max(d.width / 2, d.height); // Rayon approximatif pour le texte
                        })
                        .strength(2),
                )

                .stop();

            for (let i = 0; i < 400; i++) simulation.tick();

            return allNodes.filter((d) => d.type === "label");
        }

        const colorScale = d3
            .scaleLinear()
            .domain([-1, 0, 1])
            .range([minColor, midColor, maxColor]);

        const labelLayout = computeForce(data);

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
                    .attr("stroke-width", 1.5)
                    .attr("stroke-opacity", 1);
            } else {
                g.append("circle")
                    .attr("r", store.pointSize)
                    .attr("fill", colorScale(d.direction))
                    .attr("stroke", store.colorStroke)
                    .attr("stroke-width", 1.5)

                    .attr("stroke-opacity", 1);
            }

            updateMergeSelectedLinks();
        });

        const labelGroup = svg.append("g").attr("class", "labels-group");

        labelLayout.forEach((label) => {
            const d = data.find((item) => item.feature === label.feature);
            const g = labelGroup
                .append("g")
                .attr("transform", `translate(${label.x}, ${label.y})`);

            g.append("text")
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(label.feature);

            // ligne entre le point et le label si trop éloigné
            const dist = Math.sqrt(
                Math.pow(label.x - x(d.deterministic_effect), 2) +
                    Math.pow(label.y - y(d.feature_importance), 2),
            );
            if (dist > 40) {
                labelGroup
                    .append("line")
                    .attr("x1", x(d.deterministic_effect))
                    .attr("y1", y(d.feature_importance))
                    .attr("x2", label.x)
                    .attr("y2", label.y)
                    .attr("stroke", "#ccc")
                    .attr("stroke-dasharray", "2,2");
            }
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
