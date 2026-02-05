<script>
    import * as d3 from "d3";
    import { store } from "../rune/store.svelte";

    let container;
    let width = $state(0);
    let height = $state(0);
    const margin = { top: 20, right: 80, bottom: 40, left: 50 }; // Increased right margin for legend

    let isSwapped = $state(false);

    let showPlaceholder = $derived(
        !store.selectedFeatures ||
            (store.selectedFeatures.length !== 1 &&
                store.selectedFeatures.length !== 2),
    );

    function drawDetails() {
        if (!container || !width || !height) return;

        const wrapper = d3.select(container);
        wrapper.selectAll("svg").remove();

        if (showPlaceholder) return;

        const svg = wrapper
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("position", "absolute")
            .style("top", "0")
            .style("left", "0");

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
        const plotData = store.raw_x.map((d, i) => ({
            x: +d[primaryFeature],
            y: store.sv[i][`shap_${primaryFeature}`],
            colorVal: secondaryFeature ? store.x[i][secondaryFeature] : null,
        }));

        // Scales
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

        // Color Scale
        let colorScale;
        if (secondaryFeature) {
            colorScale = d3
                .scaleLinear()
                .domain([0, 0.5, 1])
                .range([store.minColor, store.midColor, store.maxColor]);
        }

        // Axes
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

        // Legend (if 2 features)
        if (secondaryFeature) {
            const legendHeight = 100;
            const legendWidth = 10;
            const legendX = width - 40;
            const legendY = (height - legendHeight) / 2;

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
                    `rotate(90, ${legendX + 35}, ${legendY + legendHeight / 2})`,
                )
                .attr("x", legendX + 35)
                .attr("y", legendY + legendHeight / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(`${secondaryFeature}`);

            // Low / High Labels
            svg.append("text")
                .attr("x", legendX + legendWidth / 2)
                .attr("y", legendY + legendHeight + 12)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .text("Low");

            svg.append("text")
                .attr("x", legendX + legendWidth / 2)
                .attr("y", legendY - 5)
                .attr("text-anchor", "middle")
                .attr("font-size", "10px")
                .text("High");
        }

        // Points
        svg.append("g")
            .selectAll("circle")
            .data(plotData)
            .join("circle")
            .attr("cx", (d) => xScale(d.x))
            .attr("cy", (d) => yScale(d.y))
            .attr("r", 3)
            .attr("fill", (d) =>
                secondaryFeature ? colorScale(d.colorVal) : "green",
            )
            .attr("opacity", secondaryFeature ? 1 : 0.4);
    }

    $effect(() => {
        store.selectedFeatures;
        isSwapped;
        width;
        height;
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
