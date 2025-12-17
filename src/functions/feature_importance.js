import { store } from "../rune/store.svelte";

export function compute_feature_importance(feature) {
    const vars = Array.isArray(feature) ? feature : [feature];
    const col = "shap_" + vars.join("+");
  
    let sum = 0;
    for (const row of store.sv) sum += Math.abs(row[col]);
    
    return sum / store.sv.length;
  }