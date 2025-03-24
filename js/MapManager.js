class MapManager {
    constructor() {
      // Ensure singleton pattern
      if (!MapManager.instance) {
        // Initialize the Leaflet map
        this.map = L.map('map').setView([9.0820, 8.6753], 6);
  
        // ✅ Initialize basemaps
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
  
        // ✅ Store baseMaps in an object
        this.baseMaps = {
          "OpenStreetMap Standard": this.osmStandard,
          "Esri World Imagery": this.esriWorldImagery,
          "CartoDB Positron": this.cartoDBPositron
        };
  
        // ✅ Add layer control to toggle between basemaps
        L.control.layers(this.baseMaps, null, { position: 'topright' }).addTo(this.map);
  
        // Placeholder for layers (data layers)
        this.stateLayer = null;
        this.lgaLayer = null;
        this.wardLayer = null;
  
        MapManager.instance = this;
      }
  
      return MapManager.instance;
    }
  
    /** Returns the Leaflet map instance */
    getMap() {
      return this.map;
    }
  
    /** Initializes the data layers and adds them to the map */
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
  
      // Fit to the extent of all states
      map.fitBounds(this.stateLayer.getBounds());
    }
  
    /** Accessors for data layers */
    getStateLayer() {
      return this.stateLayer;
    }
  
    getLgaLayer() {
      return this.lgaLayer;
    }
  
    getWardLayer() {
      return this.wardLayer;
    }
  
    /** Accessors for raw GeoJSON data from layers */
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
  
    /** Returns the state GeoJSON layer (for resetting map view, etc.) */
    getStateGeoJSONLayer() {
      return this.stateLayer;
    }
  }
  
  // Singleton instance
  const instance = new MapManager();
  //commented out* Object.freeze(instance);
  
  export default instance;
  