import { store } from "../rune/store.svelte";
import { mean, max } from 'd3-array';

function direction(feature, effect) {

    const n = Math.min(feature.length, effect.length);

    const pairs = [];
    
    for (let i = 0; i < n; i++) {
        const x = +feature[i];
        const s = +effect[i];
        if (Number.isFinite(x) && Number.isFinite(s)) pairs.push({ x, s });
    }
    if (!pairs.length) return 0;

    const meanX = mean(pairs, d => d.x);
    const maxAbs = max(pairs, d => Math.abs(d.s)) || 0;
    if (maxAbs === 0) return 0;

    let acc = 0;
    for (const { x, s } of pairs) {
        const yi = Math.sign(x - meanX);
        const si = s / maxAbs;
        acc += yi * si;
    }
    return acc / pairs.length;
};


export function compute_direction(feature) {
    const col = Array.isArray(feature) ? feature.join("+") : feature;

    return direction(
        store.x.map((r) => r[col]),
        store.sv.map((r) => r["shap_" + col])
    );
}