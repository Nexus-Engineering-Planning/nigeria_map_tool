/**
 * MapManager - Singleton class for managing MapLibre GL map instance with PMTiles
 */
class MapManager {
  constructor() {
    if (!MapManager.instance) {
      this.BASE_URL = 'https://tiles.staygis.com';
      this.map = null;
      this.sourceLayers = {
        states: 'grid3_nga_boundary_vaccstates',
        lgas: 'grid3_nga_boundary_vacclgas',
        wards: 'grid3_nga_boundary_vaccwards',
        health: 'GRID3_NGA_health_facilities_v2_0',
        roads: 'roads'
      };

      // Feature caches for search and selection
      this.statesData = [];
      this.lgasData = [];
      this.wardsData = [];

      MapManager.instance = this;
    }

    return MapManager.instance;
  }

  /**
   * Initialize the MapLibre GL map
   */
  initializeMap() {
    // Register PMTiles protocol
    const protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    // Initialize map with minimal basemap style
    this.map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#f5f5f5'
            }
          }
        ]
      },
      center: [8.68, 9.08],
      zoom: 6,
      minZoom: 4,
      maxZoom: 16
    });

    // Add navigation control
    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );

    // Error handling
    this.map.on('error', (e) => {
      console.error('Map error:', e?.error?.message || e);
    });

    return this.map;
  }

  /**
   * Initialize all PMTiles layers
   */
  async initializeLayers() {
    return new Promise((resolve, reject) => {
      this.map.on('load', () => {
        try {
          // Add States layer
          this.map.addSource('states', {
            type: 'vector',
            url: `pmtiles://${this.BASE_URL}/ng_states.pmtiles`
          });

          this.map.addLayer({
            id: 'states-fill',
            type: 'fill',
            source: 'states',
            'source-layer': this.sourceLayers.states,
            paint: {
              'fill-color': 'transparent',
              'fill-opacity': 0
            }
          });

          this.map.addLayer({
            id: 'states-line',
            type: 'line',
            source: 'states',
            'source-layer': this.sourceLayers.states,
            paint: {
              'line-color': '#003366',
              'line-width': 2,
              'line-opacity': 0.8
            }
          });

          // Add LGAs layer
          this.map.addSource('lgas', {
            type: 'vector',
            url: `pmtiles://${this.BASE_URL}/ng_lgas.pmtiles`
          });

          this.map.addLayer({
            id: 'lgas-fill',
            type: 'fill',
            source: 'lgas',
            'source-layer': this.sourceLayers.lgas,
            paint: {
              'fill-color': 'transparent',
              'fill-opacity': 0
            }
          });

          this.map.addLayer({
            id: 'lgas-line',
            type: 'line',
            source: 'lgas',
            'source-layer': this.sourceLayers.lgas,
            paint: {
              'line-color': '#336699',
              'line-width': 1.2,
              'line-opacity': 0.7
            }
          });

          // Add Wards layer
          this.map.addSource('wards', {
            type: 'vector',
            url: `pmtiles://${this.BASE_URL}/ng_wards.pmtiles`
          });

          this.map.addLayer({
            id: 'wards-fill',
            type: 'fill',
            source: 'wards',
            'source-layer': this.sourceLayers.wards,
            paint: {
              'fill-color': 'transparent',
              'fill-opacity': 0
            }
          });

          this.map.addLayer({
            id: 'wards-line',
            type: 'line',
            source: 'wards',
            'source-layer': this.sourceLayers.wards,
            paint: {
              'line-color': '#6699cc',
              'line-width': 0.5,
              'line-opacity': 0.5
            }
          });

          // Add highlight layer for selections
          this.map.addSource('highlight', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          this.map.addLayer({
            id: 'highlight-fill',
            type: 'fill',
            source: 'highlight',
            paint: {
              'fill-color': '#FF9900',
              'fill-opacity': 0.4
            }
          });

          this.map.addLayer({
            id: 'highlight-line',
            type: 'line',
            source: 'highlight',
            paint: {
              'line-color': '#FF9900',
              'line-width': 3,
              'line-opacity': 0.8
            }
          });

          // Fit to Nigeria bounds
          this.map.fitBounds([[2.68, 4.27], [14.68, 13.89]], { padding: 20 });

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Add optional layers (health, roads, population)
   */
  addOptionalLayers() {
    // Health facilities
    this.map.addSource('health', {
      type: 'vector',
      url: `pmtiles://${this.BASE_URL}/ng_health_facilities.pmtiles`
    });

    this.map.addLayer({
      id: 'health',
      type: 'circle',
      source: 'health',
      'source-layer': this.sourceLayers.health,
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 4, 14, 8],
        'circle-color': '#1e88e5',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1,
        'circle-opacity': 0.8
      }
    });

    // Roads
    this.map.addSource('roads', {
      type: 'vector',
      url: `pmtiles://${this.BASE_URL}/ng_roads.pmtiles`
    });

    this.map.addLayer({
      id: 'roads',
      type: 'line',
      source: 'roads',
      'source-layer': this.sourceLayers.roads,
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#bb3333',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 10, 1.2, 14, 2.5],
        'line-opacity': 0.8
      }
    });

    // Population density
    this.map.addSource('pop', {
      type: 'raster',
      url: `pmtiles://${this.BASE_URL}/ng_pop_total.pmtiles`,
      tileSize: 256
    });

    this.map.addLayer({
      id: 'pop',
      type: 'raster',
      source: 'pop',
      layout: { visibility: 'none' },
      paint: { 'raster-opacity': 0.6 }
    });

    // Add click handlers for health facilities
    this.map.on('click', 'health', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const properties = e.features[0].properties;

      let description = '<strong>Health Facility</strong><br>';
      for (let key in properties) {
        if (properties[key]) {
          description += `<b>${key}:</b> ${properties[key]}<br>`;
        }
      }

      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(description)
        .addTo(this.map);
    });

    // Change cursor on hover
    this.map.on('mouseenter', 'health', () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', 'health', () => {
      this.map.getCanvas().style.cursor = '';
    });
  }

  /**
   * Get the map instance
   */
  getMap() {
    return this.map;
  }

  /**
   * Highlight features by filter
   */
  highlightFeatures(sourceLayer, filter) {
    const features = this.map.querySourceFeatures('states', {
      sourceLayer: sourceLayer,
      filter: filter
    });

    if (features.length > 0) {
      this.map.getSource('highlight').setData({
        type: 'FeatureCollection',
        features: features
      });
    }
  }

  /**
   * Clear highlight
   */
  clearHighlight() {
    this.map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: []
    });
  }

  /**
   * Toggle layer visibility
   */
  toggleLayer(layerId, visible) {
    this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  /**
   * Fit map to bounds
   */
  fitBounds(bounds, options = {}) {
    this.map.fitBounds(bounds, { padding: 50, ...options });
  }
}

// Export singleton instance
const instance = new MapManager();
export default instance;
