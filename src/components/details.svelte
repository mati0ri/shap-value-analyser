<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";
    import { untrack } from "svelte";

    import { tweened } from "svelte/motion";
    import { cubicOut } from "svelte/easing";

    let container; // Outer container for width
    let plotWrapper; // Inner wrapper for SVG/Canvas
    let width = $state(0);

    let plotHeight = $state(0);

    const margin = { top: 18, right: 28, bottom: 165, left: 85 };

    let canvas;

    let showPlaceholder = $derived(!store.draggedFeatureX);

    let jitterX = $state(false);
    let jitterY = $state(false);

    const tJitterX = tweened(0, { duration: 300, easing: cubicOut });
    const tJitterY = tweened(0, { duration: 300, easing: cubicOut });

    // Transition for feature swap/change
    const tFeatures = tweened(1, { duration: 1500, easing: cubicOut });
    let lastDrawnPixels = []; // Store previous positions {x, y, color}
    let lastXBinHeights = new Array(10).fill(0);
    let isFeatureTransition = false;
    let pendingFeatureTransition = $state(false);

    // Track previous features to detect changes
    let prevPrimary = null;
    let prevSecondary = null;

    // Snapshot domains for manual interpolation during transitions
    let snapshotXDomain = [0, 1];
    let snapshotYDomain = [0, 1];

    // Keep track of the *visual* domain from the last frame to use as snapshot on new transition
    let lastVisualXDomain = [0, 1];
    let lastVisualYDomain = [0, 1];

    let snapshotPixels = [];
    let snapshotXBinHeights = new Array(10).fill(0);
    let snapshotColorBinHeights = new Array(10).fill(0);

    $effect(() => {
        const p = primaryFeature;
        const s = secondaryFeature;

        // Convert empty to null for comparison consistency if needed, but store uses null
        if (p !== prevPrimary || s !== prevSecondary) {
            // Feature changed
            if (prevPrimary !== null) {
                // Don't animate on first load
                // Start transition
                isFeatureTransition = true;

                // We need to capture the CURRENT state before the store updates?
                // Actually store already updated derived values.
                // We rely on lastDrawnPixels being populated from the LAST render frame.

                // Reset t to 0 and animate to 1
                tFeatures.set(0, { duration: 0 });
                pendingFeatureTransition = true;

                // Snapshot where the visual state is RIGHT NOW
                snapshotXDomain = lastVisualXDomain;
                snapshotYDomain = lastVisualYDomain;
                snapshotPixels = lastDrawnPixels;
                snapshotXBinHeights = lastXBinHeights;
                snapshotColorBinHeights = lastBinHeights;
            }
            prevPrimary = p;
            prevSecondary = s;
        }
    });

    $effect(() => {
        if (pendingFeatureTransition) return;
        tJitterX.set(jitterX ? 1 : 0);
        tJitterY.set(jitterY ? 1 : 0);
    });

    const primaryFeature = $derived(store.draggedFeatureX);
    const secondaryFeature = $derived(store.draggedFeatureY);

    const plotData = $derived.by(() => {
        // Prepare data
        // console.time("prepareData");

        const _primaryFeature = primaryFeature;
        const _secondaryFeature = secondaryFeature;

        if (!_primaryFeature) return [];

        const shapKey = `shap_${_primaryFeature}`;
        let shapKeySecondary = null;
        if (_secondaryFeature) {
            shapKeySecondary = `shap_${_secondaryFeature}`;
        }

        // Use untrack to prevent recalculation when store.raw_x changes if we wanted to control it strictly,
        // but here we want reactivity on data changes.
        // However, we DON'T want reactivity on chart resizing or jittering.
        // $derived handles dependencies automatically.

        const data = store.raw_x.map((d, i) => {
            if (_secondaryFeature) {
                // Case 2 features: X = feat1, Y = feat2, Color = SHAP1 + SHAP2
                return {
                    x: +d[_primaryFeature],
                    y: +d[_secondaryFeature], // Y is now feature value
                    colorVal:
                        store.sv[i][shapKey] + store.sv[i][shapKeySecondary], // Color is sum of SHAP
                };
            } else {
                // Case 1 feature: X = feat1, Y = SHAP1
                return {
                    x: +d[_primaryFeature],
                    y: store.sv[i][shapKey],
                    colorVal: null,
                };
            }
        });

        // console.timeEnd("prepareData");
        return data;
    });

    // Track previous histogram heights for animation
    let lastBinHeights = new Array(10).fill(0);

    function arrayEquals(a, b) {
        return (
            Array.isArray(a) &&
            Array.isArray(b) &&
            a.length === b.length &&
            a.every((val, index) => val === b[index])
        );
    }

    function drawDetails() {
        console.time("drawDetails");
        if (!plotWrapper || !width) {
            console.timeEnd("drawDetails");
            return;
        }

        // Calculate heights
        const xAxisLen = width - margin.left - margin.right;
        const yAxisLen = xAxisLen;
        plotHeight = yAxisLen + margin.top + margin.bottom;

        // SVG for axes and legends
        const wrapper = d3.select(plotWrapper);

        // Ensure SVG exists with groups
        let svg = wrapper.select("svg");
        if (svg.empty()) {
            svg = wrapper.append("svg");
            svg.append("g").attr("class", "x-axis");
            svg.append("g").attr("class", "y-axis");
            svg.append("defs");
        }

        if (showPlaceholder) {
            if (canvas) {
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            svg.remove();
            console.timeEnd("drawDetails");
            return;
        }

        svg.attr("width", width)
            .attr("height", plotHeight)
            .style("position", "absolute")
            .style("top", "0")
            .style("left", "0")
            .style("pointer-events", "none");

        if (plotData.length === 0) return;
        // Data is now derived outside

        // Scales
        const JITTER_AMOUNT = 20;
        // Use tweened values for interpolation
        const currentJitterX = $tJitterX;
        const currentJitterY = $tJitterY;

        const JITTER_GAP = currentJitterX * (JITTER_AMOUNT + 20);
        const JITTER_GAP_Y = currentJitterY * (JITTER_AMOUNT + 20);

        // Scales
        console.time("scales");
        const xExtent = d3.extent(plotData, (d) => d.x);
        const xScale = d3
            .scaleLinear()
            .domain(xExtent)
            .range([
                margin.left + JITTER_GAP,
                width - margin.right - JITTER_GAP,
            ]);

        const yExtent = d3.extent(plotData, (d) => d.y);
        // Remove default padding, use range padding for jitter instead
        const yScale = d3
            .scaleLinear()
            .domain(yExtent)
            .range([
                plotHeight - margin.bottom - JITTER_GAP_Y,
                margin.top + JITTER_GAP_Y,
            ]);
        console.timeEnd("scales");

        // Color Scale
        let colorScale;
        if (secondaryFeature) {
            const cExtent = d3.extent(plotData, (d) => d.colorVal);
            const maxAbs = Math.max(Math.abs(cExtent[0]), Math.abs(cExtent[1]));

            let domain;
            if (cExtent[0] < 0 && cExtent[1] > 0) {
                domain = [-maxAbs, 0, maxAbs];
            } else {
                domain = [
                    cExtent[0],
                    (cExtent[0] + cExtent[1]) / 2,
                    cExtent[1],
                ];
            }

            colorScale = d3
                .scaleLinear()
                .domain(domain)
                .range([store.minColor, store.midColor, store.maxColor]);
        }

        // --- AXES ---
        const xAxis = d3.axisBottom(xScale).ticks(5);
        const yAxis = d3.axisLeft(yScale).ticks(5);

        const xAxisG = svg
            .select(".x-axis")
            .attr("transform", `translate(0,${plotHeight - margin.bottom})`);

        const yAxisG = svg
            .select(".y-axis")
            .attr("transform", `translate(${margin.left},0)`);

        // MANUAL INTERPOLATION for X Axis
        const targetXDomain = xScale.domain();
        let renderXDomain = targetXDomain;
        if ($tFeatures < 1) {
            renderXDomain = d3.interpolate(
                snapshotXDomain,
                targetXDomain,
            )($tFeatures);
        }
        lastVisualXDomain = renderXDomain; // Save for next frame/snapshot

        // Create temp scale for axis drawing using Current Range (inc. jitter) + Interpolated Domain
        const axisXScale = xScale.copy().domain(renderXDomain);
        xAxis.scale(axisXScale);
        xAxisG.call(xAxis); // Always update to reflect Jitter/Resize AND Domain Transition

        // MANUAL INTERPOLATION for Y Axis
        const targetYDomain = yScale.domain();
        let renderYDomain = targetYDomain;
        if ($tFeatures < 1) {
            renderYDomain = d3.interpolate(
                snapshotYDomain,
                targetYDomain,
            )($tFeatures);
        }
        lastVisualYDomain = renderYDomain; // Save for next frame/snapshot

        const axisYScale = yScale.copy().domain(renderYDomain);
        yAxis.scale(axisYScale);
        yAxisG.call(yAxis);

        // Axis Labels (Top of Y axis)
        svg.selectAll(".y-axis-label").remove(); // Clear previous label to prevent overlap and DOM growth

        if (!secondaryFeature) {
            svg.append("text")
                .attr("class", "y-axis-label")
                .attr("transform", "rotate(-90)")
                .attr("x", -(plotHeight + margin.top - margin.bottom) / 2)
                .attr("y", 60)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(`SHAP Value (${primaryFeature})`);
        }
        console.timeEnd("axes");

        let colorBinData = [];
        let legendY = 0;
        let legendX = margin.left;

        // Legend (if 2 features)
        if (secondaryFeature) {
            const legendWidth = xAxisLen;
            const legendHeight = 8;
            legendY = plotHeight - 35; // position color legend

            const defs = svg.select("defs");
            defs.selectAll("*").remove(); // Clear prev defs

            const linearGradient = defs
                .append("linearGradient")
                .attr("id", "legend-gradient")
                .attr("id", "legend-gradient")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "100%")
                .attr("y2", "0%");

            linearGradient
                .append("stop")
                .attr("offset", "0%")
                .attr("stop-color", store.minColor);

            linearGradient
                .append("stop")
                .attr("offset", "50%")
                .attr("stop-color", store.midColor);

            linearGradient
                .append("stop")
                .attr("offset", "100%")
                .attr("stop-color", store.maxColor);

            svg.selectAll(".legend-rect").remove();
            svg.append("rect")
                .attr("class", "legend-rect")
                .attr("x", legendX)
                .attr("y", legendY)
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#legend-gradient)");

            svg.selectAll(".legend-text").remove();
            // Legend Label (Feature Name)
            svg.append("text")
                .attr("class", "legend-text")
                .attr("x", legendX + legendWidth / 2)
                .attr("y", legendY + legendHeight + 15)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(`Sum SHAP (${primaryFeature} + ${secondaryFeature})`);

            // Low / High Labels
            const cExtent = d3.extent(plotData, (d) => d.colorVal);
            const maxAbs = Math.max(Math.abs(cExtent[0]), Math.abs(cExtent[1]));
            // Use same domain logic as colorScale for labels if symmetrical
            let displayMin = cExtent[0];
            let displayMax = cExtent[1];
            if (cExtent[0] < 0 && cExtent[1] > 0) {
                displayMin = -maxAbs;
                displayMax = maxAbs;
            }

            svg.selectAll(".legend-limit-text").remove();
            svg.append("text")
                .attr("class", "legend-limit-text")
                .attr("x", legendX)
                .attr("y", legendY + legendHeight + 12)
                .attr("text-anchor", "start")
                .attr("font-size", "10px")
                .text(displayMin.toFixed(2));

            svg.append("text")
                .attr("class", "legend-limit-text")
                .attr("x", legendX + legendWidth)
                .attr("y", legendY + legendHeight + 12)
                .attr("text-anchor", "end")
                .attr("font-size", "10px")
                .text(displayMax.toFixed(2));

            // Prepare Color Histogram Data
            // We need to bin based on the full domain to match the visual width
            let domain;
            if (cExtent[0] < 0 && cExtent[1] > 0) {
                domain = [-maxAbs, maxAbs];
            } else {
                domain = cExtent;
            }

            // Create explicit thresholds for exactly 10 bins
            const step = (domain[1] - domain[0]) / 10;
            const thresholds = Array.from({ length: 11 }, (_, i) => {
                const t = domain[0] + i * step;
                // Ensure the last threshold is slightly higher to include max value if precision issues
                if (i === 10) return Math.max(t, domain[1]) + 1e-9;
                return t;
            });

            const colorHistogram = d3
                .bin()
                .value((d) => d.colorVal)
                .domain(domain)
                .thresholds(thresholds); // Use explicit thresholds

            colorBinData = colorHistogram(plotData);
        } else {
            const defs = svg.select("defs");
            defs.selectAll("*").remove();
            svg.selectAll(".legend-rect").remove();
            svg.selectAll(".legend-limit-text").remove();

            // Clean up old text first
            svg.selectAll(".legend-text").remove();

            // Add placeholder text
            const legendWidth = xAxisLen;
            const legendHeight = 8;
            legendY = plotHeight - 35;

            svg.append("text")
                .attr("class", "legend-text")
                .attr("x", (margin.left + legendWidth + margin.right) / 2)
                .attr("y", legendY)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .style("fill", "#999")
                .text(
                    "Drop a feature in the second drop zone to display SHAP distribution",
                );
        }

        // Histograms & Points (Canvas)
        console.time("points");

        if (canvas) {
            const ctx = canvas.getContext("2d");
            const dpr = window.devicePixelRatio || 1;

            canvas.width = width * dpr;
            canvas.height = plotHeight * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${plotHeight}px`;

            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, width, plotHeight);

            // --- 1. X-Axis Histogram (Background) ---
            const xDomain = xScale.domain();
            const xStep = (xDomain[1] - xDomain[0]) / 10;
            const xThresholds = Array.from({ length: 11 }, (_, i) => {
                const t = xDomain[0] + i * xStep;
                if (i === 10) return Math.max(t, xDomain[1]) + 1e-9;
                return t;
            });

            const xHistogram = d3
                .bin()
                .value((d) => d.x)
                .domain(xDomain)
                .thresholds(xThresholds);

            const xBins = xHistogram(plotData);
            const xMax = d3.max(xBins, (d) => d.length);

            const histHeight = (plotHeight - margin.bottom - margin.top) * 0.2;
            const yHistScale = d3
                .scaleLinear()
                .domain([0, xMax])
                .range([0, histHeight]);

            ctx.fillStyle = "#cccccc";

            // Temporary array for next frame heights
            const frameXBinHeights = new Array(10).fill(0);

            xBins.forEach((bin, i) => {
                // if (bin.length === 0) return; // Don't skip for animation calculation
                // The bin index i matches our 10 bins because we forced thresholds

                // Map bin boundaries to pixels
                const x0 = xScale(bin.x0);
                const x1 = xScale(bin.x1);
                // Ensure bars don't overlap with 1px gap if possible, but handle small widths
                const barWidth = Math.max(0, x1 - x0 - 1);

                let targetHeight = 0;
                if (bin.length > 0) {
                    targetHeight = yHistScale(bin.length);
                }

                // Interpolate height
                let renderHeight = targetHeight;
                if ($tFeatures < 1 && snapshotXBinHeights[i] !== undefined) {
                    renderHeight =
                        snapshotXBinHeights[i] +
                        (targetHeight - snapshotXBinHeights[i]) * $tFeatures;
                }

                frameXBinHeights[i] = renderHeight;

                if (renderHeight > 0) {
                    ctx.fillRect(
                        x0,
                        plotHeight - margin.bottom - renderHeight,
                        barWidth,
                        renderHeight,
                    );
                }
            });

            //Update last heights
            lastXBinHeights = frameXBinHeights;

            // --- 2. Color-Axis Histogram (Background) ---
            if (secondaryFeature && colorBinData.length > 0) {
                const cMax = d3.max(colorBinData, (d) => d.length);

                // Available height for histogram: above legend
                const histBaseY = legendY;
                const colorHistHeight = 60;

                const cExtent = d3.extent(plotData, (d) => d.colorVal);
                const maxAbs = Math.max(
                    Math.abs(cExtent[0]),
                    Math.abs(cExtent[1]),
                );
                let domain;
                if (cExtent[0] < 0 && cExtent[1] > 0) {
                    domain = [-maxAbs, maxAbs];
                } else {
                    domain = cExtent;
                }

                const xColorScale = d3
                    .scaleLinear()
                    .domain(domain)
                    .range([margin.left, width - margin.right]); // Match x-axis range logic (adjust for legend width)

                const yColorScale = d3
                    .scaleLinear()
                    .domain([0, cMax])
                    .range([0, colorHistHeight]);

                ctx.fillStyle = "#cccccc";

                // Calculate exact bin heights for animation
                const currentBinHeights = new Array(10).fill(0);

                // Pre-calculate current frame heights
                colorBinData.forEach((bin, i) => {
                    // Find index in thresholds?
                    // Actually colorBinData is already binned.
                    // But d3.bin might return fewer bins if empty?
                    // We forced thresholds, so colorBinData length should be 11 (10 bins + potential outliers?)
                    // d3.bin with N thresholds returns N+1 bins.
                    // We used 11 thresholds -> 10 bins? No, 11 thresholds define 10 bins between them?
                    // d3.bin().thresholds([0, 0.1, ... 1]) -> 11 thresholds -> 12 bins?
                    // Let's check logic:
                    // domain = [min, max], thresholds = min + i*step (11 values).
                    // thresholds = [t0, t1, ... t10]. t0=min, t10=max.
                    // bins: (-inf, t0), [t0, t1), ... [t9, t10), [t10, inf).
                    // So we have 12 bins.
                    // But we only want to draw the inner 10.
                    // In the drawing loop:
                    // x0 = xColorScale(bin.x0)
                    // We need to map bin index to our 10 slots.
                    // The drawing loop iterates colorBinData.
                });

                // Let's just interpolate the heights as we draw them.
                // But we need to map them by INDEX to persist state.
                // Assuming colorBinData structure is stable (it should be with fixed thresholds).
                // However, d3.bin result length depends on thresholds count.
                // We passed 11 thresholds. result should be 12 bins.
                // We should only draw the middle 10?
                // The drawing loop uses xColorScale(bin.x0).

                // New strategy:
                // We will store the interpolated heights in a temporary array during the loop
                // and update result at end.

                const frameBinHeights = new Array(
                    Math.max(10, colorBinData.length),
                ).fill(0);

                colorBinData.forEach((bin, i) => {
                    // if (bin.length === 0) return; // Don't skip for animation calc

                    const x0 = xColorScale(bin.x0);
                    const x1 = xColorScale(bin.x1);
                    const barWidth = Math.max(0, x1 - x0 - 1);

                    let targetHeight = 0;
                    if (bin.length > 0) {
                        const rawHeight = yColorScale(bin.length);
                        targetHeight = Math.max(2, rawHeight);
                    }

                    // Interpolate
                    let renderHeight = targetHeight;
                    if (
                        $tFeatures < 1 &&
                        snapshotColorBinHeights[i] !== undefined
                    ) {
                        renderHeight =
                            snapshotColorBinHeights[i] +
                            (targetHeight - snapshotColorBinHeights[i]) *
                                $tFeatures;
                    }

                    frameBinHeights[i] = renderHeight;

                    if (renderHeight > 0) {
                        ctx.fillRect(
                            x0,
                            histBaseY - renderHeight,
                            barWidth,
                            renderHeight,
                        );
                    }
                });

                // Update last heights
                lastBinHeights = frameBinHeights;
            } else {
                lastBinHeights = new Array(10).fill(0);
            }

            const TWO_PI = Math.PI * 2;

            // Draw points
            const t = $tFeatures; // 0 to 1
            const doInterpolate =
                t < 1 && snapshotPixels.length === plotData.length;

            // Temporary array to store current frame pixels to save as lastDrawn for next frame
            // Only strictly needed if we want to chain transitions or for the next completely different transition.
            // But actually we just need to save the FINAL state when t=1.

            const currentFramePixels = new Array(plotData.length);

            for (let i = 0; i < plotData.length; i++) {
                const d = plotData[i];
                ctx.beginPath();

                // Deterministic jitter with interpolation
                const jX =
                    currentJitterX * Math.sin(i * 123.45) * JITTER_AMOUNT;
                const jY = currentJitterY * Math.cos(i * 678.9) * JITTER_AMOUNT;

                let targetX = xScale(d.x) + jX;
                let targetY = yScale(d.y) + jY;

                // Interpolate positions if in transition
                if (doInterpolate) {
                    const prev = snapshotPixels[i];
                    if (prev) {
                        targetX = prev.x + (targetX - prev.x) * t;
                        targetY = prev.y + (targetY - prev.y) * t;
                    }
                }

                // Store for next transition
                currentFramePixels[i] = { x: targetX, y: targetY };

                ctx.arc(targetX, targetY, 3, 0, TWO_PI);
                ctx.fillStyle = secondaryFeature
                    ? colorScale(d.colorVal)
                    : "green";
                ctx.globalAlpha = secondaryFeature ? 1 : 0.4;
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // If animation finished (or effectively strict end), update lastDrawnPixels
            // We update it every frame so that if we interrupt (change feature mid-transition),
            // the next transition starts from WHERE WE ARE NOW.
            lastDrawnPixels = currentFramePixels;
        }

        if (pendingFeatureTransition) {
            pendingFeatureTransition = false;
            // Start the animation in the next tick to ensure the current frame (t=0) is rendered
            requestAnimationFrame(() => {
                tFeatures.set(1);
            });
        }

        // console.timeEnd("points");
        // console.timeEnd("drawDetails");
    }

    $effect(() => {
        // Dependencies
        plotData; // React to data changes
        width;
        canvas;
        plotWrapper;
        $tJitterX; // React to jitter animation frames
        $tJitterY; // React to jitter animation frames
        $tFeatures; // React to feature transition frames
        drawDetails();
    });
</script>

<div
    class="details-container"
    style="flex: {100 - store.graphWidthPercentage};"
    bind:clientWidth={width}
>
    <div
        bind:this={plotWrapper}
        style="width: {width}px; height: {plotHeight}px; position: relative;"
    >
        <!-- Canvas for points -->
        <canvas
            bind:this={canvas}
            style="position: absolute; top: 0; left: 0; pointer-events: none;"
        ></canvas>

        <!-- Drop Zones -->
        <div
            class="drop-zone x-axis-zone"
            data-zone-type="x"
            class:active={store.draggingFeature}
        >
            {#if store.draggedFeatureX}
                <span>{store.draggedFeatureX}</span>
                <button
                    class="remove-btn"
                    onclick={(e) => {
                        e.stopPropagation();
                        if (store.draggedFeatureY) {
                            store.draggedFeatureX = store.draggedFeatureY;
                            store.draggedFeatureY = null;
                        } else {
                            store.draggedFeatureX = null;
                        }
                    }}
                >
                    ×
                </button>
            {:else}
                Drop A Feature Here
            {/if}
        </div>

        <!-- Only show color drop zone if X axis is populated -->
        {#if store.draggedFeatureX}
            <div
                class="drop-zone color-axis-zone"
                data-zone-type="color"
                class:active={store.draggingFeature}
            >
                <div
                    style="transform: rotate(-90deg); white-space: nowrap; display: flex; align-items: center; justify-content: center; gap: 5px;"
                >
                    {#if store.draggedFeatureY}
                        <span>{store.draggedFeatureY}</span>
                        <button
                            class="remove-btn"
                            onclick={(e) => {
                                e.stopPropagation();
                                store.draggedFeatureY = null;
                            }}
                        >
                            ×
                        </button>
                    {:else}
                        Drop Second Feature Here
                    {/if}
                </div>
            </div>

            {#if store.draggedFeatureY}
                <!-- Axis Swap Button -->
                <button
                    class="axis-swap-btn"
                    title="Swap X and Y Features"
                    onclick={(e) => {
                        e.stopPropagation();
                        const tempX = store.draggedFeatureX;
                        const tempY = store.draggedFeatureY;
                        store.draggedFeatureX = tempY;
                        store.draggedFeatureY = tempX;

                        // Swap jitter states
                        const tempJitterX = jitterX;
                        const tempJitterY = jitterY;
                        jitterX = tempJitterY; // Assign directly since they are $state
                        jitterY = tempJitterX;
                    }}
                >
                    <img
                        src="/icones/swap.svg"
                        alt="Swap"
                        width="16"
                        height="16"
                    />
                </button>
            {/if}

            <!-- X Axis Jitter: Bottom Right -->
            <button
                class="jitter-control"
                style="bottom: 110px; right: 28px; background-color: {jitterX
                    ? store.primary
                    : 'rgba(200, 200, 200, 0.5)'}; color: {jitterX
                    ? 'white'
                    : '#666'};"
                title="Toggle X-Axis Jitter"
                onclick={() => (jitterX = !jitterX)}
            >
                <span>Jitter X</span>
            </button>

            <!-- Y Axis Jitter: Top Left -->
            <button
                class="jitter-control"
                style="top: 18px; left: 10px; transform: rotate(-90deg) translateX(-100%); transform-origin: top left; background-color: {jitterY
                    ? store.primary
                    : 'rgba(200, 200, 200, 0.5)'}; color: {jitterY
                    ? 'white'
                    : '#666'};"
                title="Toggle Y-Axis Jitter"
                onclick={() => (jitterY = !jitterY)}
            >
                <span>Jitter Y</span>
            </button>
        {/if}

        {#if showPlaceholder}
            <p
                class="placeholder-text"
                style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%;"
            >
                Drag a feature from the list or the graph to the X-axis box
                below.
            </p>
        {/if}
    </div>
</div>

<style>
    .details-container {
        height: 100%;
        background-color: #e9e9e9;
        /* border: 2px dashed #a1a1a1; */
        overflow-y: auto;
        position: relative;
        min-width: 200px;
        border-radius: 8px;
        display: block;
    }

    .placeholder-text {
        color: #a1a1a1;
        font-size: 16px;
        text-align: center;
        pointer-events: none;
        user-select: none;
        padding: 20px;
    }

    .drop-zone {
        position: absolute;
        background: rgba(255, 255, 255, 0.9);
        /* border: 2px dashed #ccc; */
        border-radius: 4px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 12px;
        color: #666;
        transition: all 0.2s;
        z-index: 10;
        pointer-events: auto; /* Allow mouse events for drop detection */
    }

    .drop-zone.active {
        border-color: #007ffa;
        background: rgba(0, 127, 250, 0.1);
    }

    .drop-zone.active:hover {
        border-color: #28a745;
        background: rgba(40, 167, 69, 0.1);
    }

    .x-axis-zone {
        bottom: 110px;
        left: 85px; /* Alignment with Y-axis */
        right: 120px; /* Leave space for Jitter X button */
        width: auto;
        transform: none;
        height: 30px;
    }

    .color-axis-zone {
        left: 10px;
        right: auto;
        bottom: 165px; /* Alignment with X-axis */
        top: 120px; /* Leave space for Jitter Y button */
        height: auto;
        transform: none;
        width: 30px;
    }

    .remove-btn {
        background: none;
        border: none;
        color: #999;
        font-weight: bold;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
    }

    .remove-btn:hover {
        color: #e04338;
    }

    .jitter-control {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        /* background set inline for dynamic color */
        padding: 0 8px; /* Remove vertical padding, use height for centering */
        height: 30px; /* Match drop zone height */
        border-radius: 4px;
        font-size: 11px;
        /* color set inline */
        cursor: pointer;
        z-index: 20;
        border: none;
        transition:
            background-color 0.2s,
            color 0.2s;
    }

    .jitter-control:hover {
        opacity: 0.9;
    }

    .axis-swap-btn {
        position: absolute;
        bottom: 110px;
        left: 10px;
        width: 30px;
        height: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        z-index: 25;
        transition: all 0.2s;
        border: none;
    }

    .axis-swap-btn:hover {
        background: #f0f0f0;
    }
</style>
