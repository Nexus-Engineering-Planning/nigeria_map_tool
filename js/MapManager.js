class MapManager {
    constructor() {
      // Singleton pattern
      if (!MapManager.instance) {
        // ✅ Initialize the Leaflet map
        this.map = L.map('map').setView([9.0820, 8.6753], 6);
  
        // ✅ Basemap Layers
        this.osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        });
  
        this.esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye'
        });
  
        this.cartoDBPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 19
        });
  
        // ✅ Add default basemap to map
        this.osmStandard.addTo(this.map);
  
        // ✅ Store basemaps for layer control
        this.baseMaps = {
          "OpenStreetMap Standard": this.osmStandard,
          "Esri World Imagery": this.esriWorldImagery,
          "CartoDB Positron": this.cartoDBPositron
        };
  
        // ✅ Layer control (top-right)
        L.control.layers(this.baseMaps, null, { position: 'topright' }).addTo(this.map);
  
        // ✅ Data layers (to be initialized later)
        this.stateLayer = null;
        this.lgaLayer = null;
        this.wardLayer = null;
  
        // ✅ Centralized Highlight Layer
        this.highlightLayer = L.geoJSON(null, {
          style: {
            color: '#FF0000',
            weight: 3,
            fillOpacity: 0.3
          }
        }).addTo(this.map);
  
        console.log("✅ MapManager initialized!");
  
        MapManager.instance = this;
      }
  
      return MapManager.instance;
    }
  
    /** Returns the Leaflet map instance */
    getMap() {
      return this.map;
    }
  
    /** Returns the highlight layer */
    getHighlightLayer() {
      return this.highlightLayer;
    }
  
    /** Initializes data layers from GeoJSON and adds them to the map */
    initializeLayers(stateGeoJSON, lgaGeoJSON, wardGeoJSON) {
      const map = this.getMap();
  
      // ✅ State Layer
      this.stateLayer = L.geoJSON(stateGeoJSON, {
        style: { color: '#003366', weight: 2, fillOpacity: 0.1 },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.statename);
        }
      }).addTo(map);
  
      // ✅ LGA Layer
      this.lgaLayer = L.geoJSON(lgaGeoJSON, {
        style: { color: '#336699', weight: 1.5, fillOpacity: 0.1 },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.lganame);
        }
      }).addTo(map);
  
      // ✅ Ward Layer
      this.wardLayer = L.geoJSON(wardGeoJSON, {
        style: { color: '#6699cc', weight: 1, fillOpacity: 0.1 },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.wardname);
        }
      }).addTo(map);
  
      console.log("✅ Map layers initialized.");
  
      // ✅ Fit the map to the extent of all states (initial view)
      map.fitBounds(this.stateLayer.getBounds());
    }
  
    /** Getters for data layers */
    getStateLayer() {
      return this.stateLayer;
    }
  
    getLgaLayer() {
      return this.lgaLayer;
    }
  
    getWardLayer() {
      return this.wardLayer;
    }
  
    /** Returns raw GeoJSON from layers */
    getStateGeoJSON() {
      if (!this.stateLayer) {
        console.warn("⚠️ State layer not initialized.");
        return null;
      }
      return this.stateLayer.toGeoJSON();
    }
  
    getLgaGeoJSON() {
      if (!this.lgaLayer) {
        console.warn("⚠️ LGA layer not initialized.");
        return null;
      }
      return this.lgaLayer.toGeoJSON();
    }
  
    getWardGeoJSON() {
      if (!this.wardLayer) {
        console.warn("⚠️ Ward layer not initialized.");
        return null;
      }
      return this.wardLayer.toGeoJSON();
    }
  
    /** Returns the raw state layer for fitBounds/reset */
    getStateGeoJSONLayer() {
      return this.stateLayer;
    }
  
    /** Optional: Clear all layers from the map */
    clearLayers() {
      if (this.stateLayer) this.map.removeLayer(this.stateLayer);
      if (this.lgaLayer) this.map.removeLayer(this.lgaLayer);
      if (this.wardLayer) this.map.removeLayer(this.wardLayer);
      if (this.highlightLayer) this.highlightLayer.clearLayers();
    }
  }
  
  // ✅ Export the singleton instance of MapManager
  const instance = new MapManager();
  //Object.freeze(instance); // Enforce immutability (optional but recommended)
  
  export default instance;
  