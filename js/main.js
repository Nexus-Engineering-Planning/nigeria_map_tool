// main.js - v3.0 "Single Source of Truth" Architecture

import mapManager from './MapManager.js';

// This will be our single source of truth after initialization.
let nigeriaData = []; // Array of State objects: { name, feature, lgas: [ { name, code, feature, district, wards: [...] } ] }

showSpinner();

const map = mapManager.initializeMap();

mapManager.initializeLayers()
  .then(() => fetch('./data/senatorial.json'))
  .then(res => {
    if (!res.ok) throw new Error(`Failed to load senatorial data (${res.status})`);
    return res.json();
  })
  .then(senatorialData => {
    // Build the unified data tree once the map is ready
    map.once('idle', () => {
      buildDataTree(senatorialData);
      initializeUI();
      mapManager.addOptionalLayers();
      hideSpinner();
    });
  })
  .catch(err => {
    console.error('Error initializing map:', err);
    showErrorMessage(`Failed to load map: ${err.message}. Please refresh the page.`);
    hideSpinner();
  });

/**
 * Normalizes a name for robust matching.
 * @param {string} name The name to normalize.
 * @returns {string} The normalized name.
 */
function normalize(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\\s-/\\\\_]+/g, '') // Remove all whitespace, hyphens, slashes, underscores
    .replace(/lgarea$/, '') // Remove trailing 'lgarea'
    .replace(/lga$/, '') // Remove trailing 'lga'
    .replace(/municipal$/, ''); // Remove trailing 'municipal'
}

/**
 * Builds the unified nigeriaData tree from the flat feature caches.
 * This is the core of the new "bottom-up" architecture.
 * @param {Array} senatorialData The raw senatorial district data.
 */
function buildDataTree(senatorialData) {
  // 1. Create a reverse mapping from normalized LGA name to Senatorial District
  const lgaToDistrictMap = new Map();
  senatorialData.forEach(record => {
    const district = record['Senatorial_District'] || record['district'];
    const lga = record['LGAs'] || record['lga'];
    if (district && lga) {
      lgaToDistrictMap.set(normalize(lga), district);
    }
  });

  // 2. Cache all features from the map
  const statesCache = new Map(map.querySourceFeatures('states', { sourceLayer: mapManager.sourceLayers.states }).map(f => [f.properties.statename, f]));
  const lgasCache = new Map(map.querySourceFeatures('lgas', { sourceLayer: mapManager.sourceLayers.lgas }).map(f => [f.properties.lgacode, f]));
  const wardsCache = new Map(map.querySourceFeatures('wards', { sourceLayer: mapManager.sourceLayers.wards }).map(f => [f.properties.wardcode, f]));

  // 3. Process States into a temporary map
  const statesMap = new Map();
  statesCache.forEach((feature, name) => {
    statesMap.set(name, { name, feature, lgas: [] });
  });

  // 4. Process LGAs and create a direct lookup map for performance
  const lgaCodeToLgaObjectMap = new Map();
  lgasCache.forEach((lgaFeature, lgaCode) => {
    const props = lgaFeature.properties;
    const stateName = props.statename;
    const state = statesMap.get(stateName);

    if (state) {
      const lgaObject = {
        name: props.lganame,
        code: lgaCode,
        feature: lgaFeature,
        district: lgaToDistrictMap.get(normalize(props.lganame)) || 'Unknown',
        wards: []
      };
      state.lgas.push(lgaObject);
      lgaCodeToLgaObjectMap.set(lgaCode, lgaObject); // Add to direct lookup map
    }
  });

  // 5. Process Wards using the fast direct lookup map
  wardsCache.forEach((wardFeature, wardCode) => {
    const props = wardFeature.properties;
    const lgaCode = props.lgacode;
    const parentLga = lgaCodeToLgaObjectMap.get(lgaCode); // Instant lookup
    if (parentLga) {
      parentLga.wards.push({
        name: props.wardname,
        code: wardCode,
        feature: wardFeature
      });
    }
  });

  // 6. Convert the map to our final sorted array
  nigeriaData = Array.from(statesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  nigeriaData.forEach(state => state.lgas.sort((a, b) => a.name.localeCompare(b.name)));
}

/**
 * Initializes all UI event listeners and populates the initial dropdown.
 */
function initializeUI() {
  const sidebar = document.querySelector('.sidebar');
  if (window.innerWidth <= 768) sidebar.classList.add('collapsed');

  const maplibreCtrlContainer = document.querySelector('.maplibregl-ctrl-top-right');
  const customControls = document.querySelector('.map-controls');
  if (maplibreCtrlContainer && customControls) maplibreCtrlContainer.appendChild(customControls);

  document.getElementById('state-select').addEventListener('change', handleStateChange);
  document.getElementById('senatorial-select').addEventListener('change', handleSenatorialChange);
  document.getElementById('lga-select').addEventListener('change', handleLGAChange);
  document.getElementById('ward-select').addEventListener('change', handleWardChange);
  document.getElementById('reset-btn').addEventListener('click', handleReset);

  // Layer Toggles
  document.getElementById('toggle-states').addEventListener('change', e => mapManager.toggleLayer('states-line', e.target.checked));
  document.getElementById('toggle-lgas').addEventListener('change', e => mapManager.toggleLayer('lgas-line', e.target.checked));
  document.getElementById('toggle-wards').addEventListener('change', e => mapManager.toggleLayer('wards-line', e.target.checked));
  document.getElementById('toggle-health').addEventListener('change', e => mapManager.toggleLayer('health', e.target.checked));
  document.getElementById('toggle-roads').addEventListener('change', e => mapManager.toggleLayer('roads', e.target.checked));
  document.getElementById('toggle-pop').addEventListener('change', e => mapManager.toggleLayer('pop', e.target.checked));

  // Search, Sidebar, and Map Controls
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  initializeSidebarControls();
  initializeMapControls();
  initializeSwipeGestures();

  // Initial population
  populateStateDropdown();
}

// --- DROPDOWN POPULATION ---

function populateStateDropdown() {
  const select = document.getElementById('state-select');
  select.innerHTML = '<option value="">All States</option>';
  nigeriaData.forEach(state => {
    select.add(new Option(state.name, state.name));
  });
}

function populateLGADropdown(state) {
  const select = document.getElementById('lga-select');
  select.innerHTML = '<option value="">Select LGA</option>';
  if (state && state.lgas) {
    const nameCounts = state.lgas.reduce((acc, lga) => {
      acc[lga.name] = (acc[lga.name] || 0) + 1;
      return acc;
    }, {});
    state.lgas.forEach(lga => {
      const text = nameCounts[lga.name] > 1 ? `${lga.name} [${lga.code}]` : lga.name;
      select.add(new Option(text, lga.code));
    });
    select.disabled = false;
  } else {
    select.disabled = true;
  }
}

function populateWardDropdown(lga) {
  const select = document.getElementById('ward-select');
  select.innerHTML = '<option value="">Select Ward</option>';
  if (lga && lga.wards) {
    lga.wards.sort((a, b) => a.name.localeCompare(b.name));
    lga.wards.forEach(ward => {
      select.add(new Option(ward.name, ward.code));
    });
    select.disabled = false;
  } else {
    select.disabled = true;
  }
}

function populateSenatorialDropdown(state) {
  const select = document.getElementById('senatorial-select');
  select.innerHTML = '<option value="">Select Senatorial District</option>';
  if (state && state.lgas) {
    const districts = [...new Set(state.lgas.map(lga => lga.district))].sort();
    districts.forEach(district => {
      select.add(new Option(district, district));
    });
    select.disabled = false;
  } else {
    select.disabled = true;
  }
}

// --- EVENT HANDLERS ---

function handleStateChange(e) {
  const stateName = e.target.value;
  mapManager.clearHighlight();
  
  const state = nigeriaData.find(s => s.name === stateName);

  populateLGADropdown(state);
  populateSenatorialDropdown(state);
  populateWardDropdown(null); // Reset wards

  if (state) {
    map.getSource('highlight').setData({ type: 'FeatureCollection', features: [state.feature] });
    map.fitBounds(turf.bbox(state.feature), { padding: 50 });
  } else {
    map.fitBounds([[2.68, 4.27], [14.68, 13.89]], { padding: 20 });
  }
}

function handleLGAChange(e) {
  const lgaCode = e.target.value;
  mapManager.clearHighlight();

  if (!lgaCode) {
    populateWardDropdown(null);
    const stateName = document.getElementById('state-select').value;
    handleStateChange({ target: { value: stateName } }); // Revert to state view
    return;
  }

  let selectedLga = null;
  for (const state of nigeriaData) {
    const lga = state.lgas.find(l => l.code === lgaCode);
    if (lga) {
      selectedLga = lga;
      break;
    }
  }

  if (selectedLga) {
    populateWardDropdown(selectedLga);
    map.getSource('highlight').setData({ type: 'FeatureCollection', features: [selectedLga.feature] });
    map.fitBounds(turf.bbox(selectedLga.feature), { padding: 50 });
  }
}

function handleWardChange(e) {
  const wardCode = e.target.value;
  mapManager.clearHighlight();

  const lgaCode = document.getElementById('lga-select').value;
  if (!wardCode) {
    handleLGAChange({ target: { value: lgaCode } }); // Revert to LGA view
    return;
  }

  let selectedWard = null;
  for (const state of nigeriaData) {
    for (const lga of state.lgas) {
      const ward = lga.wards.find(w => w.code === wardCode);
      if (ward) {
        selectedWard = ward;
        break;
      }
    }
    if (selectedWard) break;
  }

  if (selectedWard) {
    map.getSource('highlight').setData({ type: 'FeatureCollection', features: [selectedWard.feature] });
    map.fitBounds(turf.bbox(selectedWard.feature), { padding: 50 });
  }
}

function handleSenatorialChange(e) {
  const districtName = e.target.value;
  mapManager.clearHighlight();

  const stateName = document.getElementById('state-select').value;
  const state = nigeriaData.find(s => s.name === stateName);
  if (state && districtName) {
    const features = state.lgas.filter(lga => lga.district === districtName).map(lga => lga.feature);
    if (features.length > 0) {
      const featureCollection = { type: 'FeatureCollection', features };
      mapManager.setSenatorialHighlight(featureCollection);
      map.fitBounds(turf.bbox(featureCollection), { padding: 50 });
    }
  }
}

function handleReset() {
  document.getElementById('state-select').value = '';
  handleStateChange({ target: { value: '' } });
}

// --- SEARCH ---

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const suggestionBox = document.getElementById('searchSuggestions');
  if (query.length < 2) {
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
    return;
  }

  const suggestions = [];
  nigeriaData.forEach(state => {
    if (state.name.toLowerCase().includes(query)) {
      suggestions.push({ name: state.name, type: 'State', feature: state.feature });
    }
    state.lgas.forEach(lga => {
      if (lga.name.toLowerCase().includes(query)) {
        suggestions.push({ name: `${lga.name} (${state.name})`, type: 'LGA', feature: lga.feature });
      }
      lga.wards.forEach(ward => {
        if (ward.name.toLowerCase().includes(query)) {
          suggestions.push({ name: `${ward.name} (${lga.name})`, type: 'Ward', feature: ward.feature });
        }
      });
    });
  });

  renderSuggestions(suggestions.slice(0, 15));
}

function renderSuggestions(suggestions) {
  const suggestionBox = document.getElementById('searchSuggestions');
  suggestionBox.innerHTML = '';
  if (suggestions.length === 0) {
    suggestionBox.style.display = 'none';
    return;
  }
  suggestionBox.style.display = 'block';

  suggestions.forEach(({ name, type, feature }) => {
    const div = document.createElement('div');
    div.className = 'search-suggestion';
    div.innerHTML = `<strong>${type}:</strong> ${name}`;
    div.onclick = () => {
      mapManager.clearHighlight();
      map.getSource('highlight').setData({ type: 'FeatureCollection', features: [feature] });
      map.fitBounds(turf.bbox(feature), { padding: 50, maxZoom: 12 });
      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
      document.getElementById('searchInput').value = '';
    };
    suggestionBox.appendChild(div);
  });
}

// --- UI INITIALIZERS ---

function initializeSidebarControls() {
  const sidebar = document.querySelector('.sidebar');
  const expandButton = document.getElementById('expand-button');
  const sidebarHeader = document.querySelector('.sidebar-header');

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    expandButton.classList.add('show');
  });

  expandButton.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    expandButton.classList.remove('show');
  });

  sidebarHeader.addEventListener('click', () => {
    if (window.innerWidth <= 768) sidebar.classList.toggle('collapsed');
  });

  document.getElementById('searchInput').addEventListener('focus', () => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
    }
  });
}

function initializeMapControls() {
  document.getElementById('locate-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported.");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        map.flyTo({ center: coords, zoom: 14 });
        new maplibregl.Marker({ color: '#007aff' }).setLngLat(coords).addTo(map);
      },
      () => alert("Unable to retrieve your location.")
    );
  });

  const focusBtn = document.getElementById('focus-btn');
  focusBtn.addEventListener('click', () => {
    document.body.classList.toggle('focus-mode');
    const isFocused = document.body.classList.contains('focus-mode');
    focusBtn.innerHTML = isFocused ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
    focusBtn.title = isFocused ? 'Exit Focus Mode' : 'Focus Mode';
  });
}

function initializeSwipeGestures() {
  const sidebar = document.querySelector('.sidebar');
  let startY, isDragging = false;

  const onTouchStart = (e) => {
    if (window.innerWidth > 768) return;
    isDragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    sidebar.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    if (currentY - startY > 0) sidebar.classList.add('collapsed');
    else sidebar.classList.remove('collapsed');
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    sidebar.style.transition = '';
  };

  sidebar.addEventListener('touchstart', onTouchStart, { passive: true });
  sidebar.addEventListener('touchmove', onTouchMove, { passive: true });
  sidebar.addEventListener('touchend', onTouchEnd);
}

// --- UTILITY FUNCTIONS ---

function showSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.style.display = 'none';
}

function showErrorMessage(message) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) spinner.innerHTML = `<p style="color: white; text-align: center;">${message}</p>`;
}

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
    }
    return [[minLng, minLat], [maxLng, maxLat]];
  }
};
