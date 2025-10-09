// main.js

import { buildDictionaries, buildReverseMappings, buildSenatorialToLga } from './mappings.js';
import { initializeSidebar } from './sidebar.js';
import mapManager from './MapManager.js';

// ✅ Use the singleton map instance
const map = mapManager.getMap();

// Declare mapping variables
let state_to_lga = {}, lga_to_ward = {}, senatorial_to_lga = {}, lga_to_state = {};

// 🔄 Show spinner during data fetch
showSpinner();

Promise.all([
  fetch('./data/state_geojson.geojson').then(res => {
    if (!res.ok) throw new Error(`Failed to load state data (${res.status})`);
    return res.json();
  }),
  fetch('./data/lga_geojson.geojson').then(res => {
    if (!res.ok) throw new Error(`Failed to load LGA data (${res.status})`);
    return res.json();
  }),
  fetch('./data/ward_geojson.geojson').then(res => {
    if (!res.ok) throw new Error(`Failed to load ward data (${res.status})`);
    return res.json();
  }),
  fetch('./data/senatorial.json').then(res => {
    if (!res.ok) throw new Error(`Failed to load senatorial data (${res.status})`);
    return res.json();
  })
])
.then(([stateGeoJSON, lgaGeoJSON, wardGeoJSON, senatorialData]) => {
  try {
    // Validate data
    if (!stateGeoJSON?.features || !lgaGeoJSON?.features || !wardGeoJSON?.features) {
      throw new Error('Invalid GeoJSON data structure');
    }

    // Build mappings
    const mappings = buildDictionaries(stateGeoJSON, lgaGeoJSON, wardGeoJSON);
    const reverseMappings = buildReverseMappings(mappings.state_to_lga, mappings.lga_to_ward);

    state_to_lga = mappings.state_to_lga;
    lga_to_ward = mappings.lga_to_ward;
    lga_to_state = reverseMappings.lga_to_state;

    senatorial_to_lga = buildSenatorialToLga(senatorialData, lgaGeoJSON);

    // Initialize layers on the map
    mapManager.initializeLayers(stateGeoJSON, lgaGeoJSON, wardGeoJSON);

    // Initialize the sidebar controls
    initializeSidebar(senatorial_to_lga, lga_to_state);

    // Fit the map to the bounds of the state layer
    map.fitBounds(mapManager.getStateLayer().getBounds());
  } catch (err) {
    throw new Error(`Data initialization failed: ${err.message}`);
  }
})
.catch(err => {
  console.error('Error initializing map:', err);
  showErrorMessage(`Failed to load map data: ${err.message}. Please refresh the page.`);
})
.finally(() => {
  hideSpinner();
});

/* -------------------------
   UI Event Listeners
------------------------- */

document.getElementById('reset-btn').addEventListener('click', () => {
  showSpinner();

  setTimeout(() => {
    document.getElementById('state-select').value = "";
    document.getElementById('senatorial-select').innerHTML = '<option value="">Select Senatorial District</option>';
    document.getElementById('lga-select').innerHTML = '<option value="">Select LGA</option>';
    document.getElementById('ward-select').innerHTML = '<option value="">Select Ward</option>';

    document.getElementById('senatorial-select').disabled = true;
    document.getElementById('lga-select').disabled = true;
    document.getElementById('ward-select').disabled = true;

    mapManager.getMap().fitBounds(mapManager.getStateLayer().getBounds());
    hideSpinner();
  }, 300); // small delay to show spinner
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

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('collapsed');
});


/* -------------------------
   Spinner Utilities
------------------------- */

function showSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'none';
}

/* -------------------------
   Error Message Display
------------------------- */

function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #fff;
    border: 2px solid #e74c3c;
    border-radius: 8px;
    padding: 20px 30px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    z-index: 10000;
    max-width: 500px;
    text-align: center;
  `;

  errorDiv.innerHTML = `
    <h3 style="color: #e74c3c; margin: 0 0 10px 0;">Error Loading Map</h3>
    <p style="margin: 10px 0; color: #333;">${message}</p>
    <button onclick="location.reload()" style="
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 10px;
    ">Reload Page</button>
  `;

  document.body.appendChild(errorDiv);
}
