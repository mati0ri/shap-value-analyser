import { store } from "../rune/store.svelte";
import { compute_feature_importance } from "./feature_importance";
import { compute_deterministic_effect } from "./deterministic_effect";
import { compute_direction } from "./direction";

// Helpers

function featureKey(feature) {
  return Array.isArray(feature) ? feature.join("+") : feature;
}

function featureKeySorted(features) {
  return [...features].sort().join("+");
}


function xHasFeature(feature) {
  const col = featureKey(feature);
  return store.x.length > 0 && col in store.x[0];
}

function svHasFeature(feature) {
  const col = "shap_" + featureKey(feature);
  return store.sv.length > 0 && col in store.sv[0];
}

export function cleanGhost() {
  console.log("[clean ghost]");
  store.graph_data = store.graph_data.filter(d => !d.isGhost);
}

function findGhost() {
  return store.graph_data.find(d => d.isGhost);
}

function maxFeatureImportance() {
  return Math.max(
    0,
    ...store.graph_data
      .filter(d => !d.isGhost)
      .map(d => d.feature_importance)
  );
}

function combinations(array, k) {
  const results = [];
  function helper(start, combo) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < array.length; i++) {
      combo.push(array[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return results;
}





// "Real" functions

function add_x_merge(feature) {
  if (xHasFeature(feature)) return;

  const vars = Array.isArray(feature) ? feature : [feature];
  const col = vars.join("+");

  for (let i = 0; i < store.x.length; i++) {
    store.x[i][col] = vars
      .map(v => store.x[i][v])
      .reduce((a, b) => a + b, 0);
  }
}


function add_sv_merge(feature) {
  if (svHasFeature(feature)) return;

  const vars = Array.isArray(feature) ? feature : [feature];
  const col = "shap_" + vars.join("+");

  for (let i = 0; i < store.sv.length; i++) {
    store.sv[i][col] = vars
      .map(v => store.sv[i]["shap_" + v])
      .reduce((a, b) => a + b, 0);
  }
}



function add_feature_to_graph(feature, ghost = false) {
  console.log("[add feature to graph] avec", feature);

  const key = featureKey(feature);

  add_x_merge(feature);
  add_sv_merge(feature);

  cleanGhost();

  const rawImportance = compute_feature_importance(feature);
  const maxCurrent = maxFeatureImportance();

  const feature_importance = ghost
    ? Math.min(rawImportance, maxCurrent)
    : rawImportance;

  if (ghost && feature_importance <= 0) return;

  store.graph_data = [
    ...store.graph_data,
    {
      feature: key,
      feature_importance,
      direction: compute_direction(feature),
      deterministic_effect: compute_deterministic_effect(feature),
      isMerge: Array.isArray(feature) && feature.length > 1,
      isGhost: ghost,
      children: Array.isArray(feature) ? [...feature] : []
    }
  ];
}

export function create_data(new_merges, ghost = false) {
  for (const feature of new_merges) {
    add_feature_to_graph(feature, ghost);
  }
}

export function findInterestingMerges(maxFeatures = 3) {
  const features = store.allFeatures;

  let bestImportance = null;
  let bestDeterministic = null;
  let bestDirection = null;

  let maxImportance = 0;
  let maxDeterministic = 0;
  let maxDirection = 0;

  for (let n = 2; n <= maxFeatures; n++) {
    const combos = combinations(features, n);

    for (const combo of combos) {
      const comboKey = featureKeySorted(combo);

      console.log("[testing combo]", combo);

      const exists = store.merges.some(m => {
        return m.length === combo.length && [...m].sort().join("+") === comboKey;
      });
      if (exists) continue;

      add_x_merge(combo);
      add_sv_merge(combo);

      const fImportance = compute_feature_importance(combo);
      const fDeterministic = compute_deterministic_effect(combo);
      const fDirection = compute_direction(combo);

      if (fImportance > maxImportance) {
        maxImportance = fImportance;
        bestImportance = combo;
      }
      if (fDeterministic > maxDeterministic) {
        maxDeterministic = fDeterministic;
        bestDeterministic = combo;
      }
      if (Math.abs(fDirection) > Math.abs(maxDirection)) {
        maxDirection = fDirection;
        bestDirection = combo;
      }
    }
  }

  return {
    importance: bestImportance,
    deterministic: bestDeterministic,
    direction: bestDirection
  };
}


export function deleteMerge(featureName) {
  store.graph_data = store.graph_data.filter(
    g => g.feature !== featureName
  );

  for (let i = 0; i < store.x.length; i++) {
    delete store.x[i][featureName];
  }

  const svCol = "shap_" + featureName;
  for (let i = 0; i < store.sv.length; i++) {
    delete store.sv[i][svCol];
  }

  store.merges = store.merges.filter(
    mergeArray => mergeArray.join("+") !== featureName
  );
}

export function renameMerge(oldName) {
  // Demander le nouveau nom à l'utilisateur
  const newName = prompt(`Entrez un nouveau nom pour le merge "${oldName}":`);

  if (!newName || newName.trim() === "") {
    console.log("Nom invalide, opération annulée.");
    return;
  }

  // --- Mettre à jour graph_data ---
  store.graph_data = store.graph_data.map((g) => {
    if (g.feature === oldName) {
      return { ...g, feature: newName };
    }
    return g;
  });

  // --- Mettre à jour x ---
  for (let i = 0; i < store.x.length; i++) {
    if (store.x[i][oldName] !== undefined) {
      store.x[i][newName] = store.x[i][oldName];
      delete store.x[i][oldName];
    }
  }

  // --- Mettre à jour sv ---
  const oldSvCol = "shap_" + oldName;
  const newSvCol = "shap_" + newName;
  for (let i = 0; i < store.sv.length; i++) {
    if (store.sv[i][oldSvCol] !== undefined) {
      store.sv[i][newSvCol] = store.sv[i][oldSvCol];
      delete store.sv[i][oldSvCol];
    }
  }

  // --- Mettre à jour store.merges ---
  store.merges = store.merges.map((mergeArray) => {
    if (mergeArray.join("+") === oldName) {
      return [newName];
    }
    return mergeArray;
  });

  console.log(`Merge "${oldName}" renommé en "${newName}" !`);
}
