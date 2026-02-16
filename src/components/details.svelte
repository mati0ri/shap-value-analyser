<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";
    import { untrack } from "svelte";

    let container; // Outer container for width
    let plotWrapper; // Inner wrapper for SVG/Canvas
    let width = $state(0);
    // height is no longer the driving factor for plot height

    // Derived plot height
    let plotHeight = $state(0);

    const margin = { top: 18, right: 80, bottom: 60, left: 100 }; // Top reduced by 2px to account for border

    let canvas;

    let showPlaceholder = $derived(!store.draggedFeatureX);

    // Jitter state
    let jitterX = $state(false);
    let jitterY = $state(false);

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
        wrapper.selectAll("svg").remove();

        if (showPlaceholder) {
            if (canvas) {
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            console.timeEnd("drawDetails");
            return;
        }

        const svg = wrapper
            .append("svg")
            .attr("width", width)
            .attr("height", plotHeight)
            .style("position", "absolute")
            .style("top", "0")
            .style("left", "0")
            .style("pointer-events", "none");

        const primaryFeature = store.draggedFeatureX;
        const secondaryFeature = store.draggedFeatureY;

        // Prepare data
        console.time("prepareData");

        const shapKey = `shap_${primaryFeature}`;
        let shapKeySecondary = null;
        if (secondaryFeature) {
            shapKeySecondary = `shap_${secondaryFeature}`;
        }

        const plotData = untrack(() => {
            return store.raw_x.map((d, i) => {
                if (secondaryFeature) {
                    // Case 2 features: X = feat1, Y = feat2, Color = SHAP1 + SHAP2
                    return {
                        x: +d[primaryFeature],
                        y: +d[secondaryFeature], // Y is now feature value
                        colorVal:
                            store.sv[i][shapKey] +
                            store.sv[i][shapKeySecondary], // Color is sum of SHAP
                    };
                } else {
                    // Case 1 feature: X = feat1, Y = SHAP1
                    return {
                        x: +d[primaryFeature],
                        y: store.sv[i][shapKey],
                        colorVal: null,
                    };
                }
            });
        });

        console.timeEnd("prepareData");

        // Scales
        console.time("scales");
        const xExtent = d3.extent(plotData, (d) => d.x);
        const xScale = d3
            .scaleLinear()
            .domain(xExtent)
            .range([margin.left, width - margin.right]);

        const yExtent = d3.extent(plotData, (d) => d.y);
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1 || 0.1;
        const yScale = d3
            .scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([plotHeight - margin.bottom, margin.top]);
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

        // Axes
        console.time("axes");
        svg.append("g")
            .attr("transform", `translate(0,${plotHeight - margin.bottom})`)
            .call(d3.axisBottom(xScale).ticks(5));

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).ticks(5));

        // Axis Labels (Top of Y axis)
        if (!secondaryFeature) {
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -(plotHeight + margin.top - margin.bottom) / 2)
                .attr("y", 65) // Moved inside
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(`SHAP Value (${primaryFeature})`);
        }
        console.timeEnd("axes");

        let colorBinData = [];
        let legendY = 0;
        let legendHeight = 300;
        let legendX = width - 40;

        // Legend (if 2 features)
        if (secondaryFeature) {
            legendY = (plotHeight - legendHeight) / 2;
            const legendWidth = 10;

            const defs = svg.append("defs");
            const linearGradient = defs
                .append("linearGradient")
                .attr("id", "legend-gradient")
                .attr("x1", "0%")
                .attr("y1", "100%")
                .attr("x2", "0%")
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

            svg.append("rect")
                .attr("x", legendX)
                .attr("y", legendY)
                .attr("width", legendWidth)
                .attr("height", legendHeight)
                .style("fill", "url(#legend-gradient)");

            // Legend Label (Feature Name)
            svg.append("text")
                .attr(
                    "transform",
                    `rotate(90, ${legendX + 25}, ${legendY + legendHeight / 2})`,
                )
                .attr("x", legendX + 25)
                .attr("y", legendY + legendHeight / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(`Sum SHAP (${primaryFeature} + ${secondaryFeature})`);

            // Low / High Labels
            const cExtent = d3.extent(plotData, (d) => d.colorVal);

            svg.append("text")
                .attr("x", legendX + legendWidth / 2)
                .attr("y", legendY + legendHeight + 10)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .text(cExtent[0].toFixed(2));

            svg.append("text")
                .attr("x", legendX + legendWidth / 2)
                .attr("y", legendY - 3)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .text(cExtent[1].toFixed(2));

            // Prepare Color Histogram Data
            const colorHistogram = d3
                .bin()
                .value((d) => d.colorVal)
                .domain(cExtent)
                .thresholds(10);

            colorBinData = colorHistogram(plotData);
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
            const xHistogram = d3
                .bin()
                .value((d) => d.x)
                .domain(xScale.domain())
                .thresholds(10);

            const xBins = xHistogram(plotData);
            const xMax = d3.max(xBins, (d) => d.length);

            const histHeight = (plotHeight - margin.bottom - margin.top) * 0.2;
            const yHistScale = d3
                .scaleLinear()
                .domain([0, xMax])
                .range([0, histHeight]);

            ctx.fillStyle = "#cccccc";

            xBins.forEach((bin) => {
                if (bin.length === 0) return;
                const x0 = xScale(bin.x0);
                const x1 = xScale(bin.x1);
                const barWidth = Math.max(0, x1 - x0 - 1);
                const barHeight = yHistScale(bin.length);

                ctx.fillRect(
                    x0,
                    plotHeight - margin.bottom - barHeight,
                    barWidth,
                    barHeight,
                );
            });

            // --- 2. Color-Axis Histogram (Background) ---
            if (secondaryFeature && colorBinData.length > 0) {
                const cMax = d3.max(colorBinData, (d) => d.length);
                const histWidth = 30;

                const cExtent = d3.extent(plotData, (d) => d.colorVal);
                const yColorScale = d3
                    .scaleLinear()
                    .domain(cExtent)
                    .range([legendY + legendHeight, legendY]);

                const xColorScale = d3
                    .scaleLinear()
                    .domain([0, cMax])
                    .range([0, histWidth]);

                colorBinData.forEach((bin) => {
                    if (bin.length === 0) return;
                    const y0 = yColorScale(bin.x0);
                    const y1 = yColorScale(bin.x1);
                    const barHeight = Math.max(0, y0 - y1 - 1);
                    const barWidth = xColorScale(bin.length);

                    ctx.fillRect(
                        legendX - 5 - barWidth,
                        y1,
                        barWidth,
                        barHeight,
                    );
                });
            }

            const TWO_PI = Math.PI * 2;
            const JITTER_AMOUNT = 20;

            // Draw points
            for (let i = 0; i < plotData.length; i++) {
                const d = plotData[i];
                ctx.beginPath();

                // Deterministic jitter
                const jX = jitterX ? Math.sin(i * 123.45) * JITTER_AMOUNT : 0;
                const jY = jitterY ? Math.cos(i * 678.9) * JITTER_AMOUNT : 0;

                ctx.arc(xScale(d.x) + jX, yScale(d.y) + jY, 3, 0, TWO_PI);
                ctx.fillStyle = secondaryFeature
                    ? colorScale(d.colorVal)
                    : "green";
                ctx.globalAlpha = secondaryFeature ? 1 : 0.4;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        console.timeEnd("points");
        console.timeEnd("drawDetails");
    }

    $effect(() => {
        store.draggedFeatureX; // React to X drag
        store.draggedFeatureY; // React to Y drag
        store.raw_x;
        store.sv;
        store.x;
        store.raw_x;
        store.sv;
        store.x;
        width;
        // height removed from dependencies as it's not used directly
        canvas;
        plotWrapper;
        jitterX;
        jitterY;
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

            <!-- Jitter Controls -->
            <!-- X Axis Jitter: Bottom Right -->
            <label
                class="jitter-control"
                style="bottom: 10px; right: 10px;"
                title="Toggle X-Axis Jitter"
            >
                <input type="checkbox" bind:checked={jitterX} />
                <span>Jitter X</span>
            </label>

            <!-- Y Axis Jitter: Top Left -->
            <label
                class="jitter-control"
                style="top: 10px; left: 10px;"
                title="Toggle Y-Axis Jitter"
            >
                <input type="checkbox" bind:checked={jitterY} />
                <span>Jitter Y</span>
            </label>
        {/if}

        {#if showPlaceholder}
            <p
                class="placeholder-text"
                style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%;"
            >
                Drag a feature from the list to the X-axis box below.
            </p>
        {/if}
    </div>
</div>

<style>
    .details-container {
        height: 100%;
        background-color: #f5f5f5;
        border: 2px dashed #a1a1a1;
        overflow-y: auto;
        position: relative;
        min-width: 200px;
        border-radius: 8px;
        display: block;
        /* display: flex; removed to ensure strict top alignment via block flow */
        /* justify-content: center; */
        /* align-items: flex-start; */
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
        border: 2px dashed #ccc;
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
        bottom: 0px;
        left: 50%;
        transform: translateX(-50%);
        width: 60%;
        height: 30px;
    }

    .color-axis-zone {
        left: 10px;
        right: auto;
        top: 50%;
        transform: translateY(-50%);
        width: 30px;
        height: 60%;
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
        gap: 5px;
        background: rgba(255, 255, 255, 0.8);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        color: #666;
        cursor: pointer;
        z-index: 20;
        border: 1px solid #ddd;
    }

    .jitter-control:hover {
        background: white;
        border-color: #bbb;
    }
</style>
