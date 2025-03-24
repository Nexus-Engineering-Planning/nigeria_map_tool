import { selectState, selectLGAsInState, selectWardsInLGA, selectWard } from './layers.js';
import mapManager from './MapManager.js'; // ✅ Import the instance correctly

const highlightLayer = L.geoJSON(null, {
  style: { color: '#FF0000', weight: 3, fillOpacity: 0.3 }
}).addTo(mapManager.getMap());

/**
 * Initializes the sidebar controls.
 * @param {Object} senatorialToLga - Mapping of Senatorial Districts to LGAs
 * @param {Object} lgaToState - Mapping of LGAs to their parent States
 */
function initializeSidebar(senatorialToLga, lgaToState) {
  console.log("🔄 Initializing sidebar...");

  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const searchInput = document.getElementById("searchInput");
  const stateSelect = document.getElementById("state-select");
  const senatorialSelect = document.getElementById("senatorial-select");
  const lgaSelect = document.getElementById("lga-select");
  const wardSelect = document.getElementById("ward-select");
  const resetButton = document.getElementById("reset-btn");

  if (!searchInput || !stateSelect || !lgaSelect || !wardSelect || !senatorialSelect || !resetButton || !sidebar || !sidebarToggle) {
    console.error("❌ Sidebar elements not found!");
    return;
  }

  // 🧩 Collapsible Sidebar Toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    sidebarToggle.innerHTML = sidebar.classList.contains('collapsed') ? '&#10095;' : '&#10094;';
  });

  // Auto-collapse on small screens (JS fallback to media query)
  if (window.innerWidth <= 768) {
    sidebar.classList.add('collapsed');
    sidebarToggle.innerHTML = '&#10095;';
  }

  // Populate State dropdown
  populateStateDropdown();

  // Event Listeners
  searchInput.addEventListener('input', () => handleSearch());

  stateSelect.addEventListener('change', function () {
    const selectedState = this.value;
    console.log(`📌 Selected State: ${selectedState}`);

    highlightLayer.clearLayers();
    selectState(selectedState);
    updateFeatureSummary(selectedState, null);

    populateSenatorialDropdown(selectedState, senatorialToLga, lgaToState);
    populateLGADropdown(selectedState);

    wardSelect.innerHTML = '<option value="">Select Ward</option>';
    wardSelect.disabled = true;
  });

  senatorialSelect.addEventListener('change', function () {
    const districtName = this.value;
    console.log(`📌 Selected Senatorial District: ${districtName}`);

    highlightLayer.clearLayers();

    if (!districtName) return;

    const lgas = senatorialToLga[districtName] || [];
    const lgaGeoJSON = mapManager.getLgaGeoJSON();

    const filteredLGAs = lgaGeoJSON.features.filter(feature => lgas.includes(feature.properties.lganame));

    if (filteredLGAs.length === 0) {
      console.warn(`⚠️ No LGAs found for district: ${districtName}`);
      return;
    }

    highlightLayer.addData(filteredLGAs);
    mapManager.getMap().fitBounds(highlightLayer.getBounds());
  });

  lgaSelect.addEventListener('change', function () {
    const selectedLGA = this.value;
    console.log(`📌 Selected LGA: ${selectedLGA}`);

    highlightLayer.clearLayers();

    if (!selectedLGA) return;

    selectWardsInLGA(selectedLGA);
    updateFeatureSummary(stateSelect.value, selectedLGA);
    populateWardDropdown(selectedLGA);
  });

  wardSelect.addEventListener('change', function () {
    const selectedWard = this.value;
    console.log(`📌 Selected Ward: ${selectedWard}`);

    highlightLayer.clearLayers();
    document.getElementById('feature-summary').textContent = '';

    if (!selectedWard) return;

    selectWard(selectedWard);
  });

  resetButton.addEventListener('click', () => {
    console.log("🔄 Resetting sidebar selections...");

    stateSelect.value = "";
    senatorialSelect.innerHTML = '<option value="">Select Senatorial District</option>';
    lgaSelect.innerHTML = '<option value="">Select LGA</option>';
    wardSelect.innerHTML = '<option value="">Select Ward</option>';

    senatorialSelect.disabled = true;
    lgaSelect.disabled = true;
    wardSelect.disabled = true;

    highlightLayer.clearLayers();
    mapManager.getMap().fitBounds(mapManager.getStateGeoJSONLayer().getBounds());
  });
}

/* -------------------------
   Dropdown Population
------------------------- */

function populateStateDropdown() {
  const stateSelect = document.getElementById('state-select');
  const stateGeoJSON = mapManager.getStateGeoJSON();

  stateSelect.innerHTML = '<option value="">All States</option>';

  if (!stateGeoJSON || !stateGeoJSON.features) {
    console.error("❌ No state GeoJSON data available.");
    return;
  }

  stateGeoJSON.features.forEach(state => {
    const option = document.createElement('option');
    option.value = state.properties.statename;
    option.textContent = state.properties.statename;
    stateSelect.appendChild(option);
  });
}

function populateSenatorialDropdown(stateName, senatorialToLga, lgaToState) {
  const senatorialSelect = document.getElementById('senatorial-select');
  senatorialSelect.innerHTML = '<option value="">Select Senatorial District</option>';

  if (!stateName) {
    senatorialSelect.disabled = true;
    return;
  }

  const filteredDistricts = Object.keys(senatorialToLga).filter(district => {
    const lgas = senatorialToLga[district] || [];
    return lgas.some(lga => lgaToState[lga] === stateName);
  });

  filteredDistricts.forEach(district => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    senatorialSelect.appendChild(option);
  });

  senatorialSelect.disabled = filteredDistricts.length === 0;
}

function populateLGADropdown(stateName) {
  const lgaSelect = document.getElementById('lga-select');
  const lgaGeoJSON = mapManager.getLgaGeoJSON();

  lgaSelect.innerHTML = '<option value="">Select LGA</option>';

  if (!stateName) {
    lgaSelect.disabled = true;
    return;
  }

  const filteredLGAs = lgaGeoJSON.features.filter(lga => lga.properties.statename === stateName);

  filteredLGAs.forEach(lga => {
    const option = document.createElement('option');
    option.value = lga.properties.lgacode;
    option.textContent = lga.properties.lganame;
    lgaSelect.appendChild(option);
  });

  lgaSelect.disabled = filteredLGAs.length === 0;
}

function populateWardDropdown(lgaCode) {
  const wardSelect = document.getElementById('ward-select');
  const wardGeoJSON = mapManager.getWardGeoJSON();

  wardSelect.innerHTML = '<option value="">Select Ward</option>';

  if (!lgaCode) {
    wardSelect.disabled = true;
    return;
  }

  const filteredWards = wardGeoJSON.features.filter(ward => ward.properties.lgacode === lgaCode);

  filteredWards.forEach(ward => {
    const option = document.createElement('option');
    option.value = ward.properties.wardcode;
    option.textContent = ward.properties.wardname;
    wardSelect.appendChild(option);
  });

  wardSelect.disabled = filteredWards.length === 0;
}

/* -------------------------
   Search Logic
------------------------- */

function handleSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const suggestions = [];

  const stateLayer = mapManager.getStateLayer();
  const lgaLayer = mapManager.getLgaLayer();
  const wardLayer = mapManager.getWardLayer();

  if (!stateLayer || !lgaLayer || !wardLayer) {
    console.warn('❗ Map layers not ready');
    return;
  }

  stateLayer.eachLayer(layer => {
    if (layer.feature.properties.statename.toLowerCase().includes(query)) {
      suggestions.push({ name: `State: ${layer.feature.properties.statename}`, layer });
    }
  });

  lgaLayer.eachLayer(layer => {
    if (layer.feature.properties.lganame.toLowerCase().includes(query)) {
      suggestions.push({ name: `LGA: ${layer.feature.properties.lganame}`, layer });
    }
  });

  wardLayer.eachLayer(layer => {
    if (layer.feature.properties.wardname.toLowerCase().includes(query)) {
      suggestions.push({ name: `Ward: ${layer.feature.properties.wardname}`, layer });
    }
  });

  renderSuggestions(suggestions);
}

function renderSuggestions(suggestions) {
  const suggestionBox = document.getElementById('searchSuggestions');
  suggestionBox.innerHTML = '';

  const grouped = {
    State: [],
    LGA: [],
    Ward: []
  };

  suggestions.forEach(({ name, layer }) => {
    if (name.startsWith('State:')) grouped.State.push({ name, layer });
    else if (name.startsWith('LGA:')) grouped.LGA.push({ name, layer });
    else if (name.startsWith('Ward:')) grouped.Ward.push({ name, layer });
  });

  Object.entries(grouped).forEach(([groupName, items]) => {
    if (items.length === 0) return;

    const groupHeader = document.createElement('div');
    groupHeader.textContent = groupName;
    groupHeader.style = 'font-weight: bold; margin-top: 8px; color: #3498db;';
    suggestionBox.appendChild(groupHeader);

    items.forEach(({ name, layer }) => {
      const div = document.createElement('div');
      div.className = 'search-suggestion';
      div.textContent = name.replace(`${groupName}: `, '');
      div.onclick = () => {
        highlightLayer.clearLayers();
        highlightLayer.addData(layer.feature);

        const bounds = layer.getBounds
          ? layer.getBounds()
          : L.latLngBounds([layer.getLatLng()]);
        mapManager.getMap().fitBounds(bounds);
      };
      suggestionBox.appendChild(div);
    });
  });
}

function updateFeatureSummary(stateName, selectedLgaCode) {
  const summaryDiv = document.getElementById('feature-summary');
  const lgaGeoJSON = mapManager.getLgaGeoJSON();
  const wardGeoJSON = mapManager.getWardGeoJSON();

  let visibleLGAs = [];
  let visibleWards = [];

  if (stateName) {
    visibleLGAs = lgaGeoJSON.features.filter(lga => lga.properties.statename === stateName);
  }

  if (selectedLgaCode) {
    visibleWards = wardGeoJSON.features.filter(ward => ward.properties.lgacode === selectedLgaCode);
  }

  if (stateName && selectedLgaCode) {
    summaryDiv.textContent = `Showing ${visibleWards.length} Wards in ${visibleLGAs.find(lga => lga.properties.lgacode === selectedLgaCode)?.properties.lganame}`;
  } else if (stateName) {
    summaryDiv.textContent = `Showing ${visibleLGAs.length} LGAs in ${stateName}`;
  } else {
    summaryDiv.textContent = '';
  }
}

export { initializeSidebar };
