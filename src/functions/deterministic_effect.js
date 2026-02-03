import { store } from "../rune/store.svelte";

function AUC(effect, feature) {
    // effect : SHAP values
    // feature : feature values

    const e = [];
    const f = [];

    const n = Math.min(effect.length, feature.length);

    for (let i = 0; i < n; i++) {
        const ei = +effect[i];
        const fi = +feature[i];
        if (Number.isFinite(ei) && Number.isFinite(fi)) {
            e.push(ei);
            f.push(fi);
        }
    }
    const m = e.length;
    if (m < 2) return 1.0;



    let count = 0, total = 0;

    for (let i = 0; i < m - 1; i++) {
        const ei = e[i], fi = f[i];
        for (let j = i + 1; j < m; j++) {

            const deltaEffect = e[j] - ei;
            const deltaFeature = f[j] - fi;

            if (deltaFeature === 0) continue;

            const s = deltaEffect * deltaFeature;

            if (s > 0) count += 1;
            else if (s === 0) count += 0.5;

            total += 1;
        }
    }

    const res = total > 0 ? count / total : 1.0;
    // return 2 * Math.abs(res - 0.5)
    return res;
}



export function compute_deterministic_effect(feature) {
    const col = Array.isArray(feature) ? feature.join("+") : feature;

    return AUC(
        store.sv.map(r => r["shap_" + col]),
        store.x.map(r => r[col])
    );
}

function Xi(effect, feature) {
    const nTotal = Math.min(feature.length, effect.length);

    const x = [];
    const y = [];

    for (let i = 0; i < nTotal; i++) {
        const xi = +feature[i];
        const yi = +effect[i];
        if (Number.isFinite(xi) && Number.isFinite(yi)) {
            x.push(xi);
            y.push(yi);
        }
    }

    const n = x.length;
    if (n < 2) return 0;

    // 1. Tri par X
    const indices = Array.from({ length: n }, (_, i) => i);
    indices.sort((a, b) => {
        if (x[a] < x[b]) return -1;
        if (x[a] > x[b]) return 1;
        return a - b;
    });

    const y_ordered = indices.map(i => y[i]);

    // 2. Ranks r (method='max')
    // r_i = nombre de j tel que Y_j <= Y_i
    const sortedY = [...y_ordered].sort((a, b) => a - b);
    const ranks = new Map();
    for (let i = 0; i < n; i++) {
        ranks.set(sortedY[i], i + 1);
    }
    const r = y_ordered.map(v => ranks.get(v));

    // 3. Ranks l (method='max' on -y => nombre de j tel que Y_j >= Y_i)
    const sortedYDesc = [...y_ordered].sort((a, b) => b - a);
    const ranksL = new Map();
    for (let i = 0; i < n; i++) {
        ranksL.set(sortedYDesc[i], i + 1);
    }
    const l = y_ordered.map(v => ranksL.get(v));

    // 4. Calcul
    // num = n * sum(abs(diff(r)))
    let sumDiff = 0;
    for (let i = 0; i < n - 1; i++) {
        sumDiff += Math.abs(r[i + 1] - r[i]);
    }
    const num = n * sumDiff;

    // den = 2 * sum(l * (n - l))
    let sumDen = 0;
    for (let i = 0; i < n; i++) {
        sumDen += l[i] * (n - l[i]);
    }
    const den = 2 * sumDen;

    return den === 0 ? 0 : 1 - (num / den);
}


export function compute_expert_deterministic_effect(feature) {
    const col = Array.isArray(feature) ? feature.join("+") : feature;

    return Xi(
        store.sv.map(r => r["shap_" + col]),
        store.x.map(r => r[col])
    );
}
