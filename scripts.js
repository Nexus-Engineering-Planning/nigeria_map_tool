import MapManager from './MapManager.js';
import { showNotification } from './utils.js';

const mapManager = MapManager.getInstance();
let searchLayer = null;

/**
 * Reset highlighting for state layers.
 */
function resetHighlighting() {
    const stateLayer = mapManager.getStateLayer();
    
    if (stateLayer) {
        stateLayer.setStyle({
            color: '#3388ff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.2,
            fillColor: '#add8e6'
        });
    }
}

/**
 * Merge multiple geometries into a single polygon (Improved using Turf.js).
 */
function mergeGeometries(features) {
    if (!features || features.length === 0) return null;

    try {
        const turf = window.turf; // Ensure Turf.js is available
        let merged = features.map(f => f.geometry).reduce((acc, geom) => {
            return acc ? turf.union(acc, geom) : geom;
        });

        return merged;
    } catch (error) {
        console.error("Error merging geometries:", error);
        return null;
    }
}

/**
 * Clear all layers (State, LGA, Ward, Search).
 */
function clearLayers() {
    const map = mapManager.getMap();

    if (mapManager.getStateLayer()) {
        map.removeLayer(mapManager.getStateLayer());
    }
    if (mapManager.getLgaLayer()) {
        map.removeLayer(mapManager.getLgaLayer());
    }
    if (mapManager.getWardLayer()) {
        map.removeLayer(mapManager.getWardLayer());
    }
    if (searchLayer) {
        map.removeLayer(searchLayer);
        searchLayer = null;
    }
}

/**
 * Update the map based on search results.
 */
function updateMapForSearchResults(features) {
    const map = mapManager.getMap();
    clearLayers();

    searchLayer = L.geoJSON(features, {
        style: feature => {
            const type = feature.properties.lganame ? "LGA" : feature.properties.statename ? "State" : "Ward";
            const styles = {
                "State": { color: '#3498db', weight: 2, fillOpacity: 0.3, fillColor: '#85C1E9' },
                "LGA": { color: '#FF5733', weight: 2, fillOpacity: 0.3, fillColor: '#F5B7B1' },
                "Ward": { color: '#2ecc71', weight: 1, fillOpacity: 0.3, fillColor: '#A9DFBF' }
            };
            return styles[type];
        },
        onEachFeature: (feature, layer) => {
            const name = feature.properties.wardname || feature.properties.lganame || feature.properties.statename;
            layer.bindTooltip(`<b>${name}</b>`, { sticky: true });
        }
    }).addTo(map);

    map.fitBounds(searchLayer.getBounds());
}

export { resetHighlighting, mergeGeometries, clearLayers, updateMapForSearchResults };
