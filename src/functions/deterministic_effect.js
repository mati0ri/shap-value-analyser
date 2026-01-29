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
