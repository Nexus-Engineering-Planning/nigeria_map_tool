import { selectState, selectLGAsInState, selectWardsInLGA, selectWard } from './layers.js';
import MapManager from './MapManager.js';

const mapManager = MapManager.getInstance();

function initializeSidebar() {
    console.log("🔄 Initializing sidebar...");

    const searchInput = document.getElementById("search-bar");
    const stateSelect = document.getElementById("state-select");
    const lgaSelect = document.getElementById("lga-select");
    const wardSelect = document.getElementById("ward-select");
    const resetButton = document.getElementById("reset-btn");

    if (!searchInput || !stateSelect || !lgaSelect || !wardSelect || !resetButton) {
        console.error("❌ Sidebar elements not found!");
        return;
    }

    // Load states into dropdown
    const stateGeoJSON = mapManager.getStateGeoJSON();
    if (!stateGeoJSON || !stateGeoJSON.features) {
        console.error("❌ No state GeoJSON data available.");
        return;
    }

    console.log("📌 Populating state dropdown...");
    stateSelect.innerHTML = '<option value="">All States</option>';
    stateGeoJSON.features.forEach(state => {
        const option = document.createElement('option');
        option.value = state.properties.statename;
        option.textContent = state.properties.statename;
        stateSelect.appendChild(option);
    });

    // Handle state selection
    stateSelect.addEventListener('change', function () {
        const selectedState = this.value;
        console.log(`📌 Selected State: ${selectedState}`);
        selectState(selectedState);

        // Reset LGA and Ward dropdowns
        lgaSelect.innerHTML = '<option value="">Select LGA</option>';
        wardSelect.innerHTML = '<option value="">Select Ward</option>';
        lgaSelect.disabled = selectedState === "";
        wardSelect.disabled = true;

        if (selectedState) {
            const lgaGeoJSON = mapManager.getLgaGeoJSON();
            if (!lgaGeoJSON || !lgaGeoJSON.features) {
                console.error("❌ No LGA data available.");
                return;
            }

            console.log("📌 Filtering LGAs for selected state...");
            const filteredLGAs = lgaGeoJSON.features.filter(lga => lga.properties.statename === selectedState);
            
            console.log(`📌 Found ${filteredLGAs.length} LGAs for ${selectedState}`);

            filteredLGAs.forEach(lga => {
                const option = document.createElement('option');
                option.value = lga.properties.lgacode;
                option.textContent = lga.properties.lganame;
                lgaSelect.appendChild(option);
            });

            lgaSelect.disabled = false;
        }
    });

    // Handle LGA selection
    lgaSelect.addEventListener('change', function () {
        const selectedLGA = lgaSelect.value;
        console.log(`📌 Selected LGA: ${selectedLGA}`);

        // Reset Ward dropdown
        wardSelect.innerHTML = '<option value="">Select Ward</option>';
        wardSelect.disabled = selectedLGA === "";

        if (selectedLGA) {
            selectWardsInLGA(selectedLGA);

            const wardGeoJSON = mapManager.getWardGeoJSON();
            if (!wardGeoJSON || !wardGeoJSON.features) {
                console.error("❌ No Ward data available.");
                return;
            }

            console.log("📌 Filtering Wards for selected LGA...");
            const filteredWards = wardGeoJSON.features.filter(ward => ward.properties.lgacode === selectedLGA);
            
            console.log(`📌 Found ${filteredWards.length} Wards for LGA ${selectedLGA}`);

            filteredWards.forEach(ward => {
                const option = document.createElement('option');
                option.value = ward.properties.wardcode;
                option.textContent = ward.properties.wardname;
                wardSelect.appendChild(option);
            });

            wardSelect.disabled = false;
        }
    });

    // Handle Ward selection for isolation
    wardSelect.addEventListener('change', function () {
        const selectedWard = wardSelect.value;
        console.log(`📌 Selected Ward: ${selectedWard}`);

        if (selectedWard) {
            selectWard(selectedWard);

            // Reset state and LGA selections to isolate the ward
            stateSelect.value = "";
            lgaSelect.innerHTML = '<option value="">Select LGA</option>';
            lgaSelect.disabled = true;
        }
    });

    // Handle reset button
    resetButton.addEventListener('click', function () {
        console.log("🔄 Resetting sidebar selections...");
        stateSelect.value = "";
        lgaSelect.innerHTML = '<option value="">Select LGA</option>';
        wardSelect.innerHTML = '<option value="">Select Ward</option>';
        lgaSelect.disabled = true;
        wardSelect.disabled = true;

        selectState(null);
    });
}

export { initializeSidebar };
