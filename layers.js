import MapManager from './MapManager.js';

const mapManager = MapManager.getInstance();
let stateLayer = null;
let lgaLayer = null;
let wardLayer = null;

/**
 * Select a state and highlight all its LGAs and wards.
 */
function selectState(stateName) {
    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) return console.error('GeoJSON data is missing.');

    // Filter state features
    const stateFeatures = geojsonData.features.filter(f => f.properties.statename === stateName);
    if (stateFeatures.length === 0) return console.warn(`No data found for state: ${stateName}`);

    // Remove old layers
    clearLayers();

    // Add state layer (outlines only)
    stateLayer = L.geoJSON(stateFeatures, {
        style: { color: '#3498db', weight: 3, fillOpacity: 0 },
        onEachFeature: (feature, layer) => layer.bindPopup(`<b>${feature.properties.statename}</b>`)
    }).addTo(mapManager.getMap());

    // Select and show all LGAs in this state
    selectLGAsInState(stateName);

    // Select and show all wards in this state
    selectWardsInState(stateName);

    // Fit the map to the selected state
    mapManager.getMap().fitBounds(stateLayer.getBounds());
}

/**
 * Select and show all LGAs within a given state.
 */
function selectLGAsInState(stateName) {
    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) return console.error('GeoJSON data is missing.');

    const lgaFeatures = geojsonData.features.filter(f => f.properties.statename === stateName);
    if (lgaFeatures.length === 0) return console.warn(`No LGAs found in state: ${stateName}`);

    // Remove old LGA layer
    if (lgaLayer) mapManager.getMap().removeLayer(lgaLayer);

    // Add LGA layer (separate boundaries for each LGA)
    lgaLayer = L.geoJSON(lgaFeatures, {
        style: { color: '#FF5733', weight: 2, fillOpacity: 0.2, fillColor: '#F5B7B1' },
        onEachFeature: (feature, layer) => layer.bindPopup(`<b>${feature.properties.lganame}</b>`)
    }).addTo(mapManager.getMap());
}

/**
 * Select and show all wards within a given state.
 */
function selectWardsInState(stateName) {
    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) return console.error('GeoJSON data is missing.');

    const wardFeatures = geojsonData.features.filter(f => f.properties.statename === stateName);
    if (wardFeatures.length === 0) return console.warn(`No wards found in state: ${stateName}`);

    // Remove old ward layer
    if (wardLayer) mapManager.getMap().removeLayer(wardLayer);

    // Add ward layer (separate boundaries for each ward)
    wardLayer = L.geoJSON(wardFeatures, {
        style: { color: '#2ecc71', weight: 1, fillOpacity: 0.2, fillColor: '#A9DFBF' },
        onEachFeature: (feature, layer) => layer.bindPopup(`<b>${feature.properties.wardname}</b>`)
    }).addTo(mapManager.getMap());
}

/**
 * Select and show all wards within a specific LGA.
 */
function selectWardsInLGA(lgaName, stateName) {
    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) return console.error('GeoJSON data is missing.');

    const wardFeatures = geojsonData.features.filter(f => 
        f.properties.lganame === lgaName && f.properties.statename === stateName
    );

    if (wardFeatures.length === 0) return console.warn(`No wards found in LGA: ${lgaName}`);

    // Remove previous ward layer to avoid overlaps
    if (wardLayer) mapManager.getMap().removeLayer(wardLayer);

    // Add ward layer for selected LGA
    wardLayer = L.geoJSON(wardFeatures, {
        style: { color: '#2ecc71', weight: 1, fillOpacity: 0.2, fillColor: '#A9DFBF' },
        onEachFeature: (feature, layer) => layer.bindPopup(`<b>${feature.properties.wardname}</b>`)
    }).addTo(mapManager.getMap());

    // Fit the map to show all wards in the selected LGA
    mapManager.getMap().fitBounds(wardLayer.getBounds());
}

/**
 * Clear all layers (state, LGA, ward).
 */
function clearLayers() {
    if (stateLayer) {
        mapManager.getMap().removeLayer(stateLayer);
        stateLayer = null;
    }
    if (lgaLayer) {
        mapManager.getMap().removeLayer(lgaLayer);
        lgaLayer = null;
    }
    if (wardLayer) {
        mapManager.getMap().removeLayer(wardLayer);
        wardLayer = null;
    }
}

export { selectState, selectLGAsInState, selectWardsInState, selectWardsInLGA, clearLayers };
