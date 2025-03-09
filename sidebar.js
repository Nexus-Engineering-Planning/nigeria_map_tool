/**
 * Sidebar component for Nigeria Map Tool
 * Handles the collapsible sidebar and search filters
 */
import { selectState, selectWardsInLGA, clearLayers } from './layers.js';
import { filterStates, filterLGAs, filterWards } from './filters.js';
import { showNotification } from './utils.js';
import MapManager from './MapManager.js';

const mapManager = MapManager.getInstance();
const map = mapManager.getMap();

/**
 * Initialize the sidebar and dropdown functionality.
 */
function initializeSidebar() {
    // Ensure sidebar elements exist in the document
    const stateSelect = document.getElementById('state-select');
    const lgaSelect = document.getElementById('lga-select');
    const wardSelect = document.getElementById('ward-select');

    if (!stateSelect || !lgaSelect || !wardSelect) {
        console.error("Sidebar elements are missing from the HTML.");
        return;
    }

    // Populate the State dropdown
    populateStateDropdown();

    // Attach event listeners
    stateSelect.addEventListener('change', handleStateChange);
    lgaSelect.addEventListener('change', handleLGAChange);
}

/**
 * Populate the State dropdown with available states.
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
}

/**
 * Handle state selection.
 */
function handleStateChange(event) {
    const stateName = event.target.value;
    if (!stateName) return;

    // Show state layer and LGAs within the state
    selectState(stateName);

    // Populate the LGA dropdown
    populateLGADropdown(stateName);
}

/**
 * Populate the LGA dropdown based on the selected state.
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
}

/**
 * Handle LGA selection.
 */
function handleLGAChange(event) {
    const lgaName = event.target.value;
    const stateName = document.getElementById('state-select').value;
    if (!lgaName || !stateName) return;

    // Show LGA layer and wards within the LGA
    selectWardsInLGA(lgaName, stateName);

    // Populate the Ward dropdown
    populateWardDropdown(lgaName, stateName);
}

/**
 * Populate the Ward dropdown based on the selected LGA.
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

export { initializeSidebar };
