import mapManager from './MapManager.js';

// ✅ Access the shared map instance and highlight layer from MapManager
const map = mapManager.getMap();
const highlightLayer = mapManager.getHighlightLayer();

/**
 * Select and highlight a State by name.
 * @param {string} stateName - Name of the state to highlight.
 */
function selectState(stateName) {
  const stateLayer = mapManager.getStateLayer();
  
  if (!stateLayer) {
    console.error("❌ State Layer not initialized.");
    return;
  }

  highlightLayer.clearLayers();

  if (!stateName) {
    map.fitBounds(stateLayer.getBounds());
    return;
  }

  let found = false;

  stateLayer.eachLayer(layer => {
    if (layer.feature.properties.statename === stateName) {
      highlightLayer.addData(layer.feature);
      map.fitBounds(layer.getBounds());
      found = true;
    }
  });

  if (!found) {
    console.warn(`⚠️ No State found with the name: ${stateName}`);
  }
}

/**
 * Select and highlight all LGAs in a State by state name.
 * @param {string} stateName - Name of the state to highlight its LGAs.
 */
function selectLGAsInState(stateName) {
  const lgaLayer = mapManager.getLgaLayer();
  
  if (!lgaLayer) {
    console.error("❌ LGA Layer not initialized.");
    return;
  }

  highlightLayer.clearLayers();

  const matchingLayers = [];

  lgaLayer.eachLayer(layer => {
    if (layer.feature.properties.statename === stateName) {
      highlightLayer.addData(layer.feature);
      matchingLayers.push(layer);
    }
  });

  if (matchingLayers.length > 0) {
    const groupBounds = L.featureGroup(matchingLayers).getBounds();
    map.fitBounds(groupBounds);
  } else {
    console.warn(`⚠️ No LGAs found for state: ${stateName}`);
  }
}

/**
 * Select and highlight all Wards in an LGA by LGA code.
 * @param {string} lgaCode - Code of the LGA to highlight its Wards.
 */
function selectWardsInLGA(lgaCode) {
  const wardLayer = mapManager.getWardLayer();

  if (!wardLayer) {
    console.error("❌ Ward Layer not initialized.");
    return;
  }

  highlightLayer.clearLayers();

  const matchingLayers = [];

  wardLayer.eachLayer(layer => {
    if (layer.feature.properties.lgacode === lgaCode) {
      highlightLayer.addData(layer.feature);
      matchingLayers.push(layer);
    }
  });

  if (matchingLayers.length > 0) {
    const groupBounds = L.featureGroup(matchingLayers).getBounds();
    map.fitBounds(groupBounds);
  } else {
    console.warn(`⚠️ No Wards found for LGA Code: ${lgaCode}`);
  }
}

/**
 * Select and highlight a Ward by ward code.
 * @param {string} wardCode - Code of the Ward to highlight.
 */
function selectWard(wardCode) {
  const wardLayer = mapManager.getWardLayer();

  if (!wardLayer) {
    console.error("❌ Ward Layer not initialized.");
    return;
  }

  highlightLayer.clearLayers();

  let selectedLayer = null;

  wardLayer.eachLayer(layer => {
    if (layer.feature.properties.wardcode === wardCode) {
      highlightLayer.addData(layer.feature);
      selectedLayer = layer;
    }
  });

  if (selectedLayer) {
    map.fitBounds(selectedLayer.getBounds());
  } else {
    console.warn(`⚠️ No Ward found for ward code: ${wardCode}`);
  }
}

export {
  selectState,
  selectLGAsInState,
  selectWardsInLGA,
  selectWard
};
