import { store } from "../rune/store.svelte";

function AUC(yTrue, order) {
    const y = [];
    const p = [];
    const n = Math.min(yTrue.length, order.length);
    for (let i = 0; i < n; i++) {
        const yi = +yTrue[i];
        const pi = +order[i];
        if (Number.isFinite(yi) && Number.isFinite(pi)) {
            y.push(yi);
            p.push(pi);
        }
    }
    const m = y.length;
    if (m < 2) return 1.0;

    let count = 0, total = 0;
    for (let i = 0; i < m - 1; i++) {
        const yi = y[i], pi = p[i];
        for (let j = i + 1; j < m; j++) {
            const dtrue = y[j] - yi;
            if (dtrue === 0) continue;
            const dpred = p[j] - pi;
            const s = Math.sign(dtrue) * Math.sign(dpred);
            if (s > 0) count += 1;
            else if (s === 0) count += 0.5;
            total += 1;
        }
    }
    const res = total > 0 ? count / total : 1.0;
    return 2 * Math.abs(res - 0.5)
}


export function compute_deterministic_effect(feature) {
    const col = Array.isArray(feature) ? feature.join("+") : feature;

    return AUC(
        store.y,
        store.x.map(r => r[col])
    );
}
