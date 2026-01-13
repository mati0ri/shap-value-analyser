import * as d3 from "d3";

export function addButtonColumn(
    selection,
    data,
    {
        x,
        y,
        rowHeight,
        buttonSize = 30,
        onClick,
        getIcon,
        getFill,
        additionalEnter = null,
    },
) {
    const group = selection
        .append("g")
        .selectAll("g")
        .data(data)
        .join("g")
        .attr("transform", (d) => {
            const xPos = typeof x === "function" ? x(d) : x;
            return `translate(${xPos}, ${y(d) + (rowHeight - buttonSize) / 2})`;
        })
        .attr("cursor", "pointer")
        .on("click", (event, d) => onClick(event, d))
        .on("mouseenter", function () {
            d3.select(this).select("rect").attr("fill", "#d1d1d1");
        })
        .on("mouseleave", function (event, d) {
            const fillColor = getFill ? getFill(d) : "var(--light-grey)";
            d3.select(this).select("rect").attr("fill", fillColor);
        });

    group.each(function (d) {
        const g = d3.select(this);
        const fillColor = getFill ? getFill(d) : "var(--light-grey)";
        const iconHref = typeof getIcon === "function" ? getIcon(d) : getIcon;

        // Background
        g.append("rect")
            .attr("width", buttonSize)
            .attr("height", buttonSize)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", fillColor);

        // Icon
        g.append("image")
            .attr("href", iconHref)
            .attr("width", 20)
            .attr("height", 20)
            .attr("x", 5)
            .attr("y", 5);

        if (additionalEnter) {
            additionalEnter(g, d);
        }
    });

    return group;
}
