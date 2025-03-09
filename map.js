import { initializeSidebar } from './sidebar.js';
import { resetHighlighting, mergeGeometries, clearLayers, updateMapForSearchResults } from './scripts.js';
import { showNotification } from './utils.js';
import MapManager from './MapManager.js';

/**
 * Map-related functionality for Nigeria Map Tool
 */

// Initialize the map using MapManager
const mapManager = MapManager.getInstance();
const map = mapManager.getMap();

/**
 * Show loading message while GeoJSON is being fetched.
 */
function showLoadingMessage() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.innerHTML = `<div style="text-align:center; padding:20px; font-size:16px;">
        <i class="fas fa-spinner fa-spin"></i> Loading map data...
    </div>`;
}

/**
 * Hide loading message when data is loaded.
 */
function hideLoadingMessage() {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.opacity = 0;
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 300);
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    showLoadingMessage();

    // Load GeoJSON data
    fetch('../ward.geojson')  // ✅ Fixed file path
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network error: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.features || !Array.isArray(data.features)) {
                throw new Error("Invalid GeoJSON structure: 'features' is missing or not an array.");
            }

            // Store data in MapManager
            mapManager.setWardGeoJSON(data);

            // Trigger event to notify that data is loaded
            document.dispatchEvent(new CustomEvent('dataLoaded'));

            // Hide loading message
            hideLoadingMessage();
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
            document.getElementById('loading-overlay').innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="color: #e74c3c; font-size: 24px;"><i class="fas fa-exclamation-triangle"></i></div>
                    <p>Error loading map data: ${error.message}</p>
                    <button onclick="location.reload()">Reload</button>
                </div>`;
        });
});
