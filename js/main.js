// main.js - v2.0 "Single Source of Truth" Architecture

import mapManager from './MapManager.js';

// Development mode flag - set to false for production
const DEBUG = false;

// This will be our single source of truth after initialization.
let nigeriaData = []; // Array of State objects: { name, feature, lgas: [ { name, code, feature, district, wards: [...] } ] }

// Global lookup maps for O(1) performance
let lgaCodeMap = new Map(); // Map<lgaCode, lgaObject>
let wardCodeMap = new Map(); // Map<wardCode, wardObject>

showSpinner();

const map = mapManager.initializeMap();

mapManager.initializeLayers()
  .then(() => {
    // Fetch all necessary data files in parallel for faster loading.
    return Promise.all([
      fetch('./data/senatorial.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load senatorial data (${res.status})`);
        return res.json();
      }),
      fetch('./data/manualLgaCorrections.json').then(res => {
        if (!res.ok) throw new Error(`Failed to load LGA corrections (${res.status})`);
        return res.json();
      })
    ]);
  })
  .then(([senatorialData, lgaCorrections]) => {
    // Wait for all tile sources to finish loading before building data tree
    let sourcesLoaded = { states: false, lgas: false, wards: false };
    let dataTreeBuilt = false; // Flag to prevent rebuilding on every tile load

    const checkAllSourcesLoaded = () => {
      if (sourcesLoaded.states && sourcesLoaded.lgas && sourcesLoaded.wards && !dataTreeBuilt) {
        dataTreeBuilt = true; // Set flag immediately to prevent re-entry
        if (DEBUG) console.log('All PMTiles sources loaded, building data tree...');

        // Clean up event listener to prevent memory leaks
        map.off('sourcedata', sourcedataHandler);

        buildDataTree(senatorialData, lgaCorrections);
        initializeSearch();
        initializeUI();
        mapManager.addOptionalLayers();
        hideSpinner();
      }
    };

    // Listen for each source to finish loading
    const sourcedataHandler = (e) => {
      if (e.sourceId === 'states' && e.isSourceLoaded) {
        sourcesLoaded.states = true;
        if (DEBUG) console.log('States source loaded');
        checkAllSourcesLoaded();
      }
      if (e.sourceId === 'lgas' && e.isSourceLoaded) {
        sourcesLoaded.lgas = true;
        if (DEBUG) console.log('LGAs source loaded');
        checkAllSourcesLoaded();
      }
      if (e.sourceId === 'wards' && e.isSourceLoaded) {
        sourcesLoaded.wards = true;
        if (DEBUG) console.log('Wards source loaded');
        checkAllSourcesLoaded();
      }
    };

    map.on('sourcedata', sourcedataHandler);

    // Add 30-second timeout for initial load
    setTimeout(() => {
      if (!dataTreeBuilt) {
        showErrorMessage('Map is taking longer than expected to load. Please check your connection and try refreshing the page.');
        if (DEBUG) console.warn('Loading timeout: Data tree not built after 30 seconds');
      }
    }, 30000);
  })
  .catch(err => {
    console.error('Error initializing map:', err);
    showErrorMessage(`Failed to load map: ${err.message}. Please check your connection and refresh the page.`);
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
    .replace(/[\s-/\\_]+/g, '') // Remove all whitespace, hyphens, slashes, underscores
    .replace(/lgarea$/, '') // Remove trailing 'lgarea'
    .replace(/lga$/, '') // Remove trailing 'lga'
    .replace(/municipal$/, ''); // Remove trailing 'municipal'
}

/**
 * Builds the unified nigeriaData tree from the flat feature caches.
 * This is the core of the new "bottom-up" architecture.
 * @param {Array} senatorialData The raw senatorial district data.
 * @param {Object} lgaCorrections The manual LGA name corrections.
 */
function buildDataTree(senatorialData, lgaCorrections) {
  // 1. Create a reverse mapping from normalized LGA name to Senatorial District, applying corrections.
  const lgaToDistrictMap = new Map();
  senatorialData.forEach(record => {
    const district = record['Senatorial_District'] || record['district'];
    const lga = record['LGAs'] || record['lga'];
    if (district && lga) {
      const normalizedLga = normalize(lga);
      // Apply correction if it exists
      const correctedLga = lgaCorrections[normalizedLga] || normalizedLga;
      // Since a correction can map to multiple LGAs, handle arrays
      const lgasToMap = Array.isArray(correctedLga) ? correctedLga : [correctedLga];
      lgasToMap.forEach(l => lgaToDistrictMap.set(normalize(l), district));
    }
  });

  // 2. Cache all features from the map
  const { sourceLayers } = mapManager.config;
  const statesCache = new Map(map.querySourceFeatures('states', { sourceLayer: sourceLayers.states }).map(f => [f.properties.statename, f]));
  const lgasCache = new Map(map.querySourceFeatures('lgas', { sourceLayer: sourceLayers.lgas }).map(f => [f.properties.lgacode, f]));
  const wardsCache = new Map(map.querySourceFeatures('wards', { sourceLayer: sourceLayers.wards }).map(f => [f.properties.wardcode, f]));

  if (DEBUG) console.log(`Cached: ${statesCache.size} states, ${lgasCache.size} LGAs, ${wardsCache.size} wards`);

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
  if (DEBUG) console.log(`Processing ${wardsCache.size} wards...`);
  let wardsAdded = 0;
  let wardsSkipped = 0;

  wardsCache.forEach((wardFeature, wardCode) => {
    const props = wardFeature.properties;
    const lgaCode = props.lgacode;

    if (DEBUG && wardsAdded === 0 && wardsSkipped === 0) {
      console.log('Sample ward properties:', props);
    }

    const parentLga = lgaCodeToLgaObjectMap.get(lgaCode); // Instant lookup
    if (parentLga) {
      const wardObject = {
        name: props.wardname,
        code: wardCode,
        feature: wardFeature
      };
      parentLga.wards.push(wardObject);
      wardCodeMap.set(wardCode, wardObject); // Add to global ward lookup map
      wardsAdded++;
    } else {
      wardsSkipped++;
    }
  });

  if (DEBUG) console.log(`Wards added: ${wardsAdded}, skipped: ${wardsSkipped}`);

  // 6. Convert the map to our final sorted array and populate global LGA map
  nigeriaData = Array.from(statesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  nigeriaData.forEach(state => {
    state.lgas.sort((a, b) => a.name.localeCompare(b.name));
    // Populate global LGA code map
    state.lgas.forEach(lga => lgaCodeMap.set(lga.code, lga));
  });
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
  document.getElementById('toggle-states').addEventListener('change', e => mapManager.toggleLayer('states', e.target.checked));
  document.getElementById('toggle-lgas').addEventListener('change', e => mapManager.toggleLayer('lgas', e.target.checked));
  document.getElementById('toggle-wards').addEventListener('change', e => mapManager.toggleLayer('wards', e.target.checked));
  document.getElementById('toggle-health').addEventListener('change', e => mapManager.toggleLayer('health', e.target.checked));
  document.getElementById('toggle-roads').addEventListener('change', e => mapManager.toggleLayer('roads', e.target.checked));
  document.getElementById('toggle-pop').addEventListener('change', e => mapManager.toggleLayer('population', e.target.checked));

  // Search, Sidebar, and Map Controls
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('searchInput').addEventListener('keydown', handleSearchKeyboard);

  // Close search suggestions when clicking outside
  document.addEventListener('click', (e) => {
    const searchInput = document.getElementById('searchInput');
    const suggestionBox = document.getElementById('searchSuggestions');
    if (!searchInput.contains(e.target) && !suggestionBox.contains(e.target)) {
      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
      searchInput.setAttribute('aria-expanded', 'false');
    }
  });

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

/**
 * Lazy load wards for a specific LGA by querying visible tiles
 */
function loadWardsForLGA(lgaObject, lgaCode) {
  const { sourceLayers } = mapManager.config;

  // Query ALL visible wards first
  const allWardFeatures = map.querySourceFeatures('wards', {
    sourceLayer: sourceLayers.wards
  });

  if (DEBUG) console.log(`Total visible wards: ${allWardFeatures.length}`);

  // Manually filter to only this LGA (in case MapLibre filter doesn't work)
  const wardFeatures = allWardFeatures.filter(f => f.properties.lgacode === lgaCode);

  if (DEBUG) console.log(`Filtered to ${wardFeatures.length} wards for ${lgaObject.name} (LGA code: ${lgaCode})`);

  if (DEBUG && allWardFeatures.length > 0 && wardFeatures.length === 0) {
    console.warn('No wards matched! Sample ward lgacodes:',
      allWardFeatures.slice(0, 3).map(f => f.properties.lgacode));
    console.warn('Looking for lgacode:', lgaCode);
  }

  // Clear existing wards and add new ones
  lgaObject.wards = [];
  const seenWardCodes = new Set(); // Deduplicate by ward code

  wardFeatures.forEach(wardFeature => {
    const props = wardFeature.properties;
    const wardCode = props.wardcode;

    // Skip duplicates
    if (seenWardCodes.has(wardCode)) {
      return;
    }
    seenWardCodes.add(wardCode);

    const wardObject = {
      name: props.wardname,
      code: wardCode,
      feature: wardFeature
    };

    lgaObject.wards.push(wardObject);
    wardCodeMap.set(wardCode, wardObject);
  });

  // Now populate the dropdown
  populateWardDropdown(lgaObject);
}

function populateWardDropdown(lga) {
  const select = document.getElementById('ward-select');
  select.innerHTML = '<option value="">Loading wards...</option>';
  select.disabled = true;

  // Use requestAnimationFrame to prevent UI freeze for large ward lists
  requestAnimationFrame(() => {
    select.innerHTML = '<option value="">Select Ward</option>';

    if (lga && lga.wards && lga.wards.length > 0) {
      if (DEBUG) console.log(`Populating ${lga.wards.length} wards for LGA:`, lga.name);
      lga.wards.sort((a, b) => a.name.localeCompare(b.name));

      // Check for duplicate ward names to disambiguate
      const nameCounts = lga.wards.reduce((acc, ward) => {
        acc[ward.name] = (acc[ward.name] || 0) + 1;
        return acc;
      }, {});

      lga.wards.forEach(ward => {
        const text = nameCounts[ward.name] > 1
          ? `${ward.name} [${ward.code}]`
          : ward.name;
        select.add(new Option(text, ward.code));
      });
      select.disabled = false;
    } else {
      if (DEBUG) console.log('No wards found for LGA:', lga);
      select.disabled = true;
    }
  });
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
    map.fitBounds(mapManager.config.map.bounds, { padding: 20 });
  }
}

// Track which LGA is currently being loaded to prevent duplicates
let currentLoadingLGA = null;

function handleLGAChange(e) {
  const lgaCode = e.target.value;
  mapManager.clearHighlight();

  if (!lgaCode) {
    currentLoadingLGA = null; // Reset
    populateWardDropdown(null);
    const stateName = document.getElementById('state-select').value;
    handleStateChange({ target: { value: stateName } }); // Revert to state view
    return;
  }

  // Prevent loading same LGA multiple times
  if (currentLoadingLGA === lgaCode) {
    if (DEBUG) console.log(`Already loading wards for LGA ${lgaCode}, skipping duplicate request`);
    return;
  }

  currentLoadingLGA = lgaCode;

  // O(1) lookup using global map instead of O(n) nested loop
  const selectedLga = lgaCodeMap.get(lgaCode);

  if (selectedLga) {
    // Check if wards already loaded for this LGA
    if (selectedLga.wards && selectedLga.wards.length > 0) {
      if (DEBUG) console.log(`Using cached ${selectedLga.wards.length} wards for ${selectedLga.name}`);
      populateWardDropdown(selectedLga);
      map.getSource('highlight').setData({ type: 'FeatureCollection', features: [selectedLga.feature] });
      const bounds = turf.bbox(selectedLga.feature);
      map.fitBounds(bounds, { padding: 50 });
      return;
    }

    // Show loading state
    populateWardDropdown(null);

    map.getSource('highlight').setData({ type: 'FeatureCollection', features: [selectedLga.feature] });
    const bounds = turf.bbox(selectedLga.feature);
    map.fitBounds(bounds, { padding: 50 });

    // Lazy load wards for this LGA after zooming
    map.once('idle', () => {
      loadWardsForLGA(selectedLga, lgaCode);
      currentLoadingLGA = null; // Reset after loading
    });
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

  // O(1) lookup using global map instead of O(n²) nested loop
  const selectedWard = wardCodeMap.get(wardCode);

  if (selectedWard) {
    map.getSource('highlight').setData({ type: 'FeatureCollection', features: [selectedWard.feature] });
    map.fitBounds(turf.bbox(selectedWard.feature), { padding: 50 });
  }
}

function handleSenatorialChange(e) {
  const districtName = e.target.value;
  currentLoadingLGA = null;
  mapManager.clearHighlight();

  const stateName = document.getElementById('state-select').value;
  const state = nigeriaData.find(s => s.name === stateName);

  if (!districtName) {
    // Reset: show all LGAs in the state
    populateLGADropdown(state);
    populateWardDropdown(null);
    return;
  }

  if (state && districtName) {
    // Filter LGAs to only show those in the selected senatorial district
    const lgasInDistrict = state.lgas.filter(lga => lga.district === districtName);

    // Populate LGA dropdown with filtered LGAs
    const lgaSelect = document.getElementById('lga-select');
    lgaSelect.innerHTML = '<option value="">Select LGA</option>';
    const nameCounts = lgasInDistrict.reduce((acc, lga) => {
      acc[lga.name] = (acc[lga.name] || 0) + 1;
      return acc;
    }, {});
    lgasInDistrict.forEach(lga => {
      const text = nameCounts[lga.name] > 1 ? `${lga.name} [${lga.code}]` : lga.name;
      lgaSelect.add(new Option(text, lga.code));
    });
    lgaSelect.disabled = false;

    // Clear wards
    populateWardDropdown(null);

    // Highlight the senatorial district on map
    const features = lgasInDistrict.map(lga => lga.feature);
    if (features.length > 0) {
      const featureCollection = { type: 'FeatureCollection', features };
      mapManager.setSenatorialHighlight(featureCollection);
      map.fitBounds(turf.bbox(featureCollection), { padding: 50 });
    }
  }
}

function handleReset() {
  currentLoadingLGA = null;
  document.getElementById('state-select').value = '';
  handleStateChange({ target: { value: '' } });
}

// --- SEARCH ---

let fuse; // Fuse.js instance
let searchIndex = []; // Flattened array for searching

function initializeSearch() {
  // Check if Fuse.js loaded successfully
  if (typeof Fuse === 'undefined') {
    console.warn('Fuse.js not loaded - search will use basic filtering');
    const searchInput = document.getElementById('searchInput');
    searchInput.placeholder = 'Search (fuzzy search unavailable)';
    return; // Continue without Fuse.js
  }

  // 1. Create a flattened, searchable index from the nigeriaData tree.
  searchIndex = [];
  nigeriaData.forEach(state => {
    searchIndex.push({
      name: state.name,
      type: 'State',
      feature: state.feature,
      searchName: state.name // Field for Fuse to search on
    });
    state.lgas.forEach(lga => {
      searchIndex.push({
        name: `${lga.name} (${state.name})`,
        type: 'LGA',
        feature: lga.feature,
        searchName: lga.name // Field for Fuse to search on
      });
      lga.wards.forEach(ward => {
        searchIndex.push({
          name: `${ward.name} (${lga.name})`,
          type: 'Ward',
          feature: ward.feature,
          searchName: ward.name // Field for Fuse to search on
        });
      });
    });
  });

  // 2. Initialize Fuse.js
  const options = {
    keys: ['searchName'],
    includeScore: true,
    threshold: 0.4, // Adjust for more/less strict matching
  };
  fuse = new Fuse(searchIndex, options);
}

function handleSearch(e) {
  const query = e.target.value;
  const suggestionBox = document.getElementById('searchSuggestions');
  const searchInput = document.getElementById('searchInput');

  if (query.length < 2) {
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
    searchInput.setAttribute('aria-expanded', 'false');
    return;
  }

  // Use Fuse.js if available, otherwise fallback to basic filtering
  let results;
  if (fuse) {
    results = fuse.search(query);
  } else {
    // Fallback: basic case-insensitive substring matching
    const lowerQuery = query.toLowerCase();
    results = searchIndex
      .filter(item => item.searchName.toLowerCase().includes(lowerQuery))
      .map(item => ({ item }));
  }

  renderSuggestions(results.slice(0, 15));
}

function renderSuggestions(results) {
  const suggestionBox = document.getElementById('searchSuggestions');
  const searchInput = document.getElementById('searchInput');
  suggestionBox.innerHTML = '';

  if (results.length === 0) {
    suggestionBox.style.display = 'none';
    searchInput.setAttribute('aria-expanded', 'false');
    return;
  }
  
  suggestionBox.style.display = 'block';
  searchInput.setAttribute('aria-expanded', 'true');

  results.forEach(result => {
    const { name, type, feature } = result.item;
    const div = document.createElement('div');
    div.className = 'search-suggestion';
    div.setAttribute('role', 'option');
    const strong = document.createElement('strong');
    strong.textContent = `${type}: `;
    div.appendChild(strong);
    div.append(name);
    div.onclick = () => {
      mapManager.clearHighlight();
      map.getSource('highlight').setData({ type: 'FeatureCollection', features: [feature] });
      map.fitBounds(turf.bbox(feature), { padding: 50, maxZoom: 12 });
      suggestionBox.innerHTML = '';
      suggestionBox.style.display = 'none';
      searchInput.setAttribute('aria-expanded', 'false');
      document.getElementById('searchInput').value = '';
    };
    suggestionBox.appendChild(div);
  });
}

/**
 * Handle keyboard navigation for search suggestions
 */
function handleSearchKeyboard(e) {
  const suggestionBox = document.getElementById('searchSuggestions');
  const suggestions = suggestionBox.querySelectorAll('.search-suggestion');

  if (suggestions.length === 0) return;

  let focusedIndex = Array.from(suggestions).findIndex(s => s.classList.contains('focused'));

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusedIndex = focusedIndex < suggestions.length - 1 ? focusedIndex + 1 : 0;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusedIndex = focusedIndex > 0 ? focusedIndex - 1 : suggestions.length - 1;
  } else if (e.key === 'Enter' && focusedIndex >= 0) {
    e.preventDefault();
    suggestions[focusedIndex].click();
    return;
  } else if (e.key === 'Escape') {
    suggestionBox.innerHTML = '';
    suggestionBox.style.display = 'none';
    document.getElementById('searchInput').setAttribute('aria-expanded', 'false');
    return;
  } else {
    return; // Let other keys work normally
  }

  // Update focused state
  suggestions.forEach((s, i) => {
    if (i === focusedIndex) {
      s.classList.add('focused');
      s.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      s.classList.remove('focused');
    }
  });
}

// --- UI INITIALIZERS ---

function initializeSidebarControls() {
  const sidebar = document.querySelector('.sidebar');
  const expandButton = document.getElementById('expand-button');
  const toggleButton = document.getElementById('sidebar-toggle');
  const sidebarHeader = document.querySelector('.sidebar-header');

  toggleButton.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    expandButton.classList.add('show');
    toggleButton.setAttribute('aria-expanded', 'false');
    expandButton.setAttribute('aria-expanded', 'true');
  });

  expandButton.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    expandButton.classList.remove('show');
    toggleButton.setAttribute('aria-expanded', 'true');
    expandButton.setAttribute('aria-expanded', 'false');
  });

  sidebarHeader.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      toggleButton.setAttribute('aria-expanded', String(!isCollapsed));
    }
  });

  document.getElementById('searchInput').addEventListener('focus', () => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      toggleButton.setAttribute('aria-expanded', 'true');
    }
  });
}

function initializeMapControls() {
  let locationMarker = null;

  document.getElementById('locate-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return mapManager.showMapError("Geolocation is not supported by your browser.");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        map.flyTo({ center: coords, zoom: 14 });
        if (locationMarker) locationMarker.remove();
        locationMarker = new maplibregl.Marker({ color: '#007aff' }).setLngLat(coords).addTo(map);
      },
      () => mapManager.showMapError("Unable to retrieve your location.")
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
  const sidebarHeader = document.querySelector('.sidebar-header');
  let startY, isDragging = false;
  const SWIPE_THRESHOLD = 30; // Minimum pixels to trigger collapse/expand

  // Only attach swipe to the header area to avoid conflicting with content scrolling
  const onTouchStart = (e) => {
    if (window.innerWidth > 768) return;
    isDragging = true;
    startY = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    if (!isDragging) return;
    isDragging = false;
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - startY;

    if (Math.abs(deltaY) < SWIPE_THRESHOLD) return; // Ignore small movements

    if (deltaY > 0) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  };

  sidebarHeader.addEventListener('touchstart', onTouchStart, { passive: true });
  sidebarHeader.addEventListener('touchend', onTouchEnd, { passive: true });
}

// --- UTILITY FUNCTIONS ---

function showSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = 'flex';
    spinner.setAttribute('aria-hidden', 'false');
  }
}

function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = 'none';
    spinner.setAttribute('aria-hidden', 'true');
  }
}

function showErrorMessage(message) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.background = 'rgba(0, 0, 0, 0.85)';
    spinner.innerHTML = '';
    const p = document.createElement('p');
    p.style.cssText = 'color: white; text-align: center; padding: 0 24px; max-width: 400px; line-height: 1.5;';
    p.textContent = message;
    spinner.appendChild(p);
    spinner.setAttribute('aria-hidden', 'false');
  }
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
      geojson.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          processCoords(feature.geometry.coordinates);
        }
      });
    } else if (geojson.geometry && geojson.geometry.coordinates) {
      processCoords(geojson.geometry.coordinates);
    }
    // Return Nigeria's default bounds if no valid coordinates were found
    if (!isFinite(minLng)) {
      return [[2.68, 4.27], [14.68, 13.89]];
    }
    return [[minLng, minLat], [maxLng, maxLat]];
  }
};
