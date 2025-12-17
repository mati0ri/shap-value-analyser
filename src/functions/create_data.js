import { store } from "../rune/store.svelte";
import { compute_feature_importance } from "./feature_importance";
import { compute_deterministic_effect } from "./deterministic_effect";
import { compute_direction } from "./direction";

function add_x_merge(feature) {
  const vars = Array.isArray(feature) ? feature : [feature];

  const col = vars.join("+");

  for (let i = 0; i < store.x.length; i++) {
    store.x[i][col] = vars
      .map(v => store.x[i][v])
      .reduce((a, b) => a + b, 0);
  }
}

function add_sv_merge(feature) {
  const vars = Array.isArray(feature) ? feature : [feature];

  const col = "shap_" + vars.join("+");

  for (let i = 0; i < store.sv.length; i++) {
    store.sv[i][col] = vars
      .map(v => store.sv[i]["shap_" + v])
      .reduce((a, b) => a + b, 0);
  }
}

function add_feature_to_graph(feature) {

  const isMerge = Array.isArray(feature) && feature.length > 1;
  const children = isMerge ? [...feature] : [];

  store.graph_data = [
    ...store.graph_data,
    {
      feature: isMerge ? feature.join("+") : feature,
      feature_importance: compute_feature_importance(feature),
      direction: compute_direction(feature),
      deterministic_effect: compute_deterministic_effect(feature),
      isMerge,
      children,
    }
  ];
}


export function create_data(new_merges) {

  for (const feature of new_merges) {
    add_sv_merge(feature);
    add_x_merge(feature);
    add_feature_to_graph(feature);
  }
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
