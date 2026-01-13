export function computeGreedyLayout(data, {
    xScale,
    yScale,
    width,
    height,
    margin,
    pointSize,
    hideLabels,
    allFeaturesLength
}) {
    const padding = 0;
    const obstacles = [];

    // points
    data.forEach((d) => {
        if (d.isGhost) return;
        const px = xScale(d.deterministic_effect);
        const py = yScale(d.feature_importance);
        const r = pointSize + 5;

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
        .filter((d) => !d.isGhost && !hideLabels)
        .map((d) => ({
            feature: d.feature,
            width: d.feature.length * 7,
            height: 14,
            anchorX: xScale(d.deterministic_effect),
            anchorY: yScale(d.feature_importance),
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
    const numDirs = 64;
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
    const maxValidRings = allFeaturesLength / 3;
    const kNN = Math.round(allFeaturesLength / 4);

    labels.forEach((lbl) => {
        const halfW = lbl.width / 2;
        const halfH = lbl.height / 2;
        const pointR = pointSize;
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

        let best = null;
        let bestScore = -Infinity;

        for (const c of ringCandidates) {
            // Cap du clearance pour éviter que des voisins très lointains ne repoussent le label
            const cappedClearance = Math.min(c.clearance, 100);
            const score = cappedClearance - 0.6 * c.r;

            if (score > bestScore) {
                bestScore = score;
                best = c;
            }
        }

        // Fallback si rien ne va 
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
