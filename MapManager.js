class MapManager {
    constructor() {
        if (MapManager.instance) return MapManager.instance;

        // Initialize the map
        this.map = L.map('map').setView([9.0820, 8.6753], 6);

        // Add basemap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        this.wardGeoJSON = null;
        this.activeLayer = null;

        MapManager.instance = this;
    }

    static getInstance() {
        return MapManager.instance || new MapManager();
    }

    getMap() {
        return this.map;
    }

    setWardGeoJSON(data) {
        this.wardGeoJSON = data;
    }

    getWardGeoJSON() {
        return this.wardGeoJSON;
    }

    setLayer(layer) {
        if (this.activeLayer) this.map.removeLayer(this.activeLayer);
        this.activeLayer = layer;
    }

    clearLayers() {
        if (this.activeLayer) {
            this.map.removeLayer(this.activeLayer);
            this.activeLayer = null;
        }
    }
}

export default MapManager;
