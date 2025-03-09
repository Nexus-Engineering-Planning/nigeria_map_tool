import { selectState, selectWardsInLGA, clearLayers } from './layers.js';
import MapManager from './MapManager.js';
import { filterLGAs, filterWards } from './filters.js';

const mapManager = MapManager.getInstance();

/**
 * Populate the state dropdown.
 */
function populateStateDropdown() {
    const stateSelect = document.getElementById('state-select');
    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) return;

    // Extract unique states
    const states = [...new Set(geojsonData.features.map(f => f.properties.statename))].sort();

    // Populate dropdown
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });

    // Add event listener
    stateSelect.addEventListener('change', handleStateChange);
}

/**
 * Handle state selection.
 */
function handleStateChange(event) {
    const stateName = event.target.value;
    if (!stateName) return;

    // Show the selected state and its LGAs & wards
    selectState(stateName);

    // Populate LGA dropdown
    populateLGADropdown(stateName);
}

/**
 * Populate the LGA dropdown based on selected state.
 */
function populateLGADropdown(stateName) {
    const lgaSelect = document.getElementById('lga-select');
    lgaSelect.innerHTML = '<option value="">Select LGA</option>';
    lgaSelect.disabled = false;

    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) return;

    // Extract LGAs for the selected state
    const lgas = filterLGAs(geojsonData.features, { statename: stateName });

    // Populate dropdown
    lgas.forEach(lga => {
        const option = document.createElement('option');
        option.value = lga.name;
        option.textContent = lga.name;
        lgaSelect.appendChild(option);
    });

    // Add event listener
    lgaSelect.addEventListener('change', handleLGAChange);
}

/**
 * Handle LGA selection.
 */
function handleLGAChange(event) {
    const lgaName = event.target.value;
    const stateName = document.getElementById('state-select').value;
    if (!lgaName || !stateName) return;

    // Show the selected LGA and its wards
    selectWardsInLGA(lgaName, stateName);

    // Populate ward dropdown
    populateWardDropdown(lgaName, stateName);
}

/**
 * Populate the ward dropdown based on selected LGA.
 */
function populateWardDropdown(lgaName, stateName) {
    const wardSelect = document.getElementById('ward-select');
    wardSelect.innerHTML = '<option value="">Select Ward</option>';
    wardSelect.disabled = false;

    const geojsonData = mapManager.getWardGeoJSON();
    if (!geojsonData || !geojsonData.features) return;

    // Extract wards for the selected LGA
    const wards = filterWards(geojsonData.features, { lganame: lgaName, statename: stateName });

    // Populate dropdown
    wards.forEach(ward => {
        const option = document.createElement('option');
        option.value = ward.wardname;
        option.textContent = ward.wardname;
        wardSelect.appendChild(option);
    });
}

/**
 * Reset the map and dropdowns.
 */
function resetMap() {
    document.getElementById('state-select').value = "";
    document.getElementById('lga-select').innerHTML = '<option value="">Select LGA</option>';
    document.getElementById('lga-select').disabled = true;
    document.getElementById('ward-select').innerHTML = '<option value="">Select Ward</option>';
    document.getElementById('ward-select').disabled = true;

    clearLayers();
}

// Attach reset event
document.getElementById('reset-btn').addEventListener('click', resetMap);
document.getElementById('fab-reset').addEventListener('click', resetMap);

// Load GeoJSON data and initialize dropdowns
fetch('ward.geojson')
    .then(response => response.json())
    .then(data => {
        mapManager.setWardGeoJSON(data);
        populateStateDropdown();
    })
    .catch(error => console.error('Error loading GeoJSON:', error));
