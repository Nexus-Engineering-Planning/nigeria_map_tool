// main.js - PMTiles version

import { buildSenatorialToLga } from './mappings.js';
import mapManager from './MapManager.js';

// State for feature lookups
let senatorial_to_lga = {};
// Mappings using unique codes
let state_to_lga = new Map(); // Map<stateName, Array<{name, code}>>
let lga_to_state = new Map(); // Map<lgaCode, stateName>
let lga_to_ward = new Map(); // Map<lgaCode, Array<{name, code}>>

// Feature caches using unique codes as keys
let statesCache = new Map(); // Key: stateName
let lgasCache = new Map();   // Key: lgaCode
let wardsCache = new Map();  // Key: wardCode

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
        state_to_lga.set(stateName, []);
      }
    });

    // Cache LGAs
    const lgaFeatures = map.querySourceFeatures('lgas', {
      sourceLayer: mapManager.sourceLayers.lgas
    });

    lgaFeatures.forEach(feature => {
      const { lganame, statename, lgacode } = feature.properties;

      if (lganame && lgacode && !lgasCache.has(lgacode)) {
        lgasCache.set(lgacode, feature);

        // Build mappings
        if (statename && state_to_lga.has(statename)) {
          state_to_lga.get(statename).push({ name: lganame, code: lgacode });
        }
        lga_to_state.set(lgacode, statename);
        lga_to_ward.set(lgacode, []);
      }
    });

    // Cache Wards
    const wardFeatures = map.querySourceFeatures('wards', {
      sourceLayer: mapManager.sourceLayers.wards
    });

    wardFeatures.forEach(feature => {
      const { wardname, lgacode, wardcode } = feature.properties;

      if (wardname && wardcode && !wardsCache.has(wardcode)) {
        wardsCache.set(wardcode, feature);

        // Build lga_to_ward mapping
        if (lgacode && lga_to_ward.has(lgacode)) {
          lga_to_ward.get(lgacode).push({ name: wardname, code: wardcode });
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
  const sidebar = document.querySelector('.sidebar');
  
  // Ensure sidebar is in the correct state on mobile load
  if (window.innerWidth <= 768) {
    sidebar.classList.add('collapsed');
  }

  // Unify map controls by moving custom buttons into the MapLibre container
  const maplibreCtrlContainer = document.querySelector('.maplibregl-ctrl-top-right');
  const customControls = document.querySelector('.map-controls');
  if (maplibreCtrlContainer && customControls) {
    maplibreCtrlContainer.appendChild(customControls);
  }

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

  // Sidebar toggle logic
  const expandButton = document.getElementById('expand-button');
  const sidebarHeader = document.querySelector('.sidebar-header');

  // Desktop: Collapse button
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    expandButton.classList.add('show');
  });

  // Desktop: Expand button
  expandButton.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    expandButton.classList.remove('show');
  });

  // Mobile: Toggle sidebar by clicking the header
  sidebarHeader.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('collapsed');
    }
  });

  // "My Location" button
  document.getElementById('locate-btn').addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          essential: true
        });

        // Add a marker for the user's location
        new maplibregl.Marker({ color: '#007aff' })
          .setLngLat([longitude, latitude])
          .addTo(map);
      },
      () => {
        alert("Unable to retrieve your location. Please ensure location services are enabled.");
      }
    );
  });

  // Focus Mode button
  const focusBtn = document.getElementById('focus-btn');
  focusBtn.addEventListener('click', () => {
    document.body.classList.toggle('focus-mode');
    const isFocused = document.body.classList.contains('focus-mode');
    focusBtn.innerHTML = isFocused 
      ? '<i class="fa-solid fa-compress"></i>' 
      : '<i class="fa-solid fa-expand"></i>';
    focusBtn.title = isFocused ? 'Exit Focus Mode' : 'Focus Mode';
  });

  // Dynamic Search UI for mobile
  document.getElementById('searchInput').addEventListener('focus', () => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
    }
  });

  initializeSwipeGestures();
}

/**
 * Initializes swipe gestures for the mobile bottom sheet.
 */
function initializeSwipeGestures() {
  const sidebar = document.querySelector('.sidebar');
  let startY;
  let startHeight;
  let isDragging = false;

  const onTouchStart = (e) => {
    if (window.innerWidth > 768) return;
    isDragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startHeight = sidebar.clientHeight;
    sidebar.style.transition = 'none'; // Disable transition during drag
  };

  const onTouchMove = (e) => {
    if (!isDragging || window.innerWidth > 768) return;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = currentY - startY;
    
    // Prevent dragging beyond limits
    if (deltaY > 0) { // Dragging down
        sidebar.classList.add('collapsed');
    } else { // Dragging up
        sidebar.classList.remove('collapsed');
    }
  };

  const onTouchEnd = () => {
    if (!isDragging || window.innerWidth > 768) return;
    isDragging = false;
    sidebar.style.transition = ''; // Re-enable transition
  };

  sidebar.addEventListener('touchstart', onTouchStart, { passive: true });
  sidebar.addEventListener('touchmove', onTouchMove, { passive: true });
  sidebar.addEventListener('touchend', onTouchEnd);
  
  // Also add mouse events for desktop debugging
  sidebar.addEventListener('mousedown', onTouchStart);
  sidebar.addEventListener('mousemove', onTouchMove);
  sidebar.addEventListener('mouseup', onTouchEnd);
  sidebar.addEventListener('mouseleave', onTouchEnd);
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
  
  // Reset senatorial dropdown
  document.getElementById('senatorial-select').innerHTML = '<option value="">Select Senatorial District</option>';

  if (!stateName) {
    map.fitBounds([[2.68, 4.27], [14.68, 13.89]], { padding: 20 });
    document.getElementById('senatorial-select').disabled = true;
    // Let the populator function handle disabling LGA/Ward dropdowns
    populateLGADropdown(null);
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

  // Populate senatorial and LGA dropdowns (which will handle the ward dropdown)
  populateSenatorialDropdown(stateName);
  populateLGADropdown(stateName);
}

/**
 * A robust normalization function for LGA names.
 * @param {string} name The name to normalize.
 * @returns {string} The normalized name.
 */
function normalize(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\s-/\\_]+/g, '') // Remove all whitespace, hyphens, slashes, underscores
    .replace(/lgarea$/, '') // Remove trailing 'lgarea'
    .replace(/lga$/, '') // Remove trailing 'lga'
    .replace(/municipal$/, ''); // Remove trailing 'municipal'
}

/**
 * Populate senatorial dropdown with robust name matching.
 */
function populateSenatorialDropdown(stateName) {
  const senatorialSelect = document.getElementById('senatorial-select');
  senatorialSelect.innerHTML = '<option value="">Select Senatorial District</option>';

  if (!stateName) {
    senatorialSelect.disabled = true;
    return;
  }

  // Get a set of normalized LGA names for the selected state from our cache
  const normalizedLgasInState = new Set(
    (state_to_lga.get(stateName) || []).map(lga => normalize(lga.name))
  );

  const filteredDistricts = new Set();

  // Iterate through all senatorial districts
  for (const district in senatorial_to_lga) {
    const lgasInDistrict = senatorial_to_lga[district] || [];
    // Check if any normalized LGA name from the district exists in our state's set
    for (const lgaName of lgasInDistrict) {
      if (normalizedLgasInState.has(normalize(lgaName))) {
        filteredDistricts.add(district);
        break; // Found a match, no need to check other LGAs in this district
      }
    }
  }

  const sortedDistricts = Array.from(filteredDistricts).sort();

  sortedDistricts.forEach(district => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    senatorialSelect.appendChild(option);
  });

  senatorialSelect.disabled = sortedDistricts.length === 0;
}

/**
 * Handle senatorial change
 */
function handleSenatorialChange(e) {
  const districtName = e.target.value;
  // Clear all previous highlights
  mapManager.clearHighlight();

  if (!districtName) return;

  const lgaNamesInDistrict = new Set(senatorial_to_lga[districtName] || []);
  const features = [];
  
  // Find all LGA features that match the names for the selected district
  lgasCache.forEach(feature => {
    if (lgaNamesInDistrict.has(feature.properties.lganame)) {
      features.push(feature);
    }
  });

  if (features.length > 0) {
    const featureCollection = { type: 'FeatureCollection', features };
    // Use the new dedicated function to show the senatorial layer
    mapManager.setSenatorialHighlight(featureCollection);

    const bbox = turf.bbox(featureCollection);
    map.fitBounds(bbox, { padding: 50 });
  }
}

/**
 * Populate LGA dropdown for a given state, and reset the ward dropdown.
 */
function populateLGADropdown(stateName) {
  const lgaSelect = document.getElementById('lga-select');
  lgaSelect.innerHTML = '<option value="">Select LGA</option>';

  // This function is now also responsible for resetting the ward dropdown
  const wardSelect = document.getElementById('ward-select');
  wardSelect.innerHTML = '<option value="">Select Ward</option>';
  wardSelect.disabled = true;

  if (!stateName) {
    lgaSelect.disabled = true;
    return;
  }

  const lgas = (state_to_lga.get(stateName) || []).sort((a, b) => a.name.localeCompare(b.name));
  
  // Check for duplicate names to disambiguate
  const nameCounts = lgas.reduce((acc, lga) => {
    acc[lga.name] = (acc[lga.name] || 0) + 1;
    return acc;
  }, {});

  lgas.forEach(lga => {
    const option = document.createElement('option');
    option.value = lga.code;
    // If name is not unique within the state, append the code to the label
    option.textContent = nameCounts[lga.name] > 1 ? `${lga.name} [${lga.code}]` : lga.name;
    lgaSelect.appendChild(option);
  });

  lgaSelect.disabled = lgas.length === 0;
}

/**
 * Handle LGA change
 */
function handleLGAChange(e) {
  const lgaCode = e.target.value;
  mapManager.clearHighlight();

  // Always reset the ward dropdown when LGA changes
  const wardSelect = document.getElementById('ward-select');
  wardSelect.innerHTML = '<option value="">Select Ward</option>';
  wardSelect.disabled = true;

  if (!lgaCode) {
    // If "Select LGA" is chosen, re-trigger state change to show state highlight
    const stateSelect = document.getElementById('state-select');
    handleStateChange({ target: { value: stateSelect.value } });
    return;
  }

  const lgaFeature = lgasCache.get(lgaCode);
  if (lgaFeature) {
    map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: [lgaFeature]
    });

    const bbox = turf.bbox(lgaFeature);
    map.fitBounds(bbox, { padding: 50 });
  }

  populateWardDropdown(lgaCode);
}

/**
 * Populate ward dropdown for a given LGA
 */
function populateWardDropdown(lgaCode) {
  const wardSelect = document.getElementById('ward-select');
  wardSelect.innerHTML = '<option value="">Select Ward</option>';

  if (!lgaCode) {
    wardSelect.disabled = true;
    return;
  }

  const wards = (lga_to_ward.get(lgaCode) || []).sort((a, b) => a.name.localeCompare(b.name));

  // Check for duplicate names to disambiguate
  const nameCounts = wards.reduce((acc, ward) => {
    acc[ward.name] = (acc[ward.name] || 0) + 1;
    return acc;
  }, {});

  wards.forEach(ward => {
    const option = document.createElement('option');
    option.value = ward.code;
    option.textContent = nameCounts[ward.name] > 1 ? `${ward.name} [${ward.code}]` : ward.name;
    wardSelect.appendChild(option);
  });

  wardSelect.disabled = wards.length === 0;
}

/**
 * Handle ward change
 */
function handleWardChange(e) {
  const wardCode = e.target.value;
  mapManager.clearHighlight();

  if (!wardCode) {
    // If "Select Ward" is chosen, re-trigger LGA change to show LGA highlight
    const lgaSelect = document.getElementById('lga-select');
    handleLGAChange({ target: { value: lgaSelect.value } });
    return;
  }

  const wardFeature = wardsCache.get(wardCode);
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
 * Handle search input
 */
function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const suggestionBox = document.getElementById('searchSuggestions');

  if (query.length < 2) {
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
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
  lgasCache.forEach((feature) => {
    const lgaName = feature.properties.lganame;
    if (lgaName.toLowerCase().includes(query)) {
      const stateName = feature.properties.statename;
      suggestions.push({ type: 'LGA', name: `${lgaName} (${stateName})`, feature });
    }
  });

  // Search Wards
  wardsCache.forEach((feature) => {
    const wardName = feature.properties.wardname;
    if (wardName.toLowerCase().includes(query)) {
      const lgaName = feature.properties.lganame;
      const stateName = lga_to_state.get(feature.properties.lgacode);
      suggestions.push({ type: 'Ward', name: `${wardName} (${lgaName}, ${stateName})`, feature });
    }
  });

  renderSuggestions(suggestions.slice(0, 15));
}

/**
 * Render search suggestions
 */
function renderSuggestions(suggestions) {
  const suggestionBox = document.getElementById('searchSuggestions');
  if (suggestions.length === 0) {
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
    return;
  }

  suggestionBox.innerHTML = '';
  suggestionBox.style.display = 'block';

  suggestions.forEach(({ type, name, feature }) => {
    const div = document.createElement('div');
    div.className = 'search-suggestion';
    div.innerHTML = `<strong>${type}:</strong> ${name}`;
    div.onclick = () => {
      mapManager.clearHighlight();
      map.getSource('highlight').setData({
        type: 'FeatureCollection',
        features: [feature]
      });

      const bbox = turf.bbox(feature);
      map.fitBounds(bbox, { padding: 50, maxZoom: 12 });

      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
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
      if (typeof coords[0] === 'number' && isFinite(coords[0]) && isFinite(coords[1])) {
        minLng = Math.min(minLng, coords[0]);
        maxLng = Math.max(maxLng, coords[0]);
        minLat = Math.min(minLat, coords[1]);
        maxLat = Math.max(maxLat, coords[1]);
      } else if (Array.isArray(coords)) {
        coords.forEach(processCoords);
      }
    };
    
    if (geojson.type === 'FeatureCollection') {
        geojson.features.forEach(feature => processCoords(feature.geometry.coordinates));
    } else if (geojson.geometry) {
      processCoords(geojson.geometry.coordinates);
    } else if (geojson.coordinates) {
      processCoords(geojson.coordinates);
    }

    return [[minLng, minLat], [maxLng, maxLat]];
  }
};
