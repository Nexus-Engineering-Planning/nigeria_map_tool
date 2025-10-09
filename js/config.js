// js/config.js

export const config = {
  // Base URL for PMTiles data
  BASE_URL: 'https://tiles.staygis.com',

  // Initial map settings
  map: {
    center: [8.68, 9.08],
    zoom: 6,
    minZoom: 4,
    maxZoom: 16,
    bounds: [
      [2.68, 4.27], // Southwest
      [14.68, 13.89], // Northeast
    ],
  },

  // Source layer names from the PMTiles files
  sourceLayers: {
    states: 'grid3_nga_boundary_vaccstates',
    lgas: 'grid3_nga_boundary_vacclgas',
    wards: 'grid3_nga_boundary_vaccwards',
    health: 'GRID3_NGA_health_facilities_v2_0',
    roads: 'roads',
  },

  // Layer IDs used in the map style
  layerIds: {
    states: {
      fill: 'states-fill',
      line: 'states-line',
    },
    lgas: {
      fill: 'lgas-fill',
      line: 'lgas-line',
    },
    wards: {
      fill: 'wards-fill',
      line: 'wards-line',
    },
    health: 'health',
    roads: 'roads',
    population: 'pop',
    highlight: {
      fill: 'highlight-fill',
      line: 'highlight-line',
    },
    senatorialHighlight: {
      fill: 'senatorial-highlight-fill',
      line: 'senatorial-highlight-line',
    },
  },

  // Map style definitions for layers
  layerStyles: {
    states: {
      fill: {
        'fill-color': 'transparent',
        'fill-opacity': 0,
      },
      line: {
        'line-color': '#8a8a8e',
        'line-width': 1.5,
        'line-opacity': 0.8,
      },
    },
    lgas: {
      line: {
        'line-color': '#d1d1d6',
        'line-width': 1,
        'line-opacity': 0.7,
      },
    },
    wards: {
      line: {
        'line-color': '#e5e5ea',
        'line-width': 0.5,
        'line-opacity': 0.6,
      },
    },
    highlight: {
      fill: {
        'fill-color': 'rgba(0, 122, 255, 0.2)',
        'fill-outline-color': 'rgba(0, 122, 255, 0.8)',
      },
      line: {
        'line-color': '#007aff',
        'line-width': 2.5,
        'line-opacity': 0.9,
      },
    },
    senatorialHighlight: {
      fill: {
        'fill-color': '#8e44ad', // A distinct purple
        'fill-opacity': 0.25,
      },
      line: {
        'line-color': '#8e44ad',
        'line-width': 2,
      },
    },
    health: {
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 7, 14, 10],
        'circle-color': '#007aff',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.9,
      },
    },
    roads: {
      paint: {
        'line-color': '#6e6e73',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 10, 1, 14, 2],
        'line-opacity': 0.7,
      },
    },
    population: {
      paint: {
        'raster-opacity': 0.6,
      },
    },
  },
};
