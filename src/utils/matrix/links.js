export function drawSimpleToMergeLinks(
    selection,
    data,
    { xScale, yScale, strokeColor },
) {
    selection.selectAll("*").remove();

    // Trouver les features simples
    const simpleFeatures = data.filter((d) => !d.isMerge);

    simpleFeatures.forEach((simpleFeature) => {
        const featureName = simpleFeature.feature;

        // Trouver les merges contenant cette feature
        const relevantMerges = data.filter(
            (d) => d.isMerge && d.children.includes(featureName),
        );

        if (relevantMerges.length > 0) {
            // Trouver la merge la plus basse
            let maxY = -1;

            relevantMerges.forEach((merge) => {
                const yPos = yScale(merge.feature) + yScale.bandwidth() / 2;
                if (yPos > maxY) {
                    maxY = yPos;
                }
            });

            const col = featureName;
            const xPos = xScale(col) + xScale.bandwidth() / 2;
            const ySimple = yScale(featureName) + yScale.bandwidth() / 2;

            selection
                .append("line")
                .attr("x1", xPos)
                .attr("y1", ySimple)
                .attr("x2", xPos)
                .attr("y2", maxY)
                .attr("stroke", strokeColor)
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.8);
        }
    });
}
