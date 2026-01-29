import { config } from './config.js';

/**
 * MapManager - Singleton class for managing MapLibre GL map instance with PMTiles
 */
class MapManager {
  constructor() {
    if (!MapManager.instance) {
      this.map = null;
      // The config object is now the single source of truth for settings.
      this.config = config;
      
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

    // Initialize map with a reliable and minimal basemap from CartoDB
    this.map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#f2f2f7' },
          },
          {
            id: 'carto-tiles',
            type: 'raster',
            source: 'carto',
          },
        ],
      },
      center: this.config.map.center,
      zoom: this.config.map.zoom,
      minZoom: this.config.map.minZoom,
      maxZoom: this.config.map.maxZoom,
    });

    // Add navigation control
    this.map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right'
    );

    // Error handling with user notifications
    this.map.on('error', (e) => {
      console.error('Map error:', e?.error?.message || e);

      // Show user-friendly error for critical failures
      const errorMessage = e?.error?.message || '';
      const isCritical = errorMessage.includes('tiles') ||
                         errorMessage.includes('source') ||
                         errorMessage.includes('pmtiles') ||
                         errorMessage.includes('Failed to fetch');

      if (isCritical) {
        this.showMapError('Map data failed to load. Please check your connection and refresh the page.');
      }
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
            url: `pmtiles://${this.config.BASE_URL}/ng_states.pmtiles`,
          });

          this.map.addLayer({
            id: this.config.layerIds.states.fill,
            type: 'fill',
            source: 'states',
            'source-layer': this.config.sourceLayers.states,
            paint: this.config.layerStyles.states.fill,
          });

          this.map.addLayer({
            id: this.config.layerIds.states.line,
            type: 'line',
            source: 'states',
            'source-layer': this.config.sourceLayers.states,
            paint: this.config.layerStyles.states.line,
          });

          // Add LGAs layer
          this.map.addSource('lgas', {
            type: 'vector',
            url: `pmtiles://${this.config.BASE_URL}/ng_lgas.pmtiles`,
          });

          this.map.addLayer({
            id: this.config.layerIds.lgas.line,
            type: 'line',
            source: 'lgas',
            'source-layer': this.config.sourceLayers.lgas,
            paint: this.config.layerStyles.lgas.line,
          });

          // Add Wards layer
          this.map.addSource('wards', {
            type: 'vector',
            url: `pmtiles://${this.config.BASE_URL}/ng_wards.pmtiles`,
          });

          this.map.addLayer({
            id: this.config.layerIds.wards.line,
            type: 'line',
            source: 'wards',
            'source-layer': this.config.sourceLayers.wards,
            paint: this.config.layerStyles.wards.line,
          });

          // Add highlight layer for selections
          this.map.addSource('highlight', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          this.map.addLayer({
            id: this.config.layerIds.highlight.fill,
            type: 'fill',
            source: 'highlight',
            paint: this.config.layerStyles.highlight.fill,
          });

          this.map.addLayer({
            id: this.config.layerIds.highlight.line,
            type: 'line',
            source: 'highlight',
            paint: this.config.layerStyles.highlight.line,
          });

          // Add Senatorial District highlight layer
          this.map.addSource('senatorial-highlight', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          this.map.addLayer({
            id: this.config.layerIds.senatorialHighlight.fill,
            type: 'fill',
            source: 'senatorial-highlight',
            paint: this.config.layerStyles.senatorialHighlight.fill,
          });

          this.map.addLayer({
            id: this.config.layerIds.senatorialHighlight.line,
            type: 'line',
            source: 'senatorial-highlight',
            paint: this.config.layerStyles.senatorialHighlight.line,
          });

          // Fit to Nigeria bounds
          this.map.fitBounds(this.config.map.bounds, { padding: 20 });

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
    // Guard: prevent adding sources multiple times
    if (this.map.getSource('health')) {
      // Optional layers already added, skipping
      return;
    }

    // Health facilities
    this.map.addSource('health', {
      type: 'vector',
      url: `pmtiles://${this.config.BASE_URL}/ng_health_facilities.pmtiles`,
    });

    this.map.addLayer({
      id: this.config.layerIds.health,
      type: 'circle',
      source: 'health',
      'source-layer': this.config.sourceLayers.health,
      layout: { visibility: 'none' },
      paint: this.config.layerStyles.health.paint,
    });

    // Roads
    this.map.addSource('roads', {
      type: 'vector',
      url: `pmtiles://${this.config.BASE_URL}/ng_roads.pmtiles`,
    });

    this.map.addLayer({
      id: this.config.layerIds.roads,
      type: 'line',
      source: 'roads',
      'source-layer': this.config.sourceLayers.roads,
      layout: { visibility: 'none' },
      paint: this.config.layerStyles.roads.paint,
    });

    // Population density
    this.map.addSource('pop', {
      type: 'raster',
      url: `pmtiles://${this.config.BASE_URL}/ng_pop_total.pmtiles`,
      tileSize: 256,
    });

    this.map.addLayer({
      id: this.config.layerIds.population,
      type: 'raster',
      source: 'pop',
      layout: { visibility: 'none' },
      paint: this.config.layerStyles.population.paint,
    });

    // Add click handlers for health facilities
    this.map.on('click', this.config.layerIds.health, (e) => {
      if (!e.features || e.features.length === 0) {
        return;
      }
      const coordinates = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      const popup = document.createElement('div');

      const header = document.createElement('strong');
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-hospital';
      header.appendChild(icon);
      header.append(` ${props.facility_name || 'Health Facility'}`);
      popup.appendChild(header);

      const details = document.createElement('div');
      details.style.cssText = 'max-height: 150px; overflow-y: auto; margin-top: 8px; font-size: 13px;';

      const fields = [
        ['Type', props.facility_type_display],
        ['Ownership', props.ownership_display],
        ['Ward', props.wardname],
        ['Status', props.operational_status],
      ];
      fields.forEach(([label, value]) => {
        if (value) {
          const p = document.createElement('p');
          const b = document.createElement('b');
          b.textContent = `${label}: `;
          p.appendChild(b);
          p.append(value);
          details.appendChild(p);
        }
      });

      popup.appendChild(details);
      new maplibregl.Popup().setLngLat(coordinates).setDOMContent(popup).addTo(this.map);
    });

    // Change cursor on hover
    this.map.on('mouseenter', this.config.layerIds.health, () => {
      this.map.getCanvas().style.cursor = 'pointer';
    });

    this.map.on('mouseleave', this.config.layerIds.health, () => {
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
   * Set data for the senatorial highlight layer.
   * @param {object} featureCollection - A GeoJSON FeatureCollection.
   */
  setSenatorialHighlight(featureCollection) {
    this.map.getSource('senatorial-highlight').setData(featureCollection);
  }

  /**
   * Clear all highlights
   */
  clearHighlight() {
    // Clear standard highlight
    this.map.getSource('highlight').setData({
      type: 'FeatureCollection',
      features: [],
    });
    // Also clear senatorial highlight
    this.map.getSource('senatorial-highlight').setData({
      type: 'FeatureCollection',
      features: [],
    });
  }

  /**
   * Toggle layer visibility
   */
  toggleLayer(layerId, visible) {
    const mapLayerId = this.config.layerIds[layerId]?.line || this.config.layerIds[layerId];
    if (mapLayerId) {
        this.map.setLayoutProperty(mapLayerId, 'visibility', visible ? 'visible' : 'none');
    }
  }

  /**
   * Fit map to bounds
   */
  fitBounds(bounds, options = {}) {
    this.map.fitBounds(bounds, { padding: 50, ...options });
  }

  /**
   * Show user-friendly map error notification
   */
  showMapError(message) {
    // Prevent duplicate error messages
    if (document.getElementById('map-error-toast')) return;

    const errorDiv = document.createElement('div');
    errorDiv.id = 'map-error-toast';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff3b30, #ff6b58);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(255, 59, 48, 0.4);
      z-index: 10001;
      font-family: var(--font-family);
      font-size: 14px;
      font-weight: 500;
      max-width: 350px;
      animation: slideInRight 0.3s ease;
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-circle-exclamation';
    icon.style.fontSize = '20px';
    const span = document.createElement('span');
    span.textContent = message;
    errorDiv.appendChild(icon);
    errorDiv.appendChild(span);

    // Add CSS animation (only once)
    if (!document.getElementById('map-error-style')) {
      const style = document.createElement('style');
      style.id = 'map-error-style';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(400px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorDiv.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
  }
}

// Export singleton instance
const instance = new MapManager();
export default instance;
