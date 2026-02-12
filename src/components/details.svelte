<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";
    import { untrack } from "svelte";

    let container;
    let width = $state(0);
    let height = $state(0);
    const margin = { top: 20, right: 80, bottom: 40, left: 50 }; // Reverted right margin for legend

    let isSwapped = $state(false);

    let canvas;

    let showPlaceholder = $derived(
        !store.selectedFeatures ||
            (store.selectedFeatures.length !== 1 &&
                store.selectedFeatures.length !== 2),
    );

    function drawDetails() {
        console.time("drawDetails");
        if (!container || !width || !height) {
            console.timeEnd("drawDetails");
            return;
        }

        // SVG for axes and legends
        const wrapper = d3.select(container);
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
            .attr("height", height)
            .style("position", "absolute")
            .style("top", "0")
            .style("left", "0")
            .style("pointer-events", "none"); // Let events pass through if needed, though we said no interaction

        const selected = store.selectedFeatures;
        let primaryFeature, secondaryFeature;

        if (selected.length === 1) {
            primaryFeature = selected[0];
        } else {
            // length === 2
            if (isSwapped) {
                primaryFeature = selected[1];
                secondaryFeature = selected[0];
            } else {
                primaryFeature = selected[0];
                secondaryFeature = selected[1];
            }
        }

        // Prepare data
        console.time("prepareData");

        const shapKey = `shap_${primaryFeature}`;

        const plotData = untrack(() => {
            return store.raw_x.map((d, i) => ({
                x: +d[primaryFeature],
                y: store.sv[i][shapKey],
                colorVal: secondaryFeature
                    ? store.x[i][secondaryFeature]
                    : null,
            }));
        });

        console.timeEnd("prepareData");

        // Scales
        console.time("scales");
        const xExtent = d3.extent(plotData, (d) => d.x);
        const xScale = d3
            .scaleLinear()
            .domain(xExtent) // Use extent of raw data
            .range([margin.left, width - margin.right]);

        const yExtent = d3.extent(plotData, (d) => d.y);
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1 || 0.1;
        const yScale = d3
            .scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([height - margin.bottom, margin.top]);
        console.timeEnd("scales");

        // Color Scale
        let colorScale;
        if (secondaryFeature) {
            colorScale = d3
                .scaleLinear()
                .domain([0, 0.5, 1])
                .range([store.minColor, store.midColor, store.maxColor]);
        }

        // Axes
        console.time("axes");
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).ticks(5));

        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).ticks(5));

        // Axis Labels
        svg.append("text")
            .attr("x", (width + margin.left - margin.right) / 2)
            .attr("y", height - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(`${primaryFeature}`);

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height + margin.top - margin.bottom) / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(`SHAP Value (${primaryFeature})`);
        console.timeEnd("axes");

        let colorBinData = [];
        let legendY = 0;
        let legendHeight = 300; // Increased height (2x wider in y direction)
        let legendX = width - 40; // Reverted X position

        // Legend (if 2 features)
        if (secondaryFeature) {
            legendY = (height - legendHeight) / 2;
            const legendWidth = 10; // Reverted width

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
                .text(`${secondaryFeature}`);

            // Low / High Labels
            svg.append("text")
                .attr("x", legendX + legendWidth / 2)
                .attr("y", legendY + legendHeight + 10)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .text("Low");

            svg.append("text")
                .attr("x", legendX + legendWidth / 2)
                .attr("y", legendY - 3)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .text("High");

            // Prepare Color Histogram Data
            const colorHistogram = d3
                .bin()
                .value((d) => d.colorVal)
                .domain([0, 1])
                .thresholds(10);

            colorBinData = colorHistogram(plotData);
        }

        // Histograms & Points (Canvas)
        console.time("points");

        if (canvas) {
            const ctx = canvas.getContext("2d");
            const dpr = window.devicePixelRatio || 1;

            // Set canvas size accounting for DPI
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, width, height);

            // --- 1. X-Axis Histogram (Background) ---
            const xHistogram = d3
                .bin()
                .value((d) => d.x)
                .domain(xScale.domain())
                .thresholds(10);

            const xBins = xHistogram(plotData);
            const xMax = d3.max(xBins, (d) => d.length);

            // Height of histogram: 20% of chart height or fixed px? using 20%
            const histHeight = (height - margin.bottom - margin.top) * 0.2;
            const yHistScale = d3
                .scaleLinear()
                .domain([0, xMax])
                .range([0, histHeight]);

            ctx.fillStyle = "#e0e0e0"; // Light grey

            xBins.forEach((bin) => {
                if (bin.length === 0) return;
                const x0 = xScale(bin.x0);
                const x1 = xScale(bin.x1);
                const barWidth = Math.max(0, x1 - x0 - 1); // -1 for gap
                const barHeight = yHistScale(bin.length);

                // Draw from bottom up
                ctx.fillRect(
                    x0,
                    height - margin.bottom - barHeight,
                    barWidth,
                    barHeight,
                );
            });

            // --- 2. Color-Axis Histogram (Background) ---
            if (secondaryFeature && colorBinData.length > 0) {
                const cMax = d3.max(colorBinData, (d) => d.length);
                const histWidth = 30; // Reverted histogram width

                // We map [0,1] to [legendY + legendHeight, legendY]
                // 0 is at Bottom (legendY + legendHeight), 1 is at Top (legendY)
                const yColorScale = d3
                    .scaleLinear()
                    .domain([0, 1])
                    .range([legendY + legendHeight, legendY]);

                const xColorScale = d3
                    .scaleLinear()
                    .domain([0, cMax])
                    .range([0, histWidth]);

                colorBinData.forEach((bin) => {
                    if (bin.length === 0) return;
                    // bin.x0 is min val, bin.x1 is max val of bin
                    // Y position:
                    const y0 = yColorScale(bin.x0);
                    const y1 = yColorScale(bin.x1);
                    // Since y scale is inverted (larger value = smaller y), y1 < y0.
                    // rect y should be y1, height y0 - y1
                    const barHeight = Math.max(0, y0 - y1 - 1);
                    const barWidth = xColorScale(bin.length);

                    // Align to the left of legendX (legendX - 5 gap - barWidth)
                    ctx.fillRect(
                        legendX - 5 - barWidth,
                        y1,
                        barWidth,
                        barHeight,
                    );
                });
            }

            const TWO_PI = Math.PI * 2;

            // Draw points
            for (let i = 0; i < plotData.length; i++) {
                const d = plotData[i];
                ctx.beginPath();
                ctx.arc(xScale(d.x), yScale(d.y), 3, 0, TWO_PI);
                ctx.fillStyle = secondaryFeature
                    ? colorScale(d.colorVal)
                    : "green";
                // Only opacity if no secondary feature, or always? Original had opacity 1 or 0.4
                ctx.globalAlpha = secondaryFeature ? 1 : 0.4;
                ctx.fill();
            }
            // Reset globalAlpha
            ctx.globalAlpha = 1;
        }
        console.timeEnd("points");
        console.timeEnd("drawDetails");
    }

    $effect(() => {
        store.selectedFeatures;
        store.raw_x;
        store.sv;
        store.x;
        isSwapped;
        width;
        height;
        canvas; // Dependency
        drawDetails();
    });
</script>

<div
    class="details-container"
    style="flex: {100 - store.graphWidthPercentage};"
    bind:this={container}
    bind:clientWidth={width}
    bind:clientHeight={height}
>
    <!-- Canvas for points -->
    <canvas
        bind:this={canvas}
        style="position: absolute; top: 0; left: 0; pointer-events: none;"
    ></canvas>

    {#if store.selectedFeatures && store.selectedFeatures.length === 2}
        <button class="switch-btn" onclick={() => (isSwapped = !isSwapped)}>
            Switch Axis
        </button>
    {/if}

    {#if showPlaceholder}
        <p class="placeholder-text">
            select at least one feature to display details.
        </p>
    {/if}
</div>

<style>
    .details-container {
        height: 100%;
        background-color: transparent;
        border: 2px dashed #a1a1a1;
        overflow: hidden;
        position: relative;
        min-width: 200px;
        border-radius: 8px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .placeholder-text {
        color: #a1a1a1;
        font-size: 16px;
        text-align: center;
        pointer-events: none;
        user-select: none;
    }

    .switch-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 10;
        padding: 5px 10px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }

    .switch-btn:hover {
        background: #f0f0f0;
    }
</style>
