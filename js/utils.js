// js/utils.js — Pure utility functions extracted for testability

/**
 * Normalizes a name for robust matching.
 * @param {string} name The name to normalize.
 * @returns {string} The normalized name.
 */
export function normalize(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[\s-/\\_]+/g, '') // Remove all whitespace, hyphens, slashes, underscores
    .replace(/lgarea$/, '') // Remove trailing 'lgarea'
    .replace(/lga$/, '') // Remove trailing 'lga'
    .replace(/municipal$/, ''); // Remove trailing 'municipal'
}

/**
 * Compute a bounding box from a GeoJSON Feature or FeatureCollection.
 * Returns [[minLng, minLat], [maxLng, maxLat]].
 * Falls back to Nigeria's default bounds if no valid coordinates found.
 * @param {object} geojson A GeoJSON Feature or FeatureCollection
 * @returns {number[][]} Bounds as [[sw_lng, sw_lat], [ne_lng, ne_lat]]
 */
export function bbox(geojson) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const processCoords = (coords) => {
    if (typeof coords[0] === 'number' && isFinite(coords[0]) && isFinite(coords[1])) {
      minLng = Math.min(minLng, coords[0]);
      maxLng = Math.max(maxLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLat = Math.max(maxLat, coords[1]);
    } else if (Array.isArray(coords)) {
      coords.forEach(processCoords);
    }
  };
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      if (feature.geometry && feature.geometry.coordinates) {
        processCoords(feature.geometry.coordinates);
      }
    });
  } else if (geojson.geometry && geojson.geometry.coordinates) {
    processCoords(geojson.geometry.coordinates);
  }
  // Return Nigeria's default bounds if no valid coordinates were found
  if (!isFinite(minLng)) {
    return [[2.68, 4.27], [14.68, 13.89]];
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}

/**
 * Build a mapping from normalized LGA name to senatorial district,
 * applying manual corrections.
 * @param {Array} senatorialData Array of {Senatorial_District, LGAs} records
 * @param {Object} lgaCorrections Map of normalizedName → correctedName(s)
 * @returns {Map<string, string>} normalized LGA name → district name
 */
export function buildLgaToDistrictMap(senatorialData, lgaCorrections) {
  const lgaToDistrictMap = new Map();
  senatorialData.forEach(record => {
    const district = record['Senatorial_District'] || record['district'];
    const lga = record['LGAs'] || record['lga'];
    if (district && lga) {
      const normalizedLga = normalize(lga);
      const correctedLga = lgaCorrections[normalizedLga] || normalizedLga;
      const lgasToMap = Array.isArray(correctedLga) ? correctedLga : [correctedLga];
      lgasToMap.forEach(l => lgaToDistrictMap.set(normalize(l), district));
    }
  });
  return lgaToDistrictMap;
}
