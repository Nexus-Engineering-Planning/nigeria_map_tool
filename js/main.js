// main.js

import { buildDictionaries, buildReverseMappings, buildSenatorialToLga } from './mappings.js';
import { initializeSidebar } from './sidebar.js';
import mapManager from './MapManager.js';

// ✅ Use the singleton map instance
const map = mapManager.getMap();

// Declare mapping variables
let state_to_lga = {}, lga_to_ward = {}, senatorial_to_lga = {}, lga_to_state = {};

// Fetch GeoJSON and JSON data then initialize layers and sidebar
Promise.all([
  fetch('./data/state_geojson.geojson').then(res => res.json()),
  fetch('./data/lga_geojson.geojson').then(res => res.json()),
  fetch('./data/ward_geojson.geojson').then(res => res.json()),
  fetch('./data/senatorial.json').then(res => res.json())
])
.then(([stateGeoJSON, lgaGeoJSON, wardGeoJSON, senatorialData]) => {
  // ✅ Build mappings
  const mappings = buildDictionaries(stateGeoJSON, lgaGeoJSON, wardGeoJSON);
  const reverseMappings = buildReverseMappings(mappings.state_to_lga, mappings.lga_to_ward);

  state_to_lga = mappings.state_to_lga;
  lga_to_ward = mappings.lga_to_ward;
  lga_to_state = reverseMappings.lga_to_state;

  senatorial_to_lga = buildSenatorialToLga(senatorialData, lgaGeoJSON);

  // ✅ Initialize layers on the map
  mapManager.initializeLayers(stateGeoJSON, lgaGeoJSON, wardGeoJSON);

  // ✅ Initialize the sidebar controls
  initializeSidebar(senatorial_to_lga, lga_to_state);

  // ✅ Fit the map to the bounds of the state layer
  map.fitBounds(mapManager.getStateLayer().getBounds());
})
.catch(err => {
  console.error('❌ Error initializing data:', err);
});

/* -------------------------
   UI Event Listeners
------------------------- */

document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('state-select').value = "";
  document.getElementById('senatorial-select').innerHTML = '<option value="">Select Senatorial District</option>';
  document.getElementById('lga-select').innerHTML = '<option value="">Select LGA</option>';
  document.getElementById('ward-select').innerHTML = '<option value="">Select Ward</option>';

  document.getElementById('senatorial-select').disabled = true;
  document.getElementById('lga-select').disabled = true;
  document.getElementById('ward-select').disabled = true;

  mapManager.getMap().fitBounds(mapManager.getStateLayer().getBounds());
});

document.getElementById('toggle-states').addEventListener('change', (e) => {
  if (e.target.checked) {
    map.addLayer(mapManager.getStateLayer());
  } else {
    map.removeLayer(mapManager.getStateLayer());
  }
});

document.getElementById('toggle-lgas').addEventListener('change', (e) => {
  if (e.target.checked) {
    map.addLayer(mapManager.getLgaLayer());
  } else {
    map.removeLayer(mapManager.getLgaLayer());
  }
});

document.getElementById('toggle-wards').addEventListener('change', (e) => {
  if (e.target.checked) {
    map.addLayer(mapManager.getWardLayer());
  } else {
    map.removeLayer(mapManager.getWardLayer());
  }
});
