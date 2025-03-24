import { buildDictionaries, buildReverseMappings, buildSenatorialToLga } from './mappings.js';

const map = L.map('map').setView([9.0820, 8.6753], 6);

// ✅ Add basemap layers
const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
});

const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye'
});

const cartoDBPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 19
});

// ✅ Add default basemap
osmStandard.addTo(map);

// ✅ Create layer control for basemaps
const baseMaps = {
  "OpenStreetMap Standard": osmStandard,
  "Esri World Imagery": esriWorldImagery,
  "CartoDB Positron": cartoDBPositron
};

L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

const highlightLayer = L.geoJSON(null, {
  style: { color: '#FF0000', weight: 3, fillOpacity: 0.3 }
}).addTo(map);

let stateLayer, lgaLayer, wardLayer;
let state_to_lga = {}, lga_to_ward = {}, senatorial_to_lga = {}, lga_to_state = {};

Promise.all([
  fetch('./data/state_geojson.geojson').then(res => res.json()),
  fetch('./data/lga_geojson.geojson').then(res => res.json()),
  fetch('./data/ward_geojson.geojson').then(res => res.json()),
  fetch('./data/senatorial.json').then(res => res.json())
])
  .then(([stateGeoJSON, lgaGeoJSON, wardGeoJSON, senatorialData]) => {
    const mappings = buildDictionaries(stateGeoJSON, lgaGeoJSON, wardGeoJSON);
    const reverseMappings = buildReverseMappings(mappings.state_to_lga, mappings.lga_to_ward);

    state_to_lga = mappings.state_to_lga;
    lga_to_ward = mappings.lga_to_ward;
    lga_to_state = reverseMappings.lga_to_state;

    senatorial_to_lga = buildSenatorialToLga(senatorialData, lgaGeoJSON);

    stateLayer = L.geoJSON(stateGeoJSON, {
      style: { color: '#003366', weight: 2, fillOpacity: 0.1 },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.statename);
      }
    }).addTo(map);

    lgaLayer = L.geoJSON(lgaGeoJSON, {
      style: { color: '#336699', weight: 1.5, fillOpacity: 0.1 },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.lganame);
      }
    }).addTo(map);

    wardLayer = L.geoJSON(wardGeoJSON, {
      style: { color: '#6699cc', weight: 1, fillOpacity: 0.1 },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(feature.properties.wardname);
      }
    }).addTo(map);

    populateStateDropdown();
    map.fitBounds(stateLayer.getBounds());
  });

function populateStateDropdown() {
  const stateSelect = document.getElementById('state-select');
  stateSelect.innerHTML = '<option value="">All States</option>';
  Object.keys(state_to_lga).forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });
  stateSelect.addEventListener('change', handleStateChange);
}

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

  if (filteredDistricts.length > 0) {
    senatorialSelect.addEventListener('change', handleSenatorialChange);
  }
}

function handleStateChange(e) {
  const stateName = e.target.value;
  highlightLayer.clearLayers();
  if (!stateName) {
    map.fitBounds(stateLayer.getBounds());
    populateSenatorialDropdown(null);
    return;
  }

  stateLayer.eachLayer(layer => {
    if (layer.feature.properties.statename === stateName) {
      highlightLayer.addData(layer.feature);
      highlightLayer.setStyle({
        color: '#FF9900',
        weight: 0,
        fillColor: '#FF9900',
        fillOpacity: 0.5
      });
      map.fitBounds(layer.getBounds());
    }
  });

  populateLGADropdown(stateName);
  populateSenatorialDropdown(stateName);
}

function populateLGADropdown(stateName) {
  const lgaSelect = document.getElementById('lga-select');
  lgaSelect.innerHTML = '<option value="">Select LGA</option>';

  const lgas = state_to_lga[stateName] || [];
  lgas.forEach(lga => {
    const option = document.createElement('option');
    option.value = lga;
    option.textContent = lga;
    lgaSelect.appendChild(option);
  });

  lgaSelect.disabled = lgas.length === 0;
  lgaSelect.addEventListener('change', handleLGAChange);
}

function handleLGAChange(e) {
  const lgaName = e.target.value;
  highlightLayer.clearLayers();

  if (!lgaName) return;

  lgaLayer.eachLayer(layer => {
    if (layer.feature.properties.lganame === lgaName) {
      highlightLayer.addData(layer.feature);
      map.fitBounds(layer.getBounds());
    }
  });

  populateWardDropdown(lgaName);
}

function populateWardDropdown(lgaName) {
  const wardSelect = document.getElementById('ward-select');
  wardSelect.innerHTML = '<option value="">Select Ward</option>';

  const wards = lga_to_ward[lgaName] || [];
  wards.forEach(ward => {
    const option = document.createElement('option');
    option.value = ward;
    option.textContent = ward;
    wardSelect.appendChild(option);
  });

  wardSelect.disabled = wards.length === 0;
  wardSelect.addEventListener('change', handleWardChange);
}

function handleWardChange(e) {
  const wardName = e.target.value;
  highlightLayer.clearLayers();

  if (!wardName) return;

  wardLayer.eachLayer(layer => {
    if (layer.feature.properties.wardname === wardName) {
      highlightLayer.addData(layer.feature);
      map.fitBounds(layer.getBounds());
    }
  });
}

function handleSenatorialChange(e) {
  const districtName = e.target.value;
  highlightLayer.clearLayers();

  if (!districtName) return;

  const lgas = senatorial_to_lga[districtName] || [];

  lgaLayer.eachLayer(layer => {
    const lgaName = layer.feature.properties.lganame;
    if (lgas.includes(lgaName)) {
      highlightLayer.addData(layer.feature);
    }
  });

  if (highlightLayer.getLayers().length > 0) {
    map.fitBounds(highlightLayer.getBounds());
  }
}

document.getElementById('searchInput').addEventListener('input', handleSearch);

function handleSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const suggestions = [];

  stateLayer.eachLayer(layer => {
    if (layer.feature.properties.statename.toLowerCase().includes(query)) {
      suggestions.push({ name: layer.feature.properties.statename, layer });
    }
  });

  lgaLayer.eachLayer(layer => {
    if (layer.feature.properties.lganame.toLowerCase().includes(query)) {
      suggestions.push({ name: layer.feature.properties.lganame, layer });
    }
  });

  wardLayer.eachLayer(layer => {
    if (layer.feature.properties.wardname.toLowerCase().includes(query)) {
      suggestions.push({ name: layer.feature.properties.wardname, layer });
    }
  });

  renderSuggestions(suggestions);
}

function renderSuggestions(suggestions) {
  const suggestionBox = document.getElementById('searchSuggestions');
  suggestionBox.innerHTML = '';

  suggestions.forEach(({ name, layer }) => {
    const div = document.createElement('div');
    div.className = 'search-suggestion';
    div.textContent = name;
    div.onclick = () => {
      highlightLayer.clearLayers();
      highlightLayer.addData(layer.feature);
      const bounds = layer.getBounds ? layer.getBounds() : L.latLngBounds([layer.getLatLng()]);
      map.fitBounds(bounds);
    };
    suggestionBox.appendChild(div);
  });
}

document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('state-select').value = "";
  document.getElementById('senatorial-select').innerHTML = '<option value="">Select Senatorial District</option>';
  document.getElementById('lga-select').innerHTML = '<option value="">Select LGA</option>';
  document.getElementById('ward-select').innerHTML = '<option value="">Select Ward</option>';

  document.getElementById('senatorial-select').disabled = true;
  document.getElementById('lga-select').disabled = true;
  document.getElementById('ward-select').disabled = true;

  highlightLayer.clearLayers();
  map.fitBounds(stateLayer.getBounds());
});

document.getElementById('toggle-states').addEventListener('change', (e) => {
  if (e.target.checked) {
    map.addLayer(stateLayer);
  } else {
    map.removeLayer(stateLayer);
  }
});

document.getElementById('toggle-lgas').addEventListener('change', (e) => {
  if (e.target.checked) {
    map.addLayer(lgaLayer);
  } else {
    map.removeLayer(lgaLayer);
  }
});

document.getElementById('toggle-wards').addEventListener('change', (e) => {
  if (e.target.checked) {
    map.addLayer(wardLayer);
  } else {
    map.removeLayer(wardLayer);
  }
});