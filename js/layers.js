import mapManager from './MapManager.js';

const map = mapManager.getMap();

// Create a highlight layer (add this to MapManager if you want centralized control)
const highlightLayer = L.geoJSON(null, {
  style: {
    color: '#FF0000',
    weight: 3,
    fillOpacity: 0.3
  }
}).addTo(map);

/**
 * Select and highlight a State by name.
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

  stateLayer.eachLayer(layer => {
    if (layer.feature.properties.statename === stateName) {
      highlightLayer.addData(layer.feature);
      map.fitBounds(layer.getBounds());
    }
  });
}

/**
 * Select and highlight all LGAs in a State by state name.
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
