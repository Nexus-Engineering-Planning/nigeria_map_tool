// main.js - PMTiles version

import { buildSenatorialToLga } from './mappings.js';
import mapManager from './MapManager.js';

// State for feature lookups
let senatorial_to_lga = {};
let state_to_lga = {};
let lga_to_state = {};
let lga_to_ward = {};

// Feature caches
let statesCache = new Map();
let lgasCache = new Map();
let wardsCache = new Map();

showSpinner();

// Initialize map
const map = mapManager.initializeMap();

// Wait for map to load, then initialize layers
mapManager.initializeLayers()
  .then(() => {
    // Load senatorial data
    return fetch('./data/senatorial.json').then(res => {
      if (!res.ok) throw new Error(`Failed to load senatorial data (${res.status})`);
      return res.json();
    });
  })
  .then((senatorialData) => {
    // Build senatorial mappings
    senatorial_to_lga = buildSenatorialMappings(senatorialData);

    // Add optional layers (health, roads, population)
    mapManager.addOptionalLayers();

    // Cache features for search and dropdowns
    cacheFeatures();

    // Initialize UI
    initializeUI();

    hideSpinner();
  })
  .catch(err => {
    console.error('Error initializing map:', err);
    showErrorMessage(`Failed to load map: ${err.message}. Please refresh the page.`);
    hideSpinner();
  });

/**
 * Build senatorial mappings from JSON data
 */
function buildSenatorialMappings(senatorialData) {
  const senatorial_to_lga = {};

  senatorialData.forEach(record => {
    const district = record['Senatorial_District'] || record['district'];
    const lga = record['LGAs'] || record['lga'];

    if (!district || !lga) return;

    if (!senatorial_to_lga[district]) {
      senatorial_to_lga[district] = [];
    }

    if (!senatorial_to_lga[district].includes(lga)) {
      senatorial_to_lga[district].push(lga);
    }
  });

  return senatorial_to_lga;
}

/**
 * Cache features from PMTiles for search and selection
 */
function cacheFeatures() {
  // Query features when map is idle
  map.once('idle', () => {
    // Cache states
    const stateFeatures = map.querySourceFeatures('states', {
      sourceLayer: mapManager.sourceLayers.states
    });

    stateFeatures.forEach(feature => {
      const stateName = feature.properties.statename;
      if (stateName && !statesCache.has(stateName)) {
        statesCache.set(stateName, feature);

        // Build state_to_lga mapping
        if (!state_to_lga[stateName]) {
          state_to_lga[stateName] = [];
        }
      }
    });

    // Cache LGAs
    const lgaFeatures = map.querySourceFeatures('lgas', {
      sourceLayer: mapManager.sourceLayers.lgas
    });

    lgaFeatures.forEach(feature => {
      const lgaName = feature.properties.lganame;
      const stateName = feature.properties.statename;

      if (lgaName && !lgasCache.has(lgaName)) {
        lgasCache.set(lgaName, feature);

        // Build mappings
        if (stateName) {
          if (!state_to_lga[stateName]) {
            state_to_lga[stateName] = [];
          }
          if (!state_to_lga[stateName].includes(lgaName)) {
            state_to_lga[stateName].push(lgaName);
          }
          lga_to_state[lgaName] = stateName;
        }
      }
    });

    // Cache Wards
    const wardFeatures = map.querySourceFeatures('wards', {
      sourceLayer: mapManager.sourceLayers.wards
    });

    wardFeatures.forEach(feature => {
      const wardName = feature.properties.wardname;
      const lgaName = feature.properties.lganame;

      if (wardName && !wardsCache.has(wardName)) {
        wardsCache.set(wardName, feature);

        // Build lga_to_ward mapping
        if (lgaName) {
          if (!lga_to_ward[lgaName]) {
            lga_to_ward[lgaName] = [];
          }
          if (!lga_to_ward[lgaName].includes(wardName)) {
            lga_to_ward[lgaName].push(wardName);
          }
        }
      }
    });

    // Populate state dropdown
    populateStateDropdown();
  });
}

/**
 * Initialize UI event listeners
 */
function initializeUI() {
  // State selection
  document.getElementById('state-select').addEventListener('change', handleStateChange);

  // Senatorial selection
  document.getElementById('senatorial-select').addEventListener('change', handleSenatorialChange);

  // LGA selection
  document.getElementById('lga-select').addEventListener('change', handleLGAChange);

  // Ward selection
  document.getElementById('ward-select').addEventListener('change', handleWardChange);

  // Reset button
  document.getElementById('reset-btn').addEventListener('click', handleReset);

  // Layer toggles
  document.getElementById('toggle-states').addEventListener('change', (e) => {
    mapManager.toggleLayer('states-line', e.target.checked);
  });

  document.getElementById('toggle-lgas').addEventListener('change', (e) => {
    mapManager.toggleLayer('lgas-line', e.target.checked);
  });

  document.getElementById('toggle-wards').addEventListener('change', (e) => {
    mapManager.toggleLayer('wards-line', e.target.checked);
  });

  document.getElementById('toggle-health').addEventListener('change', (e) => {
    mapManager.toggleLayer('health', e.target.checked);
  });

  document.getElementById('toggle-roads').addEventListener('change', (e) => {
    mapManager.toggleLayer('roads', e.target.checked);
  });

  document.getElementById('toggle-pop').addEventListener('change', (e) => {
    mapManager.toggleLayer('pop', e.target.checked);
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', handleSearch);

  // Sidebar toggle
  const sidebar = document.querySelector('.sidebar');
  const expandButton = document.getElementById('expand-button');

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    expandButton.classList.add('show');
  });

  expandButton.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    expandButton.classList.remove('show');
  });
}

/**
 * Populate state dropdown
 */
function populateStateDropdown() {
  const stateSelect = document.getElementById('state-select');
  stateSelect.innerHTML = '<option value="">All States</option>';

  const states = Array.from(statesCache.keys()).sort();
  states.forEach(stateName => {
    const option = document.createElement('option');
    option.value = stateName;
    option.textContent = stateName;
    stateSelect.appendChild(option);
  });
}

/**
 * Handle state change
 */
function handleStateChange(e) {
  const stateName = e.target.value;
  mapManager.clearHighlight();

  if (!stateName) {
    map.fitBounds([[2.68, 4.27], [14.68, 13.89]], { padding: 20 });
    document.getElementById('senatorial-select').disabled = true;
    document.getElementById('lga-select').disabled = true;
    document.getElementById('ward-select').disabled = true;
    return;
  }

  // Highlight state
  const stateFeature = statesCache.get(stateName);
  if (stateFeature) {
    map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: [stateFeature]
    });

    // Fit to state bounds
    const bbox = turf.bbox(stateFeature);
    map.fitBounds(bbox, { padding: 50 });
  }

  // Populate senatorial and LGA dropdowns
  populateSenatorialDropdown(stateName);
  populateLGADropdown(stateName);
}

/**
 * Populate senatorial dropdown
 */
function populateSenatorialDropdown(stateName) {
  const senatorialSelect = document.getElementById('senatorial-select');
  senatorialSelect.innerHTML = '<option value="">Select Senatorial District</option>';

  if (!stateName) {
    senatorialSelect.disabled = true;
    return;
  }

  const filteredDistricts = Object.keys(senatorial_to_lga).filter(district => {
    const lgas = senatorial_to_lga[district] || [];
    return lgas.some(lga => lga_to_state[lga] === stateName);
  });

  filteredDistricts.forEach(district => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    senatorialSelect.appendChild(option);
  });

  senatorialSelect.disabled = filteredDistricts.length === 0;
}

/**
 * Handle senatorial change
 */
function handleSenatorialChange(e) {
  const districtName = e.target.value;
  mapManager.clearHighlight();

  if (!districtName) return;

  const lgas = senatorial_to_lga[districtName] || [];
  const features = lgas.map(lga => lgasCache.get(lga)).filter(f => f);

  if (features.length > 0) {
    map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: features
    });

    // Calculate combined bounds
    const allCoords = features.flatMap(f =>
      f.geometry.coordinates[0].map(coord => coord)
    );
    const bbox = turf.bbox({
      type: 'MultiPoint',
      coordinates: allCoords
    });
    map.fitBounds(bbox, { padding: 50 });
  }
}

/**
 * Populate LGA dropdown
 */
function populateLGADropdown(stateName) {
  const lgaSelect = document.getElementById('lga-select');
  lgaSelect.innerHTML = '<option value="">Select LGA</option>';

  if (!stateName) {
    lgaSelect.disabled = true;
    return;
  }

  const lgas = (state_to_lga[stateName] || []).sort();
  lgas.forEach(lgaName => {
    const option = document.createElement('option');
    option.value = lgaName;
    option.textContent = lgaName;
    lgaSelect.appendChild(option);
  });

  lgaSelect.disabled = lgas.length === 0;
}

/**
 * Handle LGA change
 */
function handleLGAChange(e) {
  const lgaName = e.target.value;
  mapManager.clearHighlight();

  if (!lgaName) return;

  const lgaFeature = lgasCache.get(lgaName);
  if (lgaFeature) {
    map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: [lgaFeature]
    });

    const bbox = turf.bbox(lgaFeature);
    map.fitBounds(bbox, { padding: 50 });
  }

  populateWardDropdown(lgaName);
}

/**
 * Populate ward dropdown
 */
function populateWardDropdown(lgaName) {
  const wardSelect = document.getElementById('ward-select');
  wardSelect.innerHTML = '<option value="">Select Ward</option>';

  if (!lgaName) {
    wardSelect.disabled = true;
    return;
  }

  const wards = (lga_to_ward[lgaName] || []).sort();
  wards.forEach(wardName => {
    const option = document.createElement('option');
    option.value = wardName;
    option.textContent = wardName;
    wardSelect.appendChild(option);
  });

  wardSelect.disabled = wards.length === 0;
}

/**
 * Handle ward change
 */
function handleWardChange(e) {
  const wardName = e.target.value;
  mapManager.clearHighlight();

  if (!wardName) return;

  const wardFeature = wardsCache.get(wardName);
  if (wardFeature) {
    map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: [wardFeature]
    });

    const bbox = turf.bbox(wardFeature);
    map.fitBounds(bbox, { padding: 50 });
  }
}

/**
 * Handle search
 */
function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const suggestionBox = document.getElementById('searchSuggestions');

  if (!query) {
    suggestionBox.innerHTML = '';
    return;
  }

  const suggestions = [];

  // Search states
  statesCache.forEach((feature, name) => {
    if (name.toLowerCase().includes(query)) {
      suggestions.push({ type: 'State', name, feature });
    }
  });

  // Search LGAs
  lgasCache.forEach((feature, name) => {
    if (name.toLowerCase().includes(query)) {
      suggestions.push({ type: 'LGA', name, feature });
    }
  });

  // Search Wards
  wardsCache.forEach((feature, name) => {
    if (name.toLowerCase().includes(query)) {
      suggestions.push({ type: 'Ward', name, feature });
    }
  });

  renderSuggestions(suggestions.slice(0, 10));
}

/**
 * Render search suggestions
 */
function renderSuggestions(suggestions) {
  const suggestionBox = document.getElementById('searchSuggestions');
  suggestionBox.innerHTML = '';

  suggestions.forEach(({ type, name, feature }) => {
    const div = document.createElement('div');
    div.className = 'search-suggestion';
    div.textContent = `${type}: ${name}`;
    div.onclick = () => {
      mapManager.clearHighlight();
      map.getSource('highlight').setData({
        type: 'FeatureCollection',
        features: [feature]
      });

      const bbox = turf.bbox(feature);
      map.fitBounds(bbox, { padding: 50 });

      suggestionBox.innerHTML = '';
      document.getElementById('searchInput').value = '';
    };
    suggestionBox.appendChild(div);
  });
}

/**
 * Handle reset
 */
function handleReset() {
  document.getElementById('state-select').value = '';
  document.getElementById('senatorial-select').innerHTML = '<option value="">Select Senatorial District</option>';
  document.getElementById('lga-select').innerHTML = '<option value="">Select LGA</option>';
  document.getElementById('ward-select').innerHTML = '<option value="">Select Ward</option>';

  document.getElementById('senatorial-select').disabled = true;
  document.getElementById('lga-select').disabled = true;
  document.getElementById('ward-select').disabled = true;

  mapManager.clearHighlight();
  map.fitBounds([[2.68, 4.27], [14.68, 13.89]], { padding: 20 });
}

/* Utility Functions */

function showSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'none';
}

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

// Add Turf.js for bbox calculations
const turf = {
  bbox: (geojson) => {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    const processCoords = (coords) => {
      if (typeof coords[0] === 'number') {
        minLng = Math.min(minLng, coords[0]);
        maxLng = Math.max(maxLng, coords[0]);
        minLat = Math.min(minLat, coords[1]);
        maxLat = Math.max(maxLat, coords[1]);
      } else {
        coords.forEach(processCoords);
      }
    };

    if (geojson.geometry) {
      processCoords(geojson.geometry.coordinates);
    } else if (geojson.coordinates) {
      processCoords(geojson.coordinates);
    }

    return [[minLng, minLat], [maxLng, maxLat]];
  }
};
