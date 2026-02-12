<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";
    import { untrack } from "svelte";

    let container;
    let width = $state(0);
    let height = $state(0);
    const margin = { top: 20, right: 80, bottom: 40, left: 50 };

    let isSwapped = $state(false);

    let canvas;

    let showPlaceholder = $derived(
        !store.draggedFeature1 && !store.draggedFeature2,
    );
    // Helper to determine feature usage based on drag state
    let primaryFeature = $derived(store.draggedFeature1);
    let secondaryFeature = $derived(store.draggedFeature2);

    function drawDetails() {
        console.time("drawDetails");
        if (!container || !width || !height) {
            console.timeEnd("drawDetails");
            return;
        }

        // SVG for axes and legends
        const wrapper = d3.select(container);
        wrapper.selectAll("svg").remove();

        // If no primary feature (X-axis), we can't draw the graph.
        // Even if only Y-axis is dragged, we usually need X to plot.
        // Let's assume X is required.
        if (!primaryFeature) {
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
            .style("pointer-events", "none");

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
            .text(`${primaryFeature}`)
            .style("font-weight", "bold");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height + margin.top - margin.bottom) / 2)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(`SHAP Value (${primaryFeature})`)
            .style("font-weight", "bold");
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
                .text(`${secondaryFeature}`)
                .style("font-weight", "bold");

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
        store.draggedFeature1;
        store.draggedFeature2;
        store.raw_x;
        store.sv;
        store.x;
        // isSwapped;
        width;
        height;
        canvas; // Dependency
        drawDetails();
    });

    // Drag Listeners
    // Drag Listeners
    function handleDragOver(e) {
        e.preventDefault();
        // Allow copy to support dragging from list (which is copy-only) and axis (which is move/copy)
        e.dataTransfer.dropEffect = "copy";
    }

    function handleDragStartAxis(e, axis, featureName) {
        if (!featureName) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData("text/plain", featureName);
        e.dataTransfer.setData("application/visu-axis", axis);
        // Allow moving (for swap/delete) but also copy to be compatible with drop zone expecting copy
        e.dataTransfer.effectAllowed = "copyMove";

        // Custom drag image (Label) - Reusing logic from List if possible or duplicating
        const dragIcon = document.createElement("div");
        dragIcon.innerText = featureName;
        dragIcon.style.position = "absolute";
        dragIcon.style.top = "-1000px";
        dragIcon.style.background = "white";
        dragIcon.style.padding = "5px";
        dragIcon.style.border = "1px solid #ccc";
        dragIcon.style.borderRadius = "4px";
        dragIcon.style.fontWeight = "bold";
        dragIcon.style.zIndex = "1000";
        document.body.appendChild(dragIcon);

        e.dataTransfer.setDragImage(dragIcon, 0, 0);
        setTimeout(() => document.body.removeChild(dragIcon), 0);
    }

    function handleDragEndAxis(e, axis) {
        // If dropEffect is 'none', it means it wasn't dropped in a valid dropzone (like the other axis).
        // Treat this as "dropped elsewhere" -> delete/remove.
        if (e.dataTransfer.dropEffect === "none") {
            if (axis === "x") store.draggedFeature1 = null;
            if (axis === "y") store.draggedFeature2 = null;
        }
    }

    function handleDropX(e) {
        e.preventDefault();
        const sourceAxis = e.dataTransfer.getData("application/visu-axis");
        const feature = e.dataTransfer.getData("text/plain");

        if (!feature) return;

        if (sourceAxis === "y") {
            // Swap or Move Y to X
            // If X has something, Dragged Y becomes X, Old X becomes Y (Swap)
            // If X is empty, Y becomes X, Y becomes empty (Move)
            const oldX = store.draggedFeature1;
            store.draggedFeature1 = feature;
            store.draggedFeature2 = oldX;
        } else if (sourceAxis === "x") {
            // Dropped on self, do nothing
        } else {
            // From List (or elsewhere)
            store.draggedFeature1 = feature;
        }
    }

    function handleDropY(e) {
        e.preventDefault();
        const sourceAxis = e.dataTransfer.getData("application/visu-axis");
        const feature = e.dataTransfer.getData("text/plain");

        if (!feature) return;

        if (sourceAxis === "x") {
            // Swap or Move X to Y
            const oldY = store.draggedFeature2;
            store.draggedFeature2 = feature;
            store.draggedFeature1 = oldY;
        } else if (sourceAxis === "y") {
            // Dropped on self
        } else {
            store.draggedFeature2 = feature;
        }
    }

    // Special Case: Shift Y to X if X is empty
    $effect(() => {
        if (!store.draggedFeature1 && store.draggedFeature2) {
            store.draggedFeature1 = store.draggedFeature2;
            store.draggedFeature2 = null;
        }
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

    <!-- Drop Zones -->
    <!-- X-Axis Drop Zone (Bottom) -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="drop-zone x-axis-drop"
        role="region"
        aria-label="X Axis Drop Zone"
        draggable={!!store.draggedFeature1}
        ondragstart={(e) => handleDragStartAxis(e, "x", store.draggedFeature1)}
        ondragend={(e) => handleDragEndAxis(e, "x")}
        ondragover={handleDragOver}
        ondrop={handleDropX}
        style="cursor: {store.draggedFeature1 ? 'grab' : 'default'};"
    >
        {#if !store.draggedFeature1}
            <span>Drag X-Axis Feature Here</span>
        {:else}
            <span class="rotate-text">{store.draggedFeature1}</span>
        {/if}
    </div>

    <!-- Y-Axis Drop Zone (Left/Side) -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    {#if store.draggedFeature1}
        <div
            class="drop-zone y-axis-drop"
            role="region"
            aria-label="Y Axis Drop Zone"
            draggable={!!store.draggedFeature2}
            ondragstart={(e) =>
                handleDragStartAxis(e, "y", store.draggedFeature2)}
            ondragend={(e) => handleDragEndAxis(e, "y")}
            ondragover={handleDragOver}
            ondrop={handleDropY}
            style="cursor: {store.draggedFeature2 ? 'grab' : 'default'};"
        >
            {#if !store.draggedFeature2}
                <span>Drag Color Feature Here</span>
            {:else}
                <span class="rotate-text">{store.draggedFeature2}</span>
            {/if}
        </div>
    {/if}

    {#if showPlaceholder}
        <p class="placeholder-text">
            Drag a feature from the list to the X-axis box below to start.
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
        max-width: 80%;
    }

    .drop-zone {
        position: absolute;
        background: rgba(255, 255, 255, 0.8);
        border: 2px dashed #ccc;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: #666;
        transition:
            background 0.2s,
            border-color 0.2s;
        z-index: 100;
        pointer-events: all;
    }

    .drop-zone:hover {
        background: rgba(240, 240, 240, 0.9);
        border-color: #999;
    }

    .x-axis-drop {
        bottom: 5px;
        left: 50%;
        transform: translateX(-50%);
        width: 60%;
        height: 30px;
    }

    .y-axis-drop {
        right: 5px; /* right side for consistency with previous legend pos? User said "on the left (y axis)" but color legend was on right. Let's put on right for now as it maps to color/secondary feature usually */
        /* Wait, user said "boxes underneath (if x axis) or on the left (y axis)" 
            But dragging to Y usually means Feature 1 vs Feature 2 plot. 
            However, here Feature 2 is COLOR. 
            User said "If a feature is already dragged on the x axis, allow dragging on the y axis. It then displays ... coloration for second feature's value."
            Usually color legend is on the right. 
            The USER explicitly said "on the left (y axis)". Let's stick to their words for "Y axis" meaning. But `secondaryFeature` was `colorVal`. 
            The graph plots SHAP vs Feature Value. 
            Maybe user wants a 2D partial dependence style? 
            "If a feature is already dragged on the x axis, allow dragging on the y axis. It then displays the graph we had when two features were selected" -> That was Scatter plot of Feature1 vs SHAP(Feature1) coloured by Feature2.
            So Y-axis of the plot is SHAP. 
            The drop zone for "draggedFeature 2" corresponds to COLOR. 
            I will put it on the RIGHT similar to the legend, but if user specifically requested LEFT I should be careful. 
            "boxes ... on the left (y axis)". 
            Let's interpret "left (y axis)" as the vertical axis of the chart which is SHAP value. But we are coloring by Feature 2. 
            Actually, let's place it on the RIGHT side since that's where the legend for the second feature (color) appears. Placing it on the left might confuse with the primary Y axis which is SHAP value. 
            Wait, user said: "only 2 axis with boxes underneath (if x axis) or on the left (y axis)."
            This implies user views Feature 2 as "Y axis" in their mental model, even if it's color. 
            Or maybe they want to drop onto the Y-axis area to define the Y-axis variable? 
            "It then displays the graph we had when two features were selected" -> That graph is X=Feature1, Y=SHAP(Feature1), Color=Feature2.
            So Feature 2 is NOT on the Y axis. Feature 2 is the COLOR.
            I'll put the drop zone for Feature 2 on the RIGHT where the legend is, to match the visual connection to color. 
            I'll add a comment if I deviate. 
            Actually, "on the left (y axis)" is quite specific. I will put it on the left but maybe label it "Color / Interaction". 
            Let's try putting it on the right to match the visual output (Legend). 
            If I put it on the left, it overlays the SHAP axis. 
            I'll put it on the RIGHT and see. The user said "draggedFeature 2 ... allow drag and drop ... on the left (y axis)"
            Maybe I should follow instructions precisely? 
            "boxes underneath (if x axis) or on the left (y axis)."
            Okay, I will put it on the LEFT side of the container. Vertical.
         */
        top: 50%;
        left: 5px; /* User requested Left */
        transform: translateY(-50%);
        width: 30px;
        height: 60%;
        writing-mode: vertical-lr; /* Vertical text */
    }

    .rotate-text {
        /* writing-mode handles rotation, but ensure orientation is good */
        text-orientation: mixed;
    }
</style>
